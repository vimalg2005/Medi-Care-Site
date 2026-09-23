import React, { useState, useMemo } from "react";
import { TrendingUp, Users, Calendar, BadgeIndianRupee, Award, ArrowUpRight } from "lucide-react";

/**
 * Native Interactive SVG Timeline Area Chart
 * Renders smooth spline area chart with gradient and hover tooltip
 */
export function TimelineAreaChart({
  data = [],
  metric = "revenue",
  onMetricChange,
  timeRange = 30,
  onTimeRangeChange,
}) {
  const [hoverIndex, setHoverIndex] = useState(null);

  // Slice data based on selected range (7 or 30 days)
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.slice(-timeRange);
  }, [data, timeRange]);

  const width = 760;
  const height = 260;
  const padding = { top: 25, right: 30, bottom: 40, left: 55 };

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Compute maximum value for scale
  const values = chartData.map((d) => (metric === "revenue" ? d.revenue : d.bookings));
  const rawMax = Math.max(...values, 1);
  const maxValue = metric === "revenue" ? Math.ceil(rawMax / 500) * 500 || 1000 : Math.ceil(rawMax * 1.2) || 5;

  const points = useMemo(() => {
    if (chartData.length === 0) return [];
    const step = chartData.length > 1 ? innerWidth / (chartData.length - 1) : innerWidth;
    return chartData.map((d, i) => {
      const val = metric === "revenue" ? d.revenue : d.bookings;
      const x = padding.left + i * step;
      const y = padding.top + innerHeight - (val / maxValue) * innerHeight;
      return { x, y, data: d, val };
    });
  }, [chartData, innerWidth, innerHeight, maxValue, metric, padding.left, padding.top]);

  // Construct SVG smooth path (Catmull-Rom or cubic Bezier)
  const { linePath, areaPath } = useMemo(() => {
    if (points.length === 0) return { linePath: "", areaPath: "" };
    if (points.length === 1) {
      const p = points[0];
      return {
        linePath: `M ${p.x - 20},${p.y} L ${p.x + 20},${p.y}`,
        areaPath: `M ${p.x - 20},${p.y} L ${p.x + 20},${p.y} L ${p.x + 20},${padding.top + innerHeight} L ${p.x - 20},${padding.top + innerHeight} Z`,
      };
    }

    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }

    const first = points[0];
    const last = points[points.length - 1];
    const area = `${d} L ${last.x},${padding.top + innerHeight} L ${first.x},${padding.top + innerHeight} Z`;

    return { linePath: d, areaPath: area };
  }, [points, innerHeight, padding.top]);

  // Y-axis grid labels
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((frac) => {
    const val = Math.round(maxValue * frac);
    const y = padding.top + innerHeight - frac * innerHeight;
    return { val, y };
  });

  const activePoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-3xl p-5 sm:p-6 border border-emerald-100 shadow-xl shadow-emerald-900/5">
      {/* Header with Metric & Range Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-emerald-50">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-800">
              Consultation & Revenue Velocity
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time analytics for patient consultation volume and clinical earnings.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Metric switcher */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              onClick={() => onMetricChange && onMetricChange("revenue")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                metric === "revenue"
                  ? "bg-white text-emerald-700 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Revenue (₹)
            </button>
            <button
              onClick={() => onMetricChange && onMetricChange("bookings")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                metric === "bookings"
                  ? "bg-white text-emerald-700 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Bookings
            </button>
          </div>

          {/* Time range switcher */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              onClick={() => onTimeRangeChange && onTimeRangeChange(7)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                timeRange === 7
                  ? "bg-emerald-600 text-white shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => onTimeRangeChange && onTimeRangeChange(30)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                timeRange === 30
                  ? "bg-emerald-600 text-white shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              30 Days
            </button>
          </div>
        </div>
      </div>

      {/* SVG Chart Container */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto max-h-[300px]"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="100%" stopColor="#0D9488" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#10B981" floodOpacity="0.35" />
            </filter>
          </defs>

          {/* Horizontal Gridlines & Y-Axis Labels */}
          {yTicks.map((t, idx) => (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={t.y}
                x2={width - padding.right}
                y2={t.y}
                stroke="#E2E8F0"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={padding.left - 10}
                y={t.y + 4}
                textAnchor="end"
                className="text-[10px] fill-slate-400 font-mono"
              >
                {metric === "revenue" ? `₹${t.val >= 1000 ? `${(t.val / 1000).toFixed(0)}k` : t.val}` : t.val}
              </text>
            </g>
          ))}

          {/* Area Fill */}
          {areaPath && (
            <path d={areaPath} fill="url(#areaGradient)" />
          )}

          {/* Spline Line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
            />
          )}

          {/* X-axis dates */}
          {points.map((p, idx) => {
            const showLabel =
              timeRange === 7 ||
              idx === 0 ||
              idx === points.length - 1 ||
              idx % 5 === 0;

            if (!showLabel) return null;
            return (
              <text
                key={idx}
                x={p.x}
                y={height - 12}
                textAnchor="middle"
                className="text-[10px] fill-slate-400 font-medium"
              >
                {p.data.label || p.data.date?.slice(5)}
              </text>
            );
          })}

          {/* Interactive Hover Vertical Line & Cursor */}
          {activePoint && (
            <g>
              <line
                x1={activePoint.x}
                y1={padding.top}
                x2={activePoint.x}
                y2={padding.top + innerHeight}
                stroke="#059669"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="6"
                fill="#ffffff"
                stroke="#059669"
                strokeWidth="3"
                className="transition-all"
              />
            </g>
          )}

          {/* Mouse Detection Transparent Bars */}
          {points.map((p, idx) => {
            const step = chartData.length > 1 ? innerWidth / (chartData.length - 1) : innerWidth;
            return (
              <rect
                key={idx}
                x={p.x - step / 2}
                y={padding.top}
                width={step}
                height={innerHeight}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoverIndex(idx)}
              />
            );
          })}
        </svg>

        {/* Floating Tooltip HTML Overlay */}
        {activePoint && (
          <div
            className="absolute pointer-events-none transition-all duration-75 ease-out z-20"
            style={{
              left: `${(activePoint.x / width) * 100}%`,
              top: `${(activePoint.y / height) * 100}%`,
              transform: "translate(-50%, -120%)",
            }}
          >
            <div className="bg-slate-900/95 text-white backdrop-blur-md px-3 py-2 rounded-xl shadow-2xl border border-slate-700/50 text-xs min-w-[130px]">
              <div className="font-semibold text-emerald-400 border-b border-slate-800 pb-1 mb-1">
                {activePoint.data.label || activePoint.data.date}
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="text-slate-400">Revenue:</span>
                <span className="font-bold text-white">₹{(activePoint.data.revenue || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="text-slate-400">Consultations:</span>
                <span className="font-bold text-white">{activePoint.data.bookings || 0}</span>
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="text-slate-400">Completed:</span>
                <span className="font-bold text-emerald-400">{activePoint.data.completed || 0}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Interactive Doctor Workload Distribution Bars
 */
export function WorkloadBarChart({ doctors = [] }) {
  const topDoctors = useMemo(() => {
    return (doctors || []).slice(0, 6);
  }, [doctors]);

  const maxTotal = useMemo(() => {
    const totals = topDoctors.map((d) => d.totalAppointments || 0);
    return Math.max(...totals, 4);
  }, [topDoctors]);

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-3xl p-5 sm:p-6 border border-emerald-100 shadow-xl shadow-emerald-900/5 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-emerald-50">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Award className="w-4 h-4" />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-800">
              Doctor Workload Roster
            </h3>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
            Top Active
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Consultations volume, completion rates & revenue earned per physician.
        </p>

        {/* Doctor Bars */}
        <div className="space-y-3.5">
          {topDoctors.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 italic">
              No active doctor consultations recorded yet.
            </div>
          ) : (
            topDoctors.map((doc) => {
              const total = doc.totalAppointments || 0;
              const percent = Math.min(100, Math.round((total / maxTotal) * 100));
              const completionRate = doc.completionRate ?? 100;

              return (
                <div key={doc.id} className="group">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      {doc.imageUrl ? (
                        <img
                          src={doc.imageUrl}
                          alt={doc.name}
                          className="w-5 h-5 rounded-full object-cover border border-emerald-100"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px]">
                          {(doc.name || "D").charAt(0)}
                        </div>
                      )}
                      <span className="font-semibold text-slate-700 truncate max-w-[130px] sm:max-w-[170px]">
                        {doc.name}
                      </span>
                      <span className="hidden sm:inline text-[10px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.2 rounded-md">
                        {doc.specialization}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-500 font-medium">
                        {total} consults
                      </span>
                      <span className="font-bold text-emerald-800">
                        ₹{(doc.revenue || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Bar with Stacked Completion */}
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-linear-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500 relative"
                      style={{ width: `${Math.max(5, percent)}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 mt-0.5">
                    <span>Rate: {completionRate}% completed</span>
                    <span>Fee: ₹{doc.fee || 0}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Interactive Status Donut Chart
 */
export function DonutStatusChart({ statusBreakdown = [], total = 0 }) {
  const [hoverSlice, setHoverSlice] = useState(null);

  const radius = 65;
  const strokeWidth = 20;
  const center = 85;
  const circumference = 2 * Math.PI * radius;

  // Calculate segment stroke dashes
  const segments = useMemo(() => {
    let cumulativePercent = 0;
    const totalCount = total || statusBreakdown.reduce((s, x) => s + (x.count || 0), 0) || 1;
    return statusBreakdown.map((item) => {
      const count = item.count || 0;
      const percent = (count / totalCount) * 100;
      const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`;
      const strokeDashoffset = -((cumulativePercent / 100) * circumference);
      cumulativePercent += percent;
      return {
        ...item,
        percent: Math.round(percent),
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [statusBreakdown, total, circumference]);

  const activeItem = hoverSlice !== null ? segments[hoverSlice] : null;

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-3xl p-5 sm:p-6 border border-emerald-100 shadow-xl shadow-emerald-900/5 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-2 pb-3 border-b border-emerald-50">
          <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
            <Calendar className="w-4 h-4" />
          </span>
          <h3 className="text-base sm:text-lg font-bold text-slate-800">
            Consultation Health
          </h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Distribution of completed, active and canceled appointments.
        </p>

        {/* SVG Donut */}
        <div className="flex items-center justify-center my-2 relative">
          <svg width="170" height="170" viewBox="0 0 170 170" className="transform -rotate-90">
            {/* Background track circle */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="#F1F5F9"
              strokeWidth={strokeWidth}
            />

            {/* Slices */}
            {segments.map((seg, idx) => (
              <circle
                key={idx}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={hoverSlice === idx ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoverSlice(idx)}
                onMouseLeave={() => setHoverSlice(null)}
              />
            ))}
          </svg>

          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-extrabold text-slate-800">
              {activeItem ? activeItem.count : total}
            </span>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              {activeItem ? activeItem.status : "Total"}
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-emerald-50 text-center">
        {segments.map((item, idx) => (
          <div
            key={idx}
            className={`p-1.5 rounded-xl cursor-pointer transition ${
              hoverSlice === idx ? "bg-slate-100 ring-1 ring-emerald-300" : ""
            }`}
            onMouseEnter={() => setHoverSlice(idx)}
            onMouseLeave={() => setHoverSlice(null)}
          >
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-[11px] font-semibold text-slate-600 truncate">{item.status}</span>
            </div>
            <div className="text-xs font-bold text-slate-800">{item.count} ({item.percent}%)</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Executive KPI Stat Card
 */
export function MetricHighlightCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  colorScheme = "emerald",
}) {
  const colorMap = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    cyan: "bg-cyan-50 text-cyan-600 border-cyan-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
  };

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-emerald-100 shadow-md shadow-emerald-900/5 relative overflow-hidden group hover:shadow-lg transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <h3 className="text-xl sm:text-2xl font-black text-slate-800 mt-1">{value}</h3>
          {subtitle && (
            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
              {trend && <ArrowUpRight className="w-3 h-3 text-emerald-500 inline" />}
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-2xl border ${colorMap[colorScheme] || colorMap.emerald} shadow-xs`}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
      </div>
    </div>
  );
}
