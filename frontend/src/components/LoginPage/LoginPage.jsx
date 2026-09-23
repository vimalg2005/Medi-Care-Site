import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  ArrowLeft, Mail, Lock, Heart, User, ShieldCheck, KeyRound, 
  RotateCw, CheckCircle2, UserPlus, Link2, Stethoscope, AlertCircle 
} from "lucide-react";
import { SignIn, useUser, useClerk } from "@clerk/clerk-react";
import toast, { Toaster } from "react-hot-toast";
import { loginPageStyles, toastStyles } from "../../assets/themeStyles.js";
import { API_BASE } from "../../config.js";

const STORAGE_KEY = "doctorToken_v1";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const isClerkKeyConfigured = 
  Boolean(PUBLISHABLE_KEY) && 
  (PUBLISHABLE_KEY.startsWith("pk_test_") || PUBLISHABLE_KEY.startsWith("pk_live_")) &&
  PUBLISHABLE_KEY !== "pk_test_your_clerk_publishable_key_here";

function LoginPageContent({ clerkUser, isClerkSignedIn, clerkSignOut }) {
  const [activeTab, setActiveTab] = useState("doctor"); // "doctor" or "patient"
  
  // Doctor form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [usePasswordFallback, setUsePasswordFallback] = useState(false);

  // Clerk Doctor Verification state
  const [doctorAuthChecking, setDoctorAuthChecking] = useState(false);
  const [doctorNotRegistered, setDoctorNotRegistered] = useState(false);
  const [doctorActionView, setDoctorActionView] = useState("verify"); // "verify" | "link" | "register"

  // Link form state
  const [linkEmail, setLinkEmail] = useState("");
  const [linkPassword, setLinkPassword] = useState("");

  // Register form state
  const [regSpecialization, setRegSpecialization] = useState("General Physician");
  const [regExperience] = useState("5 years");
  const [regQualifications, setRegQualifications] = useState("MBBS, MD");
  const [regFee, setRegFee] = useState(500);
  const [regLocation] = useState("Main Clinic");

  // Patient form state
  const [patientName, setPatientName] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [patientPassword, setPatientPassword] = useState("");
  const [isPatientSignUp, setIsPatientSignUp] = useState(false);

  // OTP Verification state
  const [otpStep, setOtpStep] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [resending, setResending] = useState(false);

  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const otpInputRef = useRef(null);

  // Sync linkEmail with clerkUser primary email
  useEffect(() => {
    if (clerkUser?.primaryEmailAddress?.emailAddress) {
      setLinkEmail(clerkUser.primaryEmailAddress.emailAddress);
    }
  }, [clerkUser]);

  // Focus OTP input when OTP screen opens
  useEffect(() => {
    if (otpStep && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [otpStep]);

  // Resend OTP countdown timer
  useEffect(() => {
    let timer;
    if (otpStep && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpStep, countdown]);

  // 1. Traditional Doctor Login via email & password
  const handleDoctorLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Email and password are required");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/doctors/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error(json?.message || "Login failed", { duration: 4000 });
        setBusy(false);
        return;
      }

      const token = json?.token || json?.data?.token;
      const doctor = json?.doctor || json?.data;
      const doctorId = doctor?._id || doctor?.id;

      if (!token || !doctorId) {
        toast.error("Authentication details missing from server response");
        setBusy(false);
        return;
      }

      localStorage.setItem(STORAGE_KEY, token);
      localStorage.setItem("doctorUser_v1", JSON.stringify(doctor));
      window.dispatchEvent(
        new StorageEvent("storage", { key: STORAGE_KEY, newValue: token })
      );

      toast.success("Login successful — redirecting...", {
        style: toastStyles?.successToast,
      });

      setTimeout(() => {
        navigate(`/doctor-admin/${doctorId}`);
      }, 700);
    } catch (err) {
      console.error("login error", err);
      toast.error("Network error during login");
      setBusy(false);
    }
  };

  // 2. Clerk Doctor Verification & Authentication
  const handleVerifyClerkDoctor = async () => {
    const emailToVerify = clerkUser?.primaryEmailAddress?.emailAddress;
    const clerkId = clerkUser?.id;
    if (!emailToVerify || !clerkId) {
      toast.error("Please complete Clerk sign-in first");
      return;
    }

    setDoctorAuthChecking(true);
    try {
      const res = await fetch(`${API_BASE}/api/doctors/clerk-auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailToVerify,
          clerkId,
          name: clerkUser?.fullName || "Doctor",
          avatar: clerkUser?.imageUrl,
        }),
      });

      const json = await res.json().catch(() => null);

      if (res.ok && json?.success && json?.token) {
        const token = json.token;
        const doctor = json.doctor || json.data;
        const doctorId = doctor?._id || doctor?.id;

        localStorage.setItem(STORAGE_KEY, token);
        localStorage.setItem("doctorUser_v1", JSON.stringify(doctor));
        window.dispatchEvent(
          new StorageEvent("storage", { key: STORAGE_KEY, newValue: token })
        );

        toast.success(`Verified as Dr. ${doctor.name}! Redirecting...`, {
          style: toastStyles?.successToast,
        });

        setTimeout(() => {
          navigate(`/doctor-admin/${doctorId}`);
        }, 700);
        return;
      }

      if (json?.notRegistered || res.status === 404) {
        setDoctorNotRegistered(true);
        toast("No doctor record found for this Clerk email. Link or register your profile below.", {
          icon: "🩺",
          duration: 5000,
        });
      } else {
        toast.error(json?.message || "Doctor verification failed");
      }
    } catch (err) {
      console.error("Clerk doctor verify error:", err);
      toast.error("Network error during Clerk doctor verification");
    } finally {
      setDoctorAuthChecking(false);
    }
  };

  // 3. Link existing doctor profile with Clerk account
  const handleLinkDoctorProfile = async (e) => {
    e.preventDefault();
    if (!linkPassword) {
      toast.error("Doctor password is required to link this profile");
      return;
    }

    const emailToLink = linkEmail || clerkUser?.primaryEmailAddress?.emailAddress;
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/doctors/clerk-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailToLink,
          password: linkPassword,
          clerkId: clerkUser?.id,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        toast.error(json?.message || "Linking failed. Please check credentials.");
        setBusy(false);
        return;
      }

      const token = json.token;
      const doctor = json.doctor || json.data;
      const doctorId = doctor?._id || doctor?.id;

      localStorage.setItem(STORAGE_KEY, token);
      localStorage.setItem("doctorUser_v1", JSON.stringify(doctor));
      window.dispatchEvent(
        new StorageEvent("storage", { key: STORAGE_KEY, newValue: token })
      );

      toast.success(json.message || "Doctor profile linked successfully!", {
        style: toastStyles?.successToast,
      });

      setTimeout(() => {
        navigate(`/doctor-admin/${doctorId}`);
      }, 700);
    } catch (err) {
      console.error("Link doctor error:", err);
      toast.error("Network error during profile linking");
      setBusy(false);
    }
  };

  // 4. Register new doctor profile via Clerk
  const handleRegisterClerkDoctor = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/doctors/clerk-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: clerkUser?.fullName || "Doctor",
          email: clerkUser?.primaryEmailAddress?.emailAddress,
          clerkId: clerkUser?.id,
          avatar: clerkUser?.imageUrl,
          specialization: regSpecialization || "General Physician",
          experience: regExperience || "3+ years",
          qualifications: regQualifications || "MBBS, MD",
          fee: Number(regFee) || 500,
          location: regLocation || "MediCare Hospital",
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        toast.error(json?.message || "Registration failed");
        setBusy(false);
        return;
      }

      const token = json.token;
      const doctor = json.doctor || json.data;
      const doctorId = doctor?._id || doctor?.id;

      localStorage.setItem(STORAGE_KEY, token);
      localStorage.setItem("doctorUser_v1", JSON.stringify(doctor));
      window.dispatchEvent(
        new StorageEvent("storage", { key: STORAGE_KEY, newValue: token })
      );

      toast.success("Doctor profile created and verified!", {
        style: toastStyles?.successToast,
      });

      setTimeout(() => {
        navigate(`/doctor-admin/${doctorId}`);
      }, 700);
    } catch (err) {
      console.error("Register doctor error:", err);
      toast.error("Network error during registration");
      setBusy(false);
    }
  };

  // Traditional Patient Login / Signup
  const handlePatientLogin = async (e) => {
    e.preventDefault();
    if (isPatientSignUp) {
      if (!patientName || !patientEmail || !patientPassword) {
        toast.error("Name, email, and password are required");
        return;
      }
    } else {
      if (!patientEmail || !patientPassword) {
        toast.error("Email and password are required");
        return;
      }
    }

    setBusy(true);
    try {
      const endpoint = isPatientSignUp ? "/api/patients/register" : "/api/patients/login";
      const body = isPatientSignUp
        ? { name: patientName, email: patientEmail, password: patientPassword }
        : { email: patientEmail, password: patientPassword };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json().catch(() => null);

      if (json?.requiresOTP || (res.status === 403 && json?.requiresVerification)) {
        setOtpEmail(json.email || patientEmail);
        setOtpStep(true);
        setCountdown(60);
        setBusy(false);
        toast.success(json?.message || "Verification code sent to your email!", {
          duration: 5000,
        });
        return;
      }

      if (!res.ok) {
        toast.error(json?.message || "Authentication failed", { duration: 4000 });
        setBusy(false);
        return;
      }

      const token = json?.token;
      const userPayload = json?.patient;

      localStorage.setItem("patientToken_v1", token);
      localStorage.setItem("patientUser_v1", JSON.stringify(userPayload));

      window.dispatchEvent(
        new StorageEvent("storage", { key: "patientToken_v1", newValue: token })
      );

      toast.success(
        isPatientSignUp ? "Account registered successfully!" : "Patient session activated!",
        { style: toastStyles?.successToast }
      );

      setTimeout(() => {
        navigate("/");
      }, 700);
    } catch (err) {
      console.error("patient auth error", err);
      toast.error("Network error during patient login");
      setBusy(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      toast.error("Please enter the complete 6-digit verification code");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/patients/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail, otp: otpCode.trim() }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error(json?.message || "Verification failed. Please check the code.", { duration: 4000 });
        setBusy(false);
        return;
      }

      const token = json?.token;
      const userPayload = json?.patient;

      localStorage.setItem("patientToken_v1", token);
      localStorage.setItem("patientUser_v1", JSON.stringify(userPayload));

      window.dispatchEvent(
        new StorageEvent("storage", { key: "patientToken_v1", newValue: token })
      );

      toast.success("Email verified successfully! Welcome to MediCare.", {
        style: toastStyles?.successToast,
        duration: 4000,
      });

      setTimeout(() => {
        navigate("/");
      }, 700);
    } catch (err) {
      console.error("verify otp error", err);
      toast.error("Network error during verification");
      setBusy(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0 || resending) return;

    setResending(true);
    try {
      const res = await fetch(`${API_BASE}/api/patients/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error(json?.message || "Failed to resend code");
        setResending(false);
        return;
      }

      toast.success(json?.message || "A fresh code was sent to your email!");
      setCountdown(60);
      setOtpCode("");
      setResending(false);
    } catch (err) {
      console.error("resend error", err);
      toast.error("Failed to resend verification code");
      setResending(false);
    }
  };

  return (
    <div className={loginPageStyles.mainContainer}>
      <Toaster position="top-center" reverseOrder={false} />

      <Link to="/" className={loginPageStyles.backButton}>
        <ArrowLeft className={loginPageStyles.backButtonIcon} /> Back to Home
      </Link>

      <div className={loginPageStyles.loginCard}>
        {/* Top Decorative Icon */}
        <div className={loginPageStyles.logoContainer}>
          <div className="p-4 bg-emerald-100 rounded-full shadow-md">
            {otpStep ? (
              <ShieldCheck className="w-12 h-12 text-emerald-600" />
            ) : activeTab === "doctor" ? (
              <Stethoscope className="w-12 h-12 text-emerald-600" />
            ) : (
              <Heart className="w-12 h-12 text-emerald-600 fill-emerald-200" />
            )}
          </div>
        </div>

        {/* OTP VERIFICATION VIEW */}
        {otpStep ? (
          <div>
            <h2 className={loginPageStyles.title}>Verify Email</h2>
            <p className="text-center text-slate-600 mb-2 text-sm">
              We sent a 6-digit verification code to:
            </p>
            <div className="text-center mb-6">
              <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 font-semibold text-xs rounded-full border border-emerald-200">
                {otpEmail}
              </span>
            </div>

            <form onSubmit={handleVerifyOTP} className={loginPageStyles.form}>
              <div className="relative">
                <KeyRound className="absolute left-4 top-3.5 w-5 h-5 text-emerald-600" />
                <input
                  ref={otpInputRef}
                  type="text"
                  maxLength={6}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  placeholder="Enter 6-digit OTP"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  className={`${loginPageStyles.input} pl-12 tracking-widest text-center text-xl font-mono font-bold text-emerald-950 placeholder-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={busy || otpCode.length !== 6}
                className={`${loginPageStyles.submitButton} hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {busy ? "Verifying..." : "Verify & Complete"}
              </button>

              <div className="flex flex-col items-center gap-2 pt-2 text-xs">
                {countdown > 0 ? (
                  <span className="text-slate-500">
                    Resend code in <strong className="text-emerald-700">{countdown}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={resending}
                    className="text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
                    {resending ? "Sending..." : "Didn't receive code? Resend Code"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setOtpStep(false);
                    setOtpCode("");
                  }}
                  className="text-slate-500 hover:text-slate-700 underline mt-2 cursor-pointer"
                >
                  Use a different email address
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* REGULAR LOGIN VIEW */
          <div>
            <h2 className={loginPageStyles.title}>Welcome Back</h2>

            {/* Toggle tabs for doctor vs patient */}
            <div className="flex gap-2 p-1 bg-emerald-50 rounded-full border border-emerald-200 mb-6">
              <button
                type="button"
                onClick={() => setActiveTab("doctor")}
                className={`flex-1 py-2 text-sm font-semibold rounded-full transition-all cursor-pointer ${
                  activeTab === "doctor"
                    ? "bg-emerald-600 text-white shadow-md"
                    : "text-emerald-700 hover:text-emerald-900"
                }`}
              >
                Doctor Portal
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("patient")}
                className={`flex-1 py-2 text-sm font-semibold rounded-full transition-all cursor-pointer ${
                  activeTab === "patient"
                    ? "bg-emerald-600 text-white shadow-md"
                    : "text-emerald-700 hover:text-emerald-900"
                }`}
              >
                Patient (Quick)
              </button>
            </div>

            {activeTab === "doctor" ? (
              /* DOCTOR TAB CONTENT */
              <div>
                {isClerkKeyConfigured && !usePasswordFallback ? (
                  /* CLERK DOCTOR AUTHENTICATION & VERIFICATION */
                  <div className="flex flex-col gap-4">
                    {isClerkSignedIn && clerkUser ? (
                      /* 1. Signed into Clerk: Show Verified Doctor Identity Card */
                      <div className="p-5 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          {clerkUser.imageUrl ? (
                            <img
                              src={clerkUser.imageUrl}
                              alt="Doctor Avatar"
                              className="w-12 h-12 rounded-full border-2 border-emerald-500 object-cover shadow-xs"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-lg">
                              {clerkUser.firstName?.[0] || "D"}
                            </div>
                          )}
                          <div className="overflow-hidden">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-800 text-base truncate">
                                {clerkUser.fullName || "Doctor"}
                              </span>
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            </div>
                            <span className="text-xs text-emerald-800 font-medium truncate block">
                              {clerkUser.primaryEmailAddress?.emailAddress}
                            </span>
                            <span className="inline-block mt-0.5 px-2 py-0.5 bg-emerald-100 text-emerald-800 font-semibold text-[10px] rounded-full">
                              Clerk Verified
                            </span>
                          </div>
                        </div>

                        {/* If not yet registered, show action buttons to link or create profile */}
                        {doctorNotRegistered ? (
                          <div className="mt-2 pt-3 border-t border-emerald-200 flex flex-col gap-3">
                            <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-xs">
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              <span>No profile linked to this email address yet.</span>
                            </div>

                            {doctorActionView === "link" ? (
                              /* Link existing profile */
                              <form onSubmit={handleLinkDoctorProfile} className="flex flex-col gap-2.5">
                                <p className="text-xs text-slate-600 font-medium">
                                  Link with your doctor password:
                                </p>
                                <input
                                  type="email"
                                  value={linkEmail}
                                  onChange={(e) => setLinkEmail(e.target.value)}
                                  placeholder="Doctor Email"
                                  className={`${loginPageStyles.input} py-2 text-xs`}
                                  required
                                />
                                <input
                                  type="password"
                                  value={linkPassword}
                                  onChange={(e) => setLinkPassword(e.target.value)}
                                  placeholder="Doctor Password (e.g. password123)"
                                  className={`${loginPageStyles.input} py-2 text-xs`}
                                  required
                                />
                                <button
                                  type="submit"
                                  disabled={busy}
                                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition shadow-xs cursor-pointer"
                                >
                                  {busy ? "Linking..." : "Confirm & Link to Clerk"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDoctorActionView("verify")}
                                  className="text-[11px] text-slate-500 hover:underline text-center cursor-pointer mt-1"
                                >
                                  Cancel
                                </button>
                              </form>
                            ) : doctorActionView === "register" ? (
                              /* Self-Register as Doctor */
                              <form onSubmit={handleRegisterClerkDoctor} className="flex flex-col gap-2.5">
                                <p className="text-xs text-slate-600 font-medium">
                                  Complete your doctor registration:
                                </p>
                                <input
                                  type="text"
                                  value={regSpecialization}
                                  onChange={(e) => setRegSpecialization(e.target.value)}
                                  placeholder="Specialization (e.g. Cardiologist)"
                                  className={`${loginPageStyles.input} py-2 text-xs`}
                                  required
                                />
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    type="text"
                                    value={regQualifications}
                                    onChange={(e) => setRegQualifications(e.target.value)}
                                    placeholder="Qualifications (MBBS)"
                                    className={`${loginPageStyles.input} py-2 text-xs`}
                                    required
                                  />
                                  <input
                                    type="number"
                                    value={regFee}
                                    onChange={(e) => setRegFee(e.target.value)}
                                    placeholder="Fee (₹)"
                                    className={`${loginPageStyles.input} py-2 text-xs`}
                                    required
                                  />
                                </div>
                                <button
                                  type="submit"
                                  disabled={busy}
                                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition shadow-xs cursor-pointer"
                                >
                                  {busy ? "Registering..." : "Create Doctor Profile"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDoctorActionView("verify")}
                                  className="text-[11px] text-slate-500 hover:underline text-center cursor-pointer mt-1"
                                >
                                  Cancel
                                </button>
                              </form>
                            ) : (
                              /* Choose link vs register */
                              <div className="grid grid-cols-2 gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setDoctorActionView("link")}
                                  className="py-2 px-3 bg-white border border-emerald-300 text-emerald-700 rounded-xl text-xs font-semibold hover:bg-emerald-50 transition flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Link2 className="w-3.5 h-3.5" /> Link Profile
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDoctorActionView("register")}
                                  className="py-2 px-3 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <UserPlus className="w-3.5 h-3.5" /> Register New
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Standard 1-click verify & enter */
                          <button
                            type="button"
                            onClick={handleVerifyClerkDoctor}
                            disabled={doctorAuthChecking}
                            className={`${loginPageStyles.submitButton} mt-2 flex items-center justify-center gap-2 hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer`}
                          >
                            <ShieldCheck className="w-5 h-5" />
                            {doctorAuthChecking ? "Verifying Doctor Access..." : "Verify & Enter Doctor Dashboard"}
                          </button>
                        )}

                        {/* Sign in with a different Clerk account */}
                        <div className="text-center mt-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (clerkSignOut) clerkSignOut();
                              setDoctorNotRegistered(false);
                            }}
                            className="text-[11px] text-slate-500 hover:text-slate-700 underline cursor-pointer"
                          >
                            Sign in with a different Clerk account
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* 2. Not yet signed into Clerk: Show Clerk Sign In component */
                      <div className="flex flex-col items-center justify-center">
                        <p className="text-center text-slate-600 text-xs mb-3">
                          Authenticate with your doctor email via Clerk for instant verified access.
                        </p>
                        <SignIn
                          routing="hash"
                          afterSignInUrl="/login"
                          appearance={{
                            elements: {
                              rootBox: "w-full flex justify-center",
                              card: "shadow-none border-0 p-0 w-full",
                              headerTitle: "text-slate-800 font-bold",
                              formButtonPrimary: "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm",
                              footerActionLink: "text-emerald-600 hover:text-emerald-700 font-semibold",
                            },
                          }}
                        />
                      </div>
                    )}

                    {/* Switch to email/password form */}
                    <div className="text-center pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setUsePasswordFallback(true)}
                        className="text-emerald-700 hover:underline text-xs font-semibold cursor-pointer"
                      >
                        Or sign in with Doctor Email & Password
                      </button>
                    </div>
                  </div>
                ) : (
                  /* TRADITIONAL DOCTOR LOGIN FORM */
                  <div>
                    <form onSubmit={handleDoctorLogin} className={loginPageStyles.form}>
                      <p className={loginPageStyles.subtitle}>
                        Sign in with your doctor credentials.
                      </p>

                      <div className="relative">
                        <Mail className="absolute left-4 top-3.5 w-5 h-5 text-green-600" />
                        <input
                          type="email"
                          placeholder="Doctor Email (e.g. john.doe@medicare.com)"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={`${loginPageStyles.input} pl-12 text-green-950 placeholder-green-400 focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                          required
                        />
                      </div>

                      <div className="relative">
                        <Lock className="absolute left-4 top-3.5 w-5 h-5 text-green-600" />
                        <input
                          type="password"
                          placeholder="Password (e.g. password123)"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`${loginPageStyles.input} pl-12 text-green-950 placeholder-green-400 focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={busy}
                        className={`${loginPageStyles.submitButton} hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer`}
                      >
                        {busy ? "Signing in..." : "Sign In as Doctor"}
                      </button>
                    </form>

                    {isClerkKeyConfigured && (
                      <div className="text-center mt-4 pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setUsePasswordFallback(false)}
                          className="text-emerald-700 hover:underline text-xs font-semibold cursor-pointer flex items-center justify-center gap-1 mx-auto"
                        >
                          <ShieldCheck className="w-4 h-4" /> Use Clerk Doctor Verification instead
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : isClerkKeyConfigured ? (
              /* CLERK PATIENT SIGN IN */
              <div className="flex flex-col items-center justify-center my-2">
                <p className="text-center text-slate-600 text-xs mb-4">
                  Sign in or create your patient account instantly with Clerk (Email OTP, Google, etc.).
                </p>
                <SignIn
                  routing="hash"
                  afterSignInUrl="/"
                  afterSignUpUrl="/"
                  appearance={{
                    elements: {
                      rootBox: "w-full flex justify-center",
                      card: "shadow-none border-0 p-0 w-full",
                      headerTitle: "text-slate-800 font-bold",
                      formButtonPrimary: "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm",
                      footerActionLink: "text-emerald-600 hover:text-emerald-700 font-semibold",
                    },
                  }}
                />
              </div>
            ) : (
              /* FALLBACK PATIENT LOGIN FORM (When Clerk key is not yet set) */
              <div>
                <div className="p-3 mb-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  <p className="font-semibold mb-1">Clerk Publishable Key Needed</p>
                  <p>
                    Add your <code>VITE_CLERK_PUBLISHABLE_KEY</code> in <code>frontend/.env</code> to activate live Clerk Google & Email Sign-In. Using local quick sign-in below in the meantime:
                  </p>
                </div>
                <form onSubmit={handlePatientLogin} className={loginPageStyles.form}>
                  <p className={loginPageStyles.subtitle}>
                    {isPatientSignUp
                      ? "Create an account with email verification."
                      : "Access patient dashboard and book appointments."}
                  </p>

                  {isPatientSignUp && (
                    <div className="relative">
                      <User className="absolute left-4 top-3.5 w-5 h-5 text-green-600" />
                      <input
                        type="text"
                        placeholder="Your Full Name"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        className={`${loginPageStyles.input} pl-12 text-green-950 placeholder-green-400 focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                        required={isPatientSignUp}
                      />
                    </div>
                  )}

                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 w-5 h-5 text-green-600" />
                    <input
                      type="email"
                      placeholder="Your Email Address"
                      value={patientEmail}
                      onChange={(e) => setPatientEmail(e.target.value)}
                      className={`${loginPageStyles.input} pl-12 text-green-950 placeholder-green-400 focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                      required
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 w-5 h-5 text-green-600" />
                    <input
                      type="password"
                      placeholder="Your Password"
                      value={patientPassword}
                      onChange={(e) => setPatientPassword(e.target.value)}
                      className={`${loginPageStyles.input} pl-12 text-green-950 placeholder-green-400 focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className={`${loginPageStyles.submitButton} hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer`}
                  >
                    {busy
                      ? "Processing..."
                      : isPatientSignUp
                      ? "Send Verification Code"
                      : "Sign In as Patient"}
                  </button>

                  <div className="text-center mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsPatientSignUp(!isPatientSignUp);
                      }}
                      className="text-emerald-700 hover:underline text-xs font-semibold cursor-pointer"
                    >
                      {isPatientSignUp
                        ? "Already have an account? Sign In"
                        : "Don't have an account? Sign Up with Email"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Wrapper with Clerk Hook
function ClerkLoginWrapper() {
  const { user, isSignedIn, isLoaded } = useUser();
  const { signOut } = useClerk();

  return (
    <LoginPageContent
      clerkUser={user}
      isClerkSignedIn={isSignedIn}
      isClerkLoaded={isLoaded}
      clerkSignOut={signOut}
    />
  );
}

// Fallback Wrapper when Clerk is not configured
function LocalLoginWrapper() {
  return (
    <LoginPageContent
      clerkUser={null}
      isClerkSignedIn={false}
      isClerkLoaded={true}
      clerkSignOut={() => {}}
    />
  );
}

export default function LoginPage() {
  if (isClerkKeyConfigured) {
    return <ClerkLoginWrapper />;
  }
  return <LocalLoginWrapper />;
}