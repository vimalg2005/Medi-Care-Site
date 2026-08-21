import React from "react";
import C1 from "../../assets/C1.png";
import C2 from "../../assets/C2.png";
import C3 from "../../assets/C3.png";
import C4 from "../../assets/C4.svg";
import C5 from "../../assets/C5.png";
import C6 from "../../assets/C6.png";
import C7 from "../../assets/C7.svg";
import { certificationStyles } from "../../assets/themeStyles.js";

export default function Certification() {
  const certifications = [
    { id: 1, name: "Medical Commission", image: C1, type: "international" },
    { id: 2, name: "Government Approved", image: C2, type: "government" },
    { id: 3, name: "NABH Accredited", image: C3, alt: "NABH Accreditation", type: "healthcare" },
    { id: 4, name: "Medical Council", image: C4, type: "government" },
    { id: 5, name: "Quality Healthcare", image: C5, alt: "Quality Healthcare", type: "healthcare" },
    { id: 6, name: "Paramedical Council", image: C6, alt: "Patient Safety", type: "healthcare" },
    { id: 7, name: "Ministry of Health", image: C7, alt: "Ministry of Health", type: "government" }
  ];

  const duplicatedCertifications = [...certifications, ...certifications, ...certifications];

  return (
    <>
      <style>{certificationStyles.animationStyles}</style>
      <section className={certificationStyles.container}>
        <div className={certificationStyles.backgroundGrid}>
          <div className={certificationStyles.gridContainer}>
            <div className={certificationStyles.grid}>
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className={certificationStyles.gridCell}></div>
              ))}
            </div>
          </div>
        </div>

        <div className={certificationStyles.topLine}></div>

        <div className={certificationStyles.contentWrapper}>
          <div className={certificationStyles.headingContainer}>
            <div className={certificationStyles.headingInner}>
              <div className={certificationStyles.leftLine}></div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-slate-800 font-bold mb-2">
                Our <span className="text-emerald-600">Accreditations</span>
              </h2>
              <div className={certificationStyles.rightLine}></div>
            </div>
            <p className={certificationStyles.subtitle}>
              We are fully certified and recognized by leading national and international medical boards.
            </p>
            <div className={certificationStyles.badgeContainer}>
              <div className={certificationStyles.badgeDot}></div>
              <span className={certificationStyles.badgeText}>Verified Certifications</span>
            </div>
          </div>

          {/* Marquee slider for logo accreditations */}
          <div className={certificationStyles.logosContainer}>
            <div className={certificationStyles.logosInner}>
              <div className={certificationStyles.logosFlexContainer}>
                <div className={certificationStyles.logosMarquee}>
                  {duplicatedCertifications.map((cert, index) => (
                    <div key={`${cert.id}-${index}`} className={certificationStyles.logoItem}>
                      <img
                        src={cert.image}
                        alt={cert.name}
                        className="w-16 h-16 object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      <span className={certificationStyles.logoText}>{cert.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}