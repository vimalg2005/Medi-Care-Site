import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { 
  ArrowLeft, Star, Heart, Award, Users, Stethoscope, 
  MapPin, Calendar, Clock, DollarSign, User, Phone, Mail, Sparkles 
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useUser } from "@clerk/clerk-react";
import { doctorDetailStyles, toastStyles } from "../../assets/themeStyles.js";

import { API_BASE } from "../../config.js";
import { openRazorpayModal } from "../../utils/razorpay.js";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const isClerkKeyConfigured = 
  Boolean(PUBLISHABLE_KEY) && 
  (PUBLISHABLE_KEY.startsWith("pk_test_") || PUBLISHABLE_KEY.startsWith("pk_live_")) &&
  PUBLISHABLE_KEY !== "pk_test_your_clerk_publishable_key_here";

function DoctorDetailContent({ currentUser, isClerk }) {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Booking states
  const [selectedDate, setSelectedDate] = useState(""); // YYYY-MM-DD
  const [selectedTime, setSelectedTime] = useState("");
  const [patientName, setPatientName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [paymentMethod, setPaymentMethod] = useState("Online");
  const [bookingBusy, setBookingBusy] = useState(false);

  // Prefill user details if logged in
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
  }, [currentUser]);

  // Fetch Doctor Data
  useEffect(() => {
    const fetchDoc = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/doctors/${id}`);
        if (!res.ok) throw new Error("Doctor not found");
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

  // Schedule map with 7-day fallback if empty or missing
  const scheduleMap = useMemo(() => {
    if (doctor?.schedule && typeof doctor.schedule === "object" && Object.keys(doctor.schedule).length > 0) {
      return doctor.schedule;
    }
    // Dynamic rolling schedule for next 7 days
    const fallback = {};
    const defaultSlots = ["09:00 AM", "10:30 AM", "11:30 AM", "02:00 PM", "03:30 PM", "05:00 PM"];
    for (let i = 0; i < 7; i++) {
      const dt = new Date();
      dt.setDate(dt.getDate() + i);
      const iso = dt.toISOString().split("T")[0];
      fallback[iso] = defaultSlots;
    }
    return fallback;
  }, [doctor]);

  // Available dates (keys of schedule map formatted for UI buttons)
  const availableDates = useMemo(() => {
    return Object.keys(scheduleMap).sort().map((dateStr) => {
      const d = new Date(dateStr + "T00:00:00");
      return {
        dateStr,
        day: d.getDate(),
        month: d.toLocaleDateString("en-US", { month: "short" }),
        weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
      };
    });
  }, [scheduleMap]);

  // Set default selected date
  useEffect(() => {
    if (availableDates.length > 0 && (!selectedDate || !availableDates.some(d => d.dateStr === selectedDate))) {
      setSelectedDate(availableDates[0].dateStr);
    }
  }, [availableDates, selectedDate]);

  // Time slots for selected date
  const availableSlots = useMemo(() => {
    if (!selectedDate || !scheduleMap[selectedDate]) return [];
    const slots = scheduleMap[selectedDate];
    return Array.isArray(slots) ? slots : [];
  }, [scheduleMap, selectedDate]);

  // Set default selected slot
  useEffect(() => {
    if (availableSlots.length > 0 && (!selectedTime || !availableSlots.includes(selectedTime))) {
      setSelectedTime(availableSlots[0]);
    }
  }, [availableSlots, selectedTime]);

  const handleBook = async (e) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) {
      toast.error("Please select a date and time slot");
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
        toast.error(json?.message || "Booking failed. Try again.");
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
          toast.error(orderJson?.message || "Failed to initialize payment");
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
            toast.error(err.message || "Payment incomplete. You can pay later from your appointments.");
            navigate("/appointments");
          },
        });
      } else {
        toast.success("Appointment booked successfully!", {
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
      <div className={doctorDetailStyles.loadingContainer}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className={doctorDetailStyles.errorContainer}>
        <div className={doctorDetailStyles.errorContent}>
          <p className={doctorDetailStyles.errorText}>{error || "Doctor profile not found"}</p>
          <button
            onClick={() => navigate("/doctors")}
            className={doctorDetailStyles.backButton}
          >
            <ArrowLeft className="w-5 h-5 mr-2" /> Back to List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={doctorDetailStyles.pageContainer}>
      <Toaster position="top-center" reverseOrder={false} />

      {/* Floating header section */}
      <div className="bg-white border-b border-emerald-100 p-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate("/doctors")}
            className={doctorDetailStyles.headerBackButton}
          >
            <ArrowLeft className="w-5 h-5 mr-1" /> Back
          </button>
          <span className="font-bold text-emerald-800 text-lg hidden sm:inline-block">
            Doctor Profile
          </span>
          <div className={doctorDetailStyles.headerRatingContainer}>
            <Star className="w-4 h-4 text-amber-500 fill-current" />
            <span className={doctorDetailStyles.headerRatingText}>{doctor.rating || "4.8"}</span>
          </div>
        </div>
      </div>

      <div className={`${doctorDetailStyles.mainContent} ${doctorDetailStyles.visibleState}`}>
        {/* Doctor Details Profile Card */}
        <div className={doctorDetailStyles.profileCard}>
          <div className={doctorDetailStyles.profileGrid}>
            
            {/* Left Column (Avatar + Key Stats) */}
            <div className={doctorDetailStyles.leftColumn}>
              <div className={doctorDetailStyles.avatarContainer}>
                <div className={doctorDetailStyles.avatarGlow}></div>
                <img
                  src={doctor.imageUrl || doctor.image || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=250"}
                  alt={doctor.name}
                  className="w-40 h-40 md:w-56 md:h-56 rounded-full object-cover border-4 border-white shadow-2xl relative z-10"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=250";
                  }}
                />
              </div>

              {/* Doctor Stats (Experience, Success rate, Patients) */}
              <div className={doctorDetailStyles.statsGrid}>
                <div className={doctorDetailStyles.statBox}>
                  <Heart className="w-6 h-6 mx-auto text-rose-500 mb-1" />
                  <p className={doctorDetailStyles.statValue}>{doctor.success || "98%"}</p>
                  <p className={doctorDetailStyles.statLabel}>Success Rate</p>
                </div>
                <div className={doctorDetailStyles.statBox}>
                  <Users className="w-6 h-6 mx-auto text-emerald-500 mb-1" />
                  <p className={doctorDetailStyles.statValue}>{doctor.patients || "1000+"}</p>
                  <p className={doctorDetailStyles.statLabel}>Patients Served</p>
                </div>
                <div className={doctorDetailStyles.statBox}>
                  <Award className="w-6 h-6 mx-auto text-amber-500 mb-1" />
                  <p className={doctorDetailStyles.statValue}>{doctor.experience || "5 yrs"}</p>
                  <p className={doctorDetailStyles.statLabel}>Experience</p>
                </div>
              </div>
            </div>

            {/* Right Column (Doctor details about, specialization, fee, location) */}
            <div className={doctorDetailStyles.rightColumn}>
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 leading-tight mb-2">
                  {doctor.name}
                </h1>
                <div className="flex gap-2 items-center mb-4">
                  <span className={doctorDetailStyles.specializationBadge}>
                    <Stethoscope className="w-4 h-4 mr-1 text-white" /> {doctor.specialization}
                  </span>
                </div>
              </div>

              {/* Info grid (Qualifications, Location, Consultation Fee) */}
              <div className={doctorDetailStyles.infoGrid}>
                <div className={doctorDetailStyles.infoItem}>
                  <Award className={doctorDetailStyles.infoIcon} />
                  <div>
                    <p className={doctorDetailStyles.infoLabel}>Qualifications</p>
                    <p className={doctorDetailStyles.infoValue}>{doctor.qualifications || "MBBS, MD"}</p>
                  </div>
                </div>
                <div className={doctorDetailStyles.infoItem}>
                  <MapPin className={doctorDetailStyles.infoIcon} />
                  <div>
                    <p className={doctorDetailStyles.infoLabel}>Clinic Location</p>
                    <p className={doctorDetailStyles.infoValue}>{doctor.location || "Medicare Clinic"}</p>
                  </div>
                </div>
                <div className={doctorDetailStyles.infoItem}>
                  <DollarSign className={doctorDetailStyles.infoIcon} />
                  <div>
                    <p className={doctorDetailStyles.infoLabel}>Consultation Fee</p>
                    <p className="text-lg font-bold text-rose-600">₹{doctor.fee}</p>
                  </div>
                </div>
              </div>

              {/* Doctor Biography Info */}
              <div className={doctorDetailStyles.aboutContainer}>
                <div className={doctorDetailStyles.aboutHeader}>
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  <span className={doctorDetailStyles.aboutTitle}>About Doctor</span>
                </div>
                <p className={doctorDetailStyles.aboutText}>
                  {doctor.about || "Dedicated healthcare professional providing excellent clinical consultations and customized patient care."}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Appointment Scheduler / Form section */}
        <div className={doctorDetailStyles.appointmentContainer}>
          <div className={doctorDetailStyles.appointmentContent}>
            <div className={doctorDetailStyles.appointmentHeader}>
              <Calendar className="w-6 h-6 text-emerald-600" />
              <h2 className="text-xl md:text-2xl font-bold text-slate-800">
                Book Consultation Appointment
              </h2>
            </div>

            <form onSubmit={handleBook} className={doctorDetailStyles.appointmentGrid}>
              
              {/* Select Date Section */}
              <div className={doctorDetailStyles.dateSection}>
                <h3 className={doctorDetailStyles.dateTitle}>
                  <Calendar className="w-5 h-5 text-emerald-600" /> Select Date
                </h3>
                <div className={doctorDetailStyles.dateScrollContainer}>
                  <div className="flex gap-2 pb-2">
                    {availableDates.length > 0 ? (
                      availableDates.map((d) => (
                        <button
                          key={d.dateStr}
                          type="button"
                          onClick={() => {
                            setSelectedDate(d.dateStr);
                            setSelectedTime(""); // reset selected time slot
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
                      <p className="text-slate-500 italic py-2">No availability schedule configured</p>
                    )}
                  </div>
                </div>

                {/* Patient Details Sub-Form */}
                <div className={doctorDetailStyles.patientForm}>
                  <h4 className={doctorDetailStyles.patientFormTitle}>Patient Contact Details</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Patient Full Name</label>
                      <div className="relative mt-1">
                        <User className="absolute left-3 top-3 w-4 h-4 text-emerald-600" />
                        <input
                          type="text"
                          placeholder="John Doe"
                          value={patientName}
                          onChange={(e) => setPatientName(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Mobile Number</label>
                      <div className="relative mt-1">
                        <Phone className="absolute left-3 top-3 w-4 h-4 text-emerald-600" />
                        <input
                          type="tel"
                          placeholder="10 digit phone number"
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value)}
                          maxLength="10"
                          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Age</label>
                      <input
                        type="number"
                        placeholder="Age"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        min="1"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Gender</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                      >
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">Email Address (Optional)</label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-emerald-600" />
                        <input
                          type="email"
                          placeholder="email@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Select Time Section */}
              <div className={doctorDetailStyles.timeSlotsSection}>
                <h3 className={doctorDetailStyles.timeSlotsTitle}>
                  <Clock className="w-5 h-5 text-emerald-600" /> Available Time Slots
                </h3>
                
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

                {/* Booking Summary Card */}
                <div className={doctorDetailStyles.summaryContainer}>
                  <h4 className="font-bold text-emerald-800 text-base mb-4 border-b border-emerald-200/50 pb-2">Booking Summary</h4>
                  <div className={doctorDetailStyles.summaryItem}>
                    <div className="flex justify-between text-sm py-1 border-b border-dashed border-emerald-200/30">
                      <span className="text-slate-600">Selected Date:</span>
                      <span className="font-semibold text-slate-800">{selectedDate || "—"}</span>
                    </div>
                    <div className="flex justify-between text-sm py-1 border-b border-dashed border-emerald-200/30">
                      <span className="text-slate-600">Selected Slot:</span>
                      <span className="font-semibold text-slate-800">{selectedTime || "—"}</span>
                    </div>
                    <div className="flex justify-between text-sm py-1 border-b border-emerald-200/30">
                      <span className="text-slate-600">Consultation Fee:</span>
                      <span className="font-bold text-rose-600">₹{doctor.fee}</span>
                    </div>
                  </div>

                  {/* Payment Options (Cash vs Online) */}
                  <div className={doctorDetailStyles.paymentContainer}>
                    <span className={doctorDetailStyles.paymentLabel}>Payment Option:</span>
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
                        Pay at Clinic
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
                        Pay Online (Debit/UPI)
                      </button>
                    </div>
                  </div>

                  {/* Submit Trigger Booking */}
                  <button
                    type="submit"
                    disabled={bookingBusy || !selectedDate || !selectedTime}
                    className={`w-full py-3.5 rounded-full font-bold text-sm text-center shadow-lg transition-all active:scale-[0.99] cursor-pointer ${
                      selectedDate && selectedTime
                        ? "bg-linear-to-r from-emerald-500 to-green-600 text-white hover:shadow-xl"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    {bookingBusy ? "Booking Consultation..." : "Confirm & Schedule Appointment"}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClerkDoctorDetailWrapper() {
  const { user } = useUser();
  return <DoctorDetailContent currentUser={user} isClerk={true} />;
}

function LocalDoctorDetailWrapper() {
  let user = null;
  try {
    const patUser = localStorage.getItem("patientUser_v1");
    if (patUser) user = JSON.parse(patUser);
  } catch (err) {}
  return <DoctorDetailContent currentUser={user} isClerk={false} />;
}

export default function DoctorDetail() {
  if (isClerkKeyConfigured) {
    return <ClerkDoctorDetailWrapper />;
  }
  return <LocalDoctorDetailWrapper />;
}
