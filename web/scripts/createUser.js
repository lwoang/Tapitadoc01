import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import User from "../models/user.js";

dotenv.config();

async function createUser() {
  try {
    // Kết nối MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://hoanga2k16lp:Hoang2003@training2.xepr2mq.mongodb.net/Training2", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    const username = process.argv[2] || "ad";
    const password = process.argv[3] || "123";

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Tạo user
    const user = new User({ username, passwordHash });
    await user.save();

    console.log(`User created: ${username} / ${password}`);
    process.exit(0);
  } catch (err) {
    console.error("Error creating user:", err);
    process.exit(1);
  }
}

createUser();
