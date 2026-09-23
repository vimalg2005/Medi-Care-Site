import express from "express";
import mongoose from "mongoose";
import Subscriber from "../models/Subscriber.js";
import { isMockDB, mockSubscribers } from "../utils/mockStore.js";
import { loginAdmin, verifyAdminSession, verifyClerkAdminSession } from "../controllers/adminController.js";

const router = express.Router();

// Strict Admin Gate Endpoints
router.post("/login", loginAdmin);
router.post("/clerk-verify", verifyClerkAdminSession);
router.get("/verify", verifyAdminSession);

// Admin Subscriber Management Endpoints
router.get("/subscribers", async (req, res) => {
  try {
    if (mongoose.connection?.readyState === 1 && !isMockDB) {
      const subscribers = await Subscriber.find().sort({ createdAt: -1 });
      return res.json({ success: true, count: subscribers.length, subscribers });
    }
    return res.json({ success: true, count: mockSubscribers.length, subscribers: mockSubscribers });
  } catch (err) {
    console.error("Admin get subscribers error:", err);
    return res.status(500).json({ success: false, message: "Failed to retrieve subscribers list." });
  }
});

router.delete("/subscribers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (mongoose.connection?.readyState === 1 && !isMockDB) {
      const deleted = await Subscriber.findByIdAndDelete(id);
      if (!deleted) return res.status(404).json({ success: false, message: "Subscriber not found" });
      return res.json({ success: true, message: "Subscriber removed successfully" });
    }
    const idx = mockSubscribers.findIndex((s) => String(s._id) === String(id));
    if (idx === -1) return res.status(404).json({ success: false, message: "Subscriber not found" });
    mockSubscribers.splice(idx, 1);
    return res.json({ success: true, message: "Subscriber removed successfully" });
  } catch (err) {
    console.error("Admin delete subscriber error:", err);
    return res.status(500).json({ success: false, message: "Failed to delete subscriber." });
  }
});

router.patch("/subscribers/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    if (mongoose.connection?.readyState === 1 && !isMockDB) {
      const sub = await Subscriber.findById(id);
      if (!sub) return res.status(404).json({ success: false, message: "Subscriber not found" });
      sub.active = !sub.active;
      await sub.save();
      return res.json({ success: true, message: `Subscriber marked as ${sub.active ? "Active" : "Inactive"}`, subscriber: sub });
    }
    const sub = mockSubscribers.find((s) => String(s._id) === String(id));
    if (!sub) return res.status(404).json({ success: false, message: "Subscriber not found" });
    sub.active = !sub.active;
    sub.updatedAt = new Date().toISOString();
    return res.json({ success: true, message: `Subscriber marked as ${sub.active ? "Active" : "Inactive"}`, subscriber: sub });
  } catch (err) {
    console.error("Admin patch subscriber error:", err);
    return res.status(500).json({ success: false, message: "Failed to update subscriber status." });
  }
});

export default router;
