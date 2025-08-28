import { Router } from "express";
import { getShopInfo } from "../../controllers/shopController.js";

const router = Router();

router.get("/info", getShopInfo);

export default router;