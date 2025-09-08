import mongoose from "mongoose";


const imageMapSchema = new mongoose.Schema({
shop: { type: String, required: true, index: true },
// A flat map: original URL -> optimized URL
map: { type: Map, of: String, default: {} },


// Optional: metadata for auditing
updatedBy: { type: String }, // user id or email
updatedAt: { type: Date, default: Date.now },
});


imageMapSchema.index({ shop: 1 }, { unique: true });


export default mongoose.model("ImageMap", imageMapSchema);