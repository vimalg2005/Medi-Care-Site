import Doctor from "../models/Doctor.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const parseTimeToMinutes = (t = "") => {
  const [time = "0:00", ampm = ""] = String(t || "").trim().split(" ");
  const parts = (time || "").split(":");
  const hh = parseInt(parts[0], 10) || 0;
  const mm = parseInt(parts[1], 10) || 0;
  let h = hh % 12;
  if ((ampm || "").toUpperCase() === "PM") h += 12;
  return h * 60 + mm;
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
  doc.approvalStatus = doc.approvalStatus || "Approved";
  doc.isVerified = Boolean(doc.isVerified);
  doc.emailVerified = Boolean(doc.emailVerified || (doc.clerkId && doc.isVerified));
  doc.isRegisteredAccount = Boolean(doc.isRegisteredAccount || doc.clerkId);
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
    const { q = "", limit: limitRaw = 200, page: pageRaw = 1, all = "false" } = req.query;
    const limit = Math.min(500, Math.max(1, parseInt(limitRaw, 10) || 200));
    const page = Math.max(1, parseInt(pageRaw, 10) || 1);
    const skip = (page - 1) * limit;

    const match = {};
    if (q && typeof q === "string" && q.trim()) {
      const re = new RegExp(q.trim(), "i");
      match.$or = [{ name: re }, { specialization: re }, { email: re }];
    }

    // STRICT REQUIREMENT: Only doctors who have created their account with a verified email are shown on the patient portal
    if (all !== "true") {
      match.$and = [
        { clerkId: { $ne: null, $exists: true } },
        { $or: [{ emailVerified: true }, { isVerified: true }] },
        { approvalStatus: { $ne: "Rejected" } }
      ];
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

    let match = false;
    if (doc.password.startsWith("$2a$") || doc.password.startsWith("$2b$") || doc.password.startsWith("$2y$")) {
      match = await bcrypt.compare(password, doc.password);
    } else {
      match = doc.password === password;
      if (match) {
        try {
          const salt = await bcrypt.genSalt(10);
          doc.password = await bcrypt.hash(password, salt);
          await doc.save();
        } catch (e) {}
      }
    }

    if (!match) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    // Create JWT
    const token = jwt.sign(
      { id: doc._id, email: doc.email, role: "doctor", clerkId: doc.clerkId },
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

// Clerk-based Doctor Authentication & Verification
export const clerkDoctorAuth = async (req, res) => {
  try {
    const { email, clerkId, name, avatar } = req.body || {};
    const emailLC = (email || "").toLowerCase().trim();

    if (!clerkId && !emailLC) {
      return res.status(400).json({ success: false, message: "Clerk ID or email is required" });
    }

    // Look up by clerkId first, or by email
    let doc = null;
    if (clerkId) {
      doc = await Doctor.findOne({ clerkId });
    }
    if (!doc && emailLC) {
      doc = await Doctor.findOne({ email: emailLC });
    }

    if (!doc) {
      return res.status(404).json({
        success: false,
        notRegistered: true,
        message: `No doctor profile found for ${emailLC || "this Clerk account"}. Link an existing profile or register.`,
      });
    }

    let needsSave = false;
    if (clerkId && doc.clerkId !== clerkId) {
      doc.clerkId = clerkId;
      doc.emailVerified = true;
      doc.isRegisteredAccount = true;
      needsSave = true;
    }
    if (avatar && !doc.imageUrl) {
      doc.imageUrl = avatar;
      needsSave = true;
    }
    if (needsSave) {
      await doc.save();
    }

    const token = jwt.sign(
      { id: doc._id, email: doc.email, role: "doctor", clerkId: doc.clerkId },
      process.env.JWT_SECRET || "medicare_secret_key",
      { expiresIn: "7d" }
    );

    const out = normalizeDocForClient(doc);
    delete out.password;

    return res.json({
      success: true,
      token,
      data: out,
      doctor: out,
    });
  } catch (err) {
    console.error("clerkDoctorAuth error:", err);
    return res.status(500).json({ success: false, message: "Server error during Clerk doctor verification" });
  }
};

// Link an existing doctor profile with Clerk account
export const clerkDoctorLink = async (req, res) => {
  try {
    const { email, password, clerkId } = req.body || {};
    const emailLC = (email || "").toLowerCase().trim();

    if (!emailLC || !password || !clerkId) {
      return res.status(400).json({ success: false, message: "Email, password, and Clerk ID are required" });
    }

    const doc = await Doctor.findOne({ email: emailLC });
    if (!doc) {
      return res.status(404).json({ success: false, message: "Doctor profile not found with that email" });
    }

    let match = false;
    if (doc.password.startsWith("$2a$") || doc.password.startsWith("$2b$") || doc.password.startsWith("$2y$")) {
      match = await bcrypt.compare(password, doc.password);
    } else {
      match = doc.password === password;
    }

    if (!match) {
      return res.status(401).json({ success: false, message: "Incorrect doctor password" });
    }

    doc.clerkId = clerkId;
    doc.isVerified = true;
    doc.emailVerified = true;
    doc.isRegisteredAccount = true;
    doc.approvalStatus = "Approved";
    if (!doc.password.startsWith("$2")) {
      const salt = await bcrypt.genSalt(10);
      doc.password = await bcrypt.hash(password, salt);
    }
    await doc.save();

    const token = jwt.sign(
      { id: doc._id, email: doc.email, role: "doctor", clerkId: doc.clerkId },
      process.env.JWT_SECRET || "medicare_secret_key",
      { expiresIn: "7d" }
    );

    const out = normalizeDocForClient(doc);
    delete out.password;

    return res.json({
      success: true,
      message: "Doctor profile successfully linked to Clerk account",
      token,
      data: out,
      doctor: out,
    });
  } catch (err) {
    console.error("clerkDoctorLink error:", err);
    return res.status(500).json({ success: false, message: "Server error during profile linking" });
  }
};

// Register a new doctor profile via Clerk
export const clerkDoctorRegister = async (req, res) => {
  try {
    const body = req.body || {};
    const emailLC = (body.email || "").toLowerCase().trim();
    const clerkId = body.clerkId;

    if (!emailLC || !clerkId || !body.name) {
      return res.status(400).json({ success: false, message: "Name, email, and Clerk ID are required" });
    }

    const existing = await Doctor.findOne({ $or: [{ email: emailLC }, { clerkId }] });
    if (existing) {
      return res.status(409).json({ success: false, message: "Doctor profile already exists for this email or Clerk account" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(`clerk_managed_${clerkId}_${Date.now()}`, salt);

    const schedule = parseScheduleInput(body.schedule || {});

    const doc = new Doctor({
      email: emailLC,
      password: hashedPassword,
      name: body.name,
      clerkId,
      specialization: body.specialization || "General Physician",
      imageUrl: body.imageUrl || body.avatar || null,
      availability: body.availability || "Available",
      experience: body.experience || "1+ years",
      qualifications: body.qualifications || "MBBS",
      location: body.location || "Main Clinic",
      about: body.about || `Dr. ${body.name} is a dedicated healthcare specialist.`,
      fee: body.fee !== undefined ? Number(body.fee) : 500,
      schedule,
      success: "98%",
      patients: "100+",
      rating: 5.0,
      isVerified: true,
      emailVerified: true,
      isRegisteredAccount: true,
      approvalStatus: "Approved",
    });

    await doc.save();

    const token = jwt.sign(
      { id: doc._id, email: doc.email, role: "doctor", clerkId: doc.clerkId },
      process.env.JWT_SECRET || "medicare_secret_key",
      { expiresIn: "7d" }
    );

    const out = normalizeDocForClient(doc);
    delete out.password;

    return res.status(201).json({
      success: true,
      message: "Doctor profile created and verified with Clerk successfully",
      token,
      data: out,
      doctor: out,
    });
  } catch (err) {
    console.error("clerkDoctorRegister error:", err);
    return res.status(500).json({ success: false, message: "Server error during doctor registration" });
  }
};

// Delete doctor (from Admin panel)
export const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Doctor.findByIdAndDelete(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }
    return res.json({ success: true, message: "Doctor deleted successfully" });
  } catch (err) {
    console.error("deleteDoctor error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update doctor approval and verification status (from Admin)
export const updateDoctorApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalStatus, isVerified } = req.body || {};

    const validStatuses = ["Approved", "Pending", "Rejected"];
    const update = {};

    if (approvalStatus) {
      if (!validStatuses.includes(approvalStatus)) {
        return res.status(400).json({ success: false, message: "Invalid approval status. Allowed: Approved, Pending, Rejected" });
      }
      update.approvalStatus = approvalStatus;
      if (approvalStatus === "Approved") {
        update.isVerified = true;
      } else if (approvalStatus === "Rejected") {
        update.isVerified = false;
      }
    }

    if (isVerified !== undefined) {
      update.isVerified = Boolean(isVerified);
      if (!approvalStatus) {
        update.approvalStatus = update.isVerified ? "Approved" : "Pending";
      }
    }

    const doc = await Doctor.findByIdAndUpdate(id, update, { new: true });
    if (!doc) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    const out = normalizeDocForClient(doc);
    delete out.password;

    return res.json({
      success: true,
      message: `Doctor ${out.name} status updated to ${out.approvalStatus}`,
      data: out,
      doctor: out,
    });
  } catch (err) {
    console.error("updateDoctorApproval error:", err);
    return res.status(500).json({ success: false, message: "Failed to update doctor approval status" });
  }
};
