import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, LogIn, LogOut, LayoutDashboard, Heart, Calendar, User } from "lucide-react";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { navbarStyles } from "../../assets/themeStyles.js";

const STORAGE_KEY = "doctorToken_v1";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const isClerkKeyConfigured = 
  Boolean(PUBLISHABLE_KEY) && 
  (PUBLISHABLE_KEY.startsWith("pk_test_") || PUBLISHABLE_KEY.startsWith("pk_live_")) &&
  PUBLISHABLE_KEY !== "pk_test_your_clerk_publishable_key_here";

const ClerkNavAuth = () => {
  return (
    <>
      <SignedIn>
        <div className="flex items-center gap-2">
          <Link
            to="/appointments"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition"
          >
            <Calendar className="w-3.5 h-3.5" /> My Bookings
          </Link>
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "w-9 h-9 ring-2 ring-emerald-500/40 hover:scale-105 transition",
              },
            }}
          />
        </div>
      </SignedIn>
      <SignedOut>
        <Link to="/login" className={navbarStyles.loginButton}>
          <LogIn className={navbarStyles.loginIcon} /> Sign In
        </Link>
      </SignedOut>
    </>
  );
};


export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isDoctorLoggedIn, setIsDoctorLoggedIn] = useState(() => {
    try {
      return Boolean(localStorage.getItem(STORAGE_KEY));
    } catch {
      return false;
    }
  });

  // Mock patient login status for local demo
  const [isPatientLoggedIn, setIsPatientLoggedIn] = useState(() => {
    try {
      return Boolean(localStorage.getItem("patientToken_v1"));
    } catch {
      return false;
    }
  });

  const location = useLocation();
  const navigate = useNavigate();
  const navRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setShowNavbar(false);
      } else {
        setShowNavbar(true);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        setIsDoctorLoggedIn(Boolean(e.newValue));
      }
      if (e.key === "patientToken_v1") {
        setIsPatientLoggedIn(Boolean(e.newValue));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && navRef.current && !navRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const navItems = [
    { label: "Home", href: "/" },
    { label: "Doctors", href: "/doctors" },
    { label: "Services", href: "/services" },
    { label: "Appointments", href: "/appointments" },
    { label: "Contact", href: "/contact" },
  ];

  const handleDoctorLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsDoctorLoggedIn(false);
    navigate("/");
  };

  const handlePatientLogout = () => {
    localStorage.removeItem("patientToken_v1");
    localStorage.removeItem("patientUser_v1");
    setIsPatientLoggedIn(false);
    navigate("/");
  };

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <style>{navbarStyles.animationStyles}</style>
      <nav
        ref={navRef}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 backdrop-blur-xl bg-white/85 border-b border-emerald-100/60 shadow-xs ${
          showNavbar ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo Section */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="p-2 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <Heart className="w-5 h-5 fill-white" />
              </div>
              <div>
                <span className="text-xl sm:text-2xl font-black bg-linear-to-r from-emerald-700 via-teal-700 to-emerald-800 bg-clip-text text-transparent tracking-tight">
                  MediCare
                </span>
                <p className="text-[10px] font-semibold text-emerald-600 tracking-wider uppercase -mt-0.5">
                  Healthcare & Diagnostics
                </p>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center">
              <div className="flex items-center gap-1 bg-slate-100/70 p-1.5 rounded-full border border-slate-200/50 backdrop-blur-md">
                {navItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
                        active
                          ? "bg-emerald-600 text-white shadow-sm shadow-emerald-700/25"
                          : "text-slate-600 hover:text-emerald-800 hover:bg-white/80"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right Buttons Section */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Doctor Dashboard Link */}
              {isDoctorLoggedIn ? (
                <>
                  <Link
                    to="/doctor-admin/dashboard"
                    className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-md shadow-emerald-700/20"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" /> Doctor Portal
                  </Link>
                  <button
                    onClick={handleDoctorLogout}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Logout
                  </button>
                </>
              ) : isClerkKeyConfigured ? (
                <ClerkNavAuth />
              ) : isPatientLoggedIn ? (
                <button
                  onClick={handlePatientLogout}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold text-rose-600 border border-rose-200 bg-rose-50 hover:bg-rose-100 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" /> Logout
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/doctors"
                    className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 transition"
                  >
                    <Calendar className="w-3.5 h-3.5" /> Book Doctor
                  </Link>
                  <Link
                    to="/login"
                    className="flex items-center gap-1.5 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-4 sm:px-5 py-2 rounded-full font-bold text-xs sm:text-sm shadow-md shadow-emerald-800/15 hover:shadow-lg transition cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" /> Sign In
                  </Link>
                </div>
              )}

              {/* Mobile Menu Toggle Button */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-emerald-50 border border-slate-200/60 transition cursor-pointer"
                aria-label="Toggle Menu"
              >
                {isOpen ? (
                  <X className="w-5 h-5 text-emerald-700" />
                ) : (
                  <Menu className="w-5 h-5 text-emerald-700" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isOpen && (
          <div className={navbarStyles.mobileMenu}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className={`${navbarStyles.mobileMenuItem} ${
                  isActive(item.href)
                    ? navbarStyles.mobileMenuItemActive
                    : navbarStyles.mobileMenuItemInactive
                }`}
              >
                {item.label}
              </Link>
            ))}

            <div className="px-4 pt-2">
              {isDoctorLoggedIn ? (
                <div className="flex flex-col gap-2">
                  <Link
                    to="/doctor-admin/dashboard"
                    onClick={() => setIsOpen(false)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-all"
                  >
                    <LayoutDashboard className="w-4 h-4" /> Doctor Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      handleDoctorLogout();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full border border-rose-200 bg-rose-50 text-rose-600 font-semibold text-sm hover:bg-rose-100 transition-all"
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </div>
              ) : isClerkKeyConfigured ? (
                <div className="flex flex-col gap-2">
                  <SignedIn>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                      <span className="text-sm font-semibold text-emerald-800">Patient Account</span>
                      <UserButton afterSignOutUrl="/" />
                    </div>
                  </SignedIn>
                  <SignedOut>
                    <Link
                      to="/login"
                      onClick={() => setIsOpen(false)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-all shadow-sm"
                    >
                      <LogIn className="w-4 h-4" /> Sign In
                    </Link>
                  </SignedOut>
                </div>
              ) : isPatientLoggedIn ? (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    handlePatientLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full border border-rose-200 bg-rose-50 text-rose-600 font-semibold text-sm hover:bg-rose-100 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" /> Logout (Patient)
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-all shadow-sm"
                >
                  <LogIn className="w-4 h-4" /> Sign In
                </Link>
              )}
            </div>
          </div>
        )}

        <div className={navbarStyles.navbarBorder}></div>
      </nav>
    </>
  );
}