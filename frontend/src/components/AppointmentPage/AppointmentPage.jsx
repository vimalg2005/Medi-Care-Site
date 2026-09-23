import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { 
  Calendar, Clock, AlertCircle, CheckCircle2, XCircle, 
  CreditCard, Wallet, Bell, CalendarDays, RefreshCw, Trash2, Search,
  Stethoscope, FlaskConical, Filter, Sparkles, Check
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useUser } from "@clerk/clerk-react";
import { toastStyles } from "../../assets/themeStyles.js";
import { API_BASE } from "../../config.js";
import { openRazorpayModal } from "../../utils/razorpay.js";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const isClerkKeyConfigured = 
  Boolean(PUBLISHABLE_KEY) && 
  (PUBLISHABLE_KEY.startsWith("pk_test_") || PUBLISHABLE_KEY.startsWith("pk_live_")) &&
  PUBLISHABLE_KEY !== "pk_test_your_clerk_publishable_key_here";

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

  if (item.status === "Canceled" || item.status === "Cancelled") return "Canceled";
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

const PaymentBadge = ({ payment, paymentStatus }) => {
  const isPaid = paymentStatus === "Paid";
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
        payment === "Online"
          ? "bg-blue-50 text-blue-700 border-blue-200"
          : "bg-amber-50 text-amber-700 border-amber-200"
      }`}>
        {payment === "Online" ? <CreditCard className="w-3 h-3" /> : <Wallet className="w-3 h-3" />}
        {payment === "Online" ? "Online" : "Pay at Clinic"}
      </span>
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
        isPaid
          ? "bg-emerald-100 text-emerald-800"
          : "bg-slate-100 text-slate-600"
      }`}>
        {isPaid ? <Check className="w-3 h-3" /> : null}
        {isPaid ? "Paid" : "Unpaid"}
      </span>
    </div>
  );
};

const StatusBadge = ({ itemStatus }) => {
  if (itemStatus === "Completed")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
        <CheckCircle2 className="w-3 h-3 text-slate-500" /> Completed
      </span>
    );

  if (itemStatus === "Confirmed")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
        <Bell className="w-3 h-3 text-emerald-600" /> Confirmed
      </span>
    );

  if (itemStatus === "Pending")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
        <Clock className="w-3 h-3 text-amber-600" /> Pending
      </span>
    );

  if (itemStatus === "Canceled" || itemStatus === "Cancelled")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
        <XCircle className="w-3 h-3 text-rose-500" /> Canceled
      </span>
    );

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
      <CalendarDays className="w-3 h-3 text-indigo-500" /> Rescheduled
    </span>
  );
};

function AppointmentPageContent({ userId, userEmail, isSignedIn, isLoaded }) {
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [doctorAppts, setDoctorAppts] = useState([]);
  const [serviceAppts, setServiceAppts] = useState([]);
  const [error, setError] = useState(null);

  // Category & Status tabs
  const [activeCategory, setActiveCategory] = useState("all"); // "all", "doctors", "services"
  const [activeStatusFilter, setActiveStatusFilter] = useState("all"); // "all", "upcoming", "completed", "canceled"

  // Search by phone number
  const [searchMobile, setSearchMobile] = useState("");
  const [activeLookupMobile, setActiveLookupMobile] = useState("");

  const resolvedCreatedBy = userId || "anonymous";

  const loadDoctorAppointments = useCallback(async () => {
    if (isClerkKeyConfigured && !isLoaded) return;
    setLoadingDoctors(true);

    try {
      const params = new URLSearchParams();
      if (activeLookupMobile) {
        params.append("mobile", activeLookupMobile);
      } else {
        if (resolvedCreatedBy && resolvedCreatedBy !== "anonymous") {
          params.append("createdBy", resolvedCreatedBy);
        }
        if (userEmail) {
          params.append("email", userEmail);
        }
        if (!resolvedCreatedBy || resolvedCreatedBy === "anonymous") {
          params.append("createdBy", "anonymous");
        }
      }

      const res = await fetch(`${API_BASE}/api/appointments/me?${params.toString()}`);
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
  }, [resolvedCreatedBy, userEmail, activeLookupMobile, isLoaded]);

  const loadServiceAppointments = useCallback(async () => {
    if (isClerkKeyConfigured && !isLoaded) return;
    setLoadingServices(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (activeLookupMobile) {
        params.append("mobile", activeLookupMobile);
      } else {
        if (resolvedCreatedBy && resolvedCreatedBy !== "anonymous") {
          params.append("createdBy", resolvedCreatedBy);
        }
        if (userEmail) {
          params.append("email", userEmail);
        }
        if (!resolvedCreatedBy || resolvedCreatedBy === "anonymous") {
          params.append("createdBy", "anonymous");
        }
      }

      const res = await fetch(`${API_BASE}/api/service-appointments/me?${params.toString()}`);
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
  }, [resolvedCreatedBy, userEmail, activeLookupMobile, isLoaded]);

  useEffect(() => {
    loadDoctorAppointments();
    loadServiceAppointments();
  }, [loadDoctorAppointments, loadServiceAppointments]);

  const handleMobileLookup = (e) => {
    e.preventDefault();
    const clean = (searchMobile || "").trim();
    if (!clean || clean.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    setActiveLookupMobile(clean);
  };

  const clearMobileLookup = () => {
    setSearchMobile("");
    setActiveLookupMobile("");
  };

  const handleRefreshAll = () => {
    loadDoctorAppointments();
    loadServiceAppointments();
    toast.success("Refreshed bookings", { id: "refresh-toast" });
  };

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

  const handlePayOnline = async (item, type = "doctor") => {
    try {
      const amount = type === "service" ? (item.price || 0) : (item.fees || 500);
      toast.loading("Opening Razorpay payment gateway...", { id: "pay-toast" });

      const res = await fetch(`${API_BASE}/api/payment/razorpay/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: item.id,
          type,
          amount,
        }),
      });

      const json = await res.json().catch(() => null);
      toast.dismiss("pay-toast");

      if (!res.ok || !json?.order) {
        toast.error(json?.message || "Failed to initialize payment");
        return;
      }

      await openRazorpayModal({
        order: json.order,
        keyId: json.keyId,
        appointmentId: item.id,
        type,
        patient: { name: item.patientName },
        amount,
        title: type === "service" ? `Diagnostic Test: ${item.name}` : `Consultation: Dr. ${item.doctor}`,
        onSuccess: () => {
          toast.success("Payment verified! Appointment confirmed.", {
            style: toastStyles?.successToast,
          });
          loadDoctorAppointments();
          loadServiceAppointments();
        },
        onError: (err) => {
          toast.error(err.message || "Payment could not be completed");
        },
      });
    } catch (err) {
      console.error(err);
      toast.dismiss("pay-toast");
      toast.error("Payment error");
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
        paymentStatus: a.payment?.status || "Pending",
        fees: a.fees || a.fee || 500,
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
        paymentStatus: s.payment?.status || "Pending",
        status,
        rescheduledTo,
      };
    }).map((x) => ({ ...x, status: computeStatus(x) }));
  }, [serviceAppts]);

  // Filtered lists based on active status filter
  const filteredDoctors = useMemo(() => {
    if (activeStatusFilter === "all") return appointmentData;
    if (activeStatusFilter === "upcoming") {
      return appointmentData.filter(d => d.status === "Confirmed" || d.status === "Pending");
    }
    if (activeStatusFilter === "completed") {
      return appointmentData.filter(d => d.status === "Completed");
    }
    if (activeStatusFilter === "canceled") {
      return appointmentData.filter(d => d.status === "Canceled");
    }
    return appointmentData;
  }, [appointmentData, activeStatusFilter]);

  const filteredServices = useMemo(() => {
    if (activeStatusFilter === "all") return serviceData;
    if (activeStatusFilter === "upcoming") {
      return serviceData.filter(s => s.status === "Confirmed" || s.status === "Pending");
    }
    if (activeStatusFilter === "completed") {
      return serviceData.filter(s => s.status === "Completed");
    }
    if (activeStatusFilter === "canceled") {
      return serviceData.filter(s => s.status === "Canceled");
    }
    return serviceData;
  }, [serviceData, activeStatusFilter]);

  const isGuest = !isSignedIn && (!userId || userId === "anonymous");
  const hasNoBookings = doctorAppts.length === 0 && serviceAppts.length === 0;

  return (
    <div className="min-h-screen bg-linear-to-b from-emerald-50/60 via-slate-50 to-emerald-50/20 py-10 px-4 sm:px-6 lg:px-8">
      {error && (
        <div className="max-w-7xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <Toaster position="top-center" reverseOrder={false} />

      <div className="max-w-7xl mx-auto">
        
        {/* Page Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100/80 text-emerald-800 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Patient Care Hub
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              My Bookings & Consultations
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-2xl">
              Track and manage your upcoming doctor consultations, appointments, and diagnostic laboratory tests.
            </p>
          </div>
          
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={handleRefreshAll}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-slate-700 hover:text-emerald-700 bg-white border border-slate-200 hover:border-emerald-300 shadow-xs hover:shadow-sm transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${loadingDoctors || loadingServices ? "animate-spin" : ""}`} />
              <span>Refresh Bookings</span>
            </button>
          </div>
        </div>

        {/* Mobile Lookup & Filter Strip */}
        <div className="bg-white/80 backdrop-blur-md border border-emerald-100/80 rounded-3xl p-4 sm:p-5 mb-8 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Category Switcher Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl shrink-0 overflow-x-auto">
              <button
                onClick={() => setActiveCategory("all")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeCategory === "all"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>All Bookings</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-semibold">
                  {appointmentData.length + serviceData.length}
                </span>
              </button>

              <button
                onClick={() => setActiveCategory("doctors")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeCategory === "doctors"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-emerald-700"
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Doctor Visits</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                  activeCategory === "doctors" ? "bg-white/25 text-white" : "bg-emerald-100 text-emerald-800"
                }`}>
                  {appointmentData.length}
                </span>
              </button>

              <button
                onClick={() => setActiveCategory("services")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeCategory === "services"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-blue-700"
                }`}
              >
                <FlaskConical className="w-3.5 h-3.5" />
                <span>Lab Tests</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                  activeCategory === "services" ? "bg-white/25 text-white" : "bg-blue-100 text-blue-800"
                }`}>
                  {serviceData.length}
                </span>
              </button>
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filter:
              </span>
              {[
                { key: "all", label: "All Statuses" },
                { key: "upcoming", label: "Upcoming / Confirmed" },
                { key: "completed", label: "Completed" },
                { key: "canceled", label: "Canceled" },
              ].map((pill) => (
                <button
                  key={pill.key}
                  onClick={() => setActiveStatusFilter(pill.key)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    activeStatusFilter === pill.key
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Mobile Lookup Search Form */}
            <form onSubmit={handleMobileLookup} className="flex items-center gap-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="Lookup 10-digit phone"
                  value={searchMobile}
                  onChange={(e) => setSearchMobile(e.target.value.replace(/\D/g, ""))}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-full focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 text-slate-800 placeholder-slate-400 w-44"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition shadow-xs shrink-0 cursor-pointer"
              >
                Search
              </button>
              {activeLookupMobile && (
                <button
                  type="button"
                  onClick={clearMobileLookup}
                  className="px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer shrink-0"
                >
                  Clear
                </button>
              )}
            </form>

          </div>
        </div>

        {/* Active Lookup Filter Notice */}
        {activeLookupMobile && (
          <div className="mb-6 flex items-center justify-between p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-medium">
            <span>Showing bookings matched with phone: <strong>{activeLookupMobile}</strong></span>
            <button onClick={clearMobileLookup} className="text-blue-700 underline font-bold cursor-pointer">
              Show All My Bookings
            </button>
          </div>
        )}

        {/* Empty State when no bookings */}
        {hasNoBookings && !loadingDoctors && !loadingServices && (
          <div className="bg-white/90 backdrop-blur-md rounded-3xl p-10 border border-emerald-100 text-center mb-8 shadow-sm">
            {isGuest ? (
              <>
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Guest Patient Session</h3>
                <p className="text-slate-600 text-sm max-w-md mx-auto mb-6">
                  To sync and access your appointment records across all your devices, sign in to your MediCare patient account.
                </p>
                <Link
                  to="/login"
                  className="inline-block px-7 py-3 rounded-full bg-linear-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-md shadow-emerald-600/20 hover:from-emerald-700 hover:to-teal-700 transition"
                >
                  Sign In to View Full History
                </Link>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CalendarDays className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No Active Appointments Found</h3>
                <p className="text-slate-600 text-sm max-w-md mx-auto mb-6">
                  You do not have any active appointments or diagnostic tests booked yet. Browse our verified doctors to book your next consultation.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link
                    to="/doctors"
                    className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition"
                  >
                    Find Verified Doctors
                  </Link>
                  <Link
                    to="/services"
                    className="px-6 py-2.5 rounded-full bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-semibold text-xs shadow-xs transition"
                  >
                    Browse Diagnostic Tests
                  </Link>
                </div>
              </>
            )}
          </div>
        )}

        {/* SECTION 1: DOCTOR CONSULTATIONS */}
        {(activeCategory === "all" || activeCategory === "doctors") && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                    Doctor Consultations
                  </h2>
                  <p className="text-xs text-slate-500">Scheduled clinical appointments with certified doctors</p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-400">
                {filteredDoctors.length} {filteredDoctors.length === 1 ? "Appointment" : "Appointments"}
              </span>
            </div>

            {loadingDoctors ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-100">
                <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">Loading consultations...</p>
              </div>
            ) : filteredDoctors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredDoctors.map((item) => (
                  <div 
                    key={item.id} 
                    className="bg-white rounded-3xl p-5 border border-emerald-100/80 shadow-md shadow-emerald-900/5 hover:shadow-lg hover:border-emerald-200 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top row: Avatar + Doctor Name + Specialty */}
                      <div className="flex items-start gap-3.5 mb-4">
                        <img
                          src={item.image || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=150"}
                          alt={item.doctor}
                          className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-100 shrink-0"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=150";
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <h3 className="text-sm font-bold text-slate-900 truncate">
                              {item.doctor}
                            </h3>
                            <StatusBadge itemStatus={item.status} />
                          </div>
                          <p className="text-xs font-semibold text-emerald-700 truncate">
                            {item.specialization || "Clinical Specialist"}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            Patient: <strong className="text-slate-700">{item.patientName}</strong>
                          </p>
                        </div>
                      </div>

                      {/* Date & Time pill badges */}
                      <div className="grid grid-cols-2 gap-2 mb-3.5">
                        <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs font-medium text-slate-700">
                          <CalendarDays className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{item.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs font-medium text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{item.time}</span>
                        </div>
                      </div>

                      {/* Payment & Fee Status */}
                      <div className="flex items-center justify-between pt-2 pb-3 border-t border-slate-100">
                        <PaymentBadge payment={item.payment} paymentStatus={item.paymentStatus} />
                        <span className="text-sm font-extrabold text-slate-800">
                          ₹{item.fees || 500}
                        </span>
                      </div>

                      {/* Rescheduled notice banner */}
                      {item.status === "Rescheduled" && item.rescheduledTo && (
                        <div className="text-[11px] text-indigo-700 font-semibold mb-3 bg-indigo-50 border border-indigo-100 rounded-xl p-2.5 text-center">
                          Rescheduled to: {item.rescheduledTo.date} at {item.rescheduledTo.time}
                        </div>
                      )}
                    </div>

                    {/* Actions footer */}
                    <div className="pt-2 space-y-2">
                      {item.paymentStatus !== "Paid" && item.status !== "Canceled" && (
                        <button
                          onClick={() => handlePayOnline(item, "doctor")}
                          className="w-full flex items-center justify-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition py-2.5 rounded-xl shadow-xs cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5" /> Pay ₹{item.fees || 500} via Razorpay
                        </button>
                      )}

                      {item.status !== "Canceled" && item.status !== "Completed" && (
                        <button
                          onClick={() => handleCancelDoctorAppt(item.id)}
                          className="w-full flex items-center justify-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition py-2 border border-rose-100 rounded-xl cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Cancel Appointment
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-white/70 rounded-3xl border border-slate-100">
                <p className="text-xs text-slate-500">No doctor appointments match this filter.</p>
              </div>
            )}
          </div>
        )}

        {/* SECTION 2: DIAGNOSTIC TESTS */}
        {(activeCategory === "all" || activeCategory === "services") && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <FlaskConical className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                    Diagnostic Lab Tests
                  </h2>
                  <p className="text-xs text-slate-500">Pathology tests and diagnostic imaging reservations</p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-400">
                {filteredServices.length} {filteredServices.length === 1 ? "Test" : "Tests"}
              </span>
            </div>

            {loadingServices ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-100">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">Loading diagnostic slots...</p>
              </div>
            ) : filteredServices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredServices.map((srv) => (
                  <div 
                    key={srv.id} 
                    className="bg-white rounded-3xl p-5 border border-blue-100/80 shadow-md shadow-blue-900/5 hover:shadow-lg hover:border-blue-200 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top row: Image + Test Name */}
                      <div className="flex items-start gap-3.5 mb-4">
                        <img
                          src={srv.image || "https://images.unsplash.com/photo-1579684389782-64d84b5e901a?auto=format&fit=crop&q=80&w=150"}
                          alt={srv.name}
                          className="w-14 h-14 rounded-2xl object-cover border-2 border-blue-100 shrink-0"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "https://images.unsplash.com/photo-1579684389782-64d84b5e901a?auto=format&fit=crop&q=80&w=150";
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <h3 className="text-sm font-bold text-slate-900 truncate">
                              {srv.name}
                            </h3>
                            <StatusBadge itemStatus={srv.status} />
                          </div>
                          <p className="text-xs font-semibold text-blue-700">
                            Diagnostic Pathology
                          </p>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            Patient: <strong className="text-slate-700">{srv.patientName}</strong>
                          </p>
                        </div>
                      </div>

                      {/* Date & Time pill badges */}
                      <div className="grid grid-cols-2 gap-2 mb-3.5">
                        <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs font-medium text-slate-700">
                          <CalendarDays className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">{srv.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs font-medium text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">{srv.time}</span>
                        </div>
                      </div>

                      {/* Payment & Price */}
                      <div className="flex items-center justify-between pt-2 pb-3 border-t border-slate-100">
                        <PaymentBadge payment={srv.payment} paymentStatus={srv.paymentStatus} />
                        <span className="text-sm font-extrabold text-blue-800">
                          ₹{srv.price}
                        </span>
                      </div>

                      {/* Rescheduled notice banner */}
                      {srv.status === "Rescheduled" && srv.rescheduledTo && (
                        <div className="text-[11px] text-indigo-700 font-semibold mb-3 bg-indigo-50 border border-indigo-100 rounded-xl p-2.5 text-center">
                          Rescheduled to: {srv.rescheduledTo.date} at {srv.rescheduledTo.time}
                        </div>
                      )}
                    </div>

                    {/* Actions footer */}
                    <div className="pt-2 space-y-2">
                      {srv.paymentStatus !== "Paid" && srv.status !== "Canceled" && (
                        <button
                          onClick={() => handlePayOnline(srv, "service")}
                          className="w-full flex items-center justify-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition py-2.5 rounded-xl shadow-xs cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5" /> Pay ₹{srv.price} via Razorpay
                        </button>
                      )}

                      {srv.status !== "Canceled" && srv.status !== "Completed" && (
                        <button
                          onClick={() => handleCancelServiceAppt(srv.id)}
                          className="w-full flex items-center justify-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition py-2 border border-rose-100 rounded-xl cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Cancel Test Slot
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-white/70 rounded-3xl border border-slate-100">
                <p className="text-xs text-slate-500">No diagnostic tests match this filter.</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

function ClerkAppointmentWrapper() {
  const { user, isLoaded, isSignedIn } = useUser();
  return (
    <AppointmentPageContent
      userId={user?.id}
      userEmail={user?.primaryEmailAddress?.emailAddress}
      isSignedIn={isSignedIn}
      isLoaded={isLoaded}
    />
  );
}

function LocalAppointmentWrapper() {
  let userId = "anonymous";
  let userEmail = "";
  let isSignedIn = false;
  try {
    const patientStr = localStorage.getItem("patientUser_v1");
    if (patientStr) {
      const p = JSON.parse(patientStr);
      userId = p.id || p._id || "anonymous";
      userEmail = p.email || "";
      isSignedIn = Boolean(p.id || p._id);
    }
  } catch {
    userId = "anonymous";
  }
  return (
    <AppointmentPageContent
      userId={userId}
      userEmail={userEmail}
      isSignedIn={isSignedIn}
      isLoaded={true}
    />
  );
}

export default function AppointmentPage() {
  if (isClerkKeyConfigured) {
    return <ClerkAppointmentWrapper />;
  }
  return <LocalAppointmentWrapper />;
}
