import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, LogIn, LogOut, LayoutDashboard, Heart, Calendar } from "lucide-react";
import { navbarStyles } from "../../assets/themeStyles.js";

const STORAGE_KEY = "doctorToken_v1";

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
        className={`${navbarStyles.navbarContainer} ${
          showNavbar ? navbarStyles.navbarVisible : navbarStyles.navbarHidden
        }`}
      >
        <div className={navbarStyles.contentWrapper}>
          <div className={navbarStyles.flexContainer}>
            {/* Logo Section */}
            <Link to="/" className={navbarStyles.logoLink}>
              <div className="flex items-center gap-2">
                <Heart className="w-8 h-8 text-emerald-600 fill-emerald-100" />
                <div className={navbarStyles.logoTextContainer}>
                  <span className={navbarStyles.logoTitle}>MediCare</span>
                  <p className={navbarStyles.logoSubtitle}>Health & Wellness</p>
                </div>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className={navbarStyles.desktopNav}>
              <div className={navbarStyles.navItemsContainer}>
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`${navbarStyles.navItem} ${
                      isActive(item.href)
                        ? navbarStyles.navItemActive
                        : navbarStyles.navItemInactive
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right Buttons Section */}
            <div className={navbarStyles.rightContainer}>
              {/* Doctor Dashboard Link */}
              {isDoctorLoggedIn ? (
                <>
                  <Link
                    to="/doctor-admin/dashboard"
                    className="hidden lg:inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg"
                  >
                    <LayoutDashboard className="w-4 h-4" /> Doctor Dashboard
                  </Link>
                  <button
                    onClick={handleDoctorLogout}
                    className="hidden lg:inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-emerald-600 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-all"
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </>
              ) : isPatientLoggedIn ? (
                <button
                  onClick={handlePatientLogout}
                  className="hidden lg:inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-rose-600 border border-rose-200 bg-rose-50 hover:bg-rose-100 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" /> Logout (Patient)
                </button>
              ) : (
                <Link
                  to="/login"
                  className={navbarStyles.loginButton}
                >
                  <LogIn className={navbarStyles.loginIcon} /> Doctor Login
                </Link>
              )}

              {/* Mobile Menu Toggle Button */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className={navbarStyles.mobileToggle}
                aria-label="Toggle Menu"
              >
                {isOpen ? (
                  <X className={navbarStyles.toggleIcon} />
                ) : (
                  <Menu className={navbarStyles.toggleIcon} />
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
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 transition-all"
                >
                  <LogIn className="w-4 h-4" /> Doctor Login
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