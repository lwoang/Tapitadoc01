import express from "express";
import shopify from "../../config/shopify.js";
import {
  getAllItems,
  getSingleItem,
  updateItem,
  generateAISuggestion
} from "../../controllers/shopifyEditController.js";

const router = express.Router();

router.get("/:type", shopify.validateAuthenticatedSession(), getAllItems);
router.get("/:type/:id", shopify.validateAuthenticatedSession(), getSingleItem);
router.put("/:type/:id", shopify.validateAuthenticatedSession(), updateItem);
router.post("/ai/suggest", generateAISuggestion);

export default router;
