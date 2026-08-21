import React, { useEffect, useState, useRef, useMemo } from "react";
import { 
  Calendar, CheckCircle, XCircle, User, Award, 
  MapPin, Plus, Trash2, Shield, Eye, EyeOff, FileText, Activity 
} from "lucide-react";
import { doctorDetailStyles } from "../../assets/themeStyles.js";

const s = doctorDetailStyles;
import { API_BASE } from "../../config.js";

function timeStringToMinutes(t) {
  if (!t) return 0;
  const [hhmm, ampm] = t.split(" ");
  let [h, m] = hhmm.split(":").map(Number);
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

function formatDateISO(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "June",
    "July", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  return `${Number(d)} ${monthNames[dateObj.getMonth()]} ${y}`;
}

export default function AddPage() {
  const [form, setForm] = useState({
    name: "",
    specialization: "",
    imageFile: null,
    imagePreview: "",
    experience: "",
    qualifications: "",
    location: "",
    about: "",
    fee: "",
    success: "",
    patients: "",
    rating: "",
    schedule: {},
    availability: "Available",
    email: "",
    password: "",
  });

  const fileInputRef = useRef(null);

  const [slotDate, setSlotDate] = useState("");
  const [slotHour, setSlotHour] = useState("");
  const [slotMinute, setSlotMinute] = useState("00");
  const [slotAmpm, setSlotAmpm] = useState("AM");

  const [toast, setToast] = useState({
    show: false,
    type: "success",
    message: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [today] = useState(() => {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - tzOffset * 60000);
    return local.toISOString().split("T")[0];
  });

  useEffect(() => {
    if (!toast.show) return;
    const t = setTimeout(() => setToast((s) => ({ ...s, show: false })), 3000);
    return () => clearTimeout(t);
  }, [toast.show]);

  const showToast = (type, message) => setToast({ show: true, type, message });

  function handleImage(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (form.imagePreview && form.imageFile) {
      try {
        URL.revokeObjectURL(form.imagePreview);
      } catch (err) {}
    }
    setForm((p) => ({
      ...p,
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
    }));
  }

  function removeImage() {
    if (form.imagePreview && form.imageFile) {
      try {
        URL.revokeObjectURL(form.imagePreview);
      } catch (err) {}
    }
    setForm((p) => ({ ...p, imageFile: null, imagePreview: "" }));
    if (fileInputRef.current) {
      try {
        fileInputRef.current.value = "";
      } catch (err) {}
    }
  }

  function addSlotToForm() {
    if (!slotDate || !slotHour) {
      showToast("error", "Select date + time");
      return;
    }
    if (slotDate < today) {
      showToast("error", "Cannot add a slot in the past");
      return;
    }
    const time = `${slotHour}:${slotMinute} ${slotAmpm}`;

    if (slotDate === today) {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const slotMinutes = timeStringToMinutes(time);
      if (slotMinutes <= nowMinutes) {
        showToast("error", "Cannot add a time that has already passed today");
        return;
      }
    }

    setForm((f) => {
      const sched = { ...f.schedule };
      if (!sched[slotDate]) sched[slotDate] = [];
      if (!sched[slotDate].includes(time)) sched[slotDate].push(time);

      sched[slotDate] = sched[slotDate].sort(
        (a, b) => timeStringToMinutes(a) - timeStringToMinutes(b)
      );
      return { ...f, schedule: sched };
    });

    setSlotHour("");
    setSlotMinute("00");
  }

  function removeSlot(date, time) {
    setForm((f) => {
      const sched = { ...f.schedule };
      sched[date] = sched[date].filter((t) => t !== time);
      if (!sched[date].length) delete sched[date];
      return { ...f, schedule: sched };
    });
  }

  function getFlatSlots(s) {
    const arr = [];
    Object.keys(s)
      .sort()
      .forEach((d) => {
        s[d].forEach((t) => arr.push({ date: d, time: t }));
      });
    return arr;
  }

  function validate(f) {
    const req = [
      "name", "specialization", "experience", "qualifications",
      "location", "about", "fee", "success", "patients", "rating",
      "email", "password"
    ];
    for (let k of req) if (!f[k]) return false;
    if (!f.imageFile) return false;
    if (!Object.keys(f.schedule).length) return false;
    return true;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!validate(form)) {
      showToast("error", "Fill all fields + upload image + add slot");
      return;
    }
    const r = Number(form.rating);
    if (Number.isNaN(r) || r < 1 || r > 5) {
      showToast("error", "Rating must be a number between 1 and 5");
      return;
    }
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("specialization", form.specialization || "");
      fd.append("experience", form.experience || "");
      fd.append("qualifications", form.qualifications || "");
      fd.append("location", form.location || "");
      fd.append("about", form.about || "");
      fd.append("fee", form.fee === "" ? "0" : String(form.fee));
      fd.append("success", form.success || "");
      fd.append("patients", form.patients || "");
      fd.append("rating", form.rating === "" ? "0" : String(form.rating));
      fd.append("availability", form.availability || "Available");
      fd.append("email", form.email);
      fd.append("password", form.password);
      fd.append("schedule", JSON.stringify(form.schedule || {}));

      if (form.imageFile) fd.append("image", form.imageFile);

      const res = await fetch(`${API_BASE}/api/doctors`, {
        method: "POST",
        body: fd,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = data?.message || `Server error (${res.status})`;
        showToast("error", msg);
        setLoading(false);
        return;
      }

      showToast("success", "Doctor Added Successfully!");

      // Revoke preview URL
      if (form.imagePreview && form.imageFile) {
        try {
          URL.revokeObjectURL(form.imagePreview);
        } catch (err) {}
      }

      // Reset form
      setForm({
        name: "",
        specialization: "",
        imageFile: null,
        imagePreview: "",
        experience: "",
        qualifications: "",
        location: "",
        about: "",
        fee: "",
        success: "",
        patients: "",
        rating: "",
        schedule: {},
        availability: "Available",
        email: "",
        password: "",
      });

      if (fileInputRef.current) {
        try {
          fileInputRef.current.value = "";
        } catch (err) {}
      }

      setSlotDate("");
      setSlotHour("");
      setSlotMinute("00");
      setShowPassword(false);
    } catch (err) {
      console.error("submit error:", err);
      showToast("error", "Network or server error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={s.pageContainer}>
      <div className={s.maxWidthContainerLg}>
        
        {/* Header Title Section */}
        <div className={s.headerContainer}>
          <div className="flex items-center gap-2 justify-center">
            <h1 className="text-3xl font-extrabold text-emerald-800">Add New Doctor Profile</h1>
          </div>
          <p className="text-emerald-600 text-sm text-center">Fill doctor details and configure custom schedule slots.</p>
        </div>

        {/* Input Form Body */}
        <div className={s.formContainer}>
          <form onSubmit={handleAdd} className="space-y-6">
            <div className={s.formGrid}>
              
              {/* Doctor Name */}
              <div>
                <label className={s.label}>Doctor Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Dr. John Doe"
                  className={s.inputBase}
                  required
                />
              </div>

              {/* Specialization */}
              <div>
                <label className={s.label}>Specialization</label>
                <input
                  type="text"
                  name="specialization"
                  value={form.specialization}
                  onChange={handleChange}
                  placeholder="Cardiologist, Pediatrician..."
                  className={s.inputBase}
                  required
                />
              </div>

              {/* Doctor Profile Image Upload */}
              <div className="md:col-span-2 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex flex-col sm:flex-row items-center gap-4">
                <div>
                  <label className={s.label}>Upload Profile Image</label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImage}
                    accept="image/*"
                    className={s.fileInput + " cursor-pointer"}
                    required={!form.imagePreview}
                  />
                </div>
                {form.imagePreview && (
                  <div className="relative">
                    <img src={form.imagePreview} alt="Preview" className={s.imagePreview} />
                    <button
                      type="button"
                      onClick={removeImage}
                      className={s.removeImageButton}
                    >
                      <XCircle size={18} />
                    </button>
                  </div>
                )}
              </div>

              {/* Doctor Experience */}
              <div>
                <label className={s.label}>Experience (e.g. '8 years')</label>
                <input
                  type="text"
                  name="experience"
                  value={form.experience}
                  onChange={handleChange}
                  placeholder="e.g. 8 years"
                  className={s.inputBase}
                  required
                />
              </div>

              {/* Qualifications */}
              <div>
                <label className={s.label}>Qualifications</label>
                <input
                  type="text"
                  name="qualifications"
                  value={form.qualifications}
                  onChange={handleChange}
                  placeholder="e.g. MBBS, MD (Cardiology)"
                  className={s.inputBase}
                  required
                />
              </div>

              {/* Clinic Location */}
              <div>
                <label className={s.label}>Clinic Location Address</label>
                <input
                  type="text"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="e.g. Sector-4, Gomti Nagar"
                  className={s.inputBase}
                  required
                />
              </div>

              {/* Consultation Fee */}
              <div>
                <label className={s.label}>Consultation Fee (₹)</label>
                <input
                  type="number"
                  name="fee"
                  value={form.fee}
                  onChange={handleChange}
                  placeholder="e.g. 500"
                  className={s.inputBase}
                  min="0"
                  required
                />
              </div>

              {/* Success Rate */}
              <div>
                <label className={s.label}>Success Rate (%)</label>
                <input
                  type="text"
                  name="success"
                  value={form.success}
                  onChange={handleChange}
                  placeholder="e.g. 98%"
                  className={s.inputBase}
                  required
                />
              </div>

              {/* Patients Served */}
              <div>
                <label className={s.label}>Patients Served (e.g. '1500+')</label>
                <input
                  type="text"
                  name="patients"
                  value={form.patients}
                  onChange={handleChange}
                  placeholder="e.g. 1500+"
                  className={s.inputBase}
                  required
                />
              </div>

              {/* Rating */}
              <div>
                <label className={s.label}>Rating (1.0 — 5.0)</label>
                <input
                  className={s.inputBase}
                  placeholder="Rating (1.0 - 5.0)"
                  type="number"
                  name="rating"
                  min={1}
                  max={5}
                  step={0.1}
                  value={form.rating}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") {
                      setForm((p) => ({ ...p, rating: "" }));
                      return;
                    }
                    const n = Number(v);
                    if (Number.isNaN(n)) return;
                    const clamped = Math.max(1, Math.min(5, n));
                    const fixed = Math.round(clamped * 10) / 10;
                    setForm((p) => ({ ...p, rating: fixed.toString() }));
                  }}
                  required
                />
              </div>

              {/* Availability Status */}
              <div>
                <label className={s.label}>Availability Status</label>
                <select
                  name="availability"
                  value={form.availability}
                  onChange={handleChange}
                  className={s.inputBase + " bg-white"}
                >
                  <option>Available</option>
                  <option>Unavailable</option>
                </select>
              </div>

              {/* Email Address */}
              <div>
                <label className={s.label}>Doctor Email Account (Login Credentials)</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="doctor@medicare.com"
                  className={s.inputBase}
                  required
                />
              </div>

              {/* Password */}
              <div className="relative">
                <label className={s.label}>Login Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter secure password"
                  className={s.inputBase + " pr-12"}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-[48px]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* About Bio */}
              <div className="md:col-span-2">
                <label className={s.label}>Doctor Biography / About</label>
                <textarea
                  name="about"
                  value={form.about}
                  onChange={handleChange}
                  placeholder="Write a brief professional summary..."
                  className={s.textareaBase}
                  rows="3"
                  required
                />
              </div>

              {/* SCHEDULE SLOTS SELECTOR */}
              <div className={s.scheduleContainer + " md:col-span-2"}>
                <div className={s.scheduleHeader}>
                  <Calendar className="text-emerald-600" />
                  <p className={s.scheduleTitle}>Configure Schedule Availability Slots</p>
                </div>

                <div className={s.scheduleInputsContainer}>
                  <input
                    type="date"
                    value={slotDate}
                    min={today}
                    onChange={(e) => setSlotDate(e.target.value)}
                    className={s.scheduleDateInput}
                  />

                  <select
                    value={slotHour}
                    onChange={(e) => setSlotHour(e.target.value)}
                    className={s.scheduleTimeSelect + " bg-white"}
                  >
                    <option value="">Hour</option>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <option key={i} value={String(i + 1)}>
                        {i + 1}
                      </option>
                    ))}
                  </select>

                  <select
                    value={slotMinute}
                    onChange={(e) => setSlotMinute(e.target.value)}
                    className={s.scheduleTimeSelect + " bg-white"}
                  >
                    {Array.from({ length: 60 }).map((_, i) => (
                      <option key={i} value={String(i).padStart(2, "0")}>
                        {String(i).padStart(2, "0")}
                      </option>
                    ))}
                  </select>

                  <select
                    value={slotAmpm}
                    onChange={(e) => setSlotAmpm(e.target.value)}
                    className={s.scheduleTimeSelect + " bg-white"}
                  >
                    <option>AM</option>
                    <option>PM</option>
                  </select>

                  <button
                    type="button"
                    onClick={addSlotToForm}
                    className="px-5 py-2.5 rounded-full bg-emerald-600 text-white font-semibold flex items-center gap-1 cursor-pointer hover:bg-emerald-700 transition"
                  >
                    <Plus size={16} /> Add Slot
                  </button>
                </div>

                {/* Slots List list preview */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {getFlatSlots(form.schedule).map(({ date, time }) => (
                    <div
                      key={date + time}
                      className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-emerald-100 shadow-sm text-sm"
                    >
                      <span className="font-medium text-emerald-800">
                        {formatDateISO(date)} — {time}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeSlot(date, time)}
                        className="text-rose-500 hover:text-rose-700 transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="md:col-span-2 flex justify-center pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-8 py-3.5 rounded-full font-bold text-sm text-white shadow-lg transition-all active:scale-[0.99] cursor-pointer ${
                    loading ? "bg-slate-300 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {loading ? "Registering Doctor..." : "Register & Add Doctor Profile"}
                </button>
              </div>

            </div>
          </form>
        </div>

      </div>

      {/* Toast Alert popup */}
      {toast.show && (
        <div
          className={`${s.toastContainer} ${
            toast.type === "success" ? s.toastSuccess : s.toastError
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle size={20} />
          ) : (
            <XCircle size={20} />
          )}
          <span className="font-semibold text-sm">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
