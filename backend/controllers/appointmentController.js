import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const MAJOR_ADMIN_ID = "admin_default";

const safeNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const buildFrontendBase = (req) => {
  if (FRONTEND_URL) return FRONTEND_URL.replace(/\/$/, "");
  const origin = req.get("origin") || req.get("referer");
  if (origin) return origin.replace(/\/$/, "");
  const host = req.get("host");
  if (host) return `${req.protocol || "http"}://${host}`.replace(/\/$/, "");
  return null;
};

// Get appointments (with filter)
export const getAppointments = async (req, res) => {
  try {
    const { doctorId, mobile, status, search = "", limit: limitRaw = 50, page: pageRaw = 1, patientClerkId, createdBy, email } = req.query;
    const limit = Math.min(200, Math.max(1, parseInt(limitRaw, 10) || 50));
    const page = Math.max(1, parseInt(pageRaw, 10) || 1);
    const skip = (page - 1) * limit;

    const filter = {};
    if (doctorId) filter.doctorId = doctorId;
    if (status) filter.status = status;
    
    // Support filtering by user ID, email, or mobile lookup
    const resolvedCreatedBy = createdBy || patientClerkId;
    const userOrConditions = [];
    if (resolvedCreatedBy && resolvedCreatedBy !== "anonymous") {
      userOrConditions.push({ createdBy: resolvedCreatedBy });
    }
    if (email) {
      userOrConditions.push({ email: String(email).trim().toLowerCase() });
    }
    if (mobile) {
      userOrConditions.push({ mobile: String(mobile).trim() });
    }

    if (userOrConditions.length > 0) {
      filter.$or = userOrConditions;
    } else if (resolvedCreatedBy === "anonymous") {
      filter.createdBy = "anonymous";
    }

    if (search) {
      const re = new RegExp(search, "i");
      const searchConditions = [{ patientName: re }, { mobile: re }, { doctorName: re }];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    const appointments = await Appointment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Appointment.countDocuments(filter);

    return res.json({
      success: true,
      data: appointments,
      appointments,
      meta: { page, limit, total }
    });
  } catch (err) {
    console.error("getAppointments error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Create a new appointment
export const createAppointment = async (req, res) => {
  try {
    const {
      doctorId,
      patientName,
      mobile,
      age = "",
      gender = "",
      date,
      time,
      fee,
      fees,
      notes = "",
      email,
      paymentMethod,
      owner: ownerFromBody = null,
      doctorName: doctorNameFromBody,
      speciality: specialityFromBody,
      doctorImageUrl: doctorImageUrlFromBody,
      doctorImagePublicId: doctorImagePublicIdFromBody,
      createdBy // Clerk User ID sent from frontend
    } = req.body || {};

    if (!doctorId || !patientName || !mobile || !date || !time) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    const numericFee = Number(fees ?? fee ?? doctor.fee ?? 0);

    let resolvedOwner = ownerFromBody || doctor._id || null;
    if (!resolvedOwner) resolvedOwner = MAJOR_ADMIN_ID;

    const doctorName = (doctor.name && String(doctor.name).trim()) || (doctorNameFromBody && String(doctorNameFromBody).trim()) || "Doctor";
    const speciality = (doctor.specialization && String(doctor.specialization).trim()) || (specialityFromBody && String(specialityFromBody).trim()) || "";

    const doctorImageUrl = doctor.imageUrl || doctorImageUrlFromBody || "";
    const doctorImagePublicId = doctor.imagePublicId || doctorImagePublicIdFromBody || "";
    const doctorImage = { url: doctorImageUrl, publicId: doctorImagePublicId };

    const base = {
      doctorId: String(doctor._id || doctorId),
      doctorName,
      speciality,
      doctorImage,
      patientName: String(patientName).trim(),
      mobile: String(mobile).trim(),
      email: email ? String(email).trim().toLowerCase() : "",
      age: age ? Number(age) : undefined,
      gender: gender ? String(gender) : "",
      date: String(date),
      time: String(time),
      fees: numericFee,
      status: "Pending",
      payment: { method: paymentMethod === "Online" ? "Online" : "Cash", status: "Pending", amount: numericFee },
      notes: notes || "",
      createdBy: createdBy || "anonymous",
      owner: resolvedOwner,
      sessionId: null,
    };

    let created;

    // Free appointment
    if (numericFee === 0) {
      created = await Appointment.create({
        ...base,
        status: "Confirmed",
        payment: { method: base.payment.method, status: "Paid", amount: 0 },
        paidAt: new Date(),
      });
    } else if (paymentMethod === "Cash" || !paymentMethod) {
      // Cash payment
      created = await Appointment.create({
        ...base,
        status: "Pending",
        payment: { method: "Cash", status: "Pending", amount: numericFee },
      });
    } else {
      // Online payment
      const frontBase = buildFrontendBase(req);
      const session_id = `mock_sess_${Date.now()}`;
      created = await Appointment.create({
        ...base,
        sessionId: session_id,
        payment: { ...base.payment, status: "Paid", providerId: `mock_provider_${Date.now()}` },
        status: "Confirmed",
        paidAt: new Date(),
      });
    }

    // Connect appointment with doctor's profile by incrementing totalAppointments
    try {
      await Doctor.findByIdAndUpdate(doctorId, { 
        $inc: { 
          totalAppointments: 1, 
          revenue: created.payment?.status === "Paid" ? numericFee : 0 
        } 
      });
    } catch (docErr) {
      console.warn("Doctor counter update notice:", docErr.message);
    }

    return res.status(201).json({ success: true, appointment: created });
  } catch (err) {
    console.error("createAppointment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Confirm payment session (fallback for mock checkouts)
export const confirmPayment = async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) {
      return res.status(400).json({ success: false, message: "session_id is required" });
    }

    const appt = await Appointment.findOneAndUpdate(
      { sessionId: session_id },
      {
        "payment.status": "Paid",
        status: "Confirmed",
        paidAt: new Date(),
      },
      { new: true }
    );

    if (!appt) {
      return res.status(404).json({ success: false, message: "Appointment not found for this payment session" });
    }

    return res.json({ success: true, appointment: appt });
  } catch (err) {
    console.error("confirmPayment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update appointment status or reschedule
export const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const appt = await Appointment.findById(id);
    if (!appt) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    const terminal = appt.status === "Completed" || appt.status === "Canceled";
    if (terminal && body.status && body.status !== appt.status) {
      return res.status(400).json({ success: false, message: "Cannot change status of a completed/canceled appointment" });
    }

    const update = {};
    if (body.status) {
      update.status = body.status;
      if (body.status === "Completed") {
        update["payment.status"] = "Paid";
      }
    }
    if (body.notes !== undefined) update.notes = body.notes;

    if (body.date && body.time) {
      if (appt.status === "Completed" || appt.status === "Canceled") {
        return res.status(400).json({ success: false, message: "Cannot reschedule completed/canceled appointment" });
      }
      update.date = body.date;
      update.time = body.time;
      update.status = "Rescheduled";
      update.rescheduledTo = { date: body.date, time: body.time };
    }

    const updated = await Appointment.findByIdAndUpdate(id, update, { new: true });

    return res.json({ success: true, appointment: updated });
  } catch (err) {
    console.error("updateAppointment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Cancel appointment
export const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const appt = await Appointment.findById(id);
    if (!appt) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    if (appt.status === "Completed") {
      return res.status(400).json({ success: false, message: "Cannot cancel a completed appointment" });
    }

    const updated = await Appointment.findByIdAndUpdate(
      id,
      { status: "Canceled", "payment.status": appt.payment.status === "Paid" ? "Refunded" : "Failed" },
      { new: true }
    );

    return res.json({ success: true, appointment: updated });
  } catch (err) {
    console.error("cancelAppointment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get stats (admin summary)
export const getStats = async (req, res) => {
  try {
    const totalAppointments = await Appointment.countDocuments();
    const completed = await Appointment.countDocuments({ 
      status: { $in: ["Completed", "Confirmed"] } 
    });
    const canceled = await Appointment.countDocuments({ status: "Canceled" });

    const paidAgg = await Appointment.aggregate([
      { $match: { "payment.status": "Paid" } },
      { $group: { _id: null, total: { $sum: "$fees" } } }
    ]);
    const revenue = (paidAgg[0] && paidAgg[0].total) || 0;

    return res.json({
      success: true,
      stats: {
        totalAppointments,
        completed,
        canceled,
        revenue
      }
    });
  } catch (err) {
    console.error("getStats error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get appointments for a specific doctor
export const getAppointmentsByDoctor = async (req, res) => {
  try {
    const { id: doctorId } = req.params;
    const { mobile, status, search = "", limit: limitRaw = 50, page: pageRaw = 1 } = req.query;
    const limit = Math.min(200, Math.max(1, parseInt(limitRaw, 10) || 50));
    const page = Math.max(1, parseInt(pageRaw, 10) || 1);
    const skip = (page - 1) * limit;

    const filter = { doctorId };
    if (mobile) filter.mobile = mobile;
    if (status) filter.status = status;
    if (search) {
      const re = new RegExp(search, "i");
      filter.$or = [{ patientName: re }, { mobile: re }, { notes: re }];
    }

    const appointments = await Appointment.find(filter)
      .sort({ date: 1, time: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Appointment.countDocuments(filter);

    return res.json({
      success: true,
      data: appointments,
      appointments,
      meta: { page, limit, total }
    });
  } catch (err) {
    console.error("getAppointmentsByDoctor error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
