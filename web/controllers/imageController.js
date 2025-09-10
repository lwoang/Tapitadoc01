import ImageModel from "../models/ImageModel.js";
import shopify from "../config/shopify.js";
import {
  PRODUCTS_WITH_IMAGES_QUERY,
  CREATE_STAGED_UPLOAD_MUTATION,
  CREATE_PRODUCT_MEDIA_MUTATION,
  DELETE_MEDIA_MUTATION,
  IMAGES_QUERY,
} from "../queries/imageQueries.js";
import { uploadToShopifyStaged } from "../services/shopifyUpload.js";

// --- Lấy ảnh Shopify 
export async function fetchShopifyImages(req, res) {
  try {
    const session = res.locals.shopify.session;
    const client = new shopify.api.clients.Graphql({ session });
    let allProducts = [];
    let after = null;
    let hasNextPage = true;

    while (hasNextPage) {
      const result = await client.query({
        data: {
          query: PRODUCTS_WITH_IMAGES_QUERY,
          // query: IMAGES_QUERY,
          variables: { first: 50, after },
        },
      });

      if (result.body.errors)
        throw new Error(JSON.stringify(result.body.errors));

      const products = result.body.data.products.edges;
      allProducts.push(...products);
      const pageInfo = result.body.data.products.pageInfo;
      hasNextPage = pageInfo.hasNextPage;
      after = pageInfo.endCursor;
    }

    const updatePromises = allProducts.flatMap((productEdge) => {
      const product = productEdge.node;
      const productId = product.id.split("/").pop();
      return product.images.edges.map(async (imageEdge) => {
        const image = imageEdge.node;
        const imageId = image.id.split("/").pop();
        const existing = await ImageModel.findOne({ productId, imageId });
        const isOptimized = !!(
          existing?.optimized === true ||
          (image.url && image.url.includes("optimized_")) ||
          (image.altText && image.altText.includes("Optimized"))
        );

        return ImageModel.findOneAndUpdate(
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
              compressionRatio: existing?.compressionRatio || null,
            },
            $setOnInsert: {
              productGid: product.id,
              imageGid: image.id,
              filename: null,
              optimizedAt: null,
            },
          },
          { upsert: true, new: true }
        );
      });
    });

    await Promise.all(updatePromises);

    const images = await ImageModel.find({}).lean();
    res.json({
      success: true,
      images: images.map((img) => ({
        ...img,
        originalSizeKb: img.originalSize
          ? `${(img.originalSize / 1024).toFixed(2)} KB`
          : null,
        optimizedSizeKb: img.optimizedSize
          ? `${(img.optimizedSize / 1024).toFixed(2)} KB`
          : null,
      })),
    });
  } catch (err) {
    console.error("Fetch Shopify images error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// --- Optimize ảnh ---
export async function optimizeImage(req, res) {
  try {
    const { productId, imageId, productTitle, altText, originalUrl } = req.body;
    const file = req.file;
    if (!file || !productId || !imageId)
      return res
        .status(400)
        .json({ success: false, error: "Missing file/productId/imageId" });

    const optimizedBuffer = file.buffer;
    const optimizedSize = optimizedBuffer.length;
    const originalSize = req.body.originalSize
      ? parseInt(req.body.originalSize)
      : optimizedSize;
    const compressionRatio =
      originalSize > 0
        ? `${(((originalSize - optimizedSize) / originalSize) * 100).toFixed(
            1
          )}%`
        : "0%";

    const session = res.locals.shopify.session;
    const client = new shopify.api.clients.Graphql({ session });
    const shopifyProductGid = productId.startsWith("gid://")
      ? productId
      : `gid://shopify/Product/${productId}`;
    const filename = `optimized_${Date.now()}.jpg`;

    const uploadResult = await uploadToShopifyStaged(
      client,
      optimizedBuffer,
      filename,
      shopifyProductGid
    );

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
          altText,
        },
      },
      { new: true, upsert: true }
    );

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
      isOptimizedUpload: true,
    });
  } catch (err) {
    console.error("Optimize error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}

// --- Restore ảnh ---
export async function restoreImage(req, res) {
  try {
    const { productId, imageId, mediaId } = req.body;
    if (!productId || !imageId)
      return res
        .status(400)
        .json({ success: false, error: "Missing productId or imageId" });

    const session = res.locals.shopify.session;
    const client = new shopify.api.clients.Graphql({ session });

    if (mediaId) {
      const productGid = productId.startsWith("gid://")
        ? productId
        : `gid://shopify/Product/${productId}`;
      const mediaResult = await client.query({
        data: {
          query: DELETE_MEDIA_MUTATION,
          variables: { productId: productGid, mediaIds: [mediaId] },
        },
      });
      const userErrors =
        mediaResult.body.data?.productDeleteMedia?.userErrors || [];
      if (userErrors.length > 0)
        console.warn(
          `Shopify delete media errors: ${JSON.stringify(userErrors)}`
        );
    }

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
          compressionRatio: null,
        },
      },
      { new: true }
    );

    if (!updated)
      return res
        .status(404)
        .json({ success: false, error: "Image not found in DB" });

    res.json({
      success: true,
      message: "Image restored and Shopify media deleted",
      image: updated,
    });
  } catch (err) {
    console.error("Restore error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}
