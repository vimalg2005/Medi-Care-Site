import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calendar, Briefcase, Star } from "lucide-react";
import { homeDoctorsStyles } from "../../assets/themeStyles.js";

import { API_BASE } from "../../config.js";

export default function HomeDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const previewCount = 4;

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
          if (!mounted) return;
          setError(msg);
          setDoctors([]);
          setLoading(false);
          return;
        }
        const items = (json && (json.data || json)) || [];
        const normalized = (Array.isArray(items) ? items : []).map((d) => {
          const id = d._id || d.id;
          const image = d.imageUrl || d.image || "";
          const available =
            (typeof d.availability === "string"
              ? d.availability.toLowerCase() === "available"
              : typeof d.available === "boolean"
                ? d.available
                : d.availability === true) || d.availability === "Available";
          return {
            id,
            name: d.name || "Unknown",
            specialization: d.specialization || "",
            image,
            experience: d.experience || "",
            fee: d.fee ?? d.price ?? 0,
            available,
            raw: d,
          };
        });

        if (!mounted) return;
        setDoctors(normalized);
      } catch (err) {
        if (!mounted) return;
        console.error("load doctors error:", err);
        setError("Network error while loading doctors.");
        setDoctors([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const preview = doctors.slice(0, previewCount);

  return (
    <>
      <style>{homeDoctorsStyles.customCSS}</style>
      <section className={homeDoctorsStyles.section}>
        <div className={homeDoctorsStyles.container}>
          <div className={homeDoctorsStyles.header}>
            <h2 className={homeDoctorsStyles.title}>
              Meet Our <span className={homeDoctorsStyles.titleSpan}>Specialists</span>
            </h2>
            <p className={homeDoctorsStyles.subtitle}>
              Our medical staff consists of top-tier practitioners dedicated to your health and wellness.
            </p>
          </div>

          {/* error / retry */}
          {error ? (
            <div className={homeDoctorsStyles.errorContainer}>
              <div className={homeDoctorsStyles.errorText}>{error}</div>
              <button
                onClick={async () => {
                  setLoading(true);
                  setError("");
                  try {
                    const res = await fetch(`${API_BASE}/api/doctors`);
                    const json = await res.json().catch(() => null);
                    const items = (json && (json.data || json)) || [];
                    const normalized = (Array.isArray(items) ? items : []).map(
                      (d) => {
                        const id = d._id || d.id;
                        const image = d.imageUrl || d.image || "";
                        const available =
                          (typeof d.availability === "string"
                            ? d.availability.toLowerCase() === "available"
                            : typeof d.available === "boolean"
                              ? d.available
                              : d.availability === true) ||
                          d.availability === "Available";
                        return {
                          id,
                          name: d.name || "Unknown",
                          specialization: d.specialization || "",
                          image,
                          experience: d.experience || "",
                          fee: d.fee ?? d.price ?? 0,
                          available,
                          raw: d,
                        };
                      }
                    );
                    setDoctors(normalized);
                  } catch (e) {
                    setError("Failed to reload data");
                  } finally {
                    setLoading(false);
                  }
                }}
                className={`${homeDoctorsStyles.retryButton} cursor-pointer hover:bg-emerald-700 transition`}
              >
                Retry
              </button>
            </div>
          ) : null}

          {/* Skeletons loader */}
          {loading ? (
            <div className={homeDoctorsStyles.skeletonGrid}>
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className={homeDoctorsStyles.skeletonCard}>
                  <div className={homeDoctorsStyles.skeletonImage}></div>
                  <div className={homeDoctorsStyles.skeletonText1}></div>
                  <div className={homeDoctorsStyles.skeletonText2}></div>
                  <div className={homeDoctorsStyles.skeletonButton}></div>
                </div>
              ))}
            </div>
          ) : (
            /* Doctors Grid */
            <div className={homeDoctorsStyles.doctorsGrid}>
              {preview.map((doctor) => (
                <article key={doctor.id} className={homeDoctorsStyles.article}>
                  <div
                    className={
                      doctor.available
                        ? homeDoctorsStyles.imageContainerAvailable
                        : homeDoctorsStyles.imageContainerUnavailable
                    }
                  >
                    {!doctor.available && (
                      <span className={homeDoctorsStyles.unavailableBadge}>Unavailable</span>
                    )}
                    <img
                      src={doctor.image || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200"}
                      alt={doctor.name}
                      className={homeDoctorsStyles.image}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200";
                      }}
                    />
                  </div>

                  <div className={homeDoctorsStyles.cardBody}>
                    <h3 className={homeDoctorsStyles.doctorName}>{doctor.name}</h3>
                    <p className={homeDoctorsStyles.specialization}>{doctor.specialization}</p>

                    <div className={homeDoctorsStyles.experienceContainer}>
                      <div className={homeDoctorsStyles.experienceBadge}>
                        <Briefcase className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="text-emerald-800 font-semibold">{doctor.experience || "3 yrs"}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span>{doctor.raw?.rating || "4.8"}</span>
                      </div>
                    </div>

                    <div className={homeDoctorsStyles.buttonContainer}>
                      {doctor.available ? (
                        <Link
                          to={`/doctors/${doctor.id}`}
                          state={{ doctor: doctor.raw }}
                          className={homeDoctorsStyles.buttonAvailable}
                        >
                          <Calendar className="w-4 h-4" /> Book Appointment
                        </Link>
                      ) : (
                        <button className={homeDoctorsStyles.buttonUnavailable} disabled>
                          Unavailable
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
