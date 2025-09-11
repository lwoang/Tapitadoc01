import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../../models/User.js";
import Store from "../../models/Store.js";
import { authMiddleware } from "../../middlewares/auth.js";

const router = express.Router();

// POST /api/login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET || "1234567890",
      { expiresIn: "1h" }
    );

    // Lấy luôn danh sách stores sau login
    const stores = await Store.find({});

    res.json({ token, user: { username: user.username }, stores });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/stores (protected)
router.get("/stores", authMiddleware, async (req, res) => {
  try {
    const stores = await Store.find({});
    res.json(stores);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
