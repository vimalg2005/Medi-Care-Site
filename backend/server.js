import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import { connectDB } from "./config/db.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";

// Import modular routes
import doctorRoutes from "./routes/doctorRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import serviceAppointmentRoutes from "./routes/serviceAppointmentRoutes.js";
import patientRoutes from "./routes/patientRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import newsletterRoutes from "./routes/newsletterRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Security & Parsing Middleware
app.disable("x-powered-by");
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve local uploads folder
app.use("/uploads", express.static("uploads"));

// Mount API Route Endpoints
app.use("/api/admin", adminRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/service-appointments", serviceAppointmentRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/newsletter", newsletterRoutes);

// Root index endpoint
app.get("/", (req, res) => {
  res.json({
    message: "MediCare Backend API is running",
    status: "OK",
    healthCheck: "/api/health",
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  });
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Centralized Error Handling
app.use(notFound);
app.use(errorHandler);

// Connect to Database & Start Server
connectDB().finally(() => {
  const server = app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}.`);
  });

  // Handle port conflict gracefully
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `\n[PORT CONFLICT] Port ${PORT} is already in use by another process.\n` +
        `To free port ${PORT} on Windows, run:\n` +
        `  Get-NetTCPConnection -LocalPort ${PORT} | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }\n`
      );
    } else {
      console.error("Server startup error:", err);
    }
  });

  // Graceful shutdown on process termination
  const shutdown = async (signal) => {
    console.log(`\nReceived ${signal}. Gracefully shutting down...`);
    server.close(() => {
      console.log("HTTP server closed.");
      if (mongoose.connection?.readyState === 1) {
        mongoose.connection.close(false).then(() => {
          console.log("MongoDB connection closed.");
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
});
