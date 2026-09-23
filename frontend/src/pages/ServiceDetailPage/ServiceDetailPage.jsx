import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  ArrowLeft, Calendar, Clock, Clipboard, DollarSign, 
  CheckCircle, Shield, User, Phone, Mail, AlertCircle 
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useUser } from "@clerk/clerk-react";
import { serviceDetailStyles, toastStyles } from "../../assets/themeStyles.js";

import { API_BASE } from "../../config.js";
import { openRazorpayModal } from "../../utils/razorpay.js";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const isClerkKeyConfigured = 
  Boolean(PUBLISHABLE_KEY) && 
  (PUBLISHABLE_KEY.startsWith("pk_test_") || PUBLISHABLE_KEY.startsWith("pk_live_")) &&
  PUBLISHABLE_KEY !== "pk_test_your_clerk_publishable_key_here";

function ServiceDetailPageContent({ currentUser }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Booking details states
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [patientName, setPatientName] = useState("");
  const [mobile, setMobile] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [email, setEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Online");
  const [bookingBusy, setBookingBusy] = useState(false);

  useEffect(() => {
    if (currentUser) {
      const name = currentUser.fullName || currentUser.name || "";
      const em = currentUser.primaryEmailAddress?.emailAddress || currentUser.email || "";
      if (name && !patientName) setPatientName(name);
      if (em && !email) setEmail(em);
    }
  }, [currentUser, patientName, email]);

  // Fetch Service Details
  useEffect(() => {
    async function loadService() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/services/${id}`);
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          setError(json?.message || "Service details not found");
          setService(null);
          return;
        }

        const data = json.data || json.service || json;
        setService(data);

        // Pre-select first date in slot schedule map
        if (data.slots && typeof data.slots === "object") {
          const dates = Object.keys(data.slots);
          if (dates.length > 0) {
            setSelectedDate(dates[0]);
          }
        }
      } catch (err) {
        console.error(err);
        setError("Network error loading service details");
      } finally {
        setLoading(false);
      }
    }
    loadService();
  }, [id]);

  // Formatted date options with rolling 7-day schedule fallback
  const slotsMap = useMemo(() => {
    const defaultSlots = ["09:00 AM", "10:30 AM", "12:00 PM", "02:30 PM", "04:00 PM"];
    if (service?.slots && typeof service.slots === "object" && !Array.isArray(service.slots) && Object.keys(service.slots).length > 0) {
      return service.slots;
    }

    if (Array.isArray(service?.slots) && service.slots.length > 0) {
      const fallback = {};
      for (let i = 0; i < 7; i++) {
        const dt = new Date();
        dt.setDate(dt.getDate() + i);
        const iso = dt.toISOString().split("T")[0];
        fallback[iso] = service.slots;
      }
      return fallback;
    }

    const fallback = {};
    for (let i = 0; i < 7; i++) {
      const dt = new Date();
      dt.setDate(dt.getDate() + i);
      const iso = dt.toISOString().split("T")[0];
      fallback[iso] = defaultSlots;
    }
    return fallback;
  }, [service]);

  const availableDates = useMemo(() => {
    if (!slotsMap) return [];
    return Object.keys(slotsMap).sort().map(dateStr => {
      const d = new Date(dateStr + "T00:00:00");
      return {
        dateStr,
        day: d.getDate(),
        month: d.toLocaleDateString("en-US", { month: "short" }),
        weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
      };
    });
  }, [slotsMap]);

  // Set default selected date
  useEffect(() => {
    if (availableDates.length > 0 && (!selectedDate || !availableDates.some(d => d.dateStr === selectedDate))) {
      setSelectedDate(availableDates[0].dateStr);
    }
  }, [availableDates, selectedDate]);

  // Available slots for selected date
  const availableSlots = useMemo(() => {
    if (!slotsMap || !selectedDate) return [];
    const slots = slotsMap[selectedDate];
    return Array.isArray(slots) ? slots : [];
  }, [slotsMap, selectedDate]);

  // Set default selected slot
  useEffect(() => {
    if (availableSlots.length > 0 && (!selectedTime || !availableSlots.includes(selectedTime))) {
      setSelectedTime(availableSlots[0]);
    }
  }, [availableSlots, selectedTime]);

  const handleBook = async (e) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) {
      toast.error("Please select a date and time slot for the test");
      return;
    }
    if (!patientName.trim()) {
      toast.error("Please enter patient name");
      return;
    }
    if (!mobile.trim() || mobile.trim().length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    setBookingBusy(true);

    // Split selectedTime (e.g. "10:30 AM") into hour, minute, ampm
    const timeRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i;
    const match = selectedTime.match(timeRegex);
    let hour = 10;
    let minute = 0;
    let ampm = "AM";

    if (match) {
      hour = Number(match[1]);
      minute = Number(match[2]);
      ampm = (match[3] || "AM").toUpperCase();
    }

    const createdBy = currentUser?.id || currentUser?._id || "anonymous";

    const payload = {
      patientName,
      mobile,
      age: Number(age) || undefined,
      gender,
      serviceId: service.id || service._id,
      serviceName: service.name,
      fees: service.price || 0,
      date: selectedDate,
      hour,
      minute,
      ampm,
      paymentMethod,
      email,
      createdBy,
    };

    try {
      const res = await fetch(`${API_BASE}/api/service-appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error(json?.message || "Booking failed. Try again.");
        setBookingBusy(false);
        return;
      }

      const createdAppt = json.data || json.appointment;
      const apptId = createdAppt?._id || createdAppt?.id;

      if (paymentMethod === "Online" && (service.price || 0) > 0 && apptId) {
        toast.loading("Initiating secure Razorpay checkout...", { id: "payment-toast" });

        const orderRes = await fetch(`${API_BASE}/api/payment/razorpay/create-order`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointmentId: apptId,
            type: "service",
            amount: service.price || 0,
          }),
        });

        const orderJson = await orderRes.json().catch(() => null);
        toast.dismiss("payment-toast");

        if (!orderRes.ok || !orderJson?.order) {
          toast.error(orderJson?.message || "Failed to initialize payment");
          navigate("/appointments");
          return;
        }

        await openRazorpayModal({
          order: orderJson.order,
          keyId: orderJson.keyId,
          appointmentId: apptId,
          type: "service",
          patient: { name: patientName, mobile },
          amount: service.price || 0,
          title: `Diagnostic: ${service.name}`,
          onSuccess: () => {
            toast.success("Payment verified! Service Appointment confirmed.", {
              style: toastStyles?.successToast,
            });
            navigate("/appointments");
          },
          onError: (err) => {
            toast.error(err.message || "Payment incomplete. You can pay later from your appointments.");
            navigate("/appointments");
          },
        });
      } else {
        toast.success("Service Appointment booked successfully!", {
          style: toastStyles?.successToast,
        });

        setTimeout(() => {
          navigate("/appointments");
        }, 800);
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error during booking");
      setBookingBusy(false);
    }
  };

  if (loading) {
    return (
      <div className={serviceDetailStyles.loadingContainer}>
        <div className={serviceDetailStyles.loadingCard}>
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-3 text-emerald-800 font-semibold">Loading Service Details...</p>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className={serviceDetailStyles.loadingContainer}>
        <div className="text-center p-6 bg-white rounded-3xl shadow-xl border border-emerald-100 max-w-sm">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <p className="text-rose-700 font-semibold mb-4">{error || "Service profile not found"}</p>
          <button
            onClick={() => navigate("/services")}
            className="px-6 py-2 rounded-full bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition"
          >
            Back to Services
          </button>
        </div>
      </div>
    );
  }

  const image = service.imageUrl || service.image || "https://images.unsplash.com/photo-1579684389782-64d84b5e901a?auto=format&fit=crop&q=80&w=400";

  return (
    <div className={serviceDetailStyles.pageContainer}>
      <Toaster position="top-center" reverseOrder={false} />

      {/* Detail Navigation Header */}
      <div className="bg-white border-b border-emerald-100 p-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate("/services")}
            className={serviceDetailStyles.backButton}
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Services
          </button>
          <span className="font-bold text-emerald-800 text-lg hidden sm:inline-block">
            Diagnostic Test Profile
          </span>
          <div className="px-3 py-1 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider">
            Diagnostics
          </div>
        </div>
      </div>

      <div className={serviceDetailStyles.mainGrid}>
        
        {/* Left Column (Service Banner Image + Contact Details Form) */}
        <div className={serviceDetailStyles.leftColumn}>
          <div className={serviceDetailStyles.imageContainer}>
            <img 
              src={image} 
              alt={service.name} 
              className="w-full h-full object-cover rounded-3xl"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "https://images.unsplash.com/photo-1579684389782-64d84b5e901a?auto=format&fit=crop&q=80&w=400";
              }}
            />
          </div>

          {/* Booking Contact Form */}
          <div className={serviceDetailStyles.detailsContainer}>
            <h3 className={serviceDetailStyles.detailsTitle}>
              <User className="w-5 h-5 text-emerald-600" /> Patient Details
            </h3>

            <div className={serviceDetailStyles.detailsGrid}>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-emerald-600" />
                <input
                  type="text"
                  placeholder="Patient Name"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className={serviceDetailStyles.input + " pl-10 text-sm"}
                  required
                />
              </div>

              <div className="relative">
                <Phone className="absolute left-3.5 top-3 w-4 h-4 text-emerald-600" />
                <input
                  type="tel"
                  placeholder="10 digit phone"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  maxLength="10"
                  className={serviceDetailStyles.input + " pl-10 text-sm"}
                  required
                />
              </div>

              <input
                type="number"
                placeholder="Age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className={serviceDetailStyles.input + " text-sm"}
                min="1"
                required
              />

              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className={serviceDetailStyles.input + " bg-white text-sm"}
              >
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>

              <div className="relative sm:col-span-2">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-emerald-600" />
                <input
                  type="email"
                  placeholder="Email Address (Optional)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={serviceDetailStyles.input + " pl-10 text-sm"}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Service Description, Slots selection, Booking Summary) */}
        <div className={serviceDetailStyles.rightColumn}>
          <h1 className={serviceDetailStyles.serviceName}>{service.name}</h1>
          
          <div className={serviceDetailStyles.aboutContainer}>
            <h3 className={serviceDetailStyles.aboutTitle}>
              <Clipboard className="w-5 h-5 text-emerald-600" /> Test Description
            </h3>
            <p className={serviceDetailStyles.aboutText}>
              {service.about || "This diagnostic medical test checks biological screenings to provide highly accurate laboratory results."}
            </p>
          </div>

          <div className={serviceDetailStyles.priceContainer}>
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <span className={serviceDetailStyles.priceText}>Price: ₹{service.price}</span>
          </div>

          {/* Instructions section */}
          {service.instructions && service.instructions.length > 0 && (
            <div className={serviceDetailStyles.instructionsContainer}>
              <h3 className={serviceDetailStyles.instructionsTitle}>Pre-test Instructions</h3>
              <ul className={serviceDetailStyles.instructionsList}>
                {service.instructions.map((inst, i) => (
                  <li key={i}>{inst}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Date Selector */}
          <div className={serviceDetailStyles.dateSection}>
            <h3 className={serviceDetailStyles.dateTitle}>Select Date</h3>
            <div className={serviceDetailStyles.dateScrollContainer}>
              <div className="flex gap-2 pb-2">
                {availableDates.length > 0 ? (
                  availableDates.map((d) => (
                    <button
                      key={d.dateStr}
                      type="button"
                      onClick={() => {
                        setSelectedDate(d.dateStr);
                        setSelectedTime("");
                      }}
                      className={`p-3 rounded-2xl flex flex-col items-center justify-center min-w-[70px] border cursor-pointer transition-all ${
                        selectedDate === d.dateStr
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                          : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300"
                      }`}
                    >
                      <span className="text-xs font-semibold uppercase opacity-85">{d.weekday}</span>
                      <span className="text-xl font-bold">{d.day}</span>
                      <span className="text-xs uppercase opacity-85">{d.month}</span>
                    </button>
                  ))
                ) : (
                  <p className="text-slate-500 italic py-2">No dates available</p>
                )}
              </div>
            </div>
          </div>

          {/* Time Selector */}
          <div className={serviceDetailStyles.timeSection}>
            <h3 className={serviceDetailStyles.timeTitle}>Available Time Slots</h3>
            <div className="flex flex-wrap gap-2">
              {availableSlots.length > 0 ? (
                availableSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTime(slot)}
                    className={`px-4 py-2 border rounded-full text-sm font-semibold cursor-pointer transition-all flex items-center gap-1 ${
                      selectedTime === slot
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                        : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400"
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" /> {slot}
                  </button>
                ))
              ) : (
                <p className="text-slate-500 italic py-2">
                  {selectedDate ? "No available slots on this date" : "Please select a date first"}
                </p>
              )}
            </div>
          </div>

          {/* Booking Summary */}
          <div className={serviceDetailStyles.summaryContainer}>
            <h4 className={serviceDetailStyles.summaryTitle}>Booking Summary</h4>
            <div className={serviceDetailStyles.summaryContent}>
              <div className="flex justify-between text-sm py-1 border-b border-dashed border-emerald-200/30">
                <span className="text-slate-600">Selected Date:</span>
                <span className="font-semibold text-slate-800">{selectedDate || "—"}</span>
              </div>
              <div className="flex justify-between text-sm py-1 border-b border-dashed border-emerald-200/30">
                <span className="text-slate-600">Selected Slot:</span>
                <span className="font-semibold text-slate-800">{selectedTime || "—"}</span>
              </div>
              <div className="flex justify-between text-sm py-1 border-b border-emerald-200/30">
                <span className="text-slate-600">Total Fees:</span>
                <span className="font-bold text-rose-600">₹{service.price}</span>
              </div>
            </div>

            {/* Payment Options (Cash vs Online) */}
            <div className="mb-4 mt-4 flex items-center gap-3">
              <span className="text-sm font-medium text-emerald-700">Payment Option:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("Cash")}
                  className={`px-3 py-1 rounded-full text-xs font-bold border cursor-pointer transition-all ${
                    paymentMethod === "Cash"
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-slate-600 border-slate-200"
                  }`}
                >
                  Pay Cash at Clinic
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("Online")}
                  className={`px-3 py-1 rounded-full text-xs font-bold border cursor-pointer transition-all ${
                    paymentMethod === "Online"
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-slate-600 border-slate-200"
                  }`}
                >
                  Pay Online
                </button>
              </div>
            </div>

            {/* Submit Trigger Booking */}
            <button
              onClick={handleBook}
              disabled={bookingBusy || !selectedDate || !selectedTime}
              className={`w-full py-3.5 rounded-full font-bold text-sm text-center shadow-lg transition-all active:scale-[0.99] cursor-pointer mt-2 ${
                selectedDate && selectedTime
                  ? "bg-linear-to-r from-emerald-500 to-green-600 text-white hover:shadow-xl"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              {bookingBusy ? "Booking Test Slot..." : "Confirm Diagnostic Booking"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function ClerkServiceDetailWrapper() {
  const { user } = useUser();
  return <ServiceDetailPageContent currentUser={user} />;
}

function LocalServiceDetailWrapper() {
  let user = null;
  try {
    const patUser = localStorage.getItem("patientUser_v1");
    if (patUser) user = JSON.parse(patUser);
  } catch {
    user = null;
  }
  return <ServiceDetailPageContent currentUser={user} />;
}

export default function ServiceDetailPage() {
  if (isClerkKeyConfigured) {
    return <ClerkServiceDetailWrapper />;
  }
  return <LocalServiceDetailWrapper />;
}