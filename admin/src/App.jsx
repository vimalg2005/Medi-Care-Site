import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

// Authentication Context & Route Guard
import { AdminAuthProvider } from "./context/AdminAuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute.jsx";

// Import Layout Component
import Navbar from "./components/Navbar/Navbar.jsx";

// Import Admin components/pages
import LoginPage from "./components/LoginPage/LoginPage.jsx";
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
    <AdminAuthProvider>
      <BrowserRouter>
        <Toaster position="top-center" reverseOrder={false} />
        <Routes>
          {/* Public Authentication Gate */}
          <Route path="/login" element={<LoginPage />} />

          {/* Root Path Redirects to Dashboard (Protected) */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Navigate to="/h" replace />
              </ProtectedRoute>
            } 
          />
          
          {/* Strictly Protected Admin Routes */}
          <Route 
            path="/h" 
            element={
              <ProtectedRoute>
                <Layout><DashboardPage /></Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/add" 
            element={
              <ProtectedRoute>
                <Layout><AddPage /></Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/list" 
            element={
              <ProtectedRoute>
                <Layout><ListPage /></Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/appointments" 
            element={
              <ProtectedRoute>
                <Layout><AppointmentsPage /></Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/service-dashboard" 
            element={
              <ProtectedRoute>
                <Layout><ServiceDashboard /></Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/add-service" 
            element={
              <ProtectedRoute>
                <Layout><AddService /></Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/list-service" 
            element={
              <ProtectedRoute>
                <Layout><ListServicePage /></Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/service-appointments" 
            element={
              <ProtectedRoute>
                <Layout><ServiceAppointmentsPage /></Layout>
              </ProtectedRoute>
            } 
          />
          
          {/* Catch-all route to dashboard (guarded) */}
          <Route 
            path="*" 
            element={
              <ProtectedRoute>
                <Navigate to="/h" replace />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </BrowserRouter>
    </AdminAuthProvider>
  );
}
