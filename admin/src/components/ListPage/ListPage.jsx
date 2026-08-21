import React, { useState, useEffect, useMemo } from "react";
import { 
  Users, Search, Star, Trash2, Calendar, MapPin, 
  ChevronDown, ChevronUp, Clock, ShieldAlert, Award, FileText 
} from "lucide-react";
import { doctorListStyles } from "../../assets/themeStyles.js";
import toast from "react-hot-toast";

const s = doctorListStyles;
import { API_BASE } from "../../config.js";

function formatDateISO(iso) {
  if (!iso || typeof iso !== "string") return iso;
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "June",
    "July", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  return `${Number(d)} ${monthNames[dateObj.getMonth()]} ${y}`;
}

function normalizeToDateString(d) {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().split("T")[0];
}

function buildScheduleMap(schedule) {
  const map = {};
  if (!schedule || typeof schedule !== "object") return map;
  Object.entries(schedule).forEach(([k, v]) => {
    const nd = normalizeToDateString(k) || String(k);
    map[nd] = Array.isArray(v) ? v.slice() : [];
  });
  return map;
}

function getSortedScheduleDates(scheduleLike) {
  let keys = [];
  if (Array.isArray(scheduleLike)) {
    keys = scheduleLike.map(normalizeToDateString).filter(Boolean);
  } else if (scheduleLike && typeof scheduleLike === "object") {
    keys = Object.keys(scheduleLike).map(normalizeToDateString).filter(Boolean);
  }

  keys = Array.from(new Set(keys));
  const parsed = keys.map((ds) => ({ ds, date: new Date(ds) }));
  const dateVal = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());

  const today = new Date();
  const todayVal = dateVal(today);

  const past = parsed
    .filter((p) => dateVal(p.date) < todayVal)
    .sort((a, b) => dateVal(b.date) - dateVal(a.date));

  const future = parsed
    .filter((p) => dateVal(p.date) >= todayVal)
    .sort((a, b) => dateVal(a.date) - dateVal(b.date));

  return [...past, ...future].map((p) => p.ds);
}

export default function ListPage() {
  const [doctors, setDoctors] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(false);

  async function fetchDoctors() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/doctors`);
      const body = await res.json().catch(() => null);

      if (res.ok && body) {
        const list = body.data || body.doctors || body || [];
        const normalized = list.map((d) => {
          const scheduleMap = buildScheduleMap(d.schedule || {});
          const image = d.imageUrl || d.image || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=150";
          let available = true;
          if (typeof d.availability === "string") {
            available = d.availability.toLowerCase() === "available";
          } else if (typeof d.available === "boolean") {
            available = d.available;
          } else {
            available = d.availability === "Available" || d.available === true;
          }
          return {
            id: d._id || d.id,
            name: d.name || "Unknown Doctor",
            specialization: d.specialization || d.speciality || "General",
            experience: d.experience || "0 years",
            qualifications: d.qualifications || "MBBS",
            location: d.location || "Medicare Clinic",
            fee: d.fee ?? d.price ?? 0,
            success: d.success || "90%",
            patients: d.patients || "100+",
            rating: d.rating || "4.5",
            about: d.about || "Clinical physician at Medicare Diagnostics.",
            available,
            schedule: scheduleMap,
            raw: d,
          };
        });
        setDoctors(normalized);
      }
    } catch (err) {
      console.error("fetchDoctors error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDoctors();
  }, []);

  async function handleDelete(docId) {
    if (!window.confirm("Are you sure you want to delete this doctor profile?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/doctors/${docId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(`Delete failed (${res.status})`);
      }

      toast.success("Doctor deleted successfully!");
      setDoctors((prev) => prev.filter((d) => d.id !== docId));
      if (expanded === docId) setExpanded(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete doctor profile.");
    }
  }

  const filteredDoctors = useMemo(() => {
    let result = doctors;
    
    // Status Filter
    if (filterStatus === "available") {
      result = result.filter((d) => d.available);
    } else if (filterStatus === "unavailable") {
      result = result.filter((d) => !d.available);
    }

    // Search Query Filter
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.specialization.toLowerCase().includes(q)
      );
    }

    return result;
  }, [doctors, query, filterStatus]);

  const INITIAL_COUNT = 6;
  const visibleDoctors = showAll
    ? filteredDoctors
    : filteredDoctors.slice(0, INITIAL_COUNT);

  return (
    <div className={s.container}>
      <div className={s.headerContainer}>
        {/* Header Search Top */}
        <div className={s.headerTopSection}>
          <div className={s.headerIconContainer}>
            <div className={s.headerIcon}>
              <Users className={s.headerIconSvg + " w-6 h-6"} />
            </div>
            <div>
              <h1 className={s.headerTitle}>Clinical Doctors Directory</h1>
              <p className={s.headerSubtitle}>View, register schedule slots, or deregister practitioners.</p>
            </div>
          </div>

          <div className={s.headerSearchContainer}>
            <div className={s.searchBox}>
              <Search className={s.searchIcon + " w-4 h-4"} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by doctor name or speciality..."
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

        {/* Filter status buttons */}
        <div className={s.filterContainer}>
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold border transition ${
              filterStatus === "all"
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-emerald-700 border-emerald-100"
            }`}
          >
            All Statuses
          </button>
          <button
            onClick={() => setFilterStatus("available")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold border transition ${
              filterStatus === "available"
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-emerald-700 border-emerald-100"
            }`}
          >
            Available Only
          </button>
          <button
            onClick={() => setFilterStatus("unavailable")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold border transition ${
              filterStatus === "unavailable"
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-emerald-700 border-emerald-100"
            }`}
          >
            Unavailable Only
          </button>
        </div>
      </div>

      {loading ? (
        <div className={s.loadingContainer}>
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-2 text-sm font-semibold">Fetching directory...</p>
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className={s.noResultsContainer}>
          No doctors found matching filters.
        </div>
      ) : (
        /* Doctors List Grid list */
        <div className={s.gridContainer}>
          {visibleDoctors.map((d) => {
            const isExpanded = expanded === d.id;
            return (
              <article key={d.id} className={s.article}>
                <div className={s.articleContent}>
                  <img
                    src={d.image}
                    alt={d.name}
                    className={s.doctorImage}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=150";
                    }}
                  />
                  <div className={s.doctorInfoContainer}>
                    <div className={s.doctorHeader}>
                      <div>
                        <h3 className={s.doctorName}>{d.name}</h3>
                        <p className="text-xs text-emerald-600 font-semibold">{d.specialization}</p>
                      </div>

                      <div className="flex gap-2 items-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                            d.available
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              d.available ? "bg-emerald-600" : "bg-rose-600"
                            }`}
                          />
                          {d.available ? "Active" : "Offline"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-slate-500 space-y-1">
                      <p>Exp: {d.experience} · Fees: ₹{d.fee}</p>
                      <p className="truncate">Clinic: {d.location}</p>
                    </div>

                    {/* Expand and delete action buttons */}
                    <div className="mt-4 flex items-center justify-between border-t border-emerald-50 pt-2">
                      <button
                        onClick={() => handleDelete(d.id)}
                        className={s.deleteButton}
                      >
                        <Trash2 size={12} /> Delete
                      </button>

                      <button
                        onClick={() => setExpanded(isExpanded ? null : d.id)}
                        className="text-xs font-semibold text-emerald-700 flex items-center gap-1 cursor-pointer"
                      >
                        {isExpanded ? (
                          <>
                            Hide Profile <ChevronUp size={14} />
                          </>
                        ) : (
                          <>
                            View Profile <ChevronDown size={14} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Collapsible details layout panel */}
                {isExpanded && (
                  <div className={s.expandableContent + " border-t border-emerald-50 p-4 bg-emerald-50/30 grid grid-cols-1 md:grid-cols-2 gap-4"}>
                    <div className={s.aboutSection}>
                      <h4 className={s.aboutHeading}>About Doctor</h4>
                      <p className={s.aboutText}>{d.about}</p>
                    </div>

                    <div>
                      <h4 className={s.qualificationsHeading}>Professional Credentials</h4>
                      <p className={s.qualificationsText}>{d.qualifications}</p>
                    </div>

                    <div>
                      <h4 className={s.qualificationsHeading}>Contact Information</h4>
                      <p className="text-sm text-emerald-600">{d.raw?.email || "No email registered"}</p>
                    </div>

                    <div className="col-span-2 border-t border-emerald-100 pt-3">
                      <h4 className={s.scheduleHeading}>Custom Schedule Availability</h4>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {getSortedScheduleDates(d.schedule).length > 0 ? (
                          getSortedScheduleDates(d.schedule).map((dateKey) => (
                            <div key={dateKey} className="bg-white p-2 rounded-lg border border-emerald-100 shadow-sm text-xs">
                              <span className="font-bold text-emerald-800 block mb-1">
                                {formatDateISO(dateKey)}
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {(d.schedule[dateKey] || []).map((slotTime) => (
                                  <span key={slotTime} className="bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 text-emerald-700">
                                    {slotTime}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-400 italic">No availability slots configured</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Pagination Show More */}
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
  );
}