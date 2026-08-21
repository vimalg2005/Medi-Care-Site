import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calendar, AlertCircle } from "lucide-react";
import { servicePageStyles, serviceCardStyles } from "../../assets/themeStyles.js";

import { API_BASE } from "../../config.js";

export default function ServicePage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/services`);
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.message || `Failed to fetch services (${res.status})`);
        }

        const data = json.data || json.services || json || [];
        if (mounted) {
          setServices(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("load services error:", err);
        if (mounted) {
          setError(err.message || "Network error loading services");
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

  const retry = () => {
    setLoading(true);
    setError(null);
    // trigger same loading logic
    window.location.reload();
  };

  return (
    <div className={servicePageStyles.pageContainer}>
      <div className={servicePageStyles.maxWidthContainer}>
        <div className={servicePageStyles.header}>
          <h2 className={servicePageStyles.title}>Our Diagnostic Services</h2>
          <p className={servicePageStyles.subtitle}>
            Explore our specialized clinical diagnostic services and screening tests.
          </p>
        </div>

        {/* Error state */}
        {error && (
          <div className={servicePageStyles.errorContainer}>
            <p className={servicePageStyles.errorText}>{error}</p>
            <button
              onClick={retry}
              className={`${servicePageStyles.retryButton} cursor-pointer hover:bg-emerald-700 transition`}
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading ? (
          <div className={servicePageStyles.skeletonGrid}>
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className={servicePageStyles.skeletonCard}>
                <div className={servicePageStyles.skeletonImage}></div>
                <div className={servicePageStyles.skeletonText1}></div>
                <div className={servicePageStyles.skeletonText2}></div>
                <div className={servicePageStyles.skeletonButton}></div>
              </div>
            ))}
          </div>
        ) : (
          /* Services listing grid */
          <div className={servicePageStyles.servicesGrid}>
            {services.length > 0 ? (
              services.map((svc) => {
                const id = svc._id || svc.id;
                const price = svc.price || 0;
                const isAvailable = svc.available !== false;
                const image = svc.imageUrl || svc.image || "https://images.unsplash.com/photo-1579684389782-64d84b5e901a?auto=format&fit=crop&q=80&w=300";

                return (
                  <div key={id} className={serviceCardStyles.card}>
                    {/* Image Container */}
                    <div className={serviceCardStyles.imageContainer}>
                      <img
                        src={image}
                        alt={svc.name}
                        className={serviceCardStyles.responsiveImage}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "https://images.unsplash.com/photo-1579684389782-64d84b5e901a?auto=format&fit=crop&q=80&w=300";
                        }}
                      />
                    </div>

                    {/* Service Content details */}
                    <div className={serviceCardStyles.content}>
                      <h3 className="text-lg font-bold text-emerald-950 mb-1 font-serif">
                        {svc.name}
                      </h3>
                      <p className="text-slate-500 text-sm mb-3 min-h-[40px] line-clamp-2 leading-snug">
                        {svc.shortDescription || "Clinical laboratory screening and analysis service."}
                      </p>
                      
                      <p className="text-emerald-700 font-extrabold text-lg mb-4">
                        ₹{price}
                      </p>

                      {/* Action buttons */}
                      <div className={serviceCardStyles.buttonContainer}>
                        {isAvailable ? (
                          <Link
                            to={`/services/${id}`}
                            state={{ service: svc }}
                            className={`${serviceCardStyles.buttonAvailable} hover:shadow-md hover:bg-emerald-600 transition-all`}
                          >
                            <Calendar className="w-4 h-4" /> Book Test Slot
                          </Link>
                        ) : (
                          <button
                            className={serviceCardStyles.buttonUnavailable}
                            disabled
                          >
                            <AlertCircle className="w-4 h-4" /> Temporarily Offline
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className={servicePageStyles.emptyState}>
                No medical services available at the moment.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}