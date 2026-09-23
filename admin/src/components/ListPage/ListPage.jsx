import React, { useState, useEffect, useMemo } from "react";
import { 
  Users, Search, Star, Trash2, Calendar, MapPin, 
  ChevronDown, ChevronUp, Clock, ShieldAlert, Award, FileText,
  CheckCircle, ShieldCheck, ShieldX, Mail
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
      const res = await fetch(`${API_BASE}/api/doctors?all=true`);
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
            email: d.email || "",
            emailVerified: Boolean(d.emailVerified || (d.clerkId && d.isVerified)),
            isRegisteredAccount: Boolean(d.isRegisteredAccount || d.clerkId),
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
            approvalStatus: d.approvalStatus || (d.isVerified ? "Approved" : "Pending"),
            isVerified: d.isVerified !== undefined ? d.isVerified : true,
            image,
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

  async function handleUpdateApproval(docId, newStatus) {
    const doc = doctors.find((d) => d.id === docId);
    const prevStatus = doc?.approvalStatus || "Approved";

    // Optimistic update
    setDoctors((prev) =>
      prev.map((d) =>
        d.id === docId
          ? {
              ...d,
              approvalStatus: newStatus,
              isVerified: newStatus === "Approved",
            }
          : d
      )
    );

    try {
      const res = await fetch(`${API_BASE}/api/doctors/${docId}/approval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus: newStatus }),
      });

      if (!res.ok) {
        throw new Error(`Failed to update status (${res.status})`);
      }

      toast.success(
        newStatus === "Approved"
          ? "Doctor approved & verified successfully!"
          : newStatus === "Pending"
          ? "Doctor status set to Pending Review"
          : "Doctor approval suspended"
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to update doctor approval status.");
      // Rollback
      setDoctors((prev) =>
        prev.map((d) =>
          d.id === docId ? { ...d, approvalStatus: prevStatus } : d
        )
      );
    }
  }

  const filteredDoctors = useMemo(() => {
    let result = doctors;
    
    // Status Filter
    if (filterStatus === "approved") {
      result = result.filter((d) => d.approvalStatus === "Approved");
    } else if (filterStatus === "pending") {
      result = result.filter((d) => d.approvalStatus === "Pending");
    } else if (filterStatus === "available") {
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
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${
              filterStatus === "all"
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-emerald-700 border-emerald-100 hover:bg-emerald-50"
            }`}
          >
            All Doctors ({doctors.length})
          </button>
          <button
            onClick={() => setFilterStatus("approved")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
              filterStatus === "approved"
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-emerald-700 border-emerald-100 hover:bg-emerald-50"
            }`}
          >
            <ShieldCheck size={13} />
            Approved ({doctors.filter((d) => d.approvalStatus === "Approved").length})
          </button>
          <button
            onClick={() => setFilterStatus("pending")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
              filterStatus === "pending"
                ? "bg-amber-600 text-white border-amber-600"
                : "bg-white text-amber-700 border-amber-200 hover:bg-amber-50"
            }`}
          >
            <Clock size={13} />
            Pending Review ({doctors.filter((d) => d.approvalStatus === "Pending").length})
          </button>
          <button
            onClick={() => setFilterStatus("available")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${
              filterStatus === "available"
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-emerald-700 border-emerald-100 hover:bg-emerald-50"
            }`}
          >
            Active Only
          </button>
          <button
            onClick={() => setFilterStatus("unavailable")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${
              filterStatus === "unavailable"
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-emerald-700 border-emerald-100 hover:bg-emerald-50"
            }`}
          >
            Offline
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

                      <div className="flex flex-wrap gap-1.5 items-center">
                        {d.approvalStatus === "Approved" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <ShieldCheck size={11} className="text-emerald-600" /> Verified
                          </span>
                        ) : d.approvalStatus === "Pending" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1 animate-pulse">
                            <Clock size={11} className="text-amber-600" /> Pending Review
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1">
                            <ShieldX size={11} className="text-rose-600" /> Suspended
                          </span>
                        )}

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                            d.available
                              ? "bg-slate-100 text-slate-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              d.available ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                          />
                          {d.available ? "Online" : "Offline"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-slate-500 space-y-1">
                      {d.email && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-mono">
                          <Mail size={11} className="text-slate-400 shrink-0" />
                          <span className="truncate">{d.email}</span>
                          {d.emailVerified ? (
                            <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-sans font-bold bg-emerald-100 text-emerald-800">
                              Verified Email
                            </span>
                          ) : (
                            <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-sans font-medium bg-amber-50 text-amber-700">
                              Unverified
                            </span>
                          )}
                        </div>
                      )}
                      <p>Exp: {d.experience} · Fees: ₹{d.fee}</p>
                      <p className="truncate">Clinic: {d.location}</p>
                    </div>

                    {/* Expand, approval actions, and delete action buttons */}
                    <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-emerald-50 pt-2.5">
                      <div className="flex items-center gap-1.5">
                        {d.approvalStatus === "Pending" ? (
                          <>
                            <button
                              onClick={() => handleUpdateApproval(d.id, "Approved")}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 transition shadow-xs cursor-pointer"
                            >
                              <CheckCircle size={12} /> Approve
                            </button>
                            <button
                              onClick={() => handleUpdateApproval(d.id, "Rejected")}
                              className="px-2 py-1 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 text-[11px] font-medium transition cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        ) : d.approvalStatus === "Approved" ? (
                          <button
                            onClick={() => handleUpdateApproval(d.id, "Pending")}
                            className="text-[11px] text-slate-400 hover:text-amber-600 font-medium px-2 py-0.5 rounded-md hover:bg-amber-50 transition cursor-pointer"
                            title="Move back to pending review"
                          >
                            Revoke
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateApproval(d.id, "Approved")}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 transition shadow-xs cursor-pointer"
                          >
                            <CheckCircle size={12} /> Re-Approve
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(d.id)}
                          className={s.deleteButton}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>

                      <button
                        onClick={() => setExpanded(isExpanded ? null : d.id)}
                        className="text-xs font-semibold text-emerald-700 flex items-center gap-1 cursor-pointer hover:underline"
                      >
                        {isExpanded ? (
                          <>
                            Hide <ChevronUp size={14} />
                          </>
                        ) : (
                          <>
                            Profile <ChevronDown size={14} />
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