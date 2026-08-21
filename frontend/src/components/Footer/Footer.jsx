import React from "react";
import { Link } from "react-router-dom";
import { 
  Phone, Mail, MapPin, Activity, Send, Heart, 
  Facebook, Twitter, Instagram, Linkedin, Youtube 
} from "lucide-react";
import { footerStyles } from "../../assets/themeStyles.js";

export default function Footer() {
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
      href: "https://www.facebook.com/people/Hexagon-Digital-Services/61567156598660/",
    },
    {
      Icon: Twitter,
      color: footerStyles.twitterColor,
      name: "Twitter",
      href: "https://www.linkedin.com/company/hexagondigtial-services/",
    },
    {
      Icon: Instagram,
      color: footerStyles.instagramColor,
      name: "Instagram",
      href: "http://instagram.com/hexagondigitalservices?igsh=MWp2NG1oNTlibWVnZA%3D%3D",
    },
    {
      Icon: Linkedin,
      color: footerStyles.linkedinColor,
      name: "LinkedIn",
      href: "https://www.linkedin.com/company/hexagondigtial-services/",
    },
    {
      Icon: Youtube,
      color: footerStyles.youtubeColor,
      name: "YouTube",
      href: "https://youtube.com/@hexagondigitalservices?si=lxEFYNCP42t6AoDJ",
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
                  <span className={footerStyles.contactText}>+91 8299431275</span>
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
                <div className={footerStyles.mobileNewsletterContainer}>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className={footerStyles.emailInput}
                  />
                  <button className={footerStyles.mobileSubscribeButton}>
                    <Send className={footerStyles.mobileButtonIcon} />
                    Subscribe
                  </button>
                </div>

                {/* Desktop Newsletter UI */}
                <div className={footerStyles.desktopNewsletterContainer}>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className={footerStyles.desktopEmailInput}
                  />
                  <button className={footerStyles.desktopSubscribeButton}>
                    <Send className={footerStyles.desktopButtonIcon} />
                    <span className={footerStyles.desktopButtonText}>Subscribe</span>
                  </button>
                </div>

                {/* Social Media Link Icons */}
                <div className={footerStyles.socialContainer}>
                  {socialLinks.map(({ Icon, color, name, href }, index) => (
                    <a
                      key={name}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={footerStyles.socialLink}
                      style={{ animationDelay: `${index * 120}ms` }}
                    >
                      <div className={footerStyles.socialIconBackground} />
                      <Icon className={`${footerStyles.socialIcon} ${color}`} />
                    </a>
                  ))}
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
