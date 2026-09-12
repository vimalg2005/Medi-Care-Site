import Patient from "../models/Patient.js";
import Appointment from "../models/Appointment.js";
import ServiceAppointment from "../models/serviceAppointment.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendOTPEmail } from "../utils/emailService.js";

const JWT_SECRET = process.env.JWT_SECRET || "supersecuremedicarejwtsecretkey123!";

/**
 * Helper to generate a 6-digit numeric OTP string
 */
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Register a new patient account & dispatch OTP
 */
export const registerPatient = async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: "Please fill in all fields (name, email, password)" });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const existing = await Patient.findOne({ email: normalizedEmail });

    // If account already exists and is verified, prompt to login
    if (existing && existing.isVerified) {
      return res.status(400).json({
        success: false,
        message: "This email is already registered and verified. Please sign in.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    let patientRecord;

    if (existing && !existing.isVerified) {
      // Re-registration for unverified account: update credentials and send fresh OTP
      existing.name = name.trim();
      existing.password = hashedPassword;
      existing.otp = otp;
      existing.otpExpiresAt = otpExpiresAt;
      patientRecord = await existing.save();
    } else {
      // New patient registration
      patientRecord = await Patient.create({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        isVerified: false,
        otp,
        otpExpiresAt,
      });
    }

    // Send the OTP via email
    await sendOTPEmail(normalizedEmail, otp, name);

    return res.status(200).json({
      success: true,
      requiresOTP: true,
      email: normalizedEmail,
      message: `A 6-digit verification code was sent to ${normalizedEmail}.`,
    });
  } catch (err) {
    console.error("registerPatient error:", err);
    return res.status(500).json({ success: false, message: "Server error during registration." });
  }
};

/**
 * Verify submitted OTP and activate patient account
 */
export const verifyPatientOTP = async (req, res) => {
  const { email, otp } = req.body || {};

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: "Email and 6-digit OTP code are required." });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const cleanedOTP = String(otp).trim();

  try {
    const patient = await Patient.findOne({ email: normalizedEmail });

    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient account not found." });
    }

    // Check expiration
    if (!patient.otpExpiresAt || new Date() > new Date(patient.otpExpiresAt)) {
      return res.status(400).json({
        success: false,
        message: "The verification code has expired. Please click 'Resend Code'.",
      });
    }

    // Check code match
    if (patient.otp !== cleanedOTP) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code. Please check and try again.",
      });
    }

    // Mark verified and clear OTP
    patient.isVerified = true;
    patient.otp = null;
    patient.otpExpiresAt = null;
    await patient.save();

    // Generate authenticated JWT session
    const token = jwt.sign({ id: patient._id }, JWT_SECRET, { expiresIn: "7d" });

    return res.status(200).json({
      success: true,
      message: "Email successfully verified! Welcome to MediCare.",
      token,
      patient: {
        id: patient._id,
        name: patient.name,
        email: patient.email,
        isVerified: true,
      },
    });
  } catch (err) {
    console.error("verifyPatientOTP error:", err);
    return res.status(500).json({ success: false, message: "Server error during OTP verification." });
  }
};

/**
 * Resend a new OTP to patient's email
 */
export const resendPatientOTP = async (req, res) => {
  const { email } = req.body || {};

  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required to resend verification code." });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const patient = await Patient.findOne({ email: normalizedEmail });

    if (!patient) {
      return res.status(404).json({ success: false, message: "No account found with this email." });
    }

    if (patient.isVerified) {
      return res.status(400).json({ success: false, message: "Account is already verified. Please sign in." });
    }

    const otp = generateOTP();
    patient.otp = otp;
    patient.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await patient.save();

    await sendOTPEmail(normalizedEmail, otp, patient.name);

    return res.status(200).json({
      success: true,
      message: `A new 6-digit verification code has been sent to ${normalizedEmail}.`,
    });
  } catch (err) {
    console.error("resendPatientOTP error:", err);
    return res.status(500).json({ success: false, message: "Server error while resending OTP." });
  }
};

/**
 * Patient Login with Verification Guard
 */
export const loginPatient = async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Please enter email and password." });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const patient = await Patient.findOne({ email: normalizedEmail });
    if (!patient) {
      return res.status(400).json({ success: false, message: "Invalid email or password." });
    }

    const match = await bcrypt.compare(password, patient.password);
    if (!match) {
      return res.status(400).json({ success: false, message: "Invalid email or password." });
    }

    // If account is not verified, send new OTP and prompt verification
    if (!patient.isVerified) {
      const otp = generateOTP();
      patient.otp = otp;
      patient.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await patient.save();

      await sendOTPEmail(normalizedEmail, otp, patient.name);

      return res.status(403).json({
        success: false,
        requiresVerification: true,
        email: normalizedEmail,
        message: "Your account is not verified yet. We just emailed you a fresh verification code.",
      });
    }

    const token = jwt.sign({ id: patient._id }, JWT_SECRET, { expiresIn: "7d" });

    return res.json({
      success: true,
      message: "Login successful",
      token,
      patient: {
        id: patient._id,
        name: patient.name,
        email: patient.email,
        isVerified: true,
      },
    });
  } catch (err) {
    console.error("loginPatient error:", err);
    return res.status(500).json({ success: false, message: "Server error during login." });
  }
};

/**
 * Get total patient count for metrics
 */
export const getPatientCount = async (req, res) => {
  try {
    const patientUsers = await Patient.countDocuments();
    const apptMobiles = await Appointment.distinct("mobile");
    const svcMobiles = await ServiceAppointment.distinct("mobile");
    const apptUsers = await Appointment.distinct("createdBy");
    
    const uniqueIdentifiers = new Set([
      ...apptMobiles.filter(m => m && m !== ""),
      ...svcMobiles.filter(m => m && m !== ""),
      ...apptUsers.filter(u => u && u !== "anonymous"),
    ]);

    const count = Math.max(patientUsers, uniqueIdentifiers.size);
    return res.json({ success: true, count });
  } catch (err) {
    console.error("getPatientCount error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch patient count." });
  }
};
