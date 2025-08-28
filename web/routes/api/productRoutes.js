import { Router } from "express";
import { getProductCount, createProducts } from "../../controllers/productController.js";

const router = Router();

router.get("/count", getProductCount);

router.post("/", createProducts);

export default router;