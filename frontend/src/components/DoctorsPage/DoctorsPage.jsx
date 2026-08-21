import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, X, Briefcase, Calendar, ChevronDown } from "lucide-react";
import { doctorsPageStyles } from "../../assets/themeStyles.js";

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

  const filteredDoctors = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return allDoctors;
    return allDoctors.filter(
      (doctor) =>
        (doctor.name || "").toLowerCase().includes(q) ||
        (doctor.specialization || "").toLowerCase().includes(q)
    );
  }, [allDoctors, searchTerm]);

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
    <div className={doctorsPageStyles.mainContainer}>
      {/* Background Shapes */}
      <div className={doctorsPageStyles.backgroundShape1}></div>
      <div className={doctorsPageStyles.backgroundShape2}></div>

      <div className={doctorsPageStyles.wrapper}>
        <div className={doctorsPageStyles.headerContainer}>
          <h2 className={doctorsPageStyles.headerTitle}>Find Our Specialists</h2>
          <p className={doctorsPageStyles.headerSubtitle}>
            Browse and book an appointment with our trusted medical professionals.
          </p>
        </div>

        {/* Search Input Box */}
        <div className={doctorsPageStyles.searchContainer}>
          <div className={doctorsPageStyles.searchWrapper}>
            <Search className={doctorsPageStyles.searchIcon} />
            <input
              type="text"
              placeholder="Search by doctor name or speciality..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={doctorsPageStyles.searchInput}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className={doctorsPageStyles.clearButton}
                aria-label="Clear search"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className={doctorsPageStyles.errorContainer}>
            <p className={doctorsPageStyles.errorText}>{error}</p>
            <button
              onClick={retry}
              className={`${doctorsPageStyles.retryButton} cursor-pointer hover:bg-emerald-700 transition`}
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading ? (
          <div className={doctorsPageStyles.skeletonGrid}>
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className={doctorsPageStyles.skeletonCard}>
                <div className={doctorsPageStyles.skeletonImage}></div>
                <div className={doctorsPageStyles.skeletonName}></div>
                <div className={doctorsPageStyles.skeletonSpecialization}></div>
                <div className={doctorsPageStyles.skeletonButton}></div>
              </div>
            ))}
          </div>
        ) : (
          /* Doctors Listing Grid */
          <div className={doctorsPageStyles.doctorsGrid}>
            {displayedDoctors.length > 0 ? (
              displayedDoctors.map((doctor) => (
                <div
                  key={doctor.id}
                  className={`${doctorsPageStyles.doctorCard} ${
                    !doctor.available ? doctorsPageStyles.doctorCardUnavailable : ""
                  } group`}
                >
                  {/* Doctor Image Container */}
                  <Link
                    to={`/doctors/${doctor.id}`}
                    state={{ doctor: doctor.raw }}
                    className={doctorsPageStyles.focusRing}
                  >
                    <div
                      className={`${doctorsPageStyles.imageContainer} ${
                        !doctor.available ? doctorsPageStyles.imageContainerUnavailable : ""
                      }`}
                    >
                      <img
                        src={doctor.image || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200"}
                        alt={doctor.name}
                        loading="lazy"
                        className={`${doctorsPageStyles.doctorImage} ${
                          !doctor.available ? doctorsPageStyles.doctorImageUnavailable : ""
                        }`}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200";
                        }}
                      />
                    </div>
                  </Link>

                  {/* Doctor Info Details */}
                  <h3 className={doctorsPageStyles.doctorName}>{doctor.name}</h3>
                  <p className={doctorsPageStyles.doctorSpecialization}>
                    {doctor.specialization}
                  </p>

                  <div className={doctorsPageStyles.experienceBadge}>
                    <Briefcase className={doctorsPageStyles.experienceIcon} />
                    <span>{doctor.experience} Experience</span>
                  </div>

                  <p className="text-emerald-700 font-semibold mb-4">
                    Fee: ₹{doctor.fee}
                  </p>

                  {/* Appointment Booking Trigger Buttons */}
                  {doctor.available ? (
                    <Link
                      to={`/doctors/${doctor.id}`}
                      state={{ doctor: doctor.raw }}
                      className={doctorsPageStyles.bookButton}
                    >
                      <Calendar className={doctorsPageStyles.bookButtonIcon} /> Book Consultation
                    </Link>
                  ) : (
                    <button className={doctorsPageStyles.notAvailableButton} disabled>
                      Unavailable
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className={doctorsPageStyles.noResults}>
                No doctors found matching "{searchTerm}"
              </div>
            )}
          </div>
        )}

        {/* Show More toggle */}
        {filteredDoctors.length > displayedDoctors.length && (
          <div className={doctorsPageStyles.showMoreContainer}>
            <button
              onClick={() => setShowAll(true)}
              className={`${doctorsPageStyles.showMoreButton} cursor-pointer hover:shadow-lg active:scale-95 transition-all`}
            >
              Show More Doctors <ChevronDown className={doctorsPageStyles.showMoreIcon} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
