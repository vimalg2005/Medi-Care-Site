import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Home, UserPlus, Users, Calendar, Grid, 
  PlusSquare, List, Menu, X, LogOut, Heart, ShieldCheck 
} from "lucide-react";
import toast from "react-hot-toast";
import { useAdminAuth } from "../../context/AdminAuthContext.jsx";
import { navbarStyles } from "../../assets/themeStyles.js";

const ns = navbarStyles;

const CenterNavItem = ({ to, label, icon }) => {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link
      to={to}
      className={`nav-item ${ns.centerNavItemBase} ${
        active ? ns.centerNavItemActive : ns.centerNavItemInactive
      }`}
    >
      <span className="flex items-center gap-1.5 font-semibold text-sm">
        {icon} {label}
      </span>
    </Link>
  );
};

const MobileItem = ({ to, label, icon, onClick }) => {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`${ns.mobileItemBase} ${
        active ? ns.mobileItemActive : ns.mobileItemInactive
      }`}
    >
      <span className="flex items-center gap-2 font-medium text-sm">
        {icon} {label}
      </span>
    </Link>
  );
};

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { adminUser, logout } = useAdminAuth();
  const navInnerRef = useRef(null);
  const indicatorRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const moveIndicator = useCallback(() => {
    const container = navInnerRef.current;
    const ind = indicatorRef.current;
    if (!container || !ind) return;

    const active = container.querySelector(".nav-item.active") || container.querySelector(".nav-item");
    if (!active) {
      ind.style.opacity = "0";
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();

    const left = activeRect.left - containerRect.left + container.scrollLeft;
    const width = activeRect.width;

    ind.style.transform = `translateX(${left}px)`;
    ind.style.width = `${width}px`;
    ind.style.opacity = "1";
  }, []);

  useLayoutEffect(() => {
    moveIndicator();
    const t = setTimeout(() => {
      moveIndicator();
    }, 120);
    return () => clearTimeout(t);
  }, [location.pathname, moveIndicator]);

  useEffect(() => {
    const container = navInnerRef.current;
    if (!container) return;

    const onScroll = () => {
      moveIndicator();
    };
    container.addEventListener("scroll", onScroll, { passive: true });

    const ro = new ResizeObserver(() => {
      moveIndicator();
    });
    ro.observe(container);
    if (container.parentElement) ro.observe(container.parentElement);

    window.addEventListener("resize", moveIndicator);

    moveIndicator();

    return () => {
      container.removeEventListener("scroll", onScroll);
      ro.disconnect();
      window.removeEventListener("resize", moveIndicator);
    };
  }, [moveIndicator]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const handleSignOut = () => {
    logout();
    toast.success("Administrator session closed.");
    navigate("/login");
  };

  return (
    <header className={ns.header}>
      {/* Top Navbar */}
      <div className={ns.navContainer}>
        <div className={ns.flexContainer}>
          {/* Logo Section */}
          <div className={ns.logoContainer}>
            <Heart className="w-8 h-8 text-emerald-600 fill-emerald-100" />
            <div>
              <Link to="/h" className="text-xl font-extrabold text-emerald-700 tracking-tight">
                MediCare Console
              </Link>
              <p className={ns.logoSubtext}>Admin Management</p>
            </div>
          </div>

          {/* Desktop Center Scrolling Navigation */}
          <div className={ns.centerNavContainer}>
            <div className={ns.glowEffect}>
              <div
                ref={navInnerRef}
                tabIndex={0}
                className={ns.centerNavScrollContainer}
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                <CenterNavItem to="/h" label="Dashboard" icon={<Home size={15} />} />
                <CenterNavItem to="/add" label="Add Doctor" icon={<UserPlus size={15} />} />
                <CenterNavItem to="/list" label="Doctors List" icon={<Users size={15} />} />
                <CenterNavItem to="/appointments" label="Appointments" icon={<Calendar size={15} />} />
                <CenterNavItem to="/service-dashboard" label="Service Board" icon={<Grid size={15} />} />
                <CenterNavItem to="/add-service" label="Add Service" icon={<PlusSquare size={15} />} />
                <CenterNavItem to="/list-service" label="Services List" icon={<List size={15} />} />
                <CenterNavItem to="/service-appointments" label="Service Appts" icon={<Calendar size={15} />} />
                
                {/* Underline Indicator */}
                <div ref={indicatorRef} className={ns.indicator} />
              </div>
            </div>
          </div>

          {/* Right actions */}
          <div className={ns.rightContainer}>
            {adminUser && (
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate max-w-[140px]">{adminUser.email}</span>
              </div>
            )}

            <button
              onClick={handleSignOut}
              className={ns.signOutButton}
            >
              <LogOut size={14} /> Exit Console
            </button>

            {/* Mobile Menu button toggle */}
            <button
              onClick={() => setOpen(!open)}
              className={ns.mobileMenuButton}
              aria-label="Toggle mobile menu"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {open && (
          <div className={ns.mobileMenuContainer}>
            <div className={ns.mobileMenuInner}>
              <MobileItem to="/h" label="Dashboard" icon={<Home size={16} />} onClick={() => setOpen(false)} />
              <MobileItem to="/add" label="Add Doctor" icon={<UserPlus size={16} />} onClick={() => setOpen(false)} />
              <MobileItem to="/list" label="List Doctors" icon={<Users size={16} />} onClick={() => setOpen(false)} />
              <MobileItem to="/appointments" label="Appointments" icon={<Calendar size={16} />} onClick={() => setOpen(false)} />
              <MobileItem to="/service-dashboard" label="Service Dashboard" icon={<Grid size={16} />} onClick={() => setOpen(false)} />
              <MobileItem to="/add-service" label="Add Service" icon={<PlusSquare size={16} />} onClick={() => setOpen(false)} />
              <MobileItem to="/list-service" label="List Services" icon={<List size={16} />} onClick={() => setOpen(false)} />
              <MobileItem to="/service-appointments" label="Service Appointments" icon={<Calendar size={16} />} onClick={() => setOpen(false)} />
              
              <div className={ns.mobileAuthContainer}>
                <button
                  onClick={() => {
                    setOpen(false);
                    handleSignOut();
                  }}
                  className={ns.mobileSignOutButton}
                >
                  Exit Console
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
