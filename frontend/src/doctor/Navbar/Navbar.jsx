import React, { useMemo } from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import { Home, Calendar, Edit, LogOut, Menu, X, Heart, ShieldCheck } from "lucide-react";
import { UserButton, useUser, useClerk } from "@clerk/clerk-react";

const STORAGE_KEY = "doctorToken_v1";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const isClerkKeyConfigured = 
  Boolean(PUBLISHABLE_KEY) && 
  (PUBLISHABLE_KEY.startsWith("pk_test_") || PUBLISHABLE_KEY.startsWith("pk_live_")) &&
  PUBLISHABLE_KEY !== "pk_test_your_clerk_publishable_key_here";

function DoctorNavbarContent({ clerkUser, isClerkSignedIn, clerkSignOut }) {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

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
    if (clerkSignOut) {
      clerkSignOut();
    }
    navigate("/");
  };

  const isActive = (to) => {
    if (to === basePath) {
      return location.pathname === basePath;
    }
    return location.pathname.startsWith(to);
  };

  return (
    <div className="flex flex-col h-full justify-between gap-6">
      {/* Navigation Links */}
      <div className="flex flex-col gap-2">
        {navItems.map((item) => {
          const active = isActive(item.to);
          return (
            <Link
              key={item.name}
              to={item.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                active
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/30"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <item.Icon className={`w-5 h-5 ${active ? "text-white" : "text-slate-400"}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Clerk Verification Badge & Bottom Actions */}
      <div className="pt-4 border-t border-slate-800 flex flex-col gap-3">
        {isClerkSignedIn && clerkUser && (
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="overflow-hidden">
                <p className="text-[11px] font-bold text-slate-200 truncate">{clerkUser.fullName || "Doctor"}</p>
                <p className="text-[10px] text-emerald-400 font-medium">Clerk Verified</p>
              </div>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        )}

        <Link
          to="/"
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <Heart className="w-4 h-4 text-emerald-400" />
          <span>Patient Portal</span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer w-full text-left"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

function ClerkDoctorNavbarWrapper() {
  const { user, isSignedIn } = useUser();
  const { signOut } = useClerk();

  return (
    <DoctorNavbarContent
      clerkUser={user}
      isClerkSignedIn={isSignedIn}
      clerkSignOut={signOut}
    />
  );
}

function LocalDoctorNavbarWrapper() {
  return (
    <DoctorNavbarContent
      clerkUser={null}
      isClerkSignedIn={false}
      clerkSignOut={() => {}}
    />
  );
}

export default function DoctorNavbar() {
  if (isClerkKeyConfigured) {
    return <ClerkDoctorNavbarWrapper />;
  }
  return <LocalDoctorNavbarWrapper />;
}