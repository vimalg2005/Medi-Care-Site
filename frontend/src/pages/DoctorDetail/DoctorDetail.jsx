import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Star, Heart, Award, Users, Stethoscope, 
  MapPin, Calendar, Clock, DollarSign, User, Phone, Mail, Sparkles,
  ShieldCheck, CheckCircle2, Sun, Sunset, Moon, CreditCard, Banknote
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

function DoctorDetailContent({ currentUser }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Booking form states
  const [selectedDate, setSelectedDate] = useState(""); // YYYY-MM-DD
  const [selectedTime, setSelectedTime] = useState("");
  const [patientName, setPatientName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [paymentMethod, setPaymentMethod] = useState("Online");
  const [bookingBusy, setBookingBusy] = useState(false);

  useEffect(() => {
    if (currentUser) {
      if (!patientName && (currentUser.fullName || currentUser.name)) {
        setPatientName(currentUser.fullName || currentUser.name);
      }
      if (!email) {
        const mail = currentUser.primaryEmailAddress?.emailAddress || currentUser.email;
        if (mail) setEmail(mail);
      }
    }
  }, [currentUser, patientName, email]);

  // Fetch Doctor Profile
  useEffect(() => {
    const fetchDoc = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/doctors/${id}`);
        if (!res.ok) throw new Error("Doctor profile not found");
        const json = await res.json();
        setDoctor(json.data || json.doctor);
      } catch (err) {
        setError(err.message || "Failed to load doctor details");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDoc();
  }, [id]);

  // Schedule map with 7-day rolling fallback
  const scheduleMap = useMemo(() => {
    if (doctor?.schedule && typeof doctor.schedule === "object" && Object.keys(doctor.schedule).length > 0) {
      return doctor.schedule;
    }
    const fallback = {};
    const defaultSlots = ["09:00 AM", "10:30 AM", "11:30 AM", "02:00 PM", "03:30 PM", "05:00 PM", "06:30 PM"];
    for (let i = 0; i < 7; i++) {
      const dt = new Date();
      dt.setDate(dt.getDate() + i);
      const iso = dt.toISOString().split("T")[0];
      fallback[iso] = defaultSlots;
    }
    return fallback;
  }, [doctor]);

  // Available dates formatted with Today / Tomorrow indicators
  const availableDates = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    return Object.keys(scheduleMap).sort().map((dateStr) => {
      const d = new Date(dateStr + "T00:00:00");
      let relativeLabel = null;
      if (dateStr === todayStr) relativeLabel = "TODAY";
      else if (dateStr === tomorrowStr) relativeLabel = "TOMORROW";

      return {
        dateStr,
        day: d.getDate(),
        month: d.toLocaleDateString("en-US", { month: "short" }),
        weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
        relativeLabel,
      };
    });
  }, [scheduleMap]);

  // Default select first available date
  useEffect(() => {
    if (availableDates.length > 0 && (!selectedDate || !availableDates.some(d => d.dateStr === selectedDate))) {
      setSelectedDate(availableDates[0].dateStr);
    }
  }, [availableDates, selectedDate]);

  // Available slots for the selected date
  const availableSlots = useMemo(() => {
    if (!selectedDate || !scheduleMap[selectedDate]) return [];
    const slots = scheduleMap[selectedDate];
    return Array.isArray(slots) ? slots : [];
  }, [scheduleMap, selectedDate]);

  // Group slots into Morning, Afternoon, Evening
  const categorizedSlots = useMemo(() => {
    const morning = [];
    const afternoon = [];
    const evening = [];

    availableSlots.forEach((slot) => {
      const isPM = slot.toUpperCase().includes("PM");
      const [time] = slot.split(" ");
      const parts = time.split(":");
      let hour = Number(parts[0]) || 0;
      if (isPM && hour !== 12) hour += 12;
      if (!isPM && hour === 12) hour = 0;

      if (hour < 12) {
        morning.push(slot);
      } else if (hour < 17) {
        afternoon.push(slot);
      } else {
        evening.push(slot);
      }
    });

    return { morning, afternoon, evening };
  }, [availableSlots]);

  // Default select first available slot
  useEffect(() => {
    if (availableSlots.length > 0 && (!selectedTime || !availableSlots.includes(selectedTime))) {
      setSelectedTime(availableSlots[0]);
    }
  }, [availableSlots, selectedTime]);

  const handleBook = async (e) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) {
      toast.error("Please choose a convenient date and time slot");
      return;
    }
    if (!patientName.trim()) {
      toast.error("Please enter patient full name");
      return;
    }
    if (!mobile.trim() || mobile.trim().length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    setBookingBusy(true);
    const createdBy = currentUser?.id || currentUser?._id || "anonymous";

    const payload = {
      doctorId: doctor.id || doctor._id,
      patientName,
      mobile,
      age: Number(age) || undefined,
      gender,
      date: selectedDate,
      time: selectedTime,
      fee: doctor.fee || 0,
      paymentMethod,
      email,
      createdBy,
    };

    try {
      const res = await fetch(`${API_BASE}/api/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error(json?.message || "Booking failed. Please try again.");
        setBookingBusy(false);
        return;
      }

      const createdAppt = json.appointment || json.data;
      const apptId = createdAppt?._id || createdAppt?.id;

      // Online payment via Razorpay
      if (paymentMethod === "Online" && (doctor.fee || 0) > 0 && apptId) {
        toast.loading("Initiating secure Razorpay checkout...", { id: "payment-toast" });

        const orderRes = await fetch(`${API_BASE}/api/payment/razorpay/create-order`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointmentId: apptId,
            type: "doctor",
            amount: doctor.fee || 0,
          }),
        });

        const orderJson = await orderRes.json().catch(() => null);
        toast.dismiss("payment-toast");

        if (!orderRes.ok || !orderJson?.order) {
          toast.error(orderJson?.message || "Failed to initialize payment gateway");
          navigate("/appointments");
          return;
        }

        await openRazorpayModal({
          order: orderJson.order,
          keyId: orderJson.keyId,
          appointmentId: apptId,
          type: "doctor",
          patient: { name: patientName, email, mobile },
          amount: doctor.fee || 0,
          title: `Consultation: Dr. ${doctor.name}`,
          onSuccess: () => {
            toast.success("Payment verified! Appointment confirmed.", {
              style: toastStyles?.successToast,
            });
            navigate("/appointments");
          },
          onError: (err) => {
            toast.error(err.message || "Payment incomplete. You can pay anytime from My Appointments.");
            navigate("/appointments");
          },
        });
      } else {
        toast.success("Consultation booked successfully!", {
          style: toastStyles?.successToast,
        });
        setTimeout(() => {
          navigate("/appointments");
        }, 800);
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error while booking appointment");
      setBookingBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading doctor profile & schedule...</p>
        </div>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Stethoscope className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Doctor Not Found</h2>
          <p className="text-slate-500 text-sm mb-6">{error || "The requested doctor profile could not be loaded."}</p>
          <button
            onClick={() => navigate("/doctors")}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition shadow-md shadow-emerald-600/20"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Doctors Directory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-emerald-50/50 via-slate-50 to-emerald-50/20 pb-20">
      <Toaster position="top-center" reverseOrder={false} />

      {/* Floating Modern Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-emerald-100/60 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate("/doctors")}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/80 border border-slate-200 hover:border-emerald-200 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Directory
          </button>
          
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Verified Medicare Specialist
            </span>
            <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1 rounded-full border border-amber-200/60 text-xs font-bold text-amber-900">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
              <span>{doctor.rating || "4.8"}</span>
              <span className="text-amber-600/70 font-normal">/ 5.0</span>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* DOCTOR PROFILE HERO CARD */}
        <div className="relative overflow-hidden bg-white/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 md:p-10 border border-emerald-100 shadow-xl shadow-emerald-900/5 mb-8">
          {/* Subtle decorative mesh background */}
          <div className="absolute top-0 right-0 -mt-16 -mr-16 w-80 h-80 bg-linear-to-br from-emerald-200/40 via-teal-100/20 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-20 w-64 h-64 bg-emerald-100/30 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left: Avatar + Stats Column */}
            <div className="lg:col-span-4 flex flex-col items-center text-center">
              <div className="relative mb-5 group">
                <div className="absolute inset-0 rounded-full bg-linear-to-tr from-emerald-500 to-teal-400 blur-md opacity-40 group-hover:opacity-60 transition duration-500"></div>
                <img
                  src={doctor.imageUrl || doctor.image || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=350"}
                  alt={doctor.name}
                  className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-full object-cover border-4 border-white shadow-xl"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=350";
                  }}
                />
                <span className="absolute bottom-2 right-2 w-6 h-6 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center text-white shadow-md" title="Doctor is active & accepting appointments">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </span>
              </div>

              {/* Quick Stat Badges */}
              <div className="grid grid-cols-3 gap-2 w-full max-w-sm mt-2">
                <div className="bg-emerald-50/70 border border-emerald-100/80 rounded-2xl p-2.5 text-center">
                  <Heart className="w-4 h-4 mx-auto text-rose-500 mb-1" />
                  <p className="text-sm font-extrabold text-slate-800">{doctor.success || "98%"}</p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Success</p>
                </div>
                <div className="bg-emerald-50/70 border border-emerald-100/80 rounded-2xl p-2.5 text-center">
                  <Users className="w-4 h-4 mx-auto text-emerald-600 mb-1" />
                  <p className="text-sm font-extrabold text-slate-800">{doctor.patients || "1.2k+"}</p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Patients</p>
                </div>
                <div className="bg-emerald-50/70 border border-emerald-100/80 rounded-2xl p-2.5 text-center">
                  <Award className="w-4 h-4 mx-auto text-amber-500 mb-1" />
                  <p className="text-sm font-extrabold text-slate-800">{doctor.experience || "6+ yrs"}</p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Exp.</p>
                </div>
              </div>
            </div>

            {/* Right: Info, Credentials, About Bio */}
            <div className="lg:col-span-8 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs">
                    <Stethoscope className="w-3.5 h-3.5" />
                    {doctor.specialization || "General Physician"}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                    {doctor.qualifications || "MBBS, MD (Specialist)"}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
                  {doctor.name}
                </h1>

                {/* Key metadata strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Clinic / Hospital</p>
                      <p className="text-xs font-semibold text-slate-800 truncate">{doctor.location || "Medicare Central Clinic"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                    <div className="w-9 h-9 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center shrink-0">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Consultation Fee</p>
                      <p className="text-sm font-extrabold text-emerald-700">₹{doctor.fee || 500}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                    <div className="w-9 h-9 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Satisfaction</p>
                      <p className="text-xs font-semibold text-slate-800">100% Guaranteed</p>
                    </div>
                  </div>
                </div>

                {/* About Doctor paragraph */}
                <div className="mt-4 p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100/60">
                  <div className="flex items-center gap-2 mb-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    About Doctor & Clinical Practice
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {doctor.about || "Dedicated healthcare specialist committed to providing patient-centered clinical care, accurate diagnostics, and compassionate medical guidance for lasting wellbeing."}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* BOOKING SCHEDULER SECTION */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 md:p-10 border border-emerald-100 shadow-xl shadow-emerald-900/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-slate-100 gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 mb-2">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                Step 2 of 2: Schedule & Confirm
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Book Consultation Appointment
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Instant slot confirmation • Zero booking fee</span>
            </div>
          </div>

          <form onSubmit={handleBook} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT COLUMN: Date Picker & Time Slot Picker */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* 1. Date Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  1. Select Appointment Date
                </label>
                
                <div className="flex gap-2.5 overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-emerald-200">
                  {availableDates.map((d) => {
                    const isSelected = selectedDate === d.dateStr;
                    return (
                      <button
                        key={d.dateStr}
                        type="button"
                        onClick={() => {
                          setSelectedDate(d.dateStr);
                          setSelectedTime("");
                        }}
                        className={`relative shrink-0 flex flex-col items-center justify-center w-20 py-3.5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-linear-to-b from-emerald-600 to-teal-700 text-white border-emerald-600 shadow-lg shadow-emerald-600/25 scale-[1.03]"
                            : "bg-white hover:bg-emerald-50/50 text-slate-700 border-slate-200 hover:border-emerald-300"
                        }`}
                      >
                        {d.relativeLabel && (
                          <span className={`absolute -top-2.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide uppercase ${
                            isSelected
                              ? "bg-amber-400 text-amber-950 shadow-xs"
                              : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {d.relativeLabel}
                          </span>
                        )}
                        <span className={`text-[11px] font-bold uppercase ${isSelected ? "text-emerald-100" : "text-slate-400"}`}>
                          {d.weekday}
                        </span>
                        <span className="text-xl font-extrabold my-0.5">
                          {d.day}
                        </span>
                        <span className={`text-[10px] font-semibold uppercase ${isSelected ? "text-emerald-100" : "text-slate-500"}`}>
                          {d.month}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Categorized Time Slots */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    2. Choose Available Time Slot
                  </span>
                  {selectedTime && (
                    <span className="text-emerald-700 font-semibold lowercase text-xs">
                      Selected: <strong>{selectedTime}</strong>
                    </span>
                  )}
                </label>

                {availableSlots.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-slate-500 text-sm">
                    No time slots configured for this date. Please select another date above.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Morning Slots */}
                    {categorizedSlots.morning.length > 0 && (
                      <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2.5">
                          <Sun className="w-3.5 h-3.5 text-amber-500" />
                          <span>Morning Slots</span>
                          <span className="text-[10px] text-slate-400 font-normal">({categorizedSlots.morning.length} slots)</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {categorizedSlots.morning.map((slot) => {
                            const isSelected = selectedTime === slot;
                            return (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => setSelectedTime(slot)}
                                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                                  isSelected
                                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-105"
                                    : "bg-white text-slate-700 border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50"
                                }`}
                              >
                                <Clock className="w-3 h-3" />
                                {slot}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Afternoon Slots */}
                    {categorizedSlots.afternoon.length > 0 && (
                      <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2.5">
                          <Sunset className="w-3.5 h-3.5 text-orange-500" />
                          <span>Afternoon Slots</span>
                          <span className="text-[10px] text-slate-400 font-normal">({categorizedSlots.afternoon.length} slots)</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {categorizedSlots.afternoon.map((slot) => {
                            const isSelected = selectedTime === slot;
                            return (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => setSelectedTime(slot)}
                                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                                  isSelected
                                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-105"
                                    : "bg-white text-slate-700 border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50"
                                }`}
                              >
                                <Clock className="w-3 h-3" />
                                {slot}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Evening Slots */}
                    {categorizedSlots.evening.length > 0 && (
                      <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2.5">
                          <Moon className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Evening Slots</span>
                          <span className="text-[10px] text-slate-400 font-normal">({categorizedSlots.evening.length} slots)</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {categorizedSlots.evening.map((slot) => {
                            const isSelected = selectedTime === slot;
                            return (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => setSelectedTime(slot)}
                                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                                  isSelected
                                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-105"
                                    : "bg-white text-slate-700 border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50"
                                }`}
                              >
                                <Clock className="w-3 h-3" />
                                {slot}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Patient Information Form */}
              <div className="pt-4 border-t border-slate-100">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-emerald-600" />
                  3. Patient Contact & Intake Details
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Patient Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Patient Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="e.g. John Doe"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                        required
                      />
                    </div>
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Mobile Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="10-digit mobile number"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                        required
                      />
                    </div>
                  </div>

                  {/* Age */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Patient Age <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      placeholder="e.g. 28"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                      required
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Gender
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Email */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Email Address (For Appointment Confirmation & Slip)
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        placeholder="john.doe@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Booking Summary & Payment Mode */}
            <div className="lg:col-span-5">
              <div className="bg-linear-to-br from-emerald-50/80 via-white to-teal-50/50 p-6 rounded-3xl border border-emerald-200/80 shadow-md sticky top-24">
                <h3 className="text-base font-bold text-slate-800 pb-3 mb-4 border-b border-emerald-100 flex items-center justify-between">
                  <span>Consultation Order Summary</span>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                    Active Doctor
                  </span>
                </h3>

                {/* Summary details */}
                <div className="space-y-3 text-xs sm:text-sm mb-6">
                  <div className="flex justify-between items-center py-1.5 border-b border-dashed border-emerald-100">
                    <span className="text-slate-500">Consultant:</span>
                    <span className="font-bold text-slate-800">{doctor.name}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-dashed border-emerald-100">
                    <span className="text-slate-500">Specialization:</span>
                    <span className="font-semibold text-emerald-700">{doctor.specialization}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-dashed border-emerald-100">
                    <span className="text-slate-500">Selected Date:</span>
                    <span className="font-bold text-slate-800">{selectedDate || "Not chosen"}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-dashed border-emerald-100">
                    <span className="text-slate-500">Selected Time:</span>
                    <span className="font-bold text-slate-800">{selectedTime || "Not chosen"}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 text-base font-bold">
                    <span className="text-slate-800">Total Consultation Fee:</span>
                    <span className="text-emerald-700 text-lg">₹{doctor.fee || 500}</span>
                  </div>
                </div>

                {/* Payment Option Selection */}
                <div className="mb-6">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Select Payment Mode:
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Online payment card */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("Online")}
                      className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        paymentMethod === "Online"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20"
                          : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <CreditCard className="w-4 h-4" />
                        <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                          paymentMethod === "Online" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
                        }`}>
                          Fastest
                        </span>
                      </div>
                      <p className="text-xs font-bold">Pay Online</p>
                      <p className={`text-[10px] ${paymentMethod === "Online" ? "text-emerald-100" : "text-slate-400"}`}>
                        UPI, Cards, NetBanking
                      </p>
                    </button>

                    {/* Pay at clinic card */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("Cash")}
                      className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        paymentMethod === "Cash"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20"
                          : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Banknote className="w-4 h-4" />
                        <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                          paymentMethod === "Cash" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                        }`}>
                          Desk
                        </span>
                      </div>
                      <p className="text-xs font-bold">Pay at Clinic</p>
                      <p className={`text-[10px] ${paymentMethod === "Cash" ? "text-emerald-100" : "text-slate-400"}`}>
                        Cash or Card at counter
                      </p>
                    </button>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={bookingBusy || !selectedDate || !selectedTime}
                  className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm text-center shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 ${
                    selectedDate && selectedTime && !bookingBusy
                      ? "bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-600/25"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                  }`}
                >
                  {bookingBusy ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing Booking...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Schedule Appointment</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-center text-slate-400 mt-3">
                  Safe & encrypted appointment reservation • 100% verified doctors
                </p>
              </div>
            </div>

          </form>
        </div>

      </main>
    </div>
  );
}

function ClerkDoctorDetailWrapper() {
  const { user } = useUser();
  return <DoctorDetailContent currentUser={user} />;
}

function LocalDoctorDetailWrapper() {
  let user = null;
  try {
    const patUser = localStorage.getItem("patientUser_v1");
    if (patUser) user = JSON.parse(patUser);
  } catch {
    user = null;
  }
  return <DoctorDetailContent currentUser={user} />;
}

export default function DoctorDetail() {
  if (isClerkKeyConfigured) {
    return <ClerkDoctorDetailWrapper />;
  }
  return <LocalDoctorDetailWrapper />;
}
