import { Router } from "express";
import shopRoutes from "./api/shopRoutes.js";
import productRoutes from "./api/productRoutes.js";

const router = Router();

router.use("/shop", shopRoutes);
router.use("/products", productRoutes);

export default router;