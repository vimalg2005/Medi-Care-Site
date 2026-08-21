import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import { 
  Heart, Star, Shield, Award, Stethoscope, PhoneCall, 
  ArrowUp, Activity, CheckCircle, Clock 
} from "lucide-react";
import { Toaster } from "react-hot-toast";

// Style imports
import { bannerStyles } from "./assets/themeStyles.js";

// Layout & Components imports
import Navbar from "./components/Navbar/Navbar.jsx";
import Footer from "./components/Footer/Footer.jsx";
import LoginPage from "./components/LoginPage/LoginPage.jsx";
import DoctorsPage from "./components/DoctorsPage/DoctorsPage.jsx";
import DoctorDetail from "./pages/DoctorDetail/DoctorDetail.jsx";
import ServicePage from "./components/ServicePage/ServicePage.jsx";
import ServiceDetailPage from "./pages/ServiceDetailPage/ServiceDetailPage.jsx";
import AppointmentPage from "./components/AppointmentPage/AppointmentPage.jsx";
import ContactPage from "./components/ContactPage/ContactPage.jsx";

// Sections for Home Page
import HomeDoctors from "./components/HomeDoctors/HomeDoctors.jsx";
import Certification from "./components/Certification/Certification.jsx";
import Testimonial from "./components/Testimonial/Testimonial.jsx";

// Doctor Dashboard Pages
import DoctorNavbar from "./doctor/Navbar/Navbar.jsx";
import DoctorDashboard from "./doctor/DashboardPage/DashboardPage.jsx";
import DoctorEditProfile from "./doctor/EditProfilePage/EditProfilePage.jsx";
import DoctorListPage from "./doctor/ListPage/ListPage.jsx";

// Banner Image
import BannerImg from "./assets/BannerImg.png";

// Scroll To Top Component
const ScrollButton = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 200);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <button
      onClick={scrollTop}
      className={`fixed right-4 bottom-6 z-50 w-11 h-11 rounded-full flex items-center justify-center 
      bg-emerald-600 text-white shadow-lg transition-all duration-300 cursor-pointer
      ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"} 
      hover:scale-110 hover:shadow-xl`}
      title="Go to top"
    >
      <ArrowUp size={22} />
    </button>
  );
};

// Layout for Main App (User facing)
const MainLayout = ({ children }) => {
  useEffect(() => {
    document.body.style.overflowX = "hidden";
    document.documentElement.style.overflowX = "hidden";
    return () => {
      document.body.style.overflowX = "auto";
      document.documentElement.style.overflowX = "auto";
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">{children}</main>
      <Footer />
      <ScrollButton />
    </div>
  );
};

// Layout for Doctor Dashboard Portal
const DoctorLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800">
        <div className="p-6 border-b border-slate-800 flex items-center gap-2">
          <Heart className="w-6 h-6 text-emerald-500 fill-emerald-500/20" />
          <span className="font-bold text-lg text-emerald-400">Doctor Portal</span>
        </div>
        <div className="flex-grow p-4">
          <DoctorNavbar />
        </div>
      </div>
      
      {/* Main Panel Content */}
      <div className="flex-grow flex flex-col">
        <main className="flex-grow p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
};

// Home View Component
const HomeView = () => {
  return (
    <div>
      {/* Hero Banner Section */}
      <div className={bannerStyles.bannerContainer}>
        <div className={bannerStyles.mainContainer}>
          <div className={bannerStyles.borderOutline}>
            <div className={bannerStyles.outerAnimatedBand}></div>
            <div className={bannerStyles.innerWhiteBorder}></div>
          </div>
          
          <div className={bannerStyles.contentContainer}>
            <div className={bannerStyles.flexContainer}>
              {/* Text content */}
              <div className={bannerStyles.leftContent}>
                <div className={bannerStyles.headerBadgeContainer}>
                  <div className={bannerStyles.stethoscopeContainer}>
                    <div className={bannerStyles.stethoscopeInner}>
                      <Stethoscope className={bannerStyles.stethoscopeIcon} />
                    </div>
                  </div>
                  <div className={bannerStyles.starsContainer}>
                    <div className={bannerStyles.starsInner}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={bannerStyles.starIcon} />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500 ml-2">(4.9/5 Rating)</span>
                  </div>
                </div>

                <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-800 tracking-tight leading-none mb-4 font-sans">
                  Find Best <span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-600 to-green-600">Doctors</span> <br />
                  & Book Appointment
                </h1>
                
                <p className={bannerStyles.tagline}>
                  Your Health is Our <span className={bannerStyles.taglineHighlight}>Primary Concern</span>. Get consults from highly qualified specialists.
                </p>

                {/* Features Grid */}
                <div className={bannerStyles.featuresGrid}>
                  <div className={`${bannerStyles.featureItem} ${bannerStyles.featureBorderGreen}`}>
                    <CheckCircle className={bannerStyles.featureIcon} />
                    <span className="text-sm font-semibold text-white">100% Certified Specialists</span>
                  </div>
                  <div className={`${bannerStyles.featureItem} ${bannerStyles.featureBorderEmerald}`}>
                    <CheckCircle className={bannerStyles.featureIcon} />
                    <span className="text-sm font-semibold text-white">Instant Diagnostics</span>
                  </div>
                </div>

                {/* Action CTA buttons */}
                <div className={bannerStyles.ctaButtonsContainer}>
                  <Link to="/doctors" className={bannerStyles.bookButton}>
                    <div className={bannerStyles.bookButtonOverlay}></div>
                    <div className={bannerStyles.bookButtonContent}>
                      Book Appointment Now
                    </div>
                  </Link>
                  <a href="tel:+918299431275" className={bannerStyles.emergencyButton}>
                    <div className={bannerStyles.emergencyButtonContent}>
                      <PhoneCall className={bannerStyles.emergencyButtonIcon} /> Emergency Line
                    </div>
                  </a>
                </div>
              </div>

              {/* Right side banner image */}
              <div className={bannerStyles.rightImageSection}>
                <div className={bannerStyles.imageContainer}>
                  <div className={bannerStyles.imageFrame}>
                    <img 
                      src={BannerImg} 
                      alt="Medicare Banner Doctor" 
                      className="w-full object-contain h-72 md:h-96 rounded-2xl" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Other Sections */}
      <HomeDoctors />
      <Certification />
      <Testimonial />
    </div>
  );
};

// Doctor Admin Dashboard Redirect Wrapper
const DoctorDashboardWrapper = () => {
  const token = localStorage.getItem(STORAGE_KEY);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  let doctorId = "dashboard";
  try {
    const userStr = localStorage.getItem("doctorUser_v1");
    if (userStr) {
      const user = JSON.parse(userStr);
      doctorId = user._id || user.id;
    }
  } catch (err) {}

  return <Navigate to={`/doctor-admin/${doctorId}`} replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" reverseOrder={false} />
      <Routes>
        {/* Client Portal Routes */}
        <Route path="/" element={<MainLayout><HomeView /></MainLayout>} />
        <Route path="/doctors" element={<MainLayout><DoctorsPage /></MainLayout>} />
        <Route path="/doctors/:id" element={<MainLayout><DoctorDetail /></MainLayout>} />
        <Route path="/services" element={<MainLayout><ServicePage /></MainLayout>} />
        <Route path="/services/:id" element={<MainLayout><ServiceDetailPage /></MainLayout>} />
        <Route path="/appointments" element={<MainLayout><AppointmentPage /></MainLayout>} />
        <Route path="/contact" element={<MainLayout><ContactPage /></MainLayout>} />
        <Route path="/login" element={<LoginPage />} />

        {/* Doctor Portal Routes */}
        <Route path="/doctor-admin/dashboard" element={<DoctorDashboardWrapper />} />
        <Route 
          path="/doctor-admin/:id" 
          element={<DoctorLayout><DoctorDashboard /></DoctorLayout>} 
        />
        <Route 
          path="/doctor-admin/:id/appointments" 
          element={<DoctorLayout><DoctorListPage /></DoctorLayout>} 
        />
        <Route 
          path="/doctor-admin/:id/profile/edit" 
          element={<DoctorLayout><DoctorEditProfile /></DoctorLayout>} 
        />
      </Routes>
    </BrowserRouter>
  );
}
