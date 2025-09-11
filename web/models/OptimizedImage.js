// models/OptimizedImage.js
import mongoose from "mongoose";

const optimizedImageSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    imageId: { type: String, required: true },
    originalUrl: { type: String, required: true },
    optimizedUrl: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("OptimizedImage", optimizedImageSchema);
