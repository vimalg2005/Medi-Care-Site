import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Mail, Lock, Heart, User } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { loginPageStyles, toastStyles } from "../../assets/themeStyles.js";

const STORAGE_KEY = "doctorToken_v1";
import { API_BASE } from "../../config.js";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState("doctor"); // "doctor" or "patient"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [patientPassword, setPatientPassword] = useState("");
  const [isPatientSignUp, setIsPatientSignUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

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
      if (!token) {
        toast.error("Authentication token missing");
        setBusy(false);
        return;
      }

      const doctorId = json?.data?._id || json?.doctor?._id || json?.data?.doctor?._id || json?.doctor?.id || json?.data?.id;
      if (!doctorId) {
        toast.error("Doctor ID missing from server response");
        setBusy(false);
        return;
      }

      localStorage.setItem(STORAGE_KEY, token);
      localStorage.setItem("doctorUser_v1", JSON.stringify(json.doctor || json.data));
      window.dispatchEvent(
        new StorageEvent("storage", { key: STORAGE_KEY, newValue: token }),
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

      if (!res.ok) {
        toast.error(json?.message || "Authentication failed", { duration: 4000 });
        setBusy(false);
        return;
      }

      const token = json?.token;
      const userPayload = json?.patient;

      localStorage.setItem("patientToken_v1", token);
      localStorage.setItem("patientUser_v1", JSON.stringify(userPayload));
      
      // Dispatch storage event to alert Navbar
      window.dispatchEvent(
        new StorageEvent("storage", { key: "patientToken_v1", newValue: token })
      );

      toast.success(isPatientSignUp ? "Account registered successfully!" : "Patient session activated!", {
        style: toastStyles?.successToast,
      });

      setTimeout(() => {
        navigate("/");
      }, 700);
    } catch (err) {
      console.error("patient auth error", err);
      toast.error("Network error during patient login");
      setBusy(false);
    }
  };

  return (
    <div className={loginPageStyles.mainContainer}>
      <Toaster position="top-center" reverseOrder={false} />

      <Link to="/" className={loginPageStyles.backButton}>
        <ArrowLeft className={loginPageStyles.backButtonIcon} /> Back to Home
      </Link>

      <div className={loginPageStyles.loginCard}>
        {/* Decorative Pulsing Logo */}
        <div className={loginPageStyles.logoContainer}>
          <div className="p-4 bg-emerald-100 rounded-full animate-bounce shadow-md">
            <Heart className="w-12 h-12 text-emerald-600 fill-emerald-200" />
          </div>
        </div>

        <h2 className={loginPageStyles.title}>Welcome Back</h2>
        
        {/* Toggle tabs for doctor vs patient */}
        <div className="flex gap-2 p-1 bg-emerald-50 rounded-full border border-emerald-200 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab("doctor")}
            className={`flex-1 py-2 text-sm font-semibold rounded-full transition-all ${
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
            className={`flex-1 py-2 text-sm font-semibold rounded-full transition-all ${
              activeTab === "patient"
                ? "bg-emerald-600 text-white shadow-md"
                : "text-emerald-700 hover:text-emerald-900"
            }`}
          >
            Patient (Quick)
          </button>
        </div>

        {activeTab === "doctor" ? (
          /* DOCTOR LOGIN FORM */
          <form onSubmit={handleDoctorLogin} className={loginPageStyles.form}>
            <p className={loginPageStyles.subtitle}>
              Sign in with your doctor credentials.
            </p>
            
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 w-5 h-5 text-green-600" />
              <input
                type="email"
                placeholder="Doctor Email (dr1@gmail.com)"
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
                placeholder="Password (123456)"
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
        ) : (
          /* PATIENT LOGIN FORM */
          <form onSubmit={handlePatientLogin} className={loginPageStyles.form}>
            <p className={loginPageStyles.subtitle}>
              {isPatientSignUp ? "Create a patient account to start booking." : "Access patient dashboard and book appointments."}
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
              {busy ? "Processing..." : isPatientSignUp ? "Register Account" : "Sign In as Patient"}
            </button>

            <div className="text-center mt-3">
              <button
                type="button"
                onClick={() => setIsPatientSignUp(!isPatientSignUp)}
                className="text-emerald-700 hover:underline text-xs font-semibold cursor-pointer"
              >
                {isPatientSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}