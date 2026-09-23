import React, { useState, useEffect, useMemo } from "react";
import { Search, Award, Calendar, BadgeIndianRupee, Users, CheckCircle, XCircle, Activity, ShieldCheck } from "lucide-react";
import { dashboardStyles } from "../../assets/themeStyles.js";
import { TimelineAreaChart, WorkloadBarChart, DonutStatusChart } from "../Analytics/InteractiveCharts.jsx";

const s = dashboardStyles;
import { API_BASE } from "../../config.js";
const PATIENT_COUNT_API = `${API_BASE}/api/patients/count`;

const safeNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

function normalizeDoctor(doc) {
  const id = doc._id || doc.id || String(Math.random()).slice(2);
  const name = doc.name || doc.fullName || "Unknown Doctor";
  const specialization = doc.specialization || doc.speciality || "General";
  const fee = safeNumber(doc.fee ?? doc.fees ?? doc.consultationFee ?? 0, 0);
  const image = doc.imageUrl || doc.image || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=150";

  const appointments = {
    total: doc.appointments?.total ?? doc.totalAppointments ?? 0,
    completed: doc.appointments?.completed ?? doc.completedAppointments ?? 0,
    canceled: doc.appointments?.canceled ?? doc.canceledAppointments ?? 0,
  };

  let earnings = 0;
  if (doc.earnings !== undefined && doc.earnings !== null) {
    earnings = safeNumber(doc.earnings, 0);
  } else if (doc.revenue !== undefined && doc.revenue !== null) {
    earnings = safeNumber(doc.revenue, 0);
  } else {
    earnings = fee * safeNumber(appointments.completed, 0);
  }

  return {
    id,
    name,
    specialization,
    fee,
    image,
    appointments,
    earnings,
    raw: doc,
  };
}

export default function DashboardPage() {
  const [doctors, setDoctors] = useState([]);
  const [patientCount, setPatientCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [patientCountLoading, setPatientCountLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [timelineMetric, setTimelineMetric] = useState("revenue");
  const [timelineRange, setTimelineRange] = useState(30);

  useEffect(() => {
    let mounted = true;
    async function loadAnalytics() {
      try {
        const res = await fetch(`${API_BASE}/api/appointments/analytics/admin`);
        if (!res.ok) return;
        const json = await res.json();
        if (mounted && json.success && json.analytics) {
          setAnalytics(json.analytics);
        }
      } catch (err) {
        console.error("loadAnalytics error:", err);
      }
    }
    loadAnalytics();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadDoctors() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/doctors?limit=200&all=true`);
        if (!res.ok) throw new Error(`Failed to fetch doctors (${res.status})`);
        const json = await res.json();
        
        const list = json.data || json.doctors || json || [];
        const normalized = (Array.isArray(list) ? list : []).map(normalizeDoctor);
        
        if (mounted) setDoctors(normalized);
      } catch (err) {
        console.error("loadDoctors error:", err);
        if (mounted) {
          setError(err.message || "Failed to load doctors");
          setDoctors([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadDoctors();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadPatientCount() {
      setPatientCountLoading(true);
      try {
        const res = await fetch(PATIENT_COUNT_API);
        if (!res.ok) {
          if (mounted) setPatientCount(0);
          return;
        }
        const body = await res.json();
        const count = Number(body?.count ?? body?.totalUsers ?? body?.data ?? 0);
        if (mounted) setPatientCount(isNaN(count) ? 0 : count);
      } catch (err) {
        console.error("loadPatientCount error:", err);
        if (mounted) setPatientCount(0);
      } finally {
        if (mounted) setPatientCountLoading(false);
      }
    }
    loadPatientCount();
    return () => {
      mounted = false;
    };
  }, []);

  const [stats, setStats] = useState({
    totalAppointments: 0,
    completed: 0,
    canceled: 0,
    revenue: 0,
  });

  useEffect(() => {
    let mounted = true;
    async function loadStats() {
      try {
        const res = await fetch(`${API_BASE}/api/appointments/stats`);
        if (!res.ok) return;
        const json = await res.json();
        if (mounted && json.stats) {
          setStats(json.stats);
        }
      } catch {
        // ignore stats load error
      }
    }
    loadStats();
    return () => {
      mounted = false;
    };
  }, []);

  const totals = useMemo(() => {
    const totalDoctors = doctors.length;
    const totalAppointments = stats.totalAppointments || doctors.reduce((s, d) => s + safeNumber(d.appointments?.total, 0), 0);
    const totalEarnings = stats.revenue || doctors.reduce((s, d) => s + safeNumber(d.earnings, 0), 0);
    const completed = stats.completed || doctors.reduce((s, d) => s + safeNumber(d.appointments?.completed, 0), 0);
    const canceled = stats.canceled || doctors.reduce((s, d) => s + safeNumber(d.appointments?.canceled, 0), 0);
    return {
      totalDoctors,
      totalAppointments,
      totalEarnings,
      completed,
      canceled,
    };
  }, [doctors, stats]);

  const filteredDoctors = useMemo(() => {
    if (!query) return doctors;
    const q = query.trim().toLowerCase();
    const qNum = Number(q);
    return doctors.filter((d) => {
      if (d.name.toLowerCase().includes(q)) return true;
      if (d.specialization.toLowerCase().includes(q)) return true;
      if (d.fee.toString().includes(q)) return true;
      if (!Number.isNaN(qNum) && d.fee <= qNum) return true;
      return false;
    });
  }, [doctors, query]);

  const INITIAL_COUNT = 8;
  const visibleDoctors = showAll
    ? filteredDoctors
    : filteredDoctors.slice(0, INITIAL_COUNT);

  return (
    <div className={s.pageContainer}>
      <div className={s.maxWidthContainer}>
        {/* Header */}
        <div className={s.headerContainer}>
          <div>
            <h1 className={s.headerTitle}>MediCare Console</h1>
            <p className={s.headerSubtitle}>Overview of clinical doctors performance, appointments & metrics.</p>
          </div>
        </div>

        {/* Analytics stats Grid */}
        <div className={s.statsGrid}>
          {/* Card 1: Total Doctors */}
          <div className={s.statCard}>
            <div className={s.statCardContent}>
              <div className={s.statIconContainer}>
                <Award className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className={s.statLabel}>Total Doctors</p>
                <h4 className={s.statValue}>{totals.totalDoctors}</h4>
              </div>
            </div>
          </div>

          {/* Card 2: Total Appointments */}
          <div className={s.statCard}>
            <div className={s.statCardContent}>
              <div className={s.statIconContainer}>
                <Calendar className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className={s.statLabel}>Total Consultations</p>
                <h4 className={s.statValue}>{totals.totalAppointments}</h4>
              </div>
            </div>
          </div>

          {/* Card 3: Total Earnings */}
          <div className={s.statCard}>
            <div className={s.statCardContent}>
              <div className={s.statIconContainer}>
                <BadgeIndianRupee className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className={s.statLabel}>Consultations Revenue</p>
                <h4 className={s.statValue}>₹{totals.totalEarnings.toLocaleString()}</h4>
              </div>
            </div>
          </div>

          {/* Card 4: Completed appointments */}
          <div className={s.statCard}>
            <div className={s.statCardContent}>
              <div className={s.statIconContainer}>
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className={s.statLabel}>Completed</p>
                <h4 className={s.statValue}>{totals.completed}</h4>
              </div>
            </div>
          </div>

          {/* Card 5: Canceled appointments */}
          <div className={s.statCard}>
            <div className={s.statCardContent}>
              <div className={s.statIconContainer}>
                <XCircle className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <p className={s.statLabel}>Canceled</p>
                <h4 className={s.statValue}>{totals.canceled}</h4>
              </div>
            </div>
          </div>

          {/* Card 6: Registered Patients */}
          <div className={s.statCard}>
            <div className={s.statCardContent}>
              <div className={s.statIconContainer}>
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className={s.statLabel}>Total Patients</p>
                <h4 className={s.statValue}>{patientCountLoading ? "..." : patientCount}</h4>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Analytics Section: Timeline Area & Status Donut */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <TimelineAreaChart
              data={analytics?.timeline || []}
              metric={timelineMetric}
              onMetricChange={setTimelineMetric}
              timeRange={timelineRange}
              onTimeRangeChange={setTimelineRange}
            />
          </div>
          <div className="lg:col-span-1">
            <DonutStatusChart
              statusBreakdown={analytics?.statusBreakdown || [
                { status: "Completed", count: totals.completed, color: "#10B981" },
                { status: "Pending", count: Math.max(0, totals.totalAppointments - totals.completed - totals.canceled), color: "#F59E0B" },
                { status: "Canceled", count: totals.canceled, color: "#EF4444" },
              ]}
              total={totals.totalAppointments}
            />
          </div>
        </div>

        {/* Workload Roster & Specialty Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <WorkloadBarChart doctors={analytics?.doctorWorkload || doctors} />
          </div>
          <div className="lg:col-span-1 bg-white/90 backdrop-blur-md rounded-3xl p-5 sm:p-6 border border-emerald-100 shadow-xl shadow-emerald-900/5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-emerald-50">
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <Activity className="w-4 h-4" />
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-800">
                  Specialty Breakdown
                </h3>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Distribution of consultation demands across specialties.
              </p>
              <div className="space-y-2.5">
                {(analytics?.specialtyBreakdown || []).slice(0, 5).map((spec, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 text-xs">
                    <div>
                      <span className="font-semibold text-slate-700">{spec.specialty}</span>
                      <span className="text-[10px] text-slate-400 block">{spec.doctorCount} doctors on roster</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-800">{spec.bookings} consults</span>
                      <span className="text-[10px] text-slate-500 block">₹{spec.revenue.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-emerald-50 flex items-center justify-between text-xs">
              <span className="text-slate-500">Platform Approval Status</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                {analytics?.kpis?.approvedDoctors ?? totals.totalDoctors} Verified
              </span>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div className="mb-6">
          <label className={s.searchLabel}>Search Doctor Records</label>
          <div className={s.searchContainer}>
            <div className={s.searchInputContainer}>
              <Search className={s.searchIcon} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by doctor name or specialization..."
                className={s.searchInput}
              />
            </div>
            {query && (
              <button
                onClick={() => setQuery("")}
                className={s.clearButton}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Doctors Table */}
        <div className={s.tableContainer}>
          <div className={s.tableHeader}>
            <span className={s.tableTitle}>Clinical Doctors Overview</span>
            <span className={s.tableCount}>{filteredDoctors.length} doctors found</span>
          </div>

          {error && <div className={s.errorContainer}>{error}</div>}

          {loading ? (
            <div className="text-center py-8 text-emerald-600 font-semibold">
              Loading doctor statistics...
            </div>
          ) : (
            <div className={s.tableWrapper}>
              <table className={s.table}>
                <thead className={s.tableHead}>
                  <tr>
                    <th className={s.tableHeaderCell}>Doctor Details</th>
                    <th className={s.tableHeaderCell}>Specialization</th>
                    <th className={s.tableHeaderCell}>Consultation Fee</th>
                    <th className={s.tableHeaderCell}>Total Bookings</th>
                    <th className={s.tableHeaderCell}>Completed</th>
                    <th className={s.tableHeaderCell}>Canceled</th>
                    <th className={s.tableHeaderCell}>Total Revenue</th>
                  </tr>
                </thead>
                <tbody className={s.tableBody}>
                  {visibleDoctors.length > 0 ? (
                    visibleDoctors.map((d, idx) => (
                      <tr
                        key={d.id}
                        className={`${s.tableRow} ${
                          idx % 2 === 0 ? s.tableRowEven : s.tableRowOdd
                        }`}
                      >
                        <td className={`${s.tableCell} ${s.tableCellFlex}`}>
                          <div className={s.verticalLine} />
                          <img
                            src={d.image}
                            alt={d.name}
                            className={s.doctorImage}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=150";
                            }}
                          />
                          <div>
                            <div className={s.doctorName}>{d.name}</div>
                            <div className={s.doctorId}>ID: {d.id}</div>
                          </div>
                        </td>
                        <td className={`${s.tableCell} ${s.doctorSpecialization}`}>
                          {d.specialization}
                        </td>
                        <td className={`${s.tableCell} ${s.feeText}`}>
                          ₹{d.fee}
                        </td>
                        <td className={`${s.tableCell} ${s.appointmentsText}`}>
                          {d.appointments.total}
                        </td>
                        <td className={`${s.tableCell} ${s.completedText}`}>
                          {d.appointments.completed}
                        </td>
                        <td className={`${s.tableCell} ${s.canceledText}`}>
                          {d.appointments.canceled}
                        </td>
                        <td className={`${s.tableCell} ${s.earningsText}`}>
                          ₹{d.earnings.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center py-6 text-slate-400 italic">
                        No doctors match search parameters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Show More toggle */}
          {filteredDoctors.length > visibleDoctors.length && (
            <div className={s.showMoreContainer}>
              <button
                onClick={() => setShowAll(true)}
                className={s.showMoreButton}
              >
                Show All Doctors
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}