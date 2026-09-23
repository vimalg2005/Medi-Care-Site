import React from "react";

export default function Hero({ isPatient = false }) {
  return (
    <div className="py-4 text-slate-600">
      <p>
        {isPatient
          ? "Access your patient records, manage appointments, and review medical reports securely from your dashboard."
          : "Manage hospital operations, doctors, staff, patient records, and system settings from a centralized control panel."}
      </p>
    </div>
  );
}