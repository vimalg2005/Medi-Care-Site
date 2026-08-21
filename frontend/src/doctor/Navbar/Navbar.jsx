import React, { useMemo, useState } from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import { Home, Calendar, Edit, LogOut, Menu, X, Heart } from "lucide-react";
import { navbarStylesDr } from "../../assets/themeStyles.js";

const STORAGE_KEY = "doctorToken_v1";

export default function Navbar() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const doctorId = useMemo(() => {
    if (params?.id) return params.id;
    const m = location.pathname.match(/\/doctor-admin\/([^/]+)/);
    if (m) return m[1];
    return null;
  }, [params, location.pathname]);

  const basePath = doctorId
    ? `/doctor-admin/${doctorId}`
    : "/doctor-admin/login";

  const navItems = [
    { name: "Dashboard", to: `${basePath}`, Icon: Home },
    { name: "Appointments", to: `${basePath}/appointments`, Icon: Calendar },
    { name: "Edit Profile", to: `${basePath}/profile/edit`, Icon: Edit },
  ];

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("doctorUser_v1");
    navigate("/");
  };

  const isActive = (to) => {
    if (to === basePath) {
      return location.pathname === basePath;
    }
    return location.pathname.startsWith(to);
  };

  return (
    <>
      <nav className={navbarStylesDr.navContainer}>
        {/* Brand Logo & Title */}
        <div className={navbarStylesDr.leftBrand}>
          <Link to="/" className="flex items-center gap-2">
            <Heart className="w-8 h-8 text-emerald-600 fill-emerald-100" />
            <div className={navbarStylesDr.brandTextContainer}>
              <span className={navbarStylesDr.brandTitle}>MediCare</span>
              <p className={navbarStylesDr.brandSubtitle}>Doctor Portal</p>
            </div>
          </Link>
        </div>

        {/* Desktop Menu links */}
        <div className={navbarStylesDr.desktopMenu}>
          <div className={navbarStylesDr.desktopMenuItems}>
            {navItems.map((item) => {
              const active = isActive(item.to);
              return (
                <Link
                  key={item.name}
                  to={item.to}
                  className={`${navbarStylesDr.baseLink} ${
                    active ? navbarStylesDr.activeLink : navbarStylesDr.inactiveLink
                  }`}
                >
                  <item.Icon className="w-4 h-4" />
                  <span className={navbarStylesDr.linkText}>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right Action buttons */}
        <div className={navbarStylesDr.rightActions}>
          <button
            onClick={handleLogout}
            className={navbarStylesDr.logoutButtonDesktop}
          >
            <LogOut className="w-4 h-4" /> Log Out
          </button>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-full hover:bg-emerald-50 text-emerald-700 transition"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Spacer to push content below the fixed nav */}
      <div className={navbarStylesDr.spacer}></div>

      {/* Mobile Drawer Menu */}
      {mobileOpen && (
        <div className="lg:hidden fixed top-24 left-4 right-4 z-40 bg-white rounded-2xl shadow-xl border border-emerald-100 p-4 animate-fade-in">
          <div className={navbarStylesDr.mobileMenuContent}>
            {navItems.map((item) => {
              const active = isActive(item.to);
              return (
                <Link
                  key={item.name}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`${navbarStylesDr.mobileBaseLink} ${
                    active
                      ? "bg-emerald-600 text-white shadow-md rounded-lg"
                      : "text-emerald-800 hover:bg-emerald-50 rounded-lg"
                  }`}
                >
                  <item.Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}

            <button
              onClick={() => {
                setMobileOpen(false);
                handleLogout();
              }}
              className="mt-3 w-full py-2.5 rounded-xl bg-rose-50 text-rose-600 font-semibold text-sm border border-rose-100 hover:bg-rose-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Log Out
            </button>
          </div>
        </div>
      )}
    </>
  );
}