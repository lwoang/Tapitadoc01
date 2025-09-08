
import { Router } from "express";
import shopRoutes from "./api/shopRoutes.js";
import productRoutes from "./api/productRoutes.js";
import authRoutes from "./api/auth.js";
import imageRoutes from "./api/imageRoutes.js";
import express from "express";  
import editRoutes from "./api/editRoutes.js";   

const router = Router();

router.use(shopRoutes);
router.use(productRoutes);
router.use(authRoutes);
router.use("/api/images", imageRoutes);
router.use("/edit", editRoutes);

export default router;