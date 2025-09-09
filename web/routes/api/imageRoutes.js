// routes/images.js
import express from "express";
import multer from "multer";
import FormData from "form-data";
import fetch from "node-fetch";
import sharp from "sharp";
import shopify from "../../config/shopify.js";
import ImageModel from "../../models/ImageModel.js";

const router = express.Router();
const upload = multer({ 
  limits: { fileSize: 10 * 1024 * 1024 }
});

// GraphQL queries
const PRODUCTS_WITH_IMAGES_QUERY = `
  query getProductsWithImages($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          id
          title
          productType
          status
          images(first: 20) {
            edges {
              node {
                id
                url
                altText
                width
                height
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const CREATE_STAGED_UPLOAD_MUTATION = `
mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
  stagedUploadsCreate(input: $input) {
    stagedTargets {
      url
      resourceUrl
      parameters {
        name
        value
      }
    }
    userErrors {
      field
      message
    }
  }
}
`;

const CREATE_PRODUCT_MEDIA_MUTATION = `
  mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
    productCreateMedia(productId: $productId, media: $media) {
      media {
        ... on MediaImage {
          id
          image {
            id
            url
            altText
          }
        }
      }
      mediaUserErrors {
        field
        message
      }
    }
  }
`;

// Lấy danh sách ảnh từ Shopify
router.get("/shopify", shopify.validateAuthenticatedSession(), async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const client = new shopify.api.clients.Graphql({ session });

    let allProducts = [];
    let after = null;
    let hasNextPage = true;

    // --- 1. Lặp phân trang để lấy tất cả sản phẩm ---
    while (hasNextPage) {
      const result = await client.query({
        data: {
          query: PRODUCTS_WITH_IMAGES_QUERY,
          variables: { first: 50, after }
        }
      });

      if (result.body.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.body.errors)}`);
      }

      const products = result.body.data.products.edges;
      allProducts.push(...products);

      const pageInfo = result.body.data.products.pageInfo;
      hasNextPage = pageInfo.hasNextPage;
      after = pageInfo.endCursor;
    }

    // --- 2. Đồng bộ tất cả ảnh với DB ---
    const updatePromises = [];

    for (const productEdge of allProducts) {
      const product = productEdge.node;
      const productId = product.id.split("/").pop();

      for (const imageEdge of product.images.edges) {
        const image = imageEdge.node;
        const imageId = image.id.split("/").pop();

        updatePromises.push(
          (async () => {
            try {
              const existing = await ImageModel.findOne({ productId, imageId });

              const isOptimized = !!(
                existing?.optimized === true ||
                (image.url && image.url.includes("optimized_")) ||
                (image.altText && image.altText.includes("Optimized"))
              );

              await ImageModel.findOneAndUpdate(
                { productId, imageId },
                {
                  $set: {
                    productTitle: product.title,
                    productType: product.productType || "Không xác định",
                    src: image.url,
                    altText: image.altText || product.title,
                    optimized: isOptimized,
                    status: isOptimized ? "optimized" : "unoptimized",
                    originalSize: existing?.originalSize || null,
                    optimizedSize: existing?.optimizedSize || null,
                    compressionRatio: existing?.compressionRatio || null
                  },
                  $setOnInsert: {
                    productGid: product.id,
                    imageGid: image.id,
                    filename: null,
                    optimizedAt: null
                  }
                },
                { upsert: true, new: true }
              );
            } catch (err) {
              console.error(`DB update failed for productId=${productId}, imageId=${imageId}:`, err);
            }
          })()
        );
      }
    }

    // Chờ tất cả update hoàn tất
    await Promise.all(updatePromises);

    // --- 3. Lấy tất cả ảnh từ DB ---
    const images = await ImageModel.find({}).lean();

    res.json({
      success: true,
      images: images.map(img => ({
        ...img,
        originalSizeKb: img.originalSize ? `${(img.originalSize / 1024).toFixed(2)} KB` : null,
        optimizedSizeKb: img.optimizedSize ? `${(img.optimizedSize / 1024).toFixed(2)} KB` : null
      }))
    });
  } catch (err) {
    console.error("Fetch Shopify images error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});



// Optimize ảnh & lưu DB trước khi upload
router.post("/optimize", shopify.validateAuthenticatedSession(), upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const { productId, imageId, productTitle, altText, originalUrl } = req.body;

    if (!file || !productId || !imageId) {
      return res.status(400).json({ 
        success: false, 
        error: "Thiếu file hoặc productId hoặc imageId" 
      });
    }

    // --- 1. Dung lượng ảnh đã optimize từ frontend ---
    const optimizedBuffer = file.buffer;
    const optimizedSize = optimizedBuffer.length;

    // Nếu có originalSize từ frontend thì dùng, nếu không backend không cần tính lại
    const originalSize = req.body.originalSize ? parseInt(req.body.originalSize) : optimizedSize;
    const compressionRatio = originalSize > 0 
      ? `${((originalSize - optimizedSize) / originalSize * 100).toFixed(1)}%` 
      : "0%";

    // --- 2. Upload lên Shopify ---
    const session = res.locals.shopify.session;
    const client = new shopify.api.clients.Graphql({ session });
    const shopifyProductGid = productId.startsWith("gid://") 
      ? productId 
      : `gid://shopify/Product/${productId}`;
    const filename = `optimized_${Date.now()}.jpg`;

    const uploadResult = await uploadToShopifyStaged(client, optimizedBuffer, filename, shopifyProductGid);

    // --- 3. Lưu DB ---
    const updated = await ImageModel.findOneAndUpdate(
      { productId, imageId },
      {
        $set: {
          optimizedUrl: uploadResult.mediaUrl || uploadResult.resourceUrl,
          resourceUrl: uploadResult.resourceUrl,
          mediaId: uploadResult.mediaId || null,
          optimized: true,
          status: "optimized",
          originalSize,       
          optimizedSize,      
          compressionRatio,
          optimizedAt: new Date(),
          filename,
          originalUrl,
          productTitle,
          altText
        }
      },
      { new: true, upsert: true }
    );

    // --- 4. Trả về ---
    res.json({
      success: true,
      optimized: true,
      newUrl: updated.optimizedUrl,
      compressionRatio,
      originalSize,
      optimizedSize,
      originalSizeKb: `${(originalSize / 1024).toFixed(2)} KB`,
      optimizedSizeKb: `${(optimizedSize / 1024).toFixed(2)} KB`,
      mediaId: updated.mediaId,
      filename: updated.filename,
      isOptimizedUpload: true
    });

  } catch (err) {
    console.error("Optimize error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});




// Hàm upload
async function uploadToShopifyStaged(client, fileBuffer, filename, productId) {
  try {
    // Step 1: Create staged upload
    const stagedResult = await client.query({
      data: {
        query: CREATE_STAGED_UPLOAD_MUTATION,
        variables: {
          input: [{ 
            resource: "IMAGE", 
            filename, 
            mimeType: "image/jpeg", 
            httpMethod: "POST" 
          }]
        }
      }
    });

    if (stagedResult.body.errors) {
      throw new Error(`Staged upload GraphQL errors: ${JSON.stringify(stagedResult.body.errors)}`);
    }

    const userErrors = stagedResult.body.data?.stagedUploadsCreate?.userErrors || [];
    if (userErrors.length > 0) {
      throw new Error(`Staged upload failed: ${JSON.stringify(userErrors)}`);
    }

    const stagedTarget = stagedResult.body.data?.stagedUploadsCreate?.stagedTargets?.[0];
    if (!stagedTarget || !stagedTarget.url || !stagedTarget.resourceUrl) {
      throw new Error("No valid staged target returned from Shopify");
    }

    // Step 2: Upload file to staged URL
    const formData = new FormData();
    stagedTarget.parameters.forEach(p => formData.append(p.name, p.value));
    formData.append("file", fileBuffer, filename);

    const uploadResponse = await fetch(stagedTarget.url, { 
      method: "POST", 
      body: formData, 
      headers: formData.getHeaders() 
    });

    if (!uploadResponse.ok) {
      const text = await uploadResponse.text();
      throw new Error(`File upload to Shopify failed: ${uploadResponse.status} - ${text}`);
    }

    // Step 3: Create product media
    const mediaResult = await client.query({
      data: {
        query: CREATE_PRODUCT_MEDIA_MUTATION,
        variables: {
          productId,
          media: [{ 
            originalSource: stagedTarget.resourceUrl, 
            mediaContentType: "IMAGE", 
            alt: `Optimized - ${filename}`   // <--- altText 
          }]
        }
      }
    });

    const createdMedia = mediaResult.body.data?.productCreateMedia?.media?.[0];
    
    return {
      resourceUrl: stagedTarget.resourceUrl,
      mediaUrl: createdMedia?.image?.url || null,
      mediaId: createdMedia?.id || null
    };

  } catch (err) {
    console.error("Upload to Shopify error:", err.message);
    throw err;
  }
}

const DELETE_MEDIA_MUTATION = `
  mutation productDeleteMedia($productId: ID!, $mediaIds: [ID!]!) {
    productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
      deletedMediaIds
      userErrors {
        field
        message
      }
    }
  }
`;


// Restore ảnh: xóa ảnh đã optimized trên Shopify và reset DB
router.post("/restore", shopify.validateAuthenticatedSession(), async (req, res) => {
  try {
    const { productId, imageId, mediaId } = req.body;

    if (!productId || !imageId) {
      return res.status(400).json({ success: false, error: "Missing productId or imageId" });
    }

    const session = res.locals.shopify.session;
    const client = new shopify.api.clients.Graphql({ session });

    // Xoá media trên Shopify nếu có mediaId
    if (mediaId) {
      const productGid = productId.startsWith("gid://") ? productId : `gid://shopify/Product/${productId}`;

      const mediaResult = await client.query({
        data: {
          query: DELETE_MEDIA_MUTATION,
          variables: {
            productId: productGid,
            mediaIds: [mediaId],
          },
        },
      });

      const userErrors = mediaResult.body.data?.productDeleteMedia?.userErrors || [];
      if (userErrors.length > 0) {
        console.warn(`Shopify delete media errors: ${JSON.stringify(userErrors)}`);
      }
    }


    //  Cập nhật DB: reset trạng thái ảnh
    const updated = await ImageModel.findOneAndUpdate(
      { productId, imageId },
      {
        $set: {
          status: "unoptimized",
          optimizedUrl: null,
          mediaId: null,
          filename: null,
          optimizedAt: null,
          optimizedSize: null,
          compressionRatio: null
        }
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, error: "Image not found in DB" });
    }

    res.json({ success: true, message: "Image restored and Shopify media deleted", image: updated });

  } catch (err) {
    console.error("Restore error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});


export default router;