import { Router } from "express";
import { getShopInfo, getAllStores } from "../../controllers/shopController.js";
import shopify from "../../config/shopify.js";

const router = Router();

router.get("/info", shopify.validateAuthenticatedSession(), getShopInfo);
router.get("/stores", shopify.validateAuthenticatedSession(), async (req, res, next) => {
	await getShopInfo(req, res);
	if (res.headersSent) return;
	return getAllStores(req, res, next);
});

export default router;