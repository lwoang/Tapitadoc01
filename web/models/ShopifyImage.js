// models/ShopifyImage.js
import mongoose from "mongoose";

const shopifyImageSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    productTitle: { type: String },
    imageId: { type: String, required: true },
    src: { type: String, required: true },  
    altText: { type: String },
    width: { type: Number },
    height: { type: Number },
    fileSize: { type: Number },
    optimized: { type: Boolean, default: false },
    optimizedUrl: { type: String }, 
  },
  { timestamps: true }
);

export default mongoose.model("ShopifyImage", shopifyImageSchema);
