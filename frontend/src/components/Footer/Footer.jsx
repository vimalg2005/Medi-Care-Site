import React, { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Phone, Mail, MapPin, Activity, Send, Heart, Loader2, CheckCircle2, AlertCircle,
  Facebook, Twitter, Instagram, Linkedin, Youtube 
} from "lucide-react";
import toast from "react-hot-toast";
import { API_BASE } from "../../config.js";
import { footerStyles } from "../../assets/themeStyles.js";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((curr) => (curr?.message === message ? null : curr));
    }, 5000);
  };

  const handleSubscribe = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const trimmed = (email || "").trim();

    if (!trimmed) {
      const msg = "Please enter your email address";
      toast.error(msg);
      showFeedback("error", msg);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      const msg = "Please enter a valid email address";
      toast.error(msg);
      showFeedback("error", msg);
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/api/newsletter/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const msg = data.message || "Thank you for subscribing to MediCare Health Tips!";
        toast.success(msg);
        showFeedback("success", msg);
        setEmail("");
      } else {
        const msg = data.message || "Subscription failed. Please try again.";
        toast.error(msg);
        showFeedback("error", msg);
      }
    } catch (err) {
      console.error("Newsletter subscription error:", err);
      const msg = "Network error subscribing to newsletter";
      toast.error(msg);
      showFeedback("error", msg);
    } finally {
      setSubmitting(false);
    }
  };
  const quickLinks = [
    { name: "Home", href: "/" },
    { name: "Doctors", href: "/doctors" },
    { name: "Services", href: "/services" },
    { name: "Contact", href: "/contact" },
    { name: "Appointments", href: "/appointments" },
  ];

  const services = [
    { name: "Blood Pressure Check", href: "/services" },
    { name: "Blood Sugar Test", href: "/services" },
    { name: "Full Body Count", href: "/services" },
    { name: "X-Ray Scan", href: "/services" },
  ];

  const socialLinks = [
    {
      Icon: Facebook,
      color: footerStyles.facebookColor,
      name: "Facebook",
      href: "https://www.facebook.com/profile.php?id=61566434211126",
    },
    {
      Icon: Twitter,
      color: footerStyles.twitterColor,
      name: "Twitter",
      href: "https://x.com/VimalGupta9391",
    },
    {
      Icon: Instagram,
      color: footerStyles.instagramColor,
      name: "Instagram",
      href: "https://www.instagram.com/vi.m.a.l_/",
    },
    {
      Icon: Linkedin,
      color: footerStyles.linkedinColor,
      name: "LinkedIn",
      href: "https://www.linkedin.com/in/vimal-gupta-9a720a289/",
    },
    {
      Icon: Youtube,
      color: footerStyles.youtubeColor,
      name: "YouTube",
      href: "https://www.youtube.com/@vimalgupta3013",
    },
  ];

  return (
    <>
      <style>{footerStyles.animationStyles}</style>
      <footer className={footerStyles.footerContainer}>
        {/* Floating background decorative icons */}
        <div className={footerStyles.floatingIcon1}>
          <Activity className={footerStyles.stethoscopeIcon} />
        </div>
        <div className={footerStyles.floatingIcon2}>
          <Activity className={footerStyles.activityIcon} />
        </div>

        <div className={footerStyles.mainContent}>
          <div className={footerStyles.gridContainer}>
            {/* Company Info */}
            <div className={footerStyles.companySection}>
              <div className={footerStyles.logoContainer}>
                <Heart className="w-10 h-10 text-emerald-600 fill-emerald-100" />
                <div>
                  <span className={footerStyles.companyName}>MediCare</span>
                  <p className={footerStyles.companyTagline}>Your Health, Our Priority</p>
                </div>
              </div>
              <p className={footerStyles.companyDescription}>
                Providing top-tier medical assistance, diagnostics, and doctor appointments at your fingertips.
              </p>
              
              {/* Contact Info */}
              <div className={footerStyles.contactContainer}>
                <div className={footerStyles.contactItem}>
                  <div className={footerStyles.contactIconWrapper}>
                    <Phone className={footerStyles.contactIcon} />
                  </div>
                  <a href="https://wa.me/919660802511" target="_blank" rel="noopener noreferrer" className={footerStyles.contactText + " hover:text-white"}>
                    +91 9660802511
                  </a>
                </div>
                <div className={footerStyles.contactItem}>
                  <div className={footerStyles.contactIconWrapper}>
                    <Mail className={footerStyles.contactIcon} />
                  </div>
                  <span className={footerStyles.contactText}>info@medicare.com</span>
                </div>
                <div className={footerStyles.contactItem}>
                  <div className={footerStyles.contactIconWrapper}>
                    <MapPin className={footerStyles.contactIcon} />
                  </div>
                  <span className={footerStyles.contactText}>Gomti Nagar, Lucknow</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className={footerStyles.linksSection}>
              <h3 className={footerStyles.sectionTitle}>Quick Links</h3>
              <ul className={footerStyles.linksList}>
                {quickLinks.map((link) => (
                  <li key={link.name} className={footerStyles.linkItem}>
                    <Link to={link.href} className={footerStyles.quickLink}>
                      <span className={footerStyles.quickLinkIconWrapper}>
                        <Activity className={footerStyles.quickLinkIcon} />
                      </span>
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Medical Services */}
            <div className={footerStyles.linksSection}>
              <h3 className={footerStyles.sectionTitle}>Our Services</h3>
              <ul className={footerStyles.linksList}>
                {services.map((svc) => (
                  <li key={svc.name} className={footerStyles.linkItem}>
                    <Link to={svc.href} className={footerStyles.serviceLink}>
                      <span className={footerStyles.serviceIcon} />
                      {svc.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Newsletter Subscription */}
            <div className={footerStyles.newsletterSection}>
              <h3 className={footerStyles.newsletterTitle}>Stay Connected</h3>
              <p className={footerStyles.newsletterDescription}>
                Subscribe for health tips, medical updates, and wellness insights.
              </p>

              <div className={footerStyles.newsletterForm}>
                {/* Mobile Newsletter UI */}
                <form onSubmit={handleSubscribe} className={footerStyles.mobileNewsletterContainer}>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                    className={footerStyles.emailInput}
                  />
                  <button 
                    type="submit" 
                    onClick={handleSubscribe}
                    disabled={submitting}
                    className={`${footerStyles.mobileSubscribeButton} ${submitting ? "opacity-75 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    {submitting ? (
                      <Loader2 className={`${footerStyles.mobileButtonIcon} animate-spin`} />
                    ) : (
                      <Send className={footerStyles.mobileButtonIcon} />
                    )}
                    {submitting ? "Subscribing..." : "Subscribe"}
                  </button>
                </form>

                {/* Desktop Newsletter UI */}
                <form onSubmit={handleSubscribe} className={footerStyles.desktopNewsletterContainer}>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                    className={footerStyles.desktopEmailInput}
                  />
                  <button 
                    type="submit" 
                    onClick={handleSubscribe}
                    disabled={submitting}
                    className={`${footerStyles.desktopSubscribeButton} ${submitting ? "opacity-75 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    {submitting ? (
                      <Loader2 className={`${footerStyles.desktopButtonIcon} animate-spin mr-2`} />
                    ) : (
                      <Send className={footerStyles.desktopButtonIcon} />
                    )}
                    <span className={footerStyles.desktopButtonText}>
                      {submitting ? "Subscribing..." : "Subscribe"}
                    </span>
                  </button>
                </form>

                {/* Inline Feedback Message */}
                {feedback && (
                  <div
                    className={`mt-3 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 shadow-sm transition-all duration-300 ${
                      feedback.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                        : "bg-rose-50 text-rose-700 border border-rose-300"
                    }`}
                  >
                    {feedback.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    )}
                    <span>{feedback.message}</span>
                  </div>
                )}

                {/* Social Media Link Icons */}
                <div className={footerStyles.socialContainer}>
                  {socialLinks.map((social, index) => {
                    const SocialIcon = social.Icon;
                    return (
                      <a
                        key={social.name}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={footerStyles.socialLink}
                        style={{ animationDelay: `${index * 120}ms` }}
                      >
                        <div className={footerStyles.socialIconBackground} />
                        <SocialIcon className={`${footerStyles.socialIcon} ${social.color}`} />
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Copyright Section */}
          <div className={footerStyles.bottomSection}>
            <p className={footerStyles.copyright}>
              © {new Date().getFullYear()} MediCare. All rights reserved.
            </p>
            <p className={footerStyles.designerText}>
              Powered by{" "}
              <a 
                href="https://github.com/HexagonDigitalServices" 
                target="_blank" 
                rel="noreferrer" 
                className={footerStyles.designerLink}
              >
                Hexagon Digital Services
              </a>
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
