import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

// Import Layout Component
import Navbar from "./components/Navbar/Navbar.jsx";

// Import Admin components/pages
import DashboardPage from "./components/DashboardPage/DashboardPage.jsx";
import AddPage from "./components/AddPage/AddPage.jsx";
import ListPage from "./components/ListPage/ListPage.jsx";
import AppointmentsPage from "./components/AppointmentsPage/AppointmentsPage.jsx";
import ServiceDashboard from "./components/ServiceDashboard/ServiceDashboard.jsx";
import AddService from "./components/AddService/AddService.jsx";
import ListServicePage from "./components/ListServicePage/ListServicePage.jsx";
import ServiceAppointmentsPage from "./components/ServiceAppointmentsPage/ServiceAppointmentsPage.jsx";

const Layout = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Top Navbar */}
      <Navbar />
      
      {/* Main Content Area */}
      <main className="flex-grow p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full mt-2">
        {children}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" reverseOrder={false} />
      <Routes>
        {/* Redirect Root path to /h (Dashboard) */}
        <Route path="/" element={<Navigate to="/h" replace />} />
        
        {/* Admin Router Paths */}
        <Route path="/h" element={<Layout><DashboardPage /></Layout>} />
        <Route path="/add" element={<Layout><AddPage /></Layout>} />
        <Route path="/list" element={<Layout><ListPage /></Layout>} />
        <Route path="/appointments" element={<Layout><AppointmentsPage /></Layout>} />
        <Route path="/service-dashboard" element={<Layout><ServiceDashboard /></Layout>} />
        <Route path="/add-service" element={<Layout><AddService /></Layout>} />
        <Route path="/list-service" element={<Layout><ListServicePage /></Layout>} />
        <Route path="/service-appointments" element={<Layout><ServiceAppointmentsPage /></Layout>} />
        
        {/* Catch-all route to dashboard */}
        <Route path="*" element={<Navigate to="/h" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
