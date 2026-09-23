import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, X, Briefcase, Calendar, ChevronDown } from "lucide-react";

import { API_BASE } from "../../config.js";

export default function DoctorsPage() {
  const [allDoctors, setAllDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/api/doctors`);
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          const msg =
            (json && json.message) || `Failed to load doctors (${res.status})`;
          if (mounted) {
            setError(msg);
            setAllDoctors([]);
            setLoading(false);
          }
          return;
        }

        const items = (json && (json.data || json)) || [];
        const normalized = (Array.isArray(items) ? items : []).map((d) => {
          const id = d._id || d.id;
          const image = d.imageUrl || d.image || "";
          let available = true;
          if (typeof d.availability === "string") {
            available = d.availability.toLowerCase() === "available";
          } else if (typeof d.available === "boolean") {
            available = d.available;
          } else {
            available = d.availability === "Available" || d.available === true;
          }
          return {
            id,
            name: d.name || "Unknown",
            specialization: d.specialization || "",
            image,
            experience: d.experience ?? "—",
            fee: d.fee ?? d.price ?? 0,
            available,
            raw: d,
          };
        });

        if (mounted) {
          setAllDoctors(normalized);
          setError("");
        }
      } catch (err) {
        console.error("load doctors error:", err);
        if (mounted) {
          setError("Network error while loading doctors.");
          setAllDoctors([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const [selectedSpecialty, setSelectedSpecialty] = useState("All");
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  // Extract unique specialties from loaded doctors
  const specialties = useMemo(() => {
    const set = new Set(["All"]);
    allDoctors.forEach((d) => {
      if (d.specialization) set.add(d.specialization);
    });
    return Array.from(set);
  }, [allDoctors]);

  const filteredDoctors = useMemo(() => {
    let result = allDoctors;

    // Filter by specialty
    if (selectedSpecialty !== "All") {
      result = result.filter(
        (d) => (d.specialization || "").toLowerCase() === selectedSpecialty.toLowerCase()
      );
    }

    // Filter by availability
    if (onlyAvailable) {
      result = result.filter((d) => d.available);
    }

    // Search query
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (doctor) =>
          (doctor.name || "").toLowerCase().includes(q) ||
          (doctor.specialization || "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [allDoctors, selectedSpecialty, onlyAvailable, searchTerm]);

  const displayedDoctors = showAll
    ? filteredDoctors
    : filteredDoctors.slice(0, 8);

  const retry = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/doctors`);
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError((json && json.message) || `Failed to load (${res.status})`);
        setAllDoctors([]);
        return;
      }
      const items = (json && (json.data || json)) || [];
      const normalized = (Array.isArray(items) ? items : []).map((d) => {
        const id = d._id || d.id;
        const image = d.imageUrl || d.image || "";
        let available = true;
        if (typeof d.availability === "string") {
          available = d.availability.toLowerCase() === "available";
        } else if (typeof d.available === "boolean") {
          available = d.available;
        } else {
          available = d.availability === "Available" || d.available === true;
        }
        return {
          id,
          name: d.name || "Unknown",
          specialization: d.specialization || "",
          image,
          experience: d.experience ?? "—",
          fee: d.fee ?? d.price ?? 0,
          available,
          approvalStatus: d.approvalStatus || "Approved",
          rating: d.rating || 4.8,
          raw: d,
        };
      });
      setAllDoctors(normalized);
      setError("");
    } catch (e) {
      console.error(e);
      setError("Network error while loading doctors.");
      setAllDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-emerald-50/70 via-slate-50 to-white py-12 px-4 sm:px-6 relative overflow-hidden font-sans">
      {/* Background Shapes */}
      <div className="absolute -top-40 -right-32 w-96 h-96 bg-emerald-200/40 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 -left-32 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header Title Section */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-100/80 text-emerald-800 border border-emerald-200 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
            Verified Clinical Practitioners
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
            Consult Trusted <span className="bg-linear-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Specialists</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-2">
            Schedule an in-person or video consultation with top medical doctors across specialties.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="max-w-2xl mx-auto mb-6">
          <div className="relative flex items-center bg-white rounded-full shadow-lg shadow-emerald-950/5 border border-emerald-100 p-1.5 transition-all focus-within:ring-2 focus-within:ring-emerald-400/50">
            <Search className="w-5 h-5 text-emerald-600 ml-3" />
            <input
              type="text"
              placeholder="Search by doctor name, specialty, or condition..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full py-2.5 px-3 text-sm text-slate-800 placeholder-slate-400 bg-transparent outline-none font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="p-1.5 text-slate-400 hover:text-slate-600 mr-1 rounded-full transition cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Specialty Pills Carousel */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
          {specialties.map((spec) => (
            <button
              key={spec}
              onClick={() => setSelectedSpecialty(spec)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                selectedSpecialty === spec
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25 scale-105"
                  : "bg-white/90 text-slate-600 hover:text-emerald-700 hover:bg-white border border-slate-200/70"
              }`}
            >
              {spec === "All" ? "All Specialists" : spec}
            </button>
          ))}
          
          <button
            onClick={() => setOnlyAvailable(!onlyAvailable)}
            className={`px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all cursor-pointer flex items-center gap-1.5 ${
              onlyAvailable
                ? "bg-emerald-800 text-white border-emerald-800 shadow-sm"
                : "bg-white/90 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${onlyAvailable ? "bg-emerald-400 animate-ping" : "bg-emerald-500"}`}></span>
            Available Today
          </button>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs text-slate-500 mb-6 px-1">
          <span className="font-semibold text-slate-700">
            Showing <strong className="text-emerald-700">{filteredDoctors.length}</strong> medical practitioners
          </span>
          {selectedSpecialty !== "All" && (
            <button
              onClick={() => setSelectedSpecialty("All")}
              className="text-emerald-600 hover:underline font-semibold cursor-pointer"
            >
              Clear filter
            </button>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="text-center p-6 bg-red-50 border border-red-200 rounded-2xl max-w-md mx-auto mb-8">
            <p className="text-sm text-red-600 font-medium mb-3">{error}</p>
            <button
              onClick={retry}
              className="px-5 py-2 rounded-full bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="animate-pulse bg-white/90 rounded-3xl p-5 border border-slate-100 shadow-sm">
                <div className="w-24 h-24 bg-slate-200 rounded-full mx-auto mb-4"></div>
                <div className="h-4 bg-slate-200 rounded w-3/4 mx-auto mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2 mx-auto mb-4"></div>
                <div className="h-8 bg-slate-200 rounded-full w-full"></div>
              </div>
            ))}
          </div>
        ) : (
          /* Doctors Listing Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {displayedDoctors.length > 0 ? (
                displayedDoctors.map((doctor) => (
                <div
                  key={doctor.id}
                  className="bg-white/95 backdrop-blur-md rounded-3xl p-5 border border-emerald-100/70 shadow-md shadow-emerald-950/5 hover:shadow-xl hover:shadow-emerald-600/10 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-center justify-between text-[11px] mb-4">
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                        <Briefcase className="w-3 h-3 text-emerald-600" />
                        {doctor.experience}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-full ${
                          doctor.available
                            ? "bg-emerald-100/70 text-emerald-800"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            doctor.available ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        {doctor.available ? "Active" : "Offline"}
                      </span>
                    </div>

                    {/* Doctor Image */}
                    <Link
                      to={`/doctors/${doctor.id}`}
                      state={{ doctor: doctor.raw }}
                      className="block relative mx-auto w-24 h-24 sm:w-28 sm:h-28 mb-3"
                    >
                      <img
                        src={doctor.image || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200"}
                        alt={doctor.name}
                        loading="lazy"
                        className="w-full h-full rounded-full object-cover border-3 border-emerald-200 shadow-md group-hover:border-emerald-400 group-hover:scale-105 transition-all duration-300"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200";
                        }}
                      />
                    </Link>

                    {/* Doctor Info */}
                    <div className="text-center mb-4">
                      <Link
                        to={`/doctors/${doctor.id}`}
                        state={{ doctor: doctor.raw }}
                        className="font-black text-base text-slate-800 hover:text-emerald-700 transition line-clamp-1"
                      >
                        {doctor.name}
                      </Link>
                      <p className="text-xs font-semibold text-emerald-600 mt-0.5 line-clamp-1">
                        {doctor.specialization}
                      </p>
                      <div className="mt-2 text-xs font-bold text-slate-900 bg-slate-50 py-1.5 px-3 rounded-xl inline-block border border-slate-100">
                        Consultation: <span className="text-emerald-700 font-extrabold">₹{doctor.fee}</span>
                      </div>
                    </div>
                  </div>

                  {/* Booking CTA Button */}
                  <div>
                    {doctor.available ? (
                      <Link
                        to={`/doctors/${doctor.id}`}
                        state={{ doctor: doctor.raw }}
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-full font-bold text-xs text-white bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-800/15 hover:shadow-lg transition-all group-hover:scale-[1.02]"
                      >
                        <Calendar className="w-3.5 h-3.5" /> Book Consultation
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-full font-bold text-xs bg-slate-100 text-slate-400 cursor-not-allowed text-center"
                      >
                        Currently Unavailable
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-20 bg-white/60 rounded-3xl border border-dashed border-emerald-200">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                {allDoctors.length === 0 ? (
                  <>
                    <p className="text-base font-bold text-slate-700 mb-1">No doctors registered yet</p>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto mb-4">
                      Only doctors who have created and verified their account will appear here. Doctors can register via the Doctor Portal.
                    </p>
                    <a
                      href="/login"
                      className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-full transition"
                    >
                      Register as a Doctor
                    </a>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-slate-600 mb-2">
                      No specialists found matching your search criteria.
                    </p>
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setSelectedSpecialty("All");
                        setOnlyAvailable(false);
                      }}
                      className="text-xs font-bold text-emerald-700 hover:underline"
                    >
                      Reset all filters
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Show More toggle */}
        {filteredDoctors.length > displayedDoctors.length && (
          <div className="flex justify-center mt-10">
            <button
              onClick={() => setShowAll(true)}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-800 rounded-full text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              Show All {filteredDoctors.length} Specialists <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

