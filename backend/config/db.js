import mongoose from "mongoose";
import Doctor from "../models/Doctor.js";
import Service from "../models/Service.js";
import { setMockDB, mockDoctors, mockServices } from "../utils/mockStore.js";

// Seed Initial Database Data
const seedInitialData = async () => {
  try {
    // Do not seed dummy doctors: Doctors must register with verified email accounts
    const doctorCount = await Doctor.countDocuments();
    if (doctorCount === 0) {
      console.log("No registered doctors in database yet. Waiting for doctors to register with verified accounts.");
    }

    const serviceCount = await Service.countDocuments();
    if (serviceCount === 0) {
      console.log("Seeding default services...");
      await Service.create([
        {
          name: "Full Body Health Checkup",
          about: "Complete body diagnostic service",
          shortDescription: "Blood test + X-Ray + Doctor consultation",
          price: 999,
          available: true,
          instructions: ["Come empty stomach", "Carry previous reports"],
          slots: {
            "2026-08-20": ["10:00 AM", "10:30 AM", "11:00 AM"],
            "2026-08-21": ["02:00 PM", "02:30 PM"],
          },
        },
        {
          name: "Blood Test & Sugar Screening",
          about: "Routine blood test checking HbA1c and glucose levels.",
          shortDescription: "Glucose analysis + reports in 12 hours",
          price: 299,
          available: true,
          instructions: ["Fast for 8 hours before test"],
          slots: {
            "2026-08-20": ["08:00 AM", "09:00 AM", "10:00 AM"],
            "2026-08-21": ["08:00 AM", "09:00 AM"],
          },
        },
      ]);
    }
  } catch (err) {
    console.warn("Seeding failed:", err.message);
  }
};

export const connectDB = async () => {
  const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127017-mock/medicare";
  console.log("Connecting to Database...");

  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 2000 });
    console.log("Successfully connected to MongoDB.");
    setMockDB(false);
    await seedInitialData();
  } catch (err) {
    console.warn("MongoDB connection failed (or not installed locally). Falling back to Mock Database configuration.");
    setMockDB(true);

    if (mockDoctors.length === 0) {
      mockDoctors.push(
        {
          _id: "mock_d1",
          name: "Dr. Rahul Sharma",
          email: "dr1@gmail.com",
          specialization: "Cardiologist",
          experience: "10 years",
          qualifications: "MBBS, MD (Cardiology)",
          location: "Delhi",
          about: "Experienced heart specialist",
          fee: 500,
          availability: "Available",
          schedule: {
            "2026-08-20": ["10:00 AM", "10:30 AM", "11:00 AM"],
            "2026-08-21": ["02:00 PM", "02:30 PM"],
          },
          success: "98%",
          patients: "5000+",
          rating: 4.7,
        },
        {
          _id: "mock_d2",
          name: "Dr. Priya Patel",
          email: "dr2@gmail.com",
          specialization: "Dermatologist",
          experience: "8 years",
          qualifications: "MBBS, MD (Dermatology)",
          location: "Mumbai",
          about: "Skin care and cosmetology expert",
          fee: 600,
          availability: "Available",
          schedule: {
            "2026-08-20": ["11:00 AM", "11:30 AM"],
            "2026-08-22": ["03:00 PM", "03:30 PM", "04:00 PM"],
          },
          success: "95%",
          patients: "3000+",
          rating: 4.5,
        }
      );
    }

    if (mockServices.length === 0) {
      mockServices.push(
        {
          _id: "mock_s1",
          name: "Full Body Health Checkup",
          about: "Complete body diagnostic service",
          shortDescription: "Blood test + X-Ray + Doctor consultation",
          price: 999,
          available: true,
          instructions: ["Come empty stomach", "Carry previous reports"],
          slots: {
            "2026-08-20": ["10:00 AM", "10:30 AM", "11:00 AM"],
            "2026-08-21": ["02:00 PM", "02:30 PM"],
          },
        },
        {
          _id: "mock_s2",
          name: "Blood Test & Sugar Screening",
          about: "Routine blood test checking HbA1c and glucose levels.",
          shortDescription: "Glucose analysis + reports in 12 hours",
          price: 299,
          available: true,
          instructions: ["Fast for 8 hours before test"],
          slots: {
            "2026-08-20": ["08:00 AM", "09:00 AM", "10:00 AM"],
            "2026-08-21": ["08:00 AM", "09:00 AM"],
          },
        }
      );
    }
  }
};
