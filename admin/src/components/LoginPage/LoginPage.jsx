import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  ShieldCheck, Lock, Mail, Eye, EyeOff, 
  ArrowRight, Heart, AlertCircle, Sparkles, KeyRound, LogOut, CheckCircle2 
} from "lucide-react";
import { SignInButton } from "@clerk/clerk-react";
import toast, { Toaster } from "react-hot-toast";
import { useAdminAuth } from "../../context/AdminAuthContext.jsx";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    login, 
    logout,
    authorizedEmail, 
    unauthorizedAccount, 
    isClerkConfigured 
  } = useAdminAuth();

  const [email, setEmail] = useState(authorizedEmail || "vimalgupta8025@gmail.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Sync default email when authorizedEmail changes/loads
  useEffect(() => {
    if (authorizedEmail) {
      setEmail(authorizedEmail);
    }
  }, [authorizedEmail]);

  const from = location.state?.from?.pathname || "/h";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email.trim() || !password) {
      setErrorMessage("Please enter both administrator email and password.");
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      toast.success("Administrator verified. Access granted!", {
        style: {
          background: "#065f46",
          color: "#ffffff",
          fontWeight: "600",
          borderRadius: "1rem",
        },
      });
      navigate(from, { replace: true });
    } catch (err) {
      console.error("Admin login failed:", err);
      setErrorMessage(err.message || "Access Denied: Invalid administrator credentials.");
      toast.error(err.message || "Invalid administrator credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFillDemo = () => {
    setEmail(authorizedEmail || "vimalgupta8025@gmail.com");
    setPassword("Admin@12345");
    setErrorMessage("");
    toast.success("Configured credentials populated", { id: "demo-fill" });
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      <Toaster position="top-center" reverseOrder={false} />

      {/* Decorative ambient glowing backdrops */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-linear-to-tr from-emerald-600 to-teal-500 text-white shadow-xl shadow-emerald-500/20 mb-4 border border-emerald-400/30">
            <Heart className="w-8 h-8 fill-emerald-100" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            MediCare Console
          </h1>
          <p className="text-xs sm:text-sm text-emerald-300/80 font-medium mt-1">
            Restricted Staff & Administrator Access Portal
          </p>
        </div>

        {/* Glassmorphic Login Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-2xl shadow-emerald-950/40">
          
          {/* Top Security Banner */}
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Admin Authentication</h2>
                <p className="text-[11px] text-slate-500">Authorized Account Only</p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Strict Gate
            </span>
          </div>

          {/* Designated Administrator Notice */}
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-900 text-xs font-medium">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold">Authorized Administrator Email:</span>
            </div>
            <p className="font-mono text-emerald-950 font-bold bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-200 text-center select-all">
              {authorizedEmail}
            </p>
          </div>

          {/* UNAUTHORIZED CLERK ACCOUNT ALERT */}
          {unauthorizedAccount && (
            <div className="mb-5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              <div className="flex items-center gap-2 font-bold text-rose-900 mb-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Access Denied: Account Unauthorized</span>
              </div>
              <p className="mb-3 leading-relaxed">
                You are currently signed in as <strong className="underline">{unauthorizedAccount.email}</strong>. Only <strong className="underline">{authorizedEmail}</strong> is permitted to access the administrative dashboard.
              </p>
              <button
                onClick={logout}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition shadow-xs cursor-pointer text-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out & Switch Account</span>
              </button>
            </div>
          )}

          {/* Error Message Box */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* CLERK GOOGLE / EMAIL OTP SIGN-IN SECTION */}
          {isClerkConfigured && (
            <div className="mb-6">
              <SignInButton mode="modal" fallbackRedirectUrl="/h">
                <button
                  type="button"
                  className="w-full py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm text-center shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-slate-800 text-white"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Verify with Clerk / Google</span>
                </button>
              </SignInButton>

              <div className="relative flex py-4 items-center">
                <div className="grow border-t border-slate-200"></div>
                <span className="shrink mx-3 text-slate-400 text-[11px] uppercase font-bold tracking-wider">
                  or sign in with password
                </span>
                <div className="grow border-t border-slate-200"></div>
              </div>
            </div>
          )}

          {/* PASSWORD SIGN-IN FORM */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email Field */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Administrator Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  placeholder={authorizedEmail || "admin@medicare.com"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition text-slate-900 placeholder-slate-400"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Administrator Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter administrator password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition text-slate-900 placeholder-slate-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Demo Helper Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleFillDemo}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 transition cursor-pointer"
              >
                <KeyRound className="w-3 h-3 text-emerald-600" />
                <span>Fill Configured Admin Credentials</span>
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-6 rounded-2xl font-bold text-xs sm:text-sm text-center shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-600/25 mt-3 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Authenticate & Open Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

          {/* Security note */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>Only {authorizedEmail || "the configured admin"} is permitted entry.</span>
            </p>
          </div>

        </div>

        {/* Bottom Helper */}
        <p className="text-center text-[11px] text-emerald-200/60 mt-6">
          MediCare Healthcare Solutions © 2025 • Strict Clerk Security
        </p>

      </div>
    </div>
  );
}
