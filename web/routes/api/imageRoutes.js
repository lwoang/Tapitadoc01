import express from "express";
import multer from "multer";
import shopify from "../../config/shopify.js";
import {
  fetchShopifyImages,
  optimizeImage,
  restoreImage
} from "../../controllers/imageControllerCp.js";

const router = express.Router();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

router.get("/shopify", shopify.validateAuthenticatedSession(), fetchShopifyImages);
router.post("/optimize", shopify.validateAuthenticatedSession(), upload.single("file"), optimizeImage);
router.post("/restore", shopify.validateAuthenticatedSession(), restoreImage);

router.post(
  "/upload",
  shopify.validateAuthenticatedSession(),
  upload.array("images"),
  async (req, res) => {
    try {
      const { productId } = req.body;
      if (!productId) throw new Error("Missing productId");

      const session = await shopify.session.getCurrentSession(); // lấy session hiện tại
      const client = new shopify.api.clients.Graphql({ session });

      const uploadedImages = [];

      for (let file of req.files) {
        // Upload ảnh lên Shopify
        const mutation = `
          mutation productUpdate($input: ProductInput!) {
            productUpdate(input: $input) {
              product { id, images(first:5) { edges { node { id, url } } } }
              userErrors { field, message }
            }
          }
        `;
        const variables = {
          input: {
            id: `gid://shopify/Product/${productId}`,
            images: [{ attachment: file.buffer.toString("base64"), filename: file.originalname }],
          },
        };
        const result = await client.query({ data: { query: mutation, variables } });
        const errors = result.body.data.productUpdate.userErrors;
        if (errors && errors.length) throw new Error(errors.map(e => e.message).join(", "));
        const shopifyImage = result.body.data.productUpdate.product.images.edges.slice(-1)[0].node;

        // Lưu vào MongoDB
        const newImage = await ImageModel.create({
          productId,
          filename: file.originalname,
          url: shopifyImage.url,
          shop: session.shop,
        });
        uploadedImages.push(newImage);

        //  Update Metafield Shopify
        await client.query({
          data: {
            query: `
              mutation metafieldUpsert($input: MetafieldInput!) {
                metafieldUpsert(input: $input) {
                  metafield { id, key, value }
                  userErrors { field, message }
                }
              }
            `,
            variables: {
              input: {
                namespace: "custom_images",
                key: `image_${newImage._id}`,
                ownerId: `gid://shopify/Product/${productId}`,
                type: "single_line_text_field",
                value: shopifyImage.url,
              },
            },
          },
        });
      }

      res.json({ success: true, images: uploadedImages });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);


export default router;
