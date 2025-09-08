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

    // Lấy dữ liệu từ Shopify
    const result = await client.query({
      data: {
        query: PRODUCTS_WITH_IMAGES_QUERY,
        variables: { first: 50, after: null }
      }
    });

    if (result.body.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.body.errors)}`);
    }

    const products = result.body.data.products.edges;

    // Đồng bộ dữ liệu với DB
    for (const productEdge of products) {
      const product = productEdge.node;
      const productId = product.id.split("/").pop();

      for (const imageEdge of product.images.edges) {
        const image = imageEdge.node;
        const imageId = image.id.split("/").pop();

        // Lấy bản ghi cũ trong DB (nếu có)
        const existing = await ImageModel.findOne({ productId, imageId });

        // Nếu bản ghi có optimizedUrl thì coi như đã optimize
        const isOptimized = !!(existing && existing.optimizedUrl);

        await ImageModel.findOneAndUpdate(
          { productId, imageId },
          {
            $set: {
              productTitle: product.title,
              productType: product.productType || "Không xác định",
              src: image.url,
              originalSrc: image.url,
              altText: image.altText || product.title,
              optimized: existing?.optimized === true ? true : isOptimized,
              status: existing?.optimized === true ? "optimized" : (isOptimized ? "optimized" : "unoptimized"),
            },
            $setOnInsert: {
              productGid: product.id,
              imageGid: image.id,
              compressionRatio: null
            }
          },
          { upsert: true, new: true }
        );
      }
    }

    // Chỉ lấy ảnh chưa optimize từ DB
    const images = await ImageModel.find({ optimized: false });

    res.json({
      success: true,
      images
    });
  } catch (err) {
    console.error("Fetch Shopify images error:", err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});



// Optimize ảnh 
router.post("/optimize", shopify.validateAuthenticatedSession(), upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const { productId, imageId } = req.body;

    if (!file || !productId || !imageId) {
      return res.status(400).json({ 
        success: false, 
        error: "Thiếu file hoặc productId hoặc imageId" 
      });
    }

    const session = res.locals.shopify.session;
    const client = new shopify.api.clients.Graphql({ session });

    // Kích thước gốc
    const originalSize = file.buffer.length;

    // Optimize bằng Sharp
    let optimizedBuffer;
    try {
      optimizedBuffer = await sharp(file.buffer)
        .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();
    } catch {
      optimizedBuffer = file.buffer; // fallback
    }

    const optimizedSize = optimizedBuffer.length;
    const compressionRatio = originalSize > 0 
      ? `${((originalSize - optimizedSize) / originalSize * 100).toFixed(1)}%` 
      : "0%";

    const productGid = productId.startsWith("gid://") 
      ? productId 
      : `gid://shopify/Product/${productId}`;

    // Upload ảnh optimized lên Shopify
    const filename = `optimized_${Date.now()}.jpg`;
    const uploadResult = await uploadToShopifyStaged(client, optimizedBuffer, filename, productGid);

    // Cập nhật trực tiếp bản ghi cũ
    const updated = await ImageModel.findOneAndUpdate(
      { productId, imageId }, 
      {
        $set: {
          optimizedUrl: uploadResult.mediaUrl || uploadResult.resourceUrl,
          resourceUrl: uploadResult.resourceUrl,
          mediaId: uploadResult.mediaId || null,
          optimized: true,
          isOptimizedUpload: true,    
          status: "optimized",
          originalSize,
          optimizedSize,
          compressionRatio,
          optimizedAt: new Date(),
          filename,
          // lưu lại url gốc để biết ảnh này optimize từ đâu
          originalUrl: req.body.originalUrl || null
        }
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      optimized: true,
      newUrl: updated.optimizedUrl, 
      url: updated.optimizedUrl,    
      compressionRatio,
      originalSize: `${(originalSize / 1024).toFixed(2)} KB`,
      optimizedSize: `${(optimizedSize / 1024).toFixed(2)} KB`,
      mediaId: updated.mediaId,
      filename: updated.filename,
      isOptimizedUpload: true
    });

  } catch (err) {
    console.error("Optimize error:", err.message);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
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
            alt: `Optimized - ${filename}`   // <--- altText để biết ảnh đã optimize
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


export default router;