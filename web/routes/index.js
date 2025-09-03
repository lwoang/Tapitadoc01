import { Router } from "express";
import shopRoutes from "./api/shopRoutes.js";
import productRoutes from "./api/productRoutes.js";
import authRoutes from "./api/auth.js";

const router = Router();

router.use(shopRoutes);
router.use(productRoutes);
router.use(authRoutes);

export default router;