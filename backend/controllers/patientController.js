import Patient from "../models/Patient.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecuremedicarejwtsecretkey123!";

export const registerPatient = async (req, res) => {
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: "Please fill all fields" });
  }

  try {
    const existing = await Patient.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newPatient = await Patient.create({
      name,
      email,
      password: hashedPassword,
    });

    const token = jwt.sign({ id: newPatient._id }, JWT_SECRET, { expiresIn: "7d" });

    return res.status(201).json({
      success: true,
      message: "Patient registered successfully",
      token,
      patient: {
        id: newPatient._id,
        name: newPatient.name,
        email: newPatient.email,
      }
    });
  } catch (err) {
    console.error("registerPatient error:", err);
    return res.status(500).json({ success: false, message: "Server error during registration" });
  }
};

export const loginPatient = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Please enter email and password" });
  }

  try {
    const patient = await Patient.findOne({ email });
    if (!patient) {
      return res.status(400).json({ success: false, message: "Invalid email or password" });
    }

    const match = await bcrypt.compare(password, patient.password);
    if (!match) {
      return res.status(400).json({ success: false, message: "Invalid email or password" });
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
      }
    });
  } catch (err) {
    console.error("loginPatient error:", err);
    return res.status(500).json({ success: false, message: "Server error during login" });
  }
};

export const getPatientCount = async (req, res) => {
  try {
    const count = await Patient.countDocuments();
    return res.json({ success: true, count });
  } catch (err) {
    console.error("getPatientCount error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch patient count" });
  }
};
