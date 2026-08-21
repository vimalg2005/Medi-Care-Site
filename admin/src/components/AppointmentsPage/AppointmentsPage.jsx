import React, { useState, useEffect, useMemo } from "react";
import { 
  Calendar, BadgeIndianRupee, Search, X, Filter, AlertCircle 
} from "lucide-react";
import { pageStyles, statusClasses } from "../../assets/themeStyles.js";

const s = pageStyles;
import { API_BASE } from "../../config.js";

function formatDateISO(iso) {
  try {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch (e) {
    return iso;
  }
}

function dateTimeFromSlot(slot) {
  try {
    const [y, m, d] = slot.date.split("-");
    const base = new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);

    const [time, ampm] = slot.time.split(" ");
    let [hh, mm] = time.split(":").map(Number);
    if (ampm === "PM" && hh !== 12) hh += 12;
    if (ampm === "AM" && hh === 12) hh = 0;
    base.setHours(hh, mm, 0, 0);
    return base;
  } catch (e) {
    return new Date(slot.date + "T00:00:00");
  }
}

export default function AppointmentsPage() {
  const isAdmin = true;

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterSpeciality, setFilterSpeciality] = useState("all");
  const [showAll, setShowAll] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/appointments?limit=200`);
      if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
      
      const json = await res.json();
      const list = json.appointments || json.data || json || [];
      
      const items = list.map((a) => {
        const doctorName = (a.doctorId && a.doctorId.name) || a.doctorName || "";
        const speciality = (a.doctorId && a.doctorId.specialization) || a.speciality || "General";
        const fee = typeof a.fees === "number" ? a.fees : a.fee || 0;
        return {
          id: a._id || a.id,
          patientName: a.patientName || "",
          age: a.age || "",
          gender: a.gender || "",
          mobile: a.mobile || "",
          doctorName,
          speciality,
          fee,
          slot: {
            date: a.date || (a.slot && a.slot.date) || "",
            time: a.time || (a.slot && a.slot.time) || "00:00 AM",
          },
          status: a.status || a.payment?.status || "Pending",
          raw: a,
        };
      });
      setAppointments(items);
    } catch (err) {
      console.error("Load appointments error:", err);
      setError(err.message || "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const specialities = useMemo(() => {
    const specList = appointments.map((a) => a.speciality || "General");
    const set = new Set(specList);
    return ["all", ...Array.from(set)];
  }, [appointments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return appointments.filter((a) => {
      if (
        filterSpeciality !== "all" &&
        (a.speciality || "").toLowerCase() !== filterSpeciality.toLowerCase()
      )
        return false;
      if (filterDate && a.slot?.date !== filterDate) return false;
      if (!q) return true;
      return (
        (a.doctorName || "").toLowerCase().includes(q) ||
        (a.speciality || "").toLowerCase().includes(q) ||
        (a.patientName || "").toLowerCase().includes(q) ||
        (a.mobile || "").toLowerCase().includes(q)
      );
    });
  }, [appointments, query, filterDate, filterSpeciality]);

  const sortedFiltered = useMemo(() => {
    return filtered.slice().sort((a, b) => {
      const da = dateTimeFromSlot(a.slot).getTime();
      const db = dateTimeFromSlot(b.slot).getTime();
      return db - da;
    });
  }, [filtered]);

  const displayed = useMemo(
    () => (showAll ? sortedFiltered : sortedFiltered.slice(0, 8)),
    [sortedFiltered, showAll]
  );

  async function adminCancelAppointment(id) {
    const appt = appointments.find((x) => x.id === id);
    if (!appt) return;

    const statusLower = (appt.status || "").toLowerCase();
    const isCancelled = statusLower === "canceled" || statusLower === "cancelled";
    const isCompleted = statusLower === "completed";

    if (isCancelled || isCompleted) return;

    const ok = window.confirm(
      `As admin, mark appointment for ${appt.patientName} with ${
        appt.doctorName
      } on ${formatDateISO(appt.slot.date)} at ${appt.slot.time} as CANCELLED?`
    );
    if (!ok) return;

    try {
      setAppointments((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "Canceled" } : p))
      );

      const res = await fetch(`${API_BASE}/api/appointments/${id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        throw new Error(`Cancel failed (${res.status})`);
      }

      load();
    } catch (err) {
      console.error("Cancel error:", err);
      setError(err.message || "Failed to cancel appointment");
      load();
    }
  }

  return (
    <div className={s.container}>
      <div className={s.maxWidthContainer}>
        {/* Header */}
        <div className={s.headerContainer}>
          <div className={s.headerTitleSection}>
            <h1 className={s.headerTitle}>Clinical Consultations Log</h1>
            <p className={s.headerSubtitle}>Overview and administrative controls for doctor appointments.</p>
          </div>

          {/* Search Box */}
          <div className={s.headerControlsSection}>
            <div className={s.searchContainer}>
              <Search className={s.searchIcon + " w-4 h-4"} />
              <input
                type="text"
                placeholder="Search patient, doctor..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={s.searchInput}
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-emerald-500 hover:text-emerald-800">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Date Filter & Speciality Selectors */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-6 bg-white p-4 rounded-3xl border border-emerald-100 shadow-sm">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold uppercase text-emerald-800 tracking-wider">Filters:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="text-xs px-3 py-2 rounded-full border border-emerald-200 outline-none text-emerald-800 bg-white"
                title="Filter Date"
              />
            </div>

            <select
              value={filterSpeciality}
              onChange={(e) => setFilterSpeciality(e.target.value)}
              className="text-xs px-3 py-2 rounded-full border border-emerald-200 bg-white text-emerald-800 cursor-pointer"
            >
              <option value="all">All Specialities</option>
              {specialities.filter(sp => sp !== "all").map((sp) => (
                <option key={sp} value={sp}>
                  {sp}
                </option>
              ))}
            </select>

            {(filterDate || filterSpeciality !== "all" || query) && (
              <button
                onClick={() => {
                  setFilterDate("");
                  setFilterSpeciality("all");
                  setQuery("");
                }}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Error/Loading */}
        {error && (
          <div className={s.errorContainer}>
            <AlertCircle className="w-5 h-5 mx-auto mb-1" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className={s.loadingErrorContainer}>
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-2 text-sm font-semibold">Loading consult logs...</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className={s.noResultsContainer}>
            No doctor appointments found matching the current search filters.
          </div>
        ) : (
          /* Cards Grid List */
          <div className={s.gridContainer}>
            {displayed.map((a, idx) => {
              const statusLower = (a.status || "").toLowerCase();
              const isCompleted = statusLower === "completed" || statusLower === "complete";
              const isCancelled = statusLower === "canceled" || statusLower === "cancelled";
              const isDisabled = isCompleted || isCancelled;

              return (
                <div
                  key={a.id}
                  style={{
                    animation: `fadeUp 420ms cubic-bezier(.2,.9,.2,1) forwards`,
                    animationDelay: `${idx * 70}ms`,
                    opacity: 0,
                  }}
                  className={s.card}
                >
                  <div className={s.cardHeader}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className={s.cardTitle}>{a.patientName}</h3>
                        <div className={s.patientInfo}>
                          <span>{a.age ? `${a.age} yrs` : ""}</span>
                          {a.age && a.gender && <span>·</span>}
                          <span>{a.gender}</span>
                        </div>
                      </div>
                      <div className={s.doctorInfo}>
                        {a.doctorName} · <span className={s.doctorSpeciality}>{a.speciality}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={s.feeLabel}>Fees</div>
                      <div className={s.feeAmount}>
                        <BadgeIndianRupee size={16} />
                        <span>{a.fee}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 flex-wrap border-t border-slate-50 pt-2.5">
                    <div className={s.slotContainer}>
                      <Calendar size={14} className={s.slotIcon} />
                      <span className="text-xs font-semibold">
                        {formatDateISO(a.slot.date)} — {a.slot.time}
                      </span>
                    </div>

                    <div className={`${s.statusBadge} ${statusClasses(a.status)}`}>
                      {a.status ? a.status.toUpperCase() : "PENDING"}
                    </div>
                  </div>

                  {/* Cancellations admin triggers */}
                  <div className="mt-2 flex items-center justify-end">
                    <button
                      onClick={() => adminCancelAppointment(a.id)}
                      disabled={isDisabled}
                      className={s.cancelButton(isDisabled, isCompleted)}
                    >
                      {isDisabled
                        ? isCompleted
                          ? "Completed"
                          : "Cancelled"
                        : "Cancel Appointment"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Show More toggle */}
        {sortedFiltered.length > displayed.length && (
          <div className={s.showMoreContainer}>
            <button
              onClick={() => setShowAll(true)}
              className={s.showMoreButton}
            >
              Show All Appointments
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
