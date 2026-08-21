import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { 
  Calendar, Clock, AlertCircle, CheckCircle, XCircle, 
  CreditCard, Wallet, Bell, CalendarDays, RefreshCw, Trash2 
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { appointmentPageStyles, cardStyles, badgeStyles, iconSize, toastStyles } from "../../assets/themeStyles.js";

import { API_BASE } from "../../config.js";

function pad(n) {
  return String(n ?? 0).padStart(2, "0");
}

function parseDateTime(dateStr, timeStr) {
  const fast = new Date(`${dateStr} ${timeStr}`);
  if (!isNaN(fast)) return fast;

  const parts = (dateStr || "").split(" ");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const months = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    };
    const month = months[m];
    let [t, ampm] = (timeStr || "").split(" ");
    let [hh, mm] = (t || "0:00").split(":");
    hh = Number(hh || 0);
    mm = Number(mm || 0);

    if (ampm === "PM" && hh !== 12) hh += 12;
    if (ampm === "AM" && hh === 12) hh = 0;

    return new Date(Number(y), month, Number(d), hh, mm);
  }

  const iso = new Date(dateStr);
  if (!isNaN(iso)) return iso;
  return new Date();
}

function computeStatus(item) {
  const now = new Date();
  if (!item) return "Pending";

  if (item.status === "Canceled") return "Canceled";
  if (item.status === "Rescheduled") {
    if (
      item.rescheduledTo &&
      item.rescheduledTo.date &&
      item.rescheduledTo.time
    ) {
      const dt = parseDateTime(
        item.rescheduledTo.date,
        item.rescheduledTo.time
      );
      if (now >= dt) return "Completed";
    }
    return "Rescheduled";
  }
  if (item.status === "Completed") return "Completed";
  if (item.status === "Confirmed") {
    const dtConfirmed = parseDateTime(item.date, item.time);
    if (now >= dtConfirmed) return "Completed";
    return "Confirmed";
  }
  if (item.status === "Pending") {
    const dtPending = parseDateTime(item.date, item.time);
    if (now >= dtPending) return "Completed";
    return "Pending";
  }

  const dt = parseDateTime(item.date, item.time);
  if (now >= dt) return "Completed";
  return item.confirmed ? "Confirmed" : "Pending";
}

const PaymentBadge = ({ payment }) => {
  return payment === "Online" ? (
    <span className={badgeStyles.paymentBadge.online}>
      <CreditCard className="w-3.5 h-3.5" /> Online
    </span>
  ) : (
    <span className={badgeStyles.paymentBadge.cash}>
      <Wallet className="w-3.5 h-3.5" /> Cash
    </span>
  );
};

const StatusBadge = ({ itemStatus }) => {
  if (itemStatus === "Completed")
    return (
      <span className={badgeStyles.statusBadge.completed}>
        <CheckCircle className="w-3.5 h-3.5" /> Completed
      </span>
    );

  if (itemStatus === "Confirmed")
    return (
      <span className={badgeStyles.statusBadge.confirmed}>
        <Bell className="w-3.5 h-3.5" /> Confirmed
      </span>
    );

  if (itemStatus === "Pending")
    return (
      <span className={badgeStyles.statusBadge.pending}>
        <Clock className="w-3.5 h-3.5" /> Pending
      </span>
    );

  if (itemStatus === "Canceled")
    return (
      <span className={badgeStyles.statusBadge.canceled}>
        <XCircle className="w-3.5 h-3.5" /> Canceled
      </span>
    );

  return (
    <span className={badgeStyles.statusBadge.default}>
      <CalendarDays className="w-3.5 h-3.5" /> Rescheduled
    </span>
  );
};

export default function AppointmentPage() {
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [doctorAppts, setDoctorAppts] = useState([]);
  const [serviceAppts, setServiceAppts] = useState([]);
  const [error, setError] = useState(null);

  const getPatientUserId = () => {
    try {
      const patientStr = localStorage.getItem("patientUser_v1");
      if (patientStr) {
        return JSON.parse(patientStr).id;
      }
    } catch (e) {}
    return "anonymous";
  };

  const loadDoctorAppointments = useCallback(async () => {
    setLoadingDoctors(true);
    setError(null);
    const createdBy = getPatientUserId();

    try {
      const res = await fetch(`${API_BASE}/api/appointments/me?createdBy=${createdBy}`);
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.message || "Failed to load doctor appointments");
      }

      const list = json.data || json.appointments || [];
      setDoctorAppts(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load doctor appointments.");
    } finally {
      setLoadingDoctors(false);
    }
  }, []);

  const loadServiceAppointments = useCallback(async () => {
    setLoadingServices(true);
    setError(null);
    const createdBy = getPatientUserId();

    try {
      const res = await fetch(`${API_BASE}/api/service-appointments/me?createdBy=${createdBy}`);
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.message || "Failed to load service appointments");
      }

      const list = json.appointments || json.data || [];
      setServiceAppts(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load service appointments.");
    } finally {
      setLoadingServices(false);
    }
  }, []);

  useEffect(() => {
    loadDoctorAppointments();
    loadServiceAppointments();
  }, [loadDoctorAppointments, loadServiceAppointments]);

  const handleCancelDoctorAppt = async (apptId) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/appointments/${apptId}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" }
      });

      if (!res.ok) throw new Error("Cancel failed");
      toast.success("Appointment canceled successfully", { style: toastStyles?.successToast });
      loadDoctorAppointments();
    } catch (err) {
      toast.error(err.message || "Failed to cancel appointment");
    }
  };

  const handleCancelServiceAppt = async (apptId) => {
    if (!window.confirm("Are you sure you want to cancel this diagnostic test?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/service-appointments/${apptId}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" }
      });

      if (!res.ok) throw new Error("Cancel failed");
      toast.success("Diagnostic appointment canceled successfully", { style: toastStyles?.successToast });
      loadServiceAppointments();
    } catch (err) {
      toast.error(err.message || "Failed to cancel test slot");
    }
  };

  function normalizeRescheduled(rt) {
    if (!rt) return null;
    if (rt.date && rt.time) return { date: rt.date, time: rt.time };
    if (
      rt.date &&
      (rt.hour !== undefined || rt.minute !== undefined || rt.ampm)
    ) {
      const hour = rt.hour ?? 0;
      const minute = rt.minute ?? 0;
      const ampm = rt.ampm ?? "";
      return { date: rt.date, time: `${hour}:${pad(minute)} ${ampm}` };
    }
    return {
      date: rt.date || rt.dateString || "",
      time:
        rt.time ||
        (rt.hour
          ? `${rt.hour}:${pad(rt.minute || 0)} ${rt.ampm || ""}`
          : rt.timeString || ""),
    };
  }

  const appointmentData = useMemo(() => {
    return doctorAppts.map((a) => {
      const id = a._id || a.id;
      const image = a.doctorImage?.url || "";
      const doctorName = a.doctorName || "Doctor";
      const patientName = a.patientName || "Patient";
      const specialization = a.speciality || a.specialization || "";
      const date = a.date || "";
      const time = a.time || "";
      const payment = a.payment?.method || "Cash";
      const status = a.status || "Pending";
      const rescheduledTo = normalizeRescheduled(a.rescheduledTo);

      return {
        id,
        image,
        doctor: doctorName,
        patientName,
        specialization,
        date,
        time,
        payment,
        status,
        rescheduledTo,
      };
    }).map((x) => ({ ...x, status: computeStatus(x) }));
  }, [doctorAppts]);

  const serviceData = useMemo(() => {
    return serviceAppts.map((s) => {
      const id = s._id || s.id;
      const image = s.serviceImage?.url || "";
      const name = s.serviceName || "Service";
      const patientName = s.patientName || "Patient";
      const price = s.fees || s.amount || 0;
      const date = s.date || "";
      let time = s.time || "";
      if (!time && s.hour !== undefined) {
        time = `${s.hour}:${pad(s.minute || 0)} ${s.ampm || ""}`;
      }
      const payment = s.payment?.method || "Cash";
      const status = s.status || "Pending";
      const rescheduledTo = normalizeRescheduled(s.rescheduledTo);

      return {
        id,
        image,
        name,
        patientName,
        price,
        date,
        time,
        payment,
        status,
        rescheduledTo,
      };
    }).map((x) => ({ ...x, status: computeStatus(x) }));
  }, [serviceAppts]);

  const patientId = getPatientUserId();
  const showEmptyState = patientId === "anonymous" && doctorAppts.length === 0 && serviceAppts.length === 0;

  return (
    <div className={appointmentPageStyles.pageContainer}>
      <Toaster position="top-center" reverseOrder={false} />
      <div className={appointmentPageStyles.maxWidthContainer}>
        
        {showEmptyState && (
          <div className="bg-white rounded-3xl p-8 border border-emerald-100 text-center mb-8 shadow-sm">
            <AlertCircle className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
            <p className="text-emerald-800 font-semibold mb-2">Patient Dashboard (Demo)</p>
            <p className="text-slate-500 text-sm max-w-sm mx-auto mb-4">
              To view your custom booked appointments, please register/log in as a Patient using the tab in the top navbar.
            </p>
            <Link
              to="/login"
              className="px-6 py-2.5 rounded-full bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
            >
              Sign In Now
            </Link>
          </div>
        )}

        {/* SECTION 1: DOCTOR CONSULTATIONS */}
        <h2 className={appointmentPageStyles.doctorTitle}>Doctor Consultations</h2>
        
        {loadingDoctors ? (
          <p className={appointmentPageStyles.loadingText}>Loading appointments...</p>
        ) : appointmentData.length > 0 ? (
          <div className={appointmentPageStyles.doctorGrid}>
            {appointmentData.map((item) => (
              <div key={item.id} className={cardStyles.doctorCard}>
                <div className={cardStyles.doctorImageContainer}>
                  <img
                    src={item.image || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=150"}
                    alt={item.doctor}
                    className={cardStyles.image}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=150";
                    }}
                  />
                </div>

                <h3 className={cardStyles.doctorName}>{item.doctor}</h3>
                <p className={cardStyles.specialization}>{item.specialization}</p>

                <div className={cardStyles.dateContainer}>
                  <CalendarDays className="w-4 h-4 text-emerald-600" /> <span>{item.date}</span>
                </div>
                <div className={cardStyles.timeContainer}>
                  <Clock className="w-4 h-4 text-emerald-600" /> <span>{item.time}</span>
                </div>

                <div className={cardStyles.badgesContainer}>
                  <PaymentBadge payment={item.payment} />
                  <StatusBadge itemStatus={item.status} />
                </div>

                {item.status === "Rescheduled" && item.rescheduledTo && (
                  <div className="text-xs text-blue-600 font-semibold mt-3 bg-blue-50 border border-blue-100 rounded-lg p-2 text-center w-full">
                    Rescheduled to: {item.rescheduledTo.date} @ {item.rescheduledTo.time}
                  </div>
                )}

                {item.status !== "Canceled" && item.status !== "Completed" && (
                  <button
                    onClick={() => handleCancelDoctorAppt(item.id)}
                    className="mt-4 flex items-center justify-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-700 transition w-full py-1.5 border border-rose-100 hover:bg-rose-50 rounded-full cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Cancel Appointment
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className={appointmentPageStyles.emptyStateText}>No consultation appointments found.</p>
        )}

        {/* SECTION 2: DIAGNOSTIC TESTS */}
        <h2 className={appointmentPageStyles.serviceTitle}>Diagnostic Tests</h2>

        {loadingServices ? (
          <p className={appointmentPageStyles.serviceLoadingText}>Loading diagnostic bookings...</p>
        ) : serviceData.length > 0 ? (
          <div className={appointmentPageStyles.serviceGrid}>
            {serviceData.map((srv) => (
              <div key={srv.id} className={cardStyles.serviceCard}>
                <div className={cardStyles.serviceImageContainer}>
                  <img
                    src={srv.image || "https://images.unsplash.com/photo-1579684389782-64d84b5e901a?auto=format&fit=crop&q=80&w=150"}
                    alt={srv.name}
                    className={cardStyles.image}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "https://images.unsplash.com/photo-1579684389782-64d84b5e901a?auto=format&fit=crop&q=80&w=150";
                    }}
                  />
                </div>

                <h3 className={cardStyles.serviceName}>{srv.name}</h3>
                <p className={cardStyles.price}>₹{srv.price}</p>

                <div className={cardStyles.serviceDateContainer}>
                  <CalendarDays className="w-4 h-4 text-blue-600" /> <span>{srv.date}</span>
                </div>
                <div className={cardStyles.serviceTimeContainer}>
                  <Clock className="w-4 h-4 text-blue-600" /> <span>{srv.time}</span>
                </div>

                <div className={cardStyles.badgesContainer}>
                  <PaymentBadge payment={srv.payment} />
                  <StatusBadge itemStatus={srv.status} />
                </div>

                {srv.status === "Rescheduled" && srv.rescheduledTo && (
                  <div className="text-xs text-blue-600 font-semibold mt-3 bg-blue-50 border border-blue-100 rounded-lg p-2 text-center w-full">
                    Rescheduled to: {srv.rescheduledTo.date} @ {srv.rescheduledTo.time}
                  </div>
                )}

                {srv.status !== "Canceled" && srv.status !== "Completed" && (
                  <button
                    onClick={() => handleCancelServiceAppt(srv.id)}
                    className="mt-4 flex items-center justify-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-700 transition w-full py-1.5 border border-rose-100 hover:bg-rose-50 rounded-full cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Cancel Test Slot
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className={appointmentPageStyles.serviceEmptyStateText}>No diagnostic test appointments found.</p>
        )}

      </div>
    </div>
  );
}
