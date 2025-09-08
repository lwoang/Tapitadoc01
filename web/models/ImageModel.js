import mongoose from "mongoose";

const ImageSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    imageId: { type: String, required: true },
    productGid: { type: String },
    imageGid: { type: String },
    productTitle: { type: String },
    productType: { type: String },
    status: { type: String, default: "unoptimized" },
    src: { type: String },
    originalSrc: { type: String },
    optimizedUrl: { type: String },
    resourceUrl: { type: String },
    mediaId: { type: String },
    altText: { type: String },
    optimized: { type: Boolean, default: false },
    originalSize: { type: Number },
    optimizedSize: { type: Number },
    compressionRatio: { type: String },
    optimizedAt: { type: Date },
    filename: { type: String }
  },
  { timestamps: true } // tự động tạo createdAt + updatedAt
);

export default mongoose.model("Image", ImageSchema);
