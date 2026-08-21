import ServiceAppointment from "../models/serviceAppointment.js";
import Service from "../models/Service.js";

// List all service appointments
export const getServiceAppointments = async (req, res) => {
  try {
    const { patientClerkId, createdBy, limit = 500, page = 1 } = req.query;
    const filter = {};

    const resolvedCreatedBy = createdBy || patientClerkId;
    if (resolvedCreatedBy) {
      filter.createdBy = resolvedCreatedBy;
    }

    const appointments = await ServiceAppointment.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    return res.json({ success: true, appointments, data: appointments });
  } catch (err) {
    console.error("getServiceAppointments error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Create service appointment
export const createServiceAppointment = async (req, res) => {
  try {
    const body = req.body || {};
    const {
      patientName,
      mobile,
      age,
      gender,
      serviceId,
      serviceName: bodyServiceName,
      fees,
      date,
      hour,
      minute,
      ampm,
      paymentMethod,
      createdBy
    } = body;

    if (!patientName || !mobile || !serviceId || !date || hour === undefined || minute === undefined || !ampm) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    const finalFees = fees !== undefined ? Number(fees) : (service.price || 0);

    const appt = new ServiceAppointment({
      patientName,
      mobile,
      age: age ? Number(age) : undefined,
      gender: gender || "",
      serviceId,
      serviceName: bodyServiceName || service.name || "Medical Service",
      serviceImage: {
        url: service.imageUrl || "",
        publicId: service.imagePublicId || ""
      },
      fees: finalFees,
      date,
      hour: Number(hour),
      minute: Number(minute),
      ampm,
      status: "Pending",
      payment: {
        method: paymentMethod === "Online" ? "Online" : "Cash",
        status: paymentMethod === "Online" ? "Paid" : "Pending", // auto mark Paid for online simulation
        amount: finalFees,
        paidAt: paymentMethod === "Online" ? new Date() : null,
        sessionId: paymentMethod === "Online" ? `mock_svc_sess_${Date.now()}` : ""
      },
      createdBy: createdBy || "anonymous"
    });

    if (paymentMethod === "Online") {
      appt.status = "Confirmed";
    }

    await appt.save();

    // Increment stats in Service model
    await Service.findByIdAndUpdate(serviceId, { $inc: { totalAppointments: 1 } });

    return res.status(201).json({ success: true, appointment: appt });
  } catch (err) {
    console.error("createServiceAppointment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update service appointment (status or reschedule)
export const updateServiceAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const appt = await ServiceAppointment.findById(id);
    if (!appt) {
      return res.status(404).json({ success: false, message: "Service appointment not found" });
    }

    const update = {};
    if (body.status) {
      update.status = body.status;
      if (body.status === "Completed") {
        update["payment.status"] = "Paid";
        // Increment completed in Service model
        await Service.findByIdAndUpdate(appt.serviceId, { $inc: { completed: 1 } });
      } else if (body.status === "Canceled") {
        update["payment.status"] = appt.payment.status === "Paid" ? "Refunded" : "Failed";
        // Increment canceled in Service model
        await Service.findByIdAndUpdate(appt.serviceId, { $inc: { canceled: 1 } });
      }
    }

    if (body.date && body.hour !== undefined && body.minute !== undefined && body.ampm) {
      update.date = body.date;
      update.hour = Number(body.hour);
      update.minute = Number(body.minute);
      update.ampm = body.ampm;
      update.status = "Rescheduled";
      update.rescheduledTo = {
        date: body.date,
        hour: Number(body.hour),
        minute: Number(body.minute),
        ampm: body.ampm
      };
    }

    const updated = await ServiceAppointment.findByIdAndUpdate(id, update, { new: true });
    return res.json({ success: true, appointment: updated });
  } catch (err) {
    console.error("updateServiceAppointment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Cancel service appointment
export const cancelServiceAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const appt = await ServiceAppointment.findById(id);
    if (!appt) {
      return res.status(404).json({ success: false, message: "Service appointment not found" });
    }

    const updated = await ServiceAppointment.findByIdAndUpdate(
      id,
      {
        status: "Canceled",
        "payment.status": appt.payment.status === "Paid" ? "Refunded" : "Failed"
      },
      { new: true }
    );

    await Service.findByIdAndUpdate(appt.serviceId, { $inc: { canceled: 1 } });

    return res.json({ success: true, appointment: updated });
  } catch (err) {
    console.error("cancelServiceAppointment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get service dashboard stats summary
export const getStatsSummary = async (req, res) => {
  try {
    const totalAppointments = await ServiceAppointment.countDocuments();
    const completed = await ServiceAppointment.countDocuments({ status: "Completed" });
    const canceled = await ServiceAppointment.countDocuments({ status: "Canceled" });

    const paidAgg = await ServiceAppointment.aggregate([
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
    console.error("getStatsSummary error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
