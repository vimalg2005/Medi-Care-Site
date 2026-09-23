import React, { useState } from "react";
import { TrendingUp, CheckCircle2, Calendar, Award } from "lucide-react";

/**
 * Doctor Weekly Activity & Completion Rate Analytics Suite
 */
export default function DoctorAnalyticsCharts({ analytics, doctorId }) {
  const [hoverBar, setHoverBar] = useState(null);

  if (!analytics) return null;

  const { kpis, weeklyActivity = [] } = analytics;
  const maxDayCount = Math.max(...weeklyActivity.map((w) => w.bookings || 0), 4);

  // SVG Gauge calculations for Completion Rate
  const completionRate = kpis?.completionRate ?? 100;
  const radius = 45;
  const strokeWidth = 10;
  const center = 55;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completionRate / 100) * circumference;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
      {/* 7-Day Activity Chart (2 cols on desktop) */}
      <div className="lg:col-span-2 bg-white/90 backdrop-blur-md rounded-3xl p-5 sm:p-6 border border-emerald-100 shadow-xl shadow-emerald-900/5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2 pb-3 border-b border-emerald-50">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <TrendingUp className="w-4 h-4" />
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-800">
                7-Day Consultation Activity
              </h3>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Past 7 Days
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-6">
            Track daily patient bookings, attended consultations, and daily earnings.
          </p>

          {/* Interactive Bar Visualization */}
          <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-40 pt-4 pb-2 border-b border-slate-100">
            {weeklyActivity.map((day, idx) => {
              const heightPercent = Math.min(100, Math.max(8, Math.round((day.bookings / maxDayCount) * 100)));
              const isHovered = hoverBar === idx;

              return (
                <div
                  key={idx}
                  className="flex flex-col items-center h-full justify-end group relative cursor-pointer"
                  onMouseEnter={() => setHoverBar(idx)}
                  onMouseLeave={() => setHoverBar(null)}
                >
                  {/* Tooltip */}
                  {isHovered && (
                    <div className="absolute -top-14 bg-slate-900 text-white text-[11px] py-1.5 px-2.5 rounded-xl shadow-xl whitespace-nowrap z-30 pointer-events-none">
                      <div className="font-bold text-emerald-400">{day.day}, {day.date}</div>
                      <div>Bookings: <span className="font-semibold">{day.bookings}</span></div>
                      <div>Completed: <span className="font-semibold">{day.completed}</span></div>
                    </div>
                  )}

                  {/* Number above bar */}
                  <span className={`text-[10px] font-bold mb-1 transition ${
                    isHovered ? "text-emerald-700 scale-110" : "text-slate-400"
                  }`}>
                    {day.bookings}
                  </span>

                  {/* The bar */}
                  <div className="w-full max-w-[34px] bg-slate-100 rounded-t-xl overflow-hidden h-full flex items-end">
                    <div
                      className={`w-full rounded-t-xl transition-all duration-300 ${
                        isHovered
                          ? "bg-linear-to-t from-emerald-600 to-teal-500 shadow-md"
                          : day.completed > 0
                          ? "bg-linear-to-t from-emerald-500 to-emerald-400"
                          : "bg-slate-200"
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>

                  {/* Day label */}
                  <span className={`text-[11px] mt-2 font-medium ${
                    isHovered ? "font-bold text-emerald-800" : "text-slate-500"
                  }`}>
                    {day.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Summary */}
        <div className="flex items-center justify-between pt-3 mt-2 text-xs text-slate-500">
          <div className="flex items-center gap-1 text-emerald-700 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{kpis?.completed || 0} completed consultations this period</span>
          </div>
          <span className="font-bold text-slate-800">
            ₹{(kpis?.revenue || 0).toLocaleString()} Generated
          </span>
        </div>
      </div>

      {/* Completion & Performance Ring Gauge (1 col) */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl p-5 sm:p-6 border border-emerald-100 shadow-xl shadow-emerald-900/5 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2 pb-3 border-b border-emerald-50">
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Award className="w-4 h-4" />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-800">
              Practice Efficiency
            </h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Consultation completion efficiency and reliability score.
          </p>

          {/* SVG Circular Gauge */}
          <div className="flex items-center justify-center my-3 relative">
            <svg width="120" height="120" viewBox="0 0 110 110" className="transform -rotate-90">
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke="#F1F5F9"
                strokeWidth={strokeWidth}
              />
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke="#10B981"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>

            {/* Inner Percentage */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-slate-800">{completionRate}%</span>
              <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Success</span>
            </div>
          </div>
        </div>

        {/* Practice Metrics Grid */}
        <div className="space-y-2 pt-3 border-t border-emerald-50 text-xs">
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Total Consultations</span>
            <span className="font-bold text-slate-800">{kpis?.totalAppointments || 0}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Completed Sessions</span>
            <span className="font-bold text-emerald-600">{kpis?.completed || 0}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Cancelled / No-shows</span>
            <span className="font-bold text-rose-500">{kpis?.canceled || 0}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-t border-slate-100">
            <span className="text-slate-500">Practice Status</span>
            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              ID: {doctorId ? String(doctorId).slice(-6) : "Active"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
