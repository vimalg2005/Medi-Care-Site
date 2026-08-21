import React, { useState, useEffect, useRef } from "react";
import { Star } from "lucide-react";
import { testimonialStyles } from "../../assets/themeStyles.js";

export default function Testimonial() {
  const scrollRefLeft = useRef(null);
  const scrollRefRight = useRef(null);
  const [isPaused, setIsPaused] = useState(false);

  const testimonials = [
    {
      id: 1,
      name: "Dr. Sarah Johnson",
      role: "Cardiologist",
      rating: 5,
      text: "The appointment booking system is incredibly efficient. It saves me valuable time and helps me focus on patient care.",
      image:
        "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=150&q=80",
      type: "doctor",
    },
    {
      id: 2,
      name: "Michael Chen",
      role: "Patient",
      rating: 5,
      text: "Scheduling appointments has never been easier. The interface is intuitive and reminders are very helpful!",
      image:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
      type: "patient",
    },
    {
      id: 3,
      name: "Dr. Robert Martinez",
      role: "Pediatrician",
      rating: 4,
      text: "This platform has streamlined our clinic operations significantly. Patient management is much more organized.",
      image:
        "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=150&q=80",
      type: "doctor",
    },
    {
      id: 4,
      name: "Emily Williams",
      role: "Patient",
      rating: 5,
      text: "Booking appointments online 24/7 is a game-changer. The confirmation system gives me peace of mind.",
      image:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80",
      type: "patient",
    },
    {
      id: 5,
      name: "Dr. Amanda Lee",
      role: "Dermatologist",
      rating: 5,
      text: "Excellent platform for managing appointments. Automated reminders reduce no-shows dramatically.",
      image:
        "https://images.unsplash.com/photo-1594824813573-246434e33963?auto=format&fit=crop&w=150&q=80",
      type: "doctor",
    },
    {
      id: 6,
      name: "David Thompson",
      role: "Patient",
      rating: 5,
      text: "The wait time has reduced significantly since using this platform. Very convenient and user-friendly!",
      image:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
      type: "patient",
    },
  ];

  const leftTestimonials = testimonials.filter((t) => t.type === "doctor");
  const rightTestimonials = testimonials.filter((t) => t.type === "patient");

  // Duplicate arrays to facilitate infinite scrolling loop
  const duplicatedLeft = [...leftTestimonials, ...leftTestimonials, ...leftTestimonials];
  const duplicatedRight = [...rightTestimonials, ...rightTestimonials, ...rightTestimonials];

  useEffect(() => {
    const scrollLeft = scrollRefLeft.current;
    const scrollRight = scrollRefRight.current;
    if (!scrollLeft || !scrollRight) return;

    let scrollSpeed = 0.5; // preserved animation speed
    let rafId;

    const smoothScroll = () => {
      if (!isPaused) {
        scrollLeft.scrollTop += scrollSpeed;
        scrollRight.scrollTop += scrollSpeed; // scroll both in same dir or opposite

        // seamless infinite loop
        if (scrollLeft.scrollTop >= scrollLeft.scrollHeight / 3) {
          scrollLeft.scrollTop = 0;
        }
        if (scrollRight.scrollTop >= scrollRight.scrollHeight / 3) {
          scrollRight.scrollTop = 0;
        }
      }
      rafId = requestAnimationFrame(smoothScroll);
    };

    rafId = requestAnimationFrame(smoothScroll);
    return () => cancelAnimationFrame(rafId);
  }, [isPaused]);

  const renderStars = (rating) =>
    Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={
          i < rating
            ? testimonialStyles.activeStar
            : testimonialStyles.inactiveStar
        }
      >
        <Star className={testimonialStyles.star + " fill-current"} />
      </span>
    ));

  const TestimonialCard = ({ testimonial, direction }) => (
    <div
      className={`${testimonialStyles.testimonialCard} ${
        direction === "left"
          ? testimonialStyles.leftCardBorder
          : testimonialStyles.rightCardBorder
      }`}
    >
      <div className={testimonialStyles.cardContent}>
        <img
          src={testimonial.image}
          alt={testimonial.name}
          className={testimonialStyles.avatar}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";
          }}
        />
        <div className={testimonialStyles.textContainer}>
          <div className={testimonialStyles.nameRoleContainer}>
            <div>
              <h4
                className={`${testimonialStyles.name} ${
                  direction === "left"
                    ? testimonialStyles.leftName
                    : testimonialStyles.rightName
                }`}
              >
                {testimonial.name}
              </h4>
              <p className={testimonialStyles.role}>{testimonial.role}</p>
            </div>
            <div className={testimonialStyles.starsContainer}>
              {renderStars(testimonial.rating)}
            </div>
          </div>

          <p className={testimonialStyles.quote}>"{testimonial.text}"</p>

          {/* Stars on small screens beneath text */}
          <div className={testimonialStyles.mobileStarsContainer}>
            {renderStars(testimonial.rating)}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{testimonialStyles.animationStyles}</style>
      <section className={testimonialStyles.container}>
        <div className={testimonialStyles.headerContainer}>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-slate-800 font-bold mb-3">
            What Our Patients & Doctors <span className="text-emerald-600">Say</span>
          </h2>
          <p className={testimonialStyles.subtitle}>
            Hear experiences from our board-certified medical professionals and satisfied patients.
          </p>
        </div>

        {/* Scroll Container Grid */}
        <div 
          className={testimonialStyles.grid}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Doctors Testimonials Column */}
          <div className={`${testimonialStyles.columnContainer} ${testimonialStyles.leftColumnBorder}`}>
            <div className={`${testimonialStyles.columnHeader} ${testimonialStyles.leftColumnHeader}`}>
              👩‍⚕️ Medical Professionals
            </div>
            <div ref={scrollRefLeft} className={testimonialStyles.scrollContainer}>
              {duplicatedLeft.map((item, idx) => (
                <TestimonialCard key={`${item.id}-${idx}`} testimonial={item} direction="left" />
              ))}
            </div>
          </div>

          {/* Patients Testimonials Column */}
          <div className={`${testimonialStyles.columnContainer} ${testimonialStyles.rightColumnBorder}`}>
            <div className={`${testimonialStyles.columnHeader} ${testimonialStyles.rightColumnHeader}`}>
              🧑‍💼 Patients
            </div>
            <div ref={scrollRefRight} className={testimonialStyles.scrollContainer}>
              {duplicatedRight.map((item, idx) => (
                <TestimonialCard key={`${item.id}-${idx}`} testimonial={item} direction="right" />
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}