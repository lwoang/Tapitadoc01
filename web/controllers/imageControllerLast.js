import shopify from "../config/shopify.js";
import sharp from "sharp";
import FormData from "form-data";
import fetch from "node-fetch";
import axios from "axios";
import {
  PRODUCTS_WITH_IMAGES_QUERY,
  CREATE_STAGED_UPLOAD_MUTATION,
  CREATE_PRODUCT_MEDIA_MUTATION,
  DELETE_MEDIA_MUTATION,
  IMAGE_QUERY,
  FILE_CREATE,
  METAFIELD_SET,
} from "../queries/imageQueries.js";
import { uploadToShopifyStaged } from "../services/shopifyUpload.js";
import OptimizedImage from "../models/OptimizedImage.js";
import ShopifyImage from "../models/ShopifyImage.js";
async function getMediaImageUrl(mediaGID, client, retry = 5, delay = 1000) {
  const query = `
    query getMediaImage($id: ID!) {
      node(id: $id) {
        ... on MediaImage {
          image { url }
          id
        }
      }
    }
  `;
  for (let i = 0; i < retry; i++) {
    const variables = { id: mediaGID };
    const response = await client.query({ data: { query, variables } });
    const url = response.body.data.node?.image?.url || null;

    if (url) return url;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  return null;
}

// --- Lấy ảnh Shopify
export async function fetchShopifyImages(req, res) {
  try {
    const session = res.locals.shopify.session;
    const client = new shopify.api.clients.Graphql({ session });

    let allProducts = [];
    let after = null;
    const first = 50;

    do {
      const variables = { first, after };
      const response = await client.query({
        data: { query: PRODUCTS_WITH_IMAGES_QUERY, variables },
      });

      const data = response.body.data;
      const products = data.products.edges.map((edge) => edge.node);
      allProducts = allProducts.concat(products);

      after = data.products.pageInfo.hasNextPage
        ? data.products.pageInfo.endCursor
        : null;
    } while (after);

    // --- Lấy tất cả bản ghi optimize đã có trong Mongo ---
    const optimizedList = await OptimizedImage.find({});
    const optimizedMap = new Map(
      optimizedList.map(doc => [`${doc.productId}_${doc.imageId}`, doc])
    );

    const allImages = [];
    for (const product of allProducts) {
      for (const imageEdge of product.images.edges) {
        const image = imageEdge.node;

        let sizeInBytes = null;
        try {
          const headRes = await fetch(image.url, { method: "HEAD" });
          sizeInBytes = headRes.headers.get("content-length");
        } catch (e) {
          console.error("Lỗi khi lấy dung lượng ảnh:", e.message);
        }

        const key = `${product.id}_${image.id}`;
        const optimizedDoc = optimizedMap.get(key);

        let optimizedSize = null;
        if (optimizedDoc?.optimizedUrl) {
          try {
            const headRes = await fetch(optimizedDoc.optimizedUrl, { method: "HEAD" });
            optimizedSize = headRes.headers.get("content-length");
          } catch (e) {
            console.error("Lỗi khi lấy dung lượng ảnh optimized:", e.message);
          }
        }

        allImages.push({
          productId: product.id,
          productTitle: product.title,
          ...image,
          fileSize: sizeInBytes ? Number(sizeInBytes) : null,
          optimizedFileSize: optimizedSize ? Number(optimizedSize) : null,
          optimized: !!optimizedDoc,
          optimizedUrl: optimizedDoc?.optimizedUrl || null
        });
      }
    }

    res.json({ products: allProducts, images: allImages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi khi lấy sản phẩm/ảnh từ Shopify" });
  }
}



// Optimize ảnh
export async function optimizeImage(req, res) { 
  try {
    const { productId, imageId } = req.body;
    if (!productId || !imageId) {
      return res.status(400).json({ error: "Thiếu productId hoặc imageId" });
    }

    const session = res.locals.shopify.session;
    const client = new shopify.api.clients.Graphql({ session });

    // Lấy ảnh gốc
    const response = await client.query({
      data: { query: IMAGE_QUERY, variables: { productId } },
    });

    const product = response.body.data.product;
    const imageEdge = product.images.edges.find(
      (edge) => edge.node.id === imageId
    );
    const image = imageEdge?.node;
    if (!image) {
      return res.status(404).json({ error: "Không tìm thấy ảnh" });
    }

    // Download ảnh
    const resp = await fetch(image.url);
    if (!resp.ok) throw new Error(`Lỗi tải ảnh: ${resp.status}`);
    const buffer = Buffer.from(await resp.arrayBuffer());

    // Optimize
    const imageSharp = sharp(buffer);
    const metadata = await imageSharp.metadata();
    const optimizedBuffer = await imageSharp.webp({ quality: 80 }).toBuffer();
    const mimeType = "image/webp";

    // Tạo staged upload
    const stagedRes = await client.query({
      data: {
        query: CREATE_STAGED_UPLOAD_MUTATION,
        variables: {
          input: [
            {
              filename: `optimized.webp`,
              mimeType,
              fileSize: optimizedBuffer.length.toString(),
              resource: "IMAGE",
              httpMethod: "POST",
            },
          ],
        },
      },
    });

    const stagedTarget = stagedRes.body.data.stagedUploadsCreate.stagedTargets[0];

    // Upload file lên Shopify storage
    const form = new FormData();
    stagedTarget.parameters.forEach(({ name, value }) =>
      form.append(name, value)
    );
    form.append("file", optimizedBuffer, {
      filename: `Op-optimized.webp`,
      contentType: mimeType,
    });

    await axios.post(stagedTarget.url, form, {
      headers: form.getHeaders(),
    });

    // fileCreate
    const fileCreateRes = await client.query({
      data: {
        query: FILE_CREATE,
        variables: {
          files: [
            {
              alt: image.altText || product.title,
              contentType: "IMAGE",
              originalSource: stagedTarget.resourceUrl,
            },
          ],
        },
      },
    });

    const fileResult = fileCreateRes.body.data.fileCreate;
    if (fileResult.userErrors.length > 0) {
      throw new Error(
        "Shopify fileCreate error: " + JSON.stringify(fileResult.userErrors)
      );
    }

    // Lấy URL thật
    const fileGID = fileResult.files[0].id;
    const optimizedUrl = await getMediaImageUrl(fileGID, client);

    // Lấy kích thước optimized
    let optimizedFileSize = null;
    try {
      const headRes = await fetch(optimizedUrl, { method: "HEAD" });
      optimizedFileSize = headRes.headers.get("content-length");
    } catch (e) {
      console.error("Lỗi lấy dung lượng ảnh optimized:", e.message);
    }

    // Lưu metafield
    await client.query({
      data: {
        query: METAFIELD_SET,
        variables: {
          metafields: [
            {
              namespace: "optimized_images",
              key: "opUrl",
              ownerId: productId,
              type: "url",
              value: optimizedUrl,
            },
          ],
        },
      },
    });

    // Lưu vào MongoDB
    const savedDoc = await OptimizedImage.create({
      productId,
      imageId,
      originalUrl: image.url,
      optimizedUrl,
    });

    res.json({
      success: true,
      optimizedUrl,
      optimizedFileSize: optimizedFileSize ? Number(optimizedFileSize) : null,
      mongo: savedDoc,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi khi optimize ảnh", details: err.message });
  }
}


// --- Restore ảnh ---
export async function restoreImage(req, res) {
  try {
    const { productId, imageId, mediaId } = req.body;

    if (!productId || !imageId) {
      return res.status(400).json({
        success: false,
        error: "Thiếu productId hoặc imageId",
      });
    }

    const session = res.locals.shopify.session;
    const client = new shopify.api.clients.Graphql({ session });

    //  Xóa media đã optimize khỏi Shopify nếu có
    if (mediaId) {
      const productGid = productId.startsWith("gid://")
        ? productId
        : `gid://shopify/Product/${productId}`;

      await client.query({
        data: {
          query: DELETE_MEDIA_MUTATION,
          variables: {
            productId: productGid,
            mediaIds: [mediaId],
          },
        },
      });
    }

    // Xóa bản ghi optimized trong MongoDB
    const deleted = await OptimizedImage.findOneAndDelete({ productId, imageId });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: "Không tìm thấy ảnh đã optimize trong DB",
      });
    }

    res.json({
      success: true,
      message: "Khôi phục ảnh gốc thành công",
      deleted,
    });
  } catch (err) {
    console.error("Lỗi restore ảnh:", err);
    res.status(500).json({
      success: false,
      error: "Lỗi khi restore ảnh",
      details: err.message,
    });
  }
}
