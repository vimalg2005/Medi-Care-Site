import React, { useState, useEffect, useMemo } from "react";
import { Search, ShieldAlert, Award, Calendar, BadgeIndianRupee, Users, CheckCircle, XCircle } from "lucide-react";
import { dashboardStyles } from "../../assets/themeStyles.js";

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

  useEffect(() => {
    let mounted = true;
    async function loadDoctors() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/doctors?limit=200`);
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

  const totals = useMemo(() => {
    const totalDoctors = doctors.length;
    const totalAppointments = doctors.reduce((s, d) => s + safeNumber(d.appointments?.total, 0), 0);
    const totalEarnings = doctors.reduce((s, d) => s + safeNumber(d.earnings, 0), 0);
    const completed = doctors.reduce((s, d) => s + safeNumber(d.appointments?.completed, 0), 0);
    const canceled = doctors.reduce((s, d) => s + safeNumber(d.appointments?.canceled, 0), 0);
    return {
      totalDoctors,
      totalAppointments,
      totalEarnings,
      completed,
      canceled,
    };
  }, [doctors]);

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