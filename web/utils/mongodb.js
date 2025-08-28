import mongoose from "mongoose";
import dotenv from "dotenv";

// Tải biến môi trường từ tệp .env ở thư mục gốc của dự án
dotenv.config();

const mongoUri = process.env.DATABASE_URL;

if (!mongoUri) {
  console.error("DATABASE_URL is not defined in the .env file.");
  process.exit(1);
}

export const connectMongoDB = async () => {
  try {
    console.log("Attempting to connect to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected successfully.");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};