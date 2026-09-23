const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// In-Memory/File mock database fallback state
export let isMockDB = false;
export const setMockDB = (val) => {
  isMockDB = val;
};

export const mockDoctors = [];
export const mockServices = [];
export const mockAppointments = [];
export const mockServiceAppointments = [];
export const mockPatients = [];
export const mockSubscribers = [];

// Route Switcher Middleware (Handles Mock Fallback if MongoDB is not connected)
export const useDBRoute = (mongoHandler, mockHandler) => {
  return (req, res) => {
    if (isMockDB && mockHandler) {
      return mockHandler(req, res);
    }
    return mongoHandler(req, res);
  };
};

// --- Doctor Mock Routes ---
export const mockGetDoctors = (req, res) => {
  const { q = "" } = req.query;
  const filtered = mockDoctors.filter((d) =>
    d.name.toLowerCase().includes(q.toLowerCase()) ||
    d.specialization.toLowerCase().includes(q.toLowerCase())
  );
  return res.json({ success: true, data: filtered, doctors: filtered });
};

export const mockGetDoctorById = (req, res) => {
  const doc = mockDoctors.find((d) => String(d._id) === req.params.id);
  if (!doc) return res.status(404).json({ success: false, message: "Doctor not found" });
  return res.json({ success: true, data: doc });
};

export const mockLoginDoctor = (req, res) => {
  const { email, password } = req.body || {};
  const doc = mockDoctors.find((d) => d.email.toLowerCase() === email.toLowerCase());
  if (!doc || password !== "123456") {
    return res.status(401).json({ success: false, message: "Invalid credentials (use pass: 123456)" });
  }
  return res.json({ success: true, token: "mock_token_jwt", data: doc, doctor: doc });
};

export const mockCreateDoctor = (req, res) => {
  const body = req.body || {};
  const doc = {
    _id: `mock_doc_${Date.now()}`,
    ...body,
    fee: Number(body.fee || 0),
    rating: Number(body.rating || 0),
    availability: body.availability || "Available",
    schedule: typeof body.schedule === "string" ? JSON.parse(body.schedule) : (body.schedule || {}),
  };
  mockDoctors.push(doc);
  return res.status(201).json({ success: true, data: doc });
};

export const mockUpdateDoctor = (req, res) => {
  const idx = mockDoctors.findIndex((d) => String(d._id) === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: "Doctor not found" });

  const body = req.body || {};
  mockDoctors[idx] = { ...mockDoctors[idx], ...body };
  return res.json({ success: true, data: mockDoctors[idx] });
};

export const mockUpdateDoctorApproval = (req, res) => {
  const idx = mockDoctors.findIndex((d) => String(d._id) === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: "Doctor not found" });

  const { approvalStatus, isVerified } = req.body || {};
  if (approvalStatus) {
    mockDoctors[idx].approvalStatus = approvalStatus;
    if (approvalStatus === "Approved") mockDoctors[idx].isVerified = true;
    if (approvalStatus === "Rejected") mockDoctors[idx].isVerified = false;
  }
  if (isVerified !== undefined) {
    mockDoctors[idx].isVerified = Boolean(isVerified);
    if (!approvalStatus) {
      mockDoctors[idx].approvalStatus = mockDoctors[idx].isVerified ? "Approved" : "Pending";
    }
  }

  return res.json({
    success: true,
    message: `Doctor ${mockDoctors[idx].name} status updated to ${mockDoctors[idx].approvalStatus || "Approved"}`,
    data: mockDoctors[idx],
    doctor: mockDoctors[idx],
  });
};

export const mockDeleteDoctor = (req, res) => {
  const idx = mockDoctors.findIndex((d) => String(d._id) === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: "Doctor not found" });
  mockDoctors.splice(idx, 1);
  return res.json({ success: true, message: "Doctor deleted successfully" });
};

export const mockClerkDoctorAuth = (req, res) => {
  const { email, clerkId } = req.body || {};
  const doc = mockDoctors.find(
    (d) => (email && d.email.toLowerCase() === email.toLowerCase()) || (clerkId && d.clerkId === clerkId)
  );
  if (!doc)
    return res.status(404).json({
      success: false,
      notRegistered: true,
      message: "No doctor profile found for this Clerk account",
    });
  if (clerkId) doc.clerkId = clerkId;
  return res.json({ success: true, token: "mock_token_jwt", data: doc, doctor: doc });
};

export const mockClerkDoctorLink = (req, res) => {
  const { email, password, clerkId } = req.body || {};
  const doc = mockDoctors.find((d) => d.email.toLowerCase() === (email || "").toLowerCase());
  if (!doc) return res.status(404).json({ success: false, message: "Doctor not found" });
  if (password !== "123456") return res.status(401).json({ success: false, message: "Invalid password" });
  doc.clerkId = clerkId;
  return res.json({ success: true, token: "mock_token_jwt", data: doc, doctor: doc });
};

export const mockClerkDoctorRegister = (req, res) => {
  const body = req.body || {};
  const doc = {
    _id: `mock_doc_${Date.now()}`,
    ...body,
    fee: Number(body.fee || 500),
    rating: 5,
    availability: "Available",
    schedule: {},
  };
  mockDoctors.push(doc);
  return res.status(201).json({ success: true, token: "mock_token_jwt", data: doc, doctor: doc });
};

// --- Appointment Mock Routes ---
export const mockCreateAppointment = (req, res) => {
  const body = req.body || {};
  const appt = {
    _id: `mock_appt_${Date.now()}`,
    ...body,
    fees: Number(body.fees || body.fee || 0),
    status: "Confirmed",
    payment: { method: body.paymentMethod || "Cash", status: "Paid", amount: Number(body.fees || body.fee || 0) },
    createdAt: new Date(),
  };
  mockAppointments.push(appt);
  return res.status(201).json({ success: true, appointment: appt, checkoutUrl: `${FRONTEND_URL}/appointments` });
};

export const mockGetAppointments = (req, res) => {
  const { createdBy, doctorId } = req.query;
  let list = mockAppointments;
  if (createdBy) list = list.filter((a) => a.createdBy === createdBy);
  if (doctorId) list = list.filter((a) => String(a.doctorId) === String(doctorId));
  return res.json({ success: true, data: list, appointments: list });
};

export const mockCancelAppointment = (req, res) => {
  const appt = mockAppointments.find((a) => String(a._id) === req.params.id);
  if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });
  appt.status = "Canceled";
  appt.payment.status = "Failed";
  return res.json({ success: true, appointment: appt });
};

export const mockUpdateAppointment = (req, res) => {
  const appt = mockAppointments.find((a) => String(a._id) === req.params.id);
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

export const mockGetAppointmentsByDoctor = (req, res) => {
  const list = mockAppointments.filter((a) => String(a.doctorId) === req.params.id);
  return res.json({ success: true, data: list, appointments: list });
};

export const mockGetStats = (req, res) => {
  return res.json({
    success: true,
    stats: {
      totalAppointments: mockAppointments.length,
      completed: mockAppointments.filter((a) => a.status === "Completed").length,
      canceled: mockAppointments.filter((a) => a.status === "Canceled").length,
      revenue: mockAppointments.reduce((sum, a) => sum + (a.fees || 0), 0),
    },
  });
};

export const mockGetAdminAnalytics = (req, res) => {
  const totalAppointments = mockAppointments.length;
  const completed = mockAppointments.filter((a) => a.status === "Completed" || a.status === "complete").length;
  const canceled = mockAppointments.filter((a) => a.status === "Canceled" || a.status === "cancelled").length;
  const pending = Math.max(0, totalAppointments - (completed + canceled));
  const revenue = mockAppointments.reduce((sum, a) => sum + (Number(a.fees) || 0), 0);

  const timeline = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split("T")[0];
    const match = mockAppointments.filter((a) => a.date === ds);
    timeline.push({
      date: ds,
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      bookings: match.length,
      completed: match.filter((a) => a.status === "Completed" || a.status === "complete").length,
      revenue: match.reduce((s, a) => s + (Number(a.fees) || 0), 0)
    });
  }

  const doctorWorkload = mockDoctors.map((doc) => {
    const docAppts = mockAppointments.filter((a) => String(a.doctorId) === String(doc._id));
    const docCompleted = docAppts.filter((a) => a.status === "Completed" || a.status === "complete").length;
    const docCanceled = docAppts.filter((a) => a.status === "Canceled" || a.status === "cancelled").length;
    const docRevenue = docAppts.reduce((s, a) => s + (Number(a.fees) || 0), 0);
    return {
      id: doc._id,
      name: doc.name,
      specialization: doc.specialization || "General",
      imageUrl: doc.imageUrl || "",
      fee: doc.fee || 500,
      availability: doc.availability || "Available",
      approvalStatus: doc.approvalStatus || "Approved",
      isVerified: doc.isVerified ?? true,
      totalAppointments: docAppts.length,
      completed: docCompleted,
      canceled: docCanceled,
      revenue: docRevenue || (docCompleted * (doc.fee || 500)),
      completionRate: docAppts.length > 0 ? Math.round((docCompleted / docAppts.length) * 100) : 100
    };
  }).sort((a, b) => b.totalAppointments - a.totalAppointments);

  const specialtyMap = {};
  doctorWorkload.forEach((d) => {
    const spec = d.specialization || "General";
    if (!specialtyMap[spec]) specialtyMap[spec] = { specialty: spec, doctorCount: 0, bookings: 0, revenue: 0 };
    specialtyMap[spec].doctorCount += 1;
    specialtyMap[spec].bookings += d.totalAppointments;
    specialtyMap[spec].revenue += d.revenue;
  });

  return res.json({
    success: true,
    analytics: {
      kpis: {
        totalAppointments,
        completed,
        canceled,
        pending,
        revenue,
        avgFee: totalAppointments > 0 ? Math.round(revenue / (completed || 1)) : 0,
        completionRate: totalAppointments > 0 ? Math.round((completed / totalAppointments) * 100) : 100,
        totalDoctors: mockDoctors.length,
        approvedDoctors: mockDoctors.filter((d) => (d.approvalStatus || "Approved") === "Approved").length,
        pendingDoctors: mockDoctors.filter((d) => d.approvalStatus === "Pending").length,
      },
      timeline,
      doctorWorkload,
      specialtyBreakdown: Object.values(specialtyMap).sort((a, b) => b.bookings - a.bookings),
      statusBreakdown: [
        { status: "Completed", count: completed, color: "#10B981" },
        { status: "Pending", count: pending, color: "#F59E0B" },
        { status: "Canceled", count: canceled, color: "#EF4444" },
      ]
    }
  });
};

export const mockGetDoctorAnalytics = (req, res) => {
  const doc = mockDoctors.find((d) => String(d._id) === req.params.id);
  const docAppts = mockAppointments.filter((a) => String(a.doctorId) === req.params.id);
  const completed = docAppts.filter((a) => a.status === "Completed" || a.status === "complete").length;
  const canceled = docAppts.filter((a) => a.status === "Canceled" || a.status === "cancelled").length;
  const pending = Math.max(0, docAppts.length - (completed + canceled));
  const revenue = docAppts.reduce((s, a) => s + (Number(a.fees) || 0), 0) || (completed * (doc?.fee || 500));

  const weeklyActivity = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split("T")[0];
    const match = docAppts.filter((a) => a.date === ds);
    weeklyActivity.push({
      date: ds,
      day: d.toLocaleDateString("en-US", { weekday: "short" }),
      bookings: match.length,
      completed: match.filter((a) => a.status === "Completed" || a.status === "complete").length,
      revenue: match.reduce((s, a) => s + (Number(a.fees) || 0), 0)
    });
  }

  return res.json({
    success: true,
    analytics: {
      doctorName: doc?.name || "Doctor",
      specialization: doc?.specialization || "General",
      kpis: {
        totalAppointments: docAppts.length,
        completed,
        canceled,
        pending,
        revenue,
        completionRate: docAppts.length > 0 ? Math.round((completed / docAppts.length) * 100) : 100
      },
      weeklyActivity,
      statusBreakdown: [
        { status: "Completed", count: completed, color: "#10B981" },
        { status: "Pending", count: pending, color: "#F59E0B" },
        { status: "Canceled", count: canceled, color: "#EF4444" },
      ]
    }
  });
};

// --- Service Mock Routes ---
export const mockGetServices = (req, res) => {
  return res.json({ success: true, data: mockServices, services: mockServices });
};

export const mockGetServiceById = (req, res) => {
  const svc = mockServices.find((s) => String(s._id) === req.params.id);
  if (!svc) return res.status(404).json({ success: false, message: "Service not found" });
  return res.json({ success: true, data: svc });
};

export const mockCreateService = (req, res) => {
  const body = req.body || {};
  const svc = {
    _id: `mock_svc_${Date.now()}`,
    ...body,
    price: Number(body.price || 0),
    slots: typeof body.slots === "string" ? JSON.parse(body.slots) : (body.slots || {}),
  };
  mockServices.push(svc);
  return res.status(201).json({ success: true, data: svc, service: svc });
};

export const mockUpdateService = (req, res) => {
  const idx = mockServices.findIndex((s) => String(s._id) === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: "Service not found" });
  mockServices[idx] = { ...mockServices[idx], ...req.body };
  return res.json({ success: true, data: mockServices[idx], service: mockServices[idx] });
};

export const mockDeleteService = (req, res) => {
  const idx = mockServices.findIndex((s) => String(s._id) === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: "Service not found" });
  mockServices.splice(idx, 1);
  return res.json({ success: true, message: "Service deleted" });
};

// --- Service Appointments Mock Routes ---
export const mockCreateServiceAppointment = (req, res) => {
  const body = req.body || {};
  const appt = {
    _id: `mock_svca_${Date.now()}`,
    ...body,
    fees: Number(body.fees || 0),
    status: "Confirmed",
    payment: { method: body.paymentMethod || "Cash", status: "Paid", amount: Number(body.fees || 0) },
    createdAt: new Date(),
  };
  mockServiceAppointments.push(appt);
  return res.status(201).json({ success: true, appointment: appt });
};

export const mockGetServiceAppointments = (req, res) => {
  const { createdBy } = req.query;
  let list = mockServiceAppointments;
  if (createdBy) list = list.filter((a) => a.createdBy === createdBy);
  return res.json({ success: true, appointments: list, data: list });
};

export const mockCancelServiceAppointment = (req, res) => {
  const appt = mockServiceAppointments.find((a) => String(a._id) === req.params.id);
  if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });
  appt.status = "Canceled";
  return res.json({ success: true, appointment: appt });
};

export const mockUpdateServiceAppointment = (req, res) => {
  const appt = mockServiceAppointments.find((a) => String(a._id) === req.params.id);
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

export const mockGetStatsSummary = (req, res) => {
  return res.json({
    success: true,
    stats: {
      totalAppointments: mockServiceAppointments.length,
      completed: mockServiceAppointments.filter((a) => a.status === "Completed").length,
      canceled: mockServiceAppointments.filter((a) => a.status === "Canceled").length,
      revenue: mockServiceAppointments.reduce((sum, a) => sum + (a.fees || 0), 0),
    },
  });
};

// --- Razorpay Payment Mock Routes ---
export const mockCreateRazorpayOrder = (req, res) => {
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

export const mockVerifyRazorpayPayment = (req, res) => {
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

// --- Patient Mock Routes ---
export const mockRegisterPatient = (req, res) => {
  const { name, email } = req.body || {};
  const normalizedEmail = (email || "").toLowerCase().trim();
  mockPatients.push({ id: `mock_p_${Date.now()}`, name, email: normalizedEmail, isVerified: true });
  return res.status(200).json({ success: true, requiresOTP: false, message: "Registration successful" });
};

export const mockVerifyPatientOTP = (req, res) => {
  const { email } = req.body || {};
  const normalizedEmail = (email || "").toLowerCase().trim();
  let p = mockPatients.find((x) => x.email === normalizedEmail);
  if (!p) {
    p = {
      id: `mock_p_${Date.now()}`,
      name: normalizedEmail.split("@")[0] || "Patient",
      email: normalizedEmail,
      isVerified: true,
    };
    mockPatients.push(p);
  }
  return res.status(200).json({ success: true, message: "Verified", token: "mock_patient_token", patient: p });
};

export const mockLoginPatient = (req, res) => {
  const { email } = req.body || {};
  const normalizedEmail = (email || "").toLowerCase().trim();
  let p = mockPatients.find((x) => x.email === normalizedEmail);
  if (!p) {
    p = {
      id: `mock_p_${Date.now()}`,
      name: normalizedEmail.split("@")[0] || "Patient",
      email: normalizedEmail,
      isVerified: true,
    };
    mockPatients.push(p);
  }
  return res.json({ success: true, token: "mock_patient_token", patient: p });
};

export const mockGetPatientCount = (req, res) => {
  return res.json({ success: true, count: mockPatients.length || 10 });
};
