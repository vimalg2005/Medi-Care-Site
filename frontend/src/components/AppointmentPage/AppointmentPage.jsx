import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { 
  Calendar, Clock, AlertCircle, CheckCircle, XCircle, 
  CreditCard, Wallet, Bell, CalendarDays, RefreshCw, Trash2, Search 
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useUser } from "@clerk/clerk-react";
import { appointmentPageStyles, cardStyles, badgeStyles, iconSize, toastStyles } from "../../assets/themeStyles.js";

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

function AppointmentPageContent({ userId, userEmail, isSignedIn, isLoaded }) {
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [doctorAppts, setDoctorAppts] = useState([]);
  const [serviceAppts, setServiceAppts] = useState([]);
  const [error, setError] = useState(null);

  // Search by phone number
  const [searchMobile, setSearchMobile] = useState("");
  const [activeLookupMobile, setActiveLookupMobile] = useState("");

  const resolvedCreatedBy = userId || "anonymous";

  const loadDoctorAppointments = useCallback(async () => {
    if (isClerkKeyConfigured && !isLoaded) return;
    setLoadingDoctors(true);
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

  const isGuest = !isSignedIn && (!userId || userId === "anonymous");
  const hasNoBookings = doctorAppts.length === 0 && serviceAppts.length === 0;

  return (
    <div className={appointmentPageStyles.pageContainer}>
      <Toaster position="top-center" reverseOrder={false} />
      <div className={appointmentPageStyles.maxWidthContainer}>
        
        {/* Page Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-emerald-950 font-serif">
              My Bookings & Consultations
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              View and manage your scheduled doctor appointments and clinical diagnostic tests.
            </p>
          </div>
          <button
            onClick={handleRefreshAll}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-emerald-700 bg-white border border-emerald-200 hover:bg-emerald-50 shadow-xs transition self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingDoctors || loadingServices ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Mobile Lookup Helper Banner */}
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 mb-8 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-900 text-xs sm:text-sm font-medium">
            <Search className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Search bookings by phone number:</span>
          </div>
          <form onSubmit={handleMobileLookup} className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="tel"
              maxLength={10}
              placeholder="10-digit mobile"
              value={searchMobile}
              onChange={(e) => setSearchMobile(e.target.value)}
              className="px-3.5 py-1.5 text-xs sm:text-sm bg-white border border-emerald-300 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-400 text-emerald-900 placeholder-emerald-400 w-full sm:w-44"
            />
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition shadow-xs shrink-0 cursor-pointer"
            >
              Search
            </button>
            {activeLookupMobile && (
              <button
                type="button"
                onClick={clearMobileLookup}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer shrink-0"
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {/* Active Lookup Filter Notice */}
        {activeLookupMobile && (
          <div className="mb-6 flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-medium">
            <span>Showing bookings matched with phone: <strong>{activeLookupMobile}</strong></span>
            <button onClick={clearMobileLookup} className="text-blue-700 underline font-bold cursor-pointer">
              Show All My Bookings
            </button>
          </div>
        )}

        {/* Empty State when no bookings */}
        {hasNoBookings && !loadingDoctors && !loadingServices && (
          <div className="bg-white rounded-3xl p-8 border border-emerald-100 text-center mb-8 shadow-xs">
            {isGuest ? (
              <>
                <AlertCircle className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-emerald-950 mb-2">Patient Dashboard</h3>
                <p className="text-slate-600 text-sm max-w-md mx-auto mb-4">
                  To view and manage your booked appointments across devices, please sign in or register with your account.
                </p>
                <Link
                  to="/login"
                  className="inline-block px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition shadow-md mb-6"
                >
                  Sign In Now
                </Link>
              </>
            ) : (
              <>
                <CalendarDays className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-emerald-950 mb-2">No Active Bookings Found</h3>
                <p className="text-slate-600 text-sm max-w-md mx-auto mb-6">
                  You don't have any appointments booked yet. Schedule a consultation with our verified doctors or book a diagnostic laboratory test.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Link
                    to="/doctors"
                    className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md transition"
                  >
                    Find Doctors
                  </Link>
                  <Link
                    to="/services"
                    className="px-6 py-2.5 rounded-full bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-semibold shadow-xs transition"
                  >
                    Browse Diagnostic Services
                  </Link>
                </div>
              </>
            )}
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

                {item.paymentStatus !== "Paid" && item.status !== "Canceled" && (
                  <button
                    onClick={() => handlePayOnline(item, "doctor")}
                    className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition w-full py-2 rounded-xl shadow-xs cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" /> Pay ₹{item.fees || 500} Online
                  </button>
                )}

                {item.status !== "Canceled" && item.status !== "Completed" && (
                  <button
                    onClick={() => handleCancelDoctorAppt(item.id)}
                    className="mt-2 flex items-center justify-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-700 transition w-full py-1.5 border border-rose-100 hover:bg-rose-50 rounded-full cursor-pointer"
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

                {srv.paymentStatus !== "Paid" && srv.status !== "Canceled" && (
                  <button
                    onClick={() => handlePayOnline(srv, "service")}
                    className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition w-full py-2 rounded-xl shadow-xs cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" /> Pay ₹{srv.price} Online
                  </button>
                )}

                {srv.status !== "Canceled" && srv.status !== "Completed" && (
                  <button
                    onClick={() => handleCancelServiceAppt(srv.id)}
                    className="mt-2 flex items-center justify-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-700 transition w-full py-1.5 border border-rose-100 hover:bg-rose-50 rounded-full cursor-pointer"
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
  } catch (e) {}
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
