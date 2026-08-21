import Doctor from "../models/Doctor.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const parseTimeToMinutes = (t = "") => {
  const [time = "0:00", ampm = ""] = (t || "").split(" ");
  const [hh = 0, mm = 0] = time.split(":").map(Number);
  let h = hh % 12;
  if ((ampm || "").toUpperCase() === "PM") h += 12;
  return h * 60 + (mm || 0);
};

function dedupeAndSortSchedule(schedule = {}) {
  const out = {};
  Object.entries(schedule).forEach(([date, slots]) => {
    if (!Array.isArray(slots)) return;
    const uniq = Array.from(new Set(slots));
    uniq.sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));
    out[date] = uniq;
  });
  return out;
}

function parseScheduleInput(s) {
  if (!s) return {};
  if (typeof s === "string") {
    try {
      s = JSON.parse(s);
    } catch {
      return {};
    }
  }
  return dedupeAndSortSchedule(s || {});
}

function normalizeDocForClient(raw = {}) {
  const doc = raw.toObject ? raw.toObject() : { ...raw };

  if (doc.schedule && typeof doc.schedule.forEach === "function") {
    const obj = {};
    doc.schedule.forEach((val, key) => {
      obj[key] = Array.isArray(val) ? val : [];
    });
    doc.schedule = obj;
  } else if (!doc.schedule || typeof doc.schedule !== "object") {
    doc.schedule = {};
  }

  doc.availability = doc.availability === undefined ? "Available" : doc.availability;
  doc.patients = doc.patients ?? "";
  doc.rating = doc.rating ?? 0;
  doc.fee = doc.fee ?? doc.fees ?? 0;

  return doc;
}

// Fake Cloudinary helpers to support mock/fallback
const uploadToCloudinary = async (filePath, folder) => {
  // If actual cloudinary is set up we would use it. Otherwise, return a mock or local path.
  return {
    secure_url: `/uploads/${filePath.split(/[\\/]/).pop()}`,
    public_id: `mock_${Date.now()}`
  };
};

const deleteFromCloudinary = async (publicId) => {
  return true;
};

// Create a new doctor (from Admin panel)
export const createDoctor = async (req, res) => {
  try {
    const body = req.body || {};
    const emailLC = (body.email || "").toLowerCase().trim();

    if (!emailLC || !body.password || !body.name) {
      return res.status(400).json({ success: false, message: "Name, email, and password are required" });
    }

    const existing = await Doctor.findOne({ email: emailLC });
    if (existing) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }

    // Encrypt password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(body.password, salt);

    let imageUrl = body.imageUrl || null;
    let imagePublicId = body.imagePublicId || null;

    if (req.file?.path) {
      const uploaded = await uploadToCloudinary(req.file.path, "doctors");
      if (uploaded) {
        imageUrl = uploaded.secure_url;
        imagePublicId = uploaded.public_id;
      }
    }

    const schedule = parseScheduleInput(body.schedule);

    const doc = new Doctor({
      email: emailLC,
      password: hashedPassword,
      name: body.name,
      specialization: body.specialization || "",
      imageUrl,
      imagePublicId,
      availability: body.availability || "Available",
      experience: body.experience || "",
      qualifications: body.qualifications || "",
      location: body.location || "",
      about: body.about || "",
      fee: body.fee !== undefined ? Number(body.fee) : 0,
      schedule,
      success: body.success || "",
      patients: body.patients || "",
      rating: body.rating !== undefined ? Number(body.rating) : 0,
    });

    await doc.save();

    const normalized = normalizeDocForClient(doc);
    delete normalized.password;

    return res.status(201).json({ success: true, data: normalized });
  } catch (err) {
    console.error("createDoctor error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// List doctors
export const getDoctors = async (req, res) => {
  try {
    const { q = "", limit: limitRaw = 200, page: pageRaw = 1 } = req.query;
    const limit = Math.min(500, Math.max(1, parseInt(limitRaw, 10) || 200));
    const page = Math.max(1, parseInt(pageRaw, 10) || 1);
    const skip = (page - 1) * limit;

    const match = {};
    if (q && typeof q === "string" && q.trim()) {
      const re = new RegExp(q.trim(), "i");
      match.$or = [{ name: re }, { specialization: re }, { email: re }];
    }

    // Standard list find
    const docs = await Doctor.find(match).sort({ name: 1 }).skip(skip).limit(limit);
    const normalized = docs.map((d) => normalizeDocForClient(d));

    const total = await Doctor.countDocuments(match);
    return res.json({ success: true, data: normalized, doctors: normalized, meta: { page, limit, total } });
  } catch (err) {
    console.error("getDoctors:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get Doctor by ID
export const getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Doctor.findById(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }
    const normalized = normalizeDocForClient(doc);
    delete normalized.password;
    return res.json({ success: true, data: normalized });
  } catch (err) {
    console.error("getDoctorById error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update Doctor profile
export const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const existing = await Doctor.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: "Doctor not found" });

    if (req.file?.path) {
      const uploaded = await uploadToCloudinary(req.file.path, "doctors");
      if (uploaded) {
        const previousPublicId = existing.imagePublicId;
        existing.imageUrl = uploaded.secure_url || uploaded.url || existing.imageUrl;
        existing.imagePublicId = uploaded.public_id || uploaded.publicId || existing.imagePublicId;
        if (previousPublicId && previousPublicId !== existing.imagePublicId) {
          deleteFromCloudinary(previousPublicId).catch((e) => console.warn("deleteFromCloudinary warning:", e?.message || e));
        }
      }
    } else if (body.imageUrl) {
      existing.imageUrl = body.imageUrl;
    }

    if (body.schedule) existing.schedule = parseScheduleInput(body.schedule);

    const updatable = ["name", "specialization", "experience", "qualifications", "location", "about", "fee", "availability", "success", "patients", "rating"];
    updatable.forEach((k) => { if (body[k] !== undefined) existing[k] = body[k]; });

    if (body.email && body.email !== existing.email) {
      const other = await Doctor.findOne({ email: body.email.toLowerCase() });
      if (other && other._id.toString() !== id) return res.status(409).json({ success: false, message: "Email already in use" });
      existing.email = body.email.toLowerCase();
    }

    if (body.password) {
      const salt = await bcrypt.genSalt(10);
      existing.password = await bcrypt.hash(body.password, salt);
    }

    await existing.save();

    const out = normalizeDocForClient(existing);
    delete out.password;
    return res.json({ success: true, data: out });
  } catch (err) {
    console.error("updateDoctor error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Login doctor
export const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const emailLC = (email || "").toLowerCase().trim();

    if (!emailLC || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const doc = await Doctor.findOne({ email: emailLC });
    if (!doc) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const match = await bcrypt.compare(password, doc.password);
    if (!match) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    // Create JWT
    const token = jwt.sign(
      { id: doc._id, email: doc.email, role: "doctor" },
      process.env.JWT_SECRET || "medicare_secret_key",
      { expiresIn: "7d" }
    );

    const out = normalizeDocForClient(doc);
    delete out.password;

    return res.json({
      success: true,
      token,
      data: out,
      doctor: out
    });
  } catch (err) {
    console.error("loginDoctor error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
