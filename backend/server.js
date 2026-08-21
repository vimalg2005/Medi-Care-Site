import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import {
  createDoctor,
  getDoctors,
  getDoctorById,
  updateDoctor,
  loginDoctor,
} from "./controllers/doctorController.js";

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
  loginPatient,
  getPatientCount,
} from "./controllers/patientController.js";

// Load models for seeding
import Doctor from "./models/Doctor.js";
import Service from "./models/Service.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127017-mock/medicare"; // We can detect mock uri
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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


// API Route Endpoints mapping standard handlers with fallback routes
app.get("/api/doctors", useDBRoute(getDoctors, mockGetDoctors));
app.get("/api/doctors/:id", useDBRoute(getDoctorById, mockGetDoctorById));
app.post("/api/doctors", useDBRoute(createDoctor, mockCreateDoctor));
app.post("/api/doctors/login", useDBRoute(loginDoctor, mockLoginDoctor));
app.put("/api/doctors/:id", useDBRoute(updateDoctor, mockUpdateDoctor));

app.post("/api/appointments", useDBRoute(createAppointment, mockCreateAppointment));
app.get("/api/appointments", useDBRoute(getAppointments, mockGetAppointments));
app.get("/api/appointments/me", useDBRoute(getAppointments, mockGetAppointments));
app.get("/api/appointments/confirm", useDBRoute(confirmPayment, confirmPayment));
app.get("/api/appointments/stats", useDBRoute(getStats, mockGetStats));
app.get("/api/appointments/doctor/:id", useDBRoute(getAppointmentsByDoctor, mockGetAppointmentsByDoctor));
app.put("/api/appointments/:id", useDBRoute(updateAppointment, mockUpdateAppointment));
app.patch("/api/appointments/:id", useDBRoute(updateAppointment, mockUpdateAppointment));
app.patch("/api/appointments/:id/cancel", useDBRoute(cancelAppointment, mockCancelAppointment));

app.get("/api/services", useDBRoute(getServices, mockGetServices));
app.get("/api/services/:id", useDBRoute(getServiceById, mockGetServiceById));
app.post("/api/services", useDBRoute(createService, mockCreateService));
app.put("/api/services/:id", useDBRoute(updateService, mockUpdateService));
app.delete("/api/services/:id", useDBRoute(deleteService, mockDeleteService));

app.post("/api/service-appointments", useDBRoute(createServiceAppointment, mockCreateServiceAppointment));
app.get("/api/service-appointments", useDBRoute(getServiceAppointments, mockGetServiceAppointments));
app.get("/api/service-appointments/me", useDBRoute(getServiceAppointments, mockGetServiceAppointments));
app.get("/api/service-appointments/stats/summary", useDBRoute(getStatsSummary, mockGetStatsSummary));
app.put("/api/service-appointments/:id", useDBRoute(updateServiceAppointment, mockUpdateServiceAppointment));
app.patch("/api/service-appointments/:id", useDBRoute(updateServiceAppointment, mockUpdateServiceAppointment));
app.patch("/api/service-appointments/:id/cancel", useDBRoute(cancelServiceAppointment, mockCancelServiceAppointment));

// Patient Authentication Routes
app.post("/api/patients/register", registerPatient);
app.post("/api/patients/login", loginPatient);
app.get("/api/patients/count", getPatientCount);


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
