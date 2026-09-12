import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import {
  createDoctor,
  getDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
  loginDoctor,
  clerkDoctorAuth,
  clerkDoctorLink,
  clerkDoctorRegister,
} from "./controllers/doctorController.js";
import multer from "multer";
import path from "path";
import fs from "fs";

import {
  createAppointment,
  getAppointments,
  confirmPayment,
  updateAppointment,
  cancelAppointment,
  getStats,
  getAppointmentsByDoctor,
} from "./controllers/appointmentController.js";

import {
  createService,
  getServices,
  getServiceById,
  updateService,
  deleteService,
} from "./controllers/serviceController.js";

import {
  createServiceAppointment,
  getServiceAppointments,
  updateServiceAppointment,
  cancelServiceAppointment,
  getStatsSummary,
} from "./controllers/serviceAppointmentController.js";

import {
  registerPatient,
  verifyPatientOTP,
  resendPatientOTP,
  loginPatient,
  getPatientCount,
} from "./controllers/patientController.js";

import {
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "./controllers/paymentController.js";

// Load models for seeding
import Doctor from "./models/Doctor.js";
import Service from "./models/Service.js";
import Subscriber from "./models/Subscriber.js";
import { sendNewsletterWelcomeEmail } from "./utils/emailService.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127017-mock/medicare"; // We can detect mock uri
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads directory exists
fs.mkdirSync("uploads", { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Serve local uploads folder
app.use("/uploads", express.static("uploads"));

// In-Memory/File mock database fallback state
let isMockDB = false;
const mockDoctors = [];
const mockServices = [];
const mockAppointments = [];
const mockServiceAppointments = [];

// Seed Initial Data Helper
const seedInitialData = async () => {
  try {
    const doctorCount = await Doctor.countDocuments();
    if (doctorCount === 0) {
      console.log("Seeding default doctors...");
      const bcrypt = await import("bcryptjs");
      const salt = await bcrypt.default.genSalt(10);
      const hashedPassword = await bcrypt.default.hash("123456", salt);
      
      await Doctor.create([
        {
          name: "Dr. Rahul Sharma",
          email: "dr1@gmail.com",
          password: hashedPassword,
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
          name: "Dr. Priya Patel",
          email: "dr2@gmail.com",
          password: hashedPassword,
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
      ]);
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
          }
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
          }
        }
      ]);
    }
  } catch (err) {
    console.warn("Seeding failed:", err.message);
  }
};

// Route Switcher Middleware (Handles Mock Fallback if MongoDB is not running)
const useDBRoute = (mongoHandler, mockHandler) => {
  return (req, res) => {
    if (isMockDB && mockHandler) {
      return mockHandler(req, res);
    }
    return mongoHandler(req, res);
  };
};

// Doctor Mock Routes
const mockGetDoctors = (req, res) => {
  const { q = "" } = req.query;
  const filtered = mockDoctors.filter(d => 
    d.name.toLowerCase().includes(q.toLowerCase()) || 
    d.specialization.toLowerCase().includes(q.toLowerCase())
  );
  return res.json({ success: true, data: filtered, doctors: filtered });
};

const mockGetDoctorById = (req, res) => {
  const doc = mockDoctors.find(d => String(d._id) === req.params.id);
  if (!doc) return res.status(404).json({ success: false, message: "Doctor not found" });
  return res.json({ success: true, data: doc });
};

const mockLoginDoctor = (req, res) => {
  const { email, password } = req.body || {};
  const doc = mockDoctors.find(d => d.email.toLowerCase() === email.toLowerCase());
  if (!doc || password !== "123456") {
    return res.status(401).json({ success: false, message: "Invalid credentials (use pass: 123456)" });
  }
  return res.json({ success: true, token: "mock_token_jwt", data: doc, doctor: doc });
};

const mockCreateDoctor = (req, res) => {
  const body = req.body || {};
  const doc = {
    _id: `mock_doc_${Date.now()}`,
    ...body,
    fee: Number(body.fee || 0),
    rating: Number(body.rating || 0),
    availability: body.availability || "Available",
    schedule: typeof body.schedule === "string" ? JSON.parse(body.schedule) : (body.schedule || {})
  };
  mockDoctors.push(doc);
  return res.status(201).json({ success: true, data: doc });
};

const mockUpdateDoctor = (req, res) => {
  const idx = mockDoctors.findIndex(d => String(d._id) === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: "Doctor not found" });
  
  const body = req.body || {};
  mockDoctors[idx] = { ...mockDoctors[idx], ...body };
  return res.json({ success: true, data: mockDoctors[idx] });
};

const mockDeleteDoctor = (req, res) => {
  const idx = mockDoctors.findIndex(d => String(d._id) === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: "Doctor not found" });
  mockDoctors.splice(idx, 1);
  return res.json({ success: true, message: "Doctor deleted successfully" });
};

const mockClerkDoctorAuth = (req, res) => {
  const { email, clerkId } = req.body || {};
  const doc = mockDoctors.find(d => (email && d.email.toLowerCase() === email.toLowerCase()) || (clerkId && d.clerkId === clerkId));
  if (!doc) return res.status(404).json({ success: false, notRegistered: true, message: "No doctor profile found for this Clerk account" });
  if (clerkId) doc.clerkId = clerkId;
  return res.json({ success: true, token: "mock_token_jwt", data: doc, doctor: doc });
};

const mockClerkDoctorLink = (req, res) => {
  const { email, password, clerkId } = req.body || {};
  const doc = mockDoctors.find(d => d.email.toLowerCase() === (email || "").toLowerCase());
  if (!doc) return res.status(404).json({ success: false, message: "Doctor not found" });
  if (password !== "123456") return res.status(401).json({ success: false, message: "Invalid password" });
  doc.clerkId = clerkId;
  return res.json({ success: true, token: "mock_token_jwt", data: doc, doctor: doc });
};

const mockClerkDoctorRegister = (req, res) => {
  const body = req.body || {};
  const doc = {
    _id: `mock_doc_${Date.now()}`,
    ...body,
    fee: Number(body.fee || 500),
    rating: 5,
    availability: "Available",
    schedule: {}
  };
  mockDoctors.push(doc);
  return res.status(201).json({ success: true, token: "mock_token_jwt", data: doc, doctor: doc });
};

// Appointment Mock Routes
const mockCreateAppointment = (req, res) => {
  const body = req.body || {};
  const appt = {
    _id: `mock_appt_${Date.now()}`,
    ...body,
    fees: Number(body.fees || body.fee || 0),
    status: "Confirmed",
    payment: { method: body.paymentMethod || "Cash", status: "Paid", amount: Number(body.fees || body.fee || 0) },
    createdAt: new Date()
  };
  mockAppointments.push(appt);
  return res.status(201).json({ success: true, appointment: appt, checkoutUrl: `${FRONTEND_URL}/appointments` });
};

const mockGetAppointments = (req, res) => {
  const { createdBy, doctorId } = req.query;
  let list = mockAppointments;
  if (createdBy) list = list.filter(a => a.createdBy === createdBy);
  if (doctorId) list = list.filter(a => String(a.doctorId) === String(doctorId));
  return res.json({ success: true, data: list, appointments: list });
};

const mockCancelAppointment = (req, res) => {
  const appt = mockAppointments.find(a => String(a._id) === req.params.id);
  if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });
  appt.status = "Canceled";
  appt.payment.status = "Failed";
  return res.json({ success: true, appointment: appt });
};

const mockUpdateAppointment = (req, res) => {
  const appt = mockAppointments.find(a => String(a._id) === req.params.id);
  if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });
  const body = req.body || {};
  if (body.status) appt.status = body.status;
  if (body.date && body.time) {
    appt.date = body.date;
    appt.time = body.time;
    appt.status = "Rescheduled";
    appt.rescheduledTo = { date: body.date, time: body.time };
  }
  return res.json({ success: true, appointment: appt });
};

// Service Mock Routes
const mockGetServices = (req, res) => {
  return res.json({ success: true, data: mockServices, services: mockServices });
};

const mockGetServiceById = (req, res) => {
  const svc = mockServices.find(s => String(s._id) === req.params.id);
  if (!svc) return res.status(404).json({ success: false, message: "Service not found" });
  return res.json({ success: true, data: svc });
};

const mockCreateService = (req, res) => {
  const body = req.body || {};
  const svc = {
    _id: `mock_svc_${Date.now()}`,
    ...body,
    price: Number(body.price || 0),
    slots: typeof body.slots === "string" ? JSON.parse(body.slots) : (body.slots || {})
  };
  mockServices.push(svc);
  return res.status(201).json({ success: true, data: svc, service: svc });
};

const mockUpdateService = (req, res) => {
  const idx = mockServices.findIndex(s => String(s._id) === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: "Service not found" });
  mockServices[idx] = { ...mockServices[idx], ...req.body };
  return res.json({ success: true, data: mockServices[idx], service: mockServices[idx] });
};

const mockDeleteService = (req, res) => {
  const idx = mockServices.findIndex(s => String(s._id) === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: "Service not found" });
  mockServices.splice(idx, 1);
  return res.json({ success: true, message: "Service deleted" });
};

// Service Appointments Mock Routes
const mockCreateServiceAppointment = (req, res) => {
  const body = req.body || {};
  const appt = {
    _id: `mock_svca_${Date.now()}`,
    ...body,
    fees: Number(body.fees || 0),
    status: "Confirmed",
    payment: { method: body.paymentMethod || "Cash", status: "Paid", amount: Number(body.fees || 0) },
    createdAt: new Date()
  };
  mockServiceAppointments.push(appt);
  return res.status(201).json({ success: true, appointment: appt });
};

const mockGetServiceAppointments = (req, res) => {
  const { createdBy } = req.query;
  let list = mockServiceAppointments;
  if (createdBy) list = list.filter(a => a.createdBy === createdBy);
  return res.json({ success: true, appointments: list, data: list });
};

const mockCancelServiceAppointment = (req, res) => {
  const appt = mockServiceAppointments.find(a => String(a._id) === req.params.id);
  if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });
  appt.status = "Canceled";
  return res.json({ success: true, appointment: appt });
};

const mockUpdateServiceAppointment = (req, res) => {
  const appt = mockServiceAppointments.find(a => String(a._id) === req.params.id);
  if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });
  const body = req.body || {};
  if (body.status) appt.status = body.status;
  if (body.date && body.hour !== undefined && body.minute !== undefined && body.ampm) {
    appt.date = body.date;
    appt.hour = body.hour;
    appt.minute = body.minute;
    appt.ampm = body.ampm;
    appt.status = "Rescheduled";
    appt.rescheduledTo = { date: body.date, hour: body.hour, minute: body.minute, ampm: body.ampm };
  }
  return res.json({ success: true, appointment: appt });
};

const mockGetStatsSummary = (req, res) => {
  return res.json({
    success: true,
    stats: {
      totalAppointments: mockServiceAppointments.length,
      completed: mockServiceAppointments.filter(a => a.status === "Completed").length,
      canceled: mockServiceAppointments.filter(a => a.status === "Canceled").length,
      revenue: mockServiceAppointments.reduce((sum, a) => sum + (a.fees || 0), 0)
    }
  });
};

const mockGetStats = (req, res) => {
  return res.json({
    success: true,
    stats: {
      totalAppointments: mockAppointments.length,
      completed: mockAppointments.filter(a => a.status === "Completed").length,
      canceled: mockAppointments.filter(a => a.status === "Canceled").length,
      revenue: mockAppointments.reduce((sum, a) => sum + (a.fees || 0), 0)
    }
  });
};

const mockGetAppointmentsByDoctor = (req, res) => {
  const list = mockAppointments.filter(a => String(a.doctorId) === req.params.id);
  return res.json({ success: true, data: list, appointments: list });
};

const mockCreateRazorpayOrder = (req, res) => {
  const { appointmentId, amount = 500, type = "doctor" } = req.body || {};
  return res.json({
    success: true,
    order: {
      id: `order_sb_${Date.now()}`,
      amount: Math.round(Number(amount) * 100),
      currency: "INR",
      status: "created",
      sandbox: true,
    },
    keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_medicare_key",
    appointment: { id: appointmentId, fee: amount, type },
  });
};

const mockVerifyRazorpayPayment = (req, res) => {
  const { appointmentId, razorpay_payment_id = "pay_mock_123" } = req.body || {};
  const appt =
    mockAppointments.find((a) => String(a._id) === appointmentId) ||
    mockServiceAppointments.find((a) => String(a._id) === appointmentId);
  if (appt) {
    appt.status = "Confirmed";
    appt.payment = { status: "Paid", method: "Online", providerId: razorpay_payment_id };
    appt.paidAt = new Date();
  }
  return res.json({ success: true, message: "Payment verified successfully", appointment: appt });
};


// Patient Mock Routes
const mockPatients = [];
const mockRegisterPatient = (req, res) => {
  const { name, email } = req.body || {};
  const normalizedEmail = (email || "").toLowerCase().trim();
  mockPatients.push({ id: `mock_p_${Date.now()}`, name, email: normalizedEmail, isVerified: true });
  return res.status(200).json({ success: true, requiresOTP: false, message: "Registration successful" });
};
const mockVerifyPatientOTP = (req, res) => {
  const { email } = req.body || {};
  const normalizedEmail = (email || "").toLowerCase().trim();
  let p = mockPatients.find(x => x.email === normalizedEmail);
  if (!p) {
    p = { id: `mock_p_${Date.now()}`, name: normalizedEmail.split("@")[0] || "Patient", email: normalizedEmail, isVerified: true };
    mockPatients.push(p);
  }
  return res.status(200).json({ success: true, message: "Verified", token: "mock_patient_token", patient: p });
};
const mockLoginPatient = (req, res) => {
  const { email } = req.body || {};
  const normalizedEmail = (email || "").toLowerCase().trim();
  let p = mockPatients.find(x => x.email === normalizedEmail);
  if (!p) {
    p = { id: `mock_p_${Date.now()}`, name: normalizedEmail.split("@")[0] || "Patient", email: normalizedEmail, isVerified: true };
    mockPatients.push(p);
  }
  return res.json({ success: true, token: "mock_patient_token", patient: p });
};
const mockGetPatientCount = (req, res) => {
  return res.json({ success: true, count: mockPatients.length || 10 });
};

// API Route Endpoints mapping standard handlers with fallback routes
app.get("/api/doctors", useDBRoute(getDoctors, mockGetDoctors));
app.get("/api/doctors/:id", useDBRoute(getDoctorById, mockGetDoctorById));
app.post("/api/doctors", upload.single("image"), useDBRoute(createDoctor, mockCreateDoctor));
app.post("/api/doctors/login", useDBRoute(loginDoctor, mockLoginDoctor));
app.post("/api/doctors/clerk-auth", useDBRoute(clerkDoctorAuth, mockClerkDoctorAuth));
app.post("/api/doctors/clerk-link", useDBRoute(clerkDoctorLink, mockClerkDoctorLink));
app.post("/api/doctors/clerk-register", useDBRoute(clerkDoctorRegister, mockClerkDoctorRegister));
app.put("/api/doctors/:id", upload.single("image"), useDBRoute(updateDoctor, mockUpdateDoctor));
app.delete("/api/doctors/:id", useDBRoute(deleteDoctor, mockDeleteDoctor));

app.post("/api/appointments", useDBRoute(createAppointment, mockCreateAppointment));
app.get("/api/appointments", useDBRoute(getAppointments, mockGetAppointments));
app.get("/api/appointments/me", useDBRoute(getAppointments, mockGetAppointments));
app.get("/api/appointments/confirm", useDBRoute(confirmPayment, confirmPayment));
app.get("/api/appointments/stats", useDBRoute(getStats, mockGetStats));
app.get("/api/appointments/doctor/:id", useDBRoute(getAppointmentsByDoctor, mockGetAppointmentsByDoctor));
app.put("/api/appointments/:id", useDBRoute(updateAppointment, mockUpdateAppointment));
app.patch("/api/appointments/:id", useDBRoute(updateAppointment, mockUpdateAppointment));
app.patch("/api/appointments/:id/cancel", useDBRoute(cancelAppointment, mockCancelAppointment));

// Razorpay Online Payment Endpoints
app.post("/api/payment/razorpay/create-order", useDBRoute(createRazorpayOrder, mockCreateRazorpayOrder));
app.post("/api/payment/razorpay/verify", useDBRoute(verifyRazorpayPayment, mockVerifyRazorpayPayment));

// Newsletter Subscription Endpoint
app.post("/api/newsletter/subscribe", async (req, res) => {
  try {
    const { email } = req.body || {};
    const emailLC = (email || "").toLowerCase().trim();

    if (!emailLC || !/^\S+@\S+\.\S+$/.test(emailLC)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address" });
    }

    if (mongoose.connection?.readyState === 1) {
      try {
        await Subscriber.findOneAndUpdate(
          { email: emailLC },
          { email: emailLC, active: true },
          { upsert: true, new: true }
        );
      } catch (dbErr) {
        console.warn("Subscriber save notice:", dbErr.message);
      }
    }

    sendNewsletterWelcomeEmail(emailLC).catch((err) =>
      console.warn("Newsletter welcome email notice:", err.message)
    );

    return res.json({
      success: true,
      message: "Thank you for subscribing to MediCare Health Tips!",
    });
  } catch (err) {
    console.error("Newsletter error:", err);
    return res.status(500).json({ success: false, message: "Server error subscribing email" });
  }
});

app.get("/api/services", useDBRoute(getServices, mockGetServices));
app.get("/api/services/:id", useDBRoute(getServiceById, mockGetServiceById));
app.post("/api/services", upload.single("image"), useDBRoute(createService, mockCreateService));
app.put("/api/services/:id", upload.single("image"), useDBRoute(updateService, mockUpdateService));
app.delete("/api/services/:id", useDBRoute(deleteService, mockDeleteService));

app.post("/api/service-appointments", useDBRoute(createServiceAppointment, mockCreateServiceAppointment));
app.get("/api/service-appointments", useDBRoute(getServiceAppointments, mockGetServiceAppointments));
app.get("/api/service-appointments/me", useDBRoute(getServiceAppointments, mockGetServiceAppointments));
app.get("/api/service-appointments/stats/summary", useDBRoute(getStatsSummary, mockGetStatsSummary));
app.put("/api/service-appointments/:id", useDBRoute(updateServiceAppointment, mockUpdateServiceAppointment));
app.patch("/api/service-appointments/:id", useDBRoute(updateServiceAppointment, mockUpdateServiceAppointment));
app.patch("/api/service-appointments/:id/cancel", useDBRoute(cancelServiceAppointment, mockCancelServiceAppointment));

// Patient Authentication Routes
app.post("/api/patients/register", useDBRoute(registerPatient, mockRegisterPatient));
app.post("/api/patients/verify-otp", useDBRoute(verifyPatientOTP, mockVerifyPatientOTP));
app.post("/api/patients/resend-otp", useDBRoute(resendPatientOTP, mockRegisterPatient));
app.post("/api/patients/login", useDBRoute(loginPatient, mockLoginPatient));
app.get("/api/patients/count", useDBRoute(getPatientCount, mockGetPatientCount));


// Server connection setup
console.log("Connecting to Database...");
mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 2000 })
  .then(() => {
    console.log("Successfully connected to MongoDB.");
    seedInitialData();
  })
  .catch((err) => {
    console.warn("MongoDB connection failed (or not installed locally). Falling back to Mock Database configuration.");
    isMockDB = true;
    
    // Seed standard mock database lists
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
        }
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
        }
      }
    );
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Backend server is running on port ${PORT}.`);
    });
  });
