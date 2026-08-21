import React, { useState } from "react";
import { Phone, Mail, MapPin, Send, Clock, User, Heart } from "lucide-react";
import { contactPageStyles } from "../../assets/themeStyles.js";

export default function ContactPage() {
  const initial = {
    name: "",
    email: "",
    phone: "",
    department: "",
    service: "",
    message: "",
  };

  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);

  const departments = [
    "General Physician",
    "Cardiology",
    "Orthopedics",
    "Dermatology",
    "Pediatrics",
    "Gynecology",
  ];

  const servicesMapping = {
    "General Physician": [
      "General Consultation",
      "Adult Checkup",
      "Vaccination",
      "Health Screening",
    ],
    Cardiology: [
      "ECG",
      "Echocardiography",
      "Stress Test",
      "Heart Consultation",
    ],
    Orthopedics: ["Fracture Care", "Joint Pain Consultation", "Physiotherapy"],
    Dermatology: ["Skin Consultation", "Allergy Test", "Acne Treatment"],
    Pediatrics: ["Child Checkup", "Vaccination (Child)", "Growth Monitoring"],
    Gynecology: ["Antenatal Care", "Pap Smear", "Ultrasound"],
  };

  const genericServices = [
    "General Consultation",
    "ECG",
    "Blood Test",
    "X-Ray",
    "Ultrasound",
    "Physiotherapy",
    "Vaccination",
  ];

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email))
      e.email = "Enter a valid email";
    if (!form.phone.trim()) e.phone = "Phone number is required";
    else if (!/^[0-9]{10}$/.test(form.phone))
      e.phone = "Phone number must be exactly 10 digits";

    if (!form.department && !form.service) {
      e.department = "Please choose a department or service";
      e.service = "Please choose a department or service";
    }

    if (!form.message.trim()) e.message = "Please write a short message";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === "department") {
      setForm((prev) => ({ ...prev, department: value, service: "" }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }

    setErrors((prev) => ({ ...prev, [name]: undefined }));

    if (name === "department" || name === "service") {
      setErrors((prev) => {
        const copy = { ...prev };
        if (
          (name === "department" && value) ||
          (name === "service" && value) ||
          form.department ||
          form.service
        ) {
          delete copy.department;
          delete copy.service;
        }
        return copy;
      });
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    const text = `*Contact Request*\nName: ${form.name}\nEmail: ${
      form.email
    }\nPhone: ${form.phone}\nDepartment: ${
      form.department || "N/A"
    }\nService: ${form.service || "N/A"}\nMessage: ${form.message}`;

    const url = `https://wa.me/8299431275?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");

    setForm(initial);
    setErrors({});
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  }

  const availableServices = form.department
    ? servicesMapping[form.department] || []
    : genericServices;

  return (
    <div className={contactPageStyles.pageContainer}>
      <style>{contactPageStyles.animationKeyframes}</style>
      
      {/* Background shapes */}
      <div className={contactPageStyles.bgAccent1}></div>
      <div className={contactPageStyles.bgAccent2}></div>

      <div className={contactPageStyles.gridContainer}>
        
        {/* Contact Form */}
        <div className={contactPageStyles.formContainer}>
          <h2 className={contactPageStyles.formTitle}>Get in Touch</h2>
          <p className={contactPageStyles.formSubtitle}>
            Send us a message and we'll get back to you shortly.
          </p>

          <form onSubmit={handleSubmit} className={contactPageStyles.formSpace}>
            
            {/* Name Input */}
            <div>
              <label className={contactPageStyles.label}>
                <User size={16} /> Full Name
              </label>
              <input
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="John Doe"
                className={contactPageStyles.input}
              />
              {errors.name && <p className={contactPageStyles.error}>{errors.name}</p>}
            </div>

            {/* Email Input */}
            <div>
              <label className={contactPageStyles.label}>
                <Mail size={16} /> Email Address
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="john@example.com"
                className={contactPageStyles.input}
              />
              {errors.email && <p className={contactPageStyles.error}>{errors.email}</p>}
            </div>

            {/* Phone + Department Grid */}
            <div className={contactPageStyles.formGrid}>
              <div>
                <label className={contactPageStyles.label}>
                  <Phone size={16} /> Phone
                </label>
                <input
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="1234567890"
                  className={contactPageStyles.input}
                  maxLength="10"
                />
                {errors.phone && (
                  <p className={contactPageStyles.error}>{errors.phone}</p>
                )}
              </div>

              <div>
                <label className={contactPageStyles.label}>
                  <Heart size={16} /> Department
                </label>
                <select
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  className={contactPageStyles.input}
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                {errors.department && (
                  <p className={contactPageStyles.error}>
                    {errors.department}
                  </p>
                )}
              </div>
            </div>

            {/* Service Dropdown */}
            <div>
              <label className={contactPageStyles.label}>
                <Heart size={16} /> Preferred Service
              </label>
              <select
                name="service"
                value={form.service}
                onChange={handleChange}
                className={contactPageStyles.input}
              >
                <option value="">Select Service</option>
                {availableServices.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {errors.service && (
                <p className={contactPageStyles.error}>{errors.service}</p>
              )}
            </div>

            {/* Message Textarea */}
            <div>
              <label className={contactPageStyles.label}>
                Message
              </label>
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                placeholder="How can we help you?"
                rows="4"
                className={contactPageStyles.textarea}
              ></textarea>
              {errors.message && <p className={contactPageStyles.error}>{errors.message}</p>}
            </div>

            {/* Submit Actions */}
            <div className={contactPageStyles.buttonContainer}>
              <button type="submit" className={`${contactPageStyles.button} cursor-pointer hover:bg-emerald-700 transition`}>
                <Send size={16} /> Contact on WhatsApp
              </button>
              {sent && (
                <span className={contactPageStyles.sentMessage}>
                  WhatsApp message compiled successfully.
                </span>
              )}
            </div>

          </form>
        </div>

        {/* Info Column & Map */}
        <div className={contactPageStyles.infoContainer}>
          <div className={contactPageStyles.infoCard}>
            <h3 className={contactPageStyles.infoTitle + " text-emerald-800"}>Our Main Clinic</h3>
            <p className={contactPageStyles.infoText + " text-slate-600 mb-4"}>
              Located in Lucknow's health hub, providing primary consultation and diagnostics.
            </p>

            <div className={contactPageStyles.infoItem + " text-slate-700 font-medium"}>
              <MapPin size={18} className="text-emerald-600" />
              <span>Gomti Nagar, Lucknow, Uttar Pradesh</span>
            </div>
            <div className={contactPageStyles.infoItem + " text-slate-700 font-medium"}>
              <Phone size={18} className="text-emerald-600" />
              <span>+91 8299431275</span>
            </div>
            <div className={contactPageStyles.infoItem + " text-slate-700 font-medium"}>
              <Mail size={18} className="text-emerald-600" />
              <span>support@medicare.com</span>
            </div>
          </div>

          <div className={contactPageStyles.hoursContainer}>
            <h3 className={contactPageStyles.hoursTitle + " text-emerald-950 flex items-center gap-2"}>
              <Clock className="w-5 h-5 text-emerald-800" /> Clinic Hours
            </h3>
            <div className="space-y-1 mt-2 text-emerald-900 text-sm">
              <div className="flex justify-between">
                <span>Monday — Friday:</span>
                <span className="font-bold">08:00 AM — 08:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Saturday:</span>
                <span className="font-bold">09:00 AM — 05:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Sunday:</span>
                <span className="font-bold text-rose-700">Closed (Emergency Only)</span>
              </div>
            </div>
          </div>

          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3559.460792853461!2d80.98709187529213!3d26.870382662861033!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x399be2ae3cea2421%3A0x6c0de12e8a77818f!2sGomti%20Nagar%2C%20Lucknow%2C%20Uttar%20Pradesh!5e0!3m2!1sen!2sin!4v1731769000000!5m2!1sen!2sin"
            className={contactPageStyles.map}
            title="Gomti Nagar Map"
            loading="lazy"
            allowFullScreen
          ></iframe>
        </div>

      </div>
    </div>
  );
}