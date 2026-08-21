import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Calendar, CheckCircle, XCircle, FileText, Plus, 
  Trash2, Clock, Upload, ArrowLeft, Clipboard, Info 
} from "lucide-react";
import { addServiceStyles } from "../../assets/themeStyles.js";
import toast from "react-hot-toast";

import { API_BASE } from "../../config.js";

export default function AddService() {
  const { id: serviceId } = useParams();
  const navigate = useNavigate();

  const fileRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [hasExistingImage, setHasExistingImage] = useState(false);
  const [removeImage, setRemoveImage] = useState(false);

  const [serviceName, setServiceName] = useState("");
  const [about, setAbout] = useState("");
  const [price, setPrice] = useState("");
  const [availability, setAvailability] = useState("available");

  const [instructions, setInstructions] = useState([""]);
  const [slots, setSlots] = useState([]);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDate = today.getDate();

  const years = Array.from({ length: 5 }).map((_, i) => currentYear + i);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  const hours = Array.from({ length: 12 }).map((_, i) =>
    String(i + 1).padStart(2, "0")
  );
  const minutes = Array.from({ length: 12 }).map((_, i) =>
    String(i * 5).padStart(2, "0")
  );
  const ampm = ["AM", "PM"];

  const [slotDay, setSlotDay] = useState(String(currentDate));
  const [slotMonth, setSlotMonth] = useState(String(currentMonth));
  const [slotYear, setSlotYear] = useState(String(currentYear));
  const [slotHour, setSlotHour] = useState("11");
  const [slotMinute, setSlotMinute] = useState("00");
  const [slotAmPm, setSlotAmPm] = useState("AM");

  const [submitting, setSubmitting] = useState(false);
  const [toastAlert, setToastAlert] = useState(null);
  const [errors, setErrors] = useState({});

  const selectedYearNum = Number(slotYear);
  const selectedMonthNum = Number(slotMonth);
  const daysInSelectedMonth = new Date(
    selectedYearNum,
    selectedMonthNum + 1,
    0
  ).getDate();
  const days = Array.from({ length: daysInSelectedMonth }).map((_, i) =>
    String(i + 1)
  );

  useEffect(() => {
    if (Number(slotDay) > daysInSelectedMonth) {
      setSlotDay(String(daysInSelectedMonth));
    }
  }, [slotMonth, slotYear, daysInSelectedMonth]);

  useEffect(() => {
    let mounted = true;
    async function loadService() {
      if (!serviceId) return;
      try {
        const res = await fetch(`${API_BASE}/api/services/${serviceId}`);
        if (!res.ok) {
          showToast("error", "Load failed", "Could not load service for editing.");
          return;
        }
        const payload = await res.json();
        const data = payload.data || payload;
        if (!data || !mounted) return;

        setServiceName(data.name || "");
        setAbout(data.about || data.description || "");
        setPrice(data.price != null ? String(data.price) : "");
        setAvailability(data.available ? "available" : "unavailable");
        setInstructions(
          Array.isArray(data.instructions) && data.instructions.length
            ? data.instructions
            : [""]
        );
        setSlots(Array.isArray(data.slots) ? data.slots : []);
        if (data.imageUrl || data.image) {
          setImagePreview(data.imageUrl || data.image);
          setHasExistingImage(true);
          setRemoveImage(false);
        } else {
          setImagePreview(null);
          setHasExistingImage(false);
        }
      } catch (err) {
        console.error("loadService error:", err);
        showToast("error", "Network error", "Could not load service.");
      }
    }
    loadService();
    return () => {
      mounted = false;
    };
  }, [serviceId]);

  function handleImageChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (imagePreview && imagePreview.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(imagePreview);
      } catch (err) {}
    }
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
    setRemoveImage(false);
    setHasExistingImage(false);
  }

  function addInstruction() {
    setInstructions((s) => [...s, ""]);
  }
  function updateInstruction(i, v) {
    setInstructions((s) => s.map((x, idx) => (idx === i ? v : x)));
  }
  function removeInstruction(i) {
    setInstructions((s) => s.filter((_, idx) => idx !== i));
  }

  function resetForm() {
    if (imagePreview && imagePreview.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(imagePreview);
      } catch (err) {}
    }
    setImagePreview(null);
    setImageFile(null);
    setHasExistingImage(false);
    setRemoveImage(false);
    setServiceName("");
    setAbout("");
    setPrice("");
    setAvailability("available");
    setInstructions([""]);
    setSlots([]);
    setErrors({});
  }

  function showToast(type, title, message) {
    setToastAlert({ type, title, message });
    setTimeout(() => setToastAlert(null), 3500);
  }

  function selectedDateTime() {
    const d = Number(slotDay);
    const m = Number(slotMonth);
    const y = Number(slotYear);
    let h = Number(slotHour);
    const mm = Number(slotMinute);
    const ap = slotAmPm;

    if (ap === "AM") {
      if (h === 12) h = 0;
    } else {
      if (h !== 12) h = h + 12;
    }

    return new Date(y, m, d, h, mm, 0, 0);
  }

  function isSelectedDateTimeInPast() {
    const sel = selectedDateTime();
    return sel.getTime() <= Date.now();
  }

  function addSlot() {
    const m = months[Number(slotMonth)];
    const d = String(slotDay).padStart(2, "0");
    const y = slotYear;
    const h = String(slotHour).padStart(2, "0");
    const mm = slotMinute;
    const ap = slotAmPm;
    const formatted = `${d} ${m} ${y} • ${h}:${mm} ${ap}`;

    if (slots.includes(formatted)) {
      showToast(
        "error",
        "Duplicate Slot",
        "This time slot has already been added."
      );
      return;
    }

    if (isSelectedDateTimeInPast()) {
      showToast(
        "error",
        "Past Time",
        "You cannot add a time slot in the past."
      );
      setErrors((e) => ({ ...e, slots: true }));
      return;
    }

    setSlots((s) => [...s, formatted]);
    setErrors((e) => ({ ...e, slots: false }));
    showToast("success", "Slot Added", `Time slot added: ${formatted}`);
  }

  function removeSlot(i) {
    const removedSlot = slots[i];
    setSlots((s) => s.filter((_, idx) => idx !== i));
    showToast("info", "Slot Removed", `Removed: ${removedSlot}`);
  }

  function validate() {
    const newErrors = {};
    if (!imageFile && !hasExistingImage) newErrors.image = true;
    if (!serviceName.trim()) newErrors.serviceName = true;
    if (!about.trim()) newErrors.about = true;
    if (!String(price).trim()) newErrors.price = true;
    if (!instructions.some((ins) => ins.trim())) newErrors.instructions = true;
    if (!slots.length) newErrors.slots = true;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) {
      showToast(
        "error",
        "Missing Fields",
        "Please fill all required fields before submitting."
      );
      return;
    }

    setSubmitting(true);

    try {
      const fd = new FormData();
      fd.append("name", serviceName);
      fd.append("about", about);
      const numericPrice = String(price).replace(/[^\d.-]/g, "");
      fd.append("price", numericPrice === "" ? "0" : numericPrice);
      fd.append("availability", availability === "available" ? "true" : "false");
      fd.append("instructions", JSON.stringify(instructions.filter(x => x.trim())));
      fd.append("slots", JSON.stringify(slots));

      if (imageFile) {
        fd.append("image", imageFile);
      } else if (removeImage) {
        fd.append("removeImage", "true");
      }

      const url = serviceId
        ? `${API_BASE}/api/services/${serviceId}`
        : `${API_BASE}/api/services`;
      const method = serviceId ? "PUT" : "POST";

      const res = await fetch(url, { method, body: fd });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = data?.message || `Server error (${res?.status || "?"})`;
        showToast("error", "Save Failed", msg);
        setSubmitting(false);
        return;
      }

      toast.success(serviceId ? "Service Updated Successfully" : "Service Added Successfully");
      
      if (!serviceId) {
        resetForm();
        if (fileRef.current) fileRef.current.value = null;
      } else {
        const saved = data?.data || null;
        if (saved) {
          setHasExistingImage(Boolean(saved.imageUrl || saved.image));
          setImagePreview(saved.imageUrl || saved.image || null);
          setImageFile(null);
          setRemoveImage(false);
        }
      }
    } catch (err) {
      console.error("service submit error:", err);
      showToast("error", "Network error", "Could not reach server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={addServiceStyles.container.main}>
      <style>{addServiceStyles.customCSS}</style>
      
      <div className={addServiceStyles.container.form}>
        <div className="flex items-center justify-between border-b border-emerald-100 pb-4 mb-6">
          <div>
            <h1 className={addServiceStyles.header.title}>
              {serviceId ? "Edit Diagnostic Service" : "Add Diagnostic Service"}
            </h1>
            <p className={addServiceStyles.header.subtitle}>
              Configure diagnostic screening test descriptions, instructions, slots, and fees.
            </p>
          </div>
          <button
            onClick={() => navigate("/list-service")}
            className="flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-800"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>

        <form onSubmit={handleSubmit} className={addServiceStyles.grids.main}>
          
          {/* Left Column: Image upload preview */}
          <div className="col-span-1 space-y-4">
            <label className={addServiceStyles.labels.standard}>Service Profile Image</label>
            
            <div className={addServiceStyles.imageUpload.container(errors.image)}>
              {imagePreview ? (
                <div className="relative w-full h-full">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-2xl" />
                  <button
                    type="button"
                    onClick={() => {
                      if (imagePreview && imagePreview.startsWith("blob:")) {
                        try { URL.revokeObjectURL(imagePreview); } catch (e) {}
                      }
                      setImagePreview(null);
                      setImageFile(null);
                      if (hasExistingImage) {
                        setRemoveImage(true);
                        setHasExistingImage(false);
                      }
                      if (fileRef.current) fileRef.current.value = null;
                    }}
                    className="absolute top-2 right-2 bg-rose-600 text-white rounded-full p-1 shadow"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <div className={addServiceStyles.imageUpload.placeholder}>
                  <Upload className="w-8 h-8 mb-2" />
                  <span className="text-xs font-semibold">Choose Banner Image</span>
                </div>
              )}
            </div>

            <input
              type="file"
              ref={fileRef}
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              id="service-image-file"
            />
            <label
              htmlFor="service-image-file"
              className="w-full py-2 border border-dashed border-emerald-300 rounded-full text-xs font-semibold text-emerald-700 text-center block cursor-pointer bg-emerald-50/50 hover:bg-emerald-50"
            >
              Select Image File
            </label>
          </div>

          {/* Right Column: Name, Description, Price, Instructions, Slots */}
          <div className="lg:col-span-2 md:col-span-1 col-span-1 space-y-6">
            <div className={addServiceStyles.grids.formFields}>
              <div>
                <label className={addServiceStyles.labels.standard}>Service Name</label>
                <input
                  type="text"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="e.g. ECG Diagnostic Screening"
                  className="w-full px-4 py-2 border rounded-full border-emerald-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm mt-1"
                  required
                />
              </div>

              <div>
                <label className={addServiceStyles.labels.standard}>Price (₹)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="₹ e.g. 500"
                  className="w-full px-4 py-2 border rounded-full border-emerald-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm mt-1"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className={addServiceStyles.labels.standard}>Service Availability</label>
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  className="w-full px-4 py-2 border rounded-full border-emerald-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm mt-1 bg-white"
                >
                  <option value="available">Available (Active)</option>
                  <option value="unavailable">Unavailable (Disabled)</option>
                </select>
              </div>
            </div>

            <div>
              <label className={addServiceStyles.labels.standard}>About Diagnostic Test</label>
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="Write a brief overview of the clinical test purpose..."
                rows="3"
                className="w-full px-4 py-2 border rounded-2xl border-emerald-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm mt-1"
                required
              />
            </div>

            {/* Pointwise test instructions list */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={addServiceStyles.labels.standard}>Pre-test Instructions</label>
                <button
                  type="button"
                  onClick={addInstruction}
                  className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                >
                  + Add Instruction
                </button>
              </div>
              
              <div className="space-y-2">
                {instructions.map((ins, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <span className="text-xs font-bold text-emerald-800">{idx + 1}.</span>
                    <input
                      type="text"
                      value={ins}
                      onChange={(e) => updateInstruction(idx, e.target.value)}
                      placeholder={`e.g. Fasting for 12 hours required`}
                      className="flex-1 px-4 py-2 border rounded-full border-emerald-100 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    {instructions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeInstruction(idx)}
                        className="text-rose-500 hover:text-rose-700 transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Schedule Slot Configuration */}
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <div className="flex items-center gap-2 text-emerald-800 font-bold mb-3">
                <Calendar className="w-5 h-5" /> Add Test Availability Slot
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500">Day</label>
                  <select
                    value={slotDay}
                    onChange={(e) => setSlotDay(e.target.value)}
                    className="w-full px-2 py-1.5 border rounded-full border-emerald-200 text-xs bg-white"
                  >
                    {days.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500">Month</label>
                  <select
                    value={slotMonth}
                    onChange={(e) => setSlotMonth(e.target.value)}
                    className="w-full px-2 py-1.5 border rounded-full border-emerald-200 text-xs bg-white"
                  >
                    {months.map((m, idx) => (
                      <option key={m} value={String(idx)}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500">Year</label>
                  <select
                    value={slotYear}
                    onChange={(e) => setSlotYear(e.target.value)}
                    className="w-full px-2 py-1.5 border rounded-full border-emerald-200 text-xs bg-white"
                  >
                    {years.map((y) => (
                      <option key={y} value={String(y)}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500">Hour</label>
                  <select
                    value={slotHour}
                    onChange={(e) => setSlotHour(e.target.value)}
                    className="w-full px-2 py-1.5 border rounded-full border-emerald-200 text-xs bg-white"
                  >
                    {hours.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500">Min</label>
                  <select
                    value={slotMinute}
                    onChange={(e) => setSlotMinute(e.target.value)}
                    className="w-full px-2 py-1.5 border rounded-full border-emerald-200 text-xs bg-white"
                  >
                    {minutes.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500">AM/PM</label>
                  <select
                    value={slotAmPm}
                    onChange={(e) => setSlotAmPm(e.target.value)}
                    className="w-full px-2 py-1.5 border rounded-full border-emerald-200 text-xs bg-white"
                  >
                    {ampm.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={addSlot}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-full shadow transition-all cursor-pointer"
              >
                + Add Time Slot
              </button>

              {/* Added Slots lists preview */}
              <div className="mt-4 border-t border-emerald-100 pt-3">
                <p className="text-xs font-bold text-emerald-800 mb-2">Configured Slots ({slots.length})</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                  {slots.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">No availability slots added yet</span>
                  ) : (
                    slots.map((s, idx) => (
                      <div key={s} className="flex justify-between items-center bg-white p-2 rounded-xl border border-emerald-100 shadow-sm text-xs">
                        <span className="font-semibold text-emerald-800 flex items-center gap-1">
                          <Clock size={12} className="text-emerald-600" /> {s}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSlot(idx)}
                          className="text-rose-500 hover:text-rose-700 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Form Submit actions */}
            <div className="flex justify-center border-t border-emerald-50 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className={`px-8 py-3 rounded-full font-bold text-sm text-white shadow-lg transition-all active:scale-[0.99] cursor-pointer ${
                  submitting ? "bg-slate-300 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {submitting ? "Saving Diagnostic Service..." : "Register & Save Service Profile"}
              </button>
            </div>

          </div>

        </form>
      </div>

      {/* Floating toast alerts */}
      {toastAlert && (
        <div className={addServiceStyles.toast.container}>
          <div
            className={`${addServiceStyles.toast.toastBase} ${
              toastAlert.type === "success"
                ? addServiceStyles.toast.toastSuccess
                : toastAlert.type === "error"
                ? addServiceStyles.toast.toastError
                : addServiceStyles.toast.toastInfo
            }`}
          >
            {toastAlert.type === "success" ? (
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-600" />
            )}
            <div>
              <p className={addServiceStyles.toast.title}>{toastAlert.title}</p>
              <p className={addServiceStyles.toast.message}>{toastAlert.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
