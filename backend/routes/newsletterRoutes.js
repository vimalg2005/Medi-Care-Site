import express from "express";
import mongoose from "mongoose";
import Subscriber from "../models/Subscriber.js";
import { sendNewsletterWelcomeEmail } from "../utils/emailService.js";
import { isMockDB, mockSubscribers } from "../utils/mockStore.js";

const router = express.Router();

/**
 * POST /api/newsletter/subscribe
 * Subscribe an email address to the newsletter
 */
router.post("/subscribe", async (req, res) => {
  try {
    const { email } = req.body || {};
    const emailLC = (email || "").toLowerCase().trim();

    if (!emailLC || !/^\S+@\S+\.\S+$/.test(emailLC)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address" });
    }

    let savedRecord = null;

    if (mongoose.connection?.readyState === 1 && !isMockDB) {
      try {
        savedRecord = await Subscriber.findOneAndUpdate(
          { email: emailLC },
          { email: emailLC, active: true },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } catch (dbErr) {
        console.warn("Subscriber save notice:", dbErr.message);
      }
    } else {
      // Mock store fallback
      const existing = mockSubscribers.find((s) => s.email === emailLC);
      if (existing) {
        existing.active = true;
        existing.updatedAt = new Date().toISOString();
        savedRecord = existing;
      } else {
        savedRecord = {
          _id: `mock_sub_${Date.now()}`,
          email: emailLC,
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        mockSubscribers.unshift(savedRecord);
      }
    }

    // Send welcome email (async background)
    sendNewsletterWelcomeEmail(emailLC).catch((err) =>
      console.warn("Newsletter welcome email notice:", err.message)
    );

    return res.json({
      success: true,
      message: "Thank you for subscribing to MediCare Health Tips!",
      subscriber: savedRecord,
    });
  } catch (err) {
    console.error("Newsletter error:", err);
    return res.status(500).json({ success: false, message: "Server error subscribing email" });
  }
});

/**
 * GET /api/newsletter/subscribers
 * Get all newsletter subscribers for Admin Console
 */
router.get("/subscribers", async (req, res) => {
  try {
    if (mongoose.connection?.readyState === 1 && !isMockDB) {
      const subscribers = await Subscriber.find().sort({ createdAt: -1 });
      return res.json({
        success: true,
        count: subscribers.length,
        subscribers,
      });
    }

    return res.json({
      success: true,
      count: mockSubscribers.length,
      subscribers: mockSubscribers,
    });
  } catch (err) {
    console.error("Get subscribers error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve subscribers list.",
    });
  }
});

/**
 * DELETE /api/newsletter/subscribers/:id
 * Delete a subscriber
 */
router.delete("/subscribers/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (mongoose.connection?.readyState === 1 && !isMockDB) {
      const deleted = await Subscriber.findByIdAndDelete(id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: "Subscriber not found" });
      }
      return res.json({ success: true, message: "Subscriber removed successfully" });
    }

    const idx = mockSubscribers.findIndex((s) => String(s._id) === String(id));
    if (idx === -1) {
      return res.status(404).json({ success: false, message: "Subscriber not found" });
    }
    mockSubscribers.splice(idx, 1);
    return res.json({ success: true, message: "Subscriber removed successfully" });
  } catch (err) {
    console.error("Delete subscriber error:", err);
    return res.status(500).json({ success: false, message: "Failed to delete subscriber." });
  }
});

/**
 * PATCH /api/newsletter/subscribers/:id/status
 * Toggle subscriber active/inactive status
 */
router.patch("/subscribers/:id/status", async (req, res) => {
  try {
    const { id } = req.params;

    if (mongoose.connection?.readyState === 1 && !isMockDB) {
      const sub = await Subscriber.findById(id);
      if (!sub) {
        return res.status(404).json({ success: false, message: "Subscriber not found" });
      }
      sub.active = !sub.active;
      await sub.save();
      return res.json({ success: true, message: `Subscriber marked as ${sub.active ? "Active" : "Inactive"}`, subscriber: sub });
    }

    const sub = mockSubscribers.find((s) => String(s._id) === String(id));
    if (!sub) {
      return res.status(404).json({ success: false, message: "Subscriber not found" });
    }
    sub.active = !sub.active;
    sub.updatedAt = new Date().toISOString();
    return res.json({ success: true, message: `Subscriber marked as ${sub.active ? "Active" : "Inactive"}`, subscriber: sub });
  } catch (err) {
    console.error("Toggle subscriber status error:", err);
    return res.status(500).json({ success: false, message: "Failed to update status." });
  }
});

export default router;
