import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../../models/user.js";
import Store from "../../models/store.js";
import { authMiddleware } from "../../middlewares/auth.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  console.log("Login attempt:", username, password);

  const user = await User.findOne({ username });
  console.log("User found:", user); 
  if (!user) return res.status(400).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(400).json({ error: "Invalid credentials" });

  const token = jwt.sign(
    { id: user._id, username: user.username },
    process.env.JWT_SECRET || "1234567890",
    { expiresIn: "1h" }
  );

  res.json({ token });
});

router.get("/stores", authMiddleware, async (req, res) => {
  const stores = await Store.find({});
  res.json(stores);
});

export default router;
