import React, { useState, useEffect, useMemo } from "react";
import { 
  Calendar, CheckCircle, XCircle, User, Phone, 
  BadgeIndianRupee, Clock, Search, X, Loader2, RefreshCw 
} from "lucide-react";
import { serviceAppointmentsStyles } from "../../assets/themeStyles.js";

const s = serviceAppointmentsStyles;
import { API_BASE } from "../../config.js";

function formatTwo(n) {
  return String(n).padStart(2, "0");
}

function formatDateNice(dateStr) {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function timePartsToInputValue(appt) {
  const hour = Number(appt.hour || 0);
  const minute = Number(appt.minute || 0);
  let hh24 = hour % 12;
  if ((appt.ampm || "AM").toUpperCase() === "PM") hh24 += 12;
  if (appt.ampm === "AM" && hour === 12) hh24 = 0;
  if (appt.ampm === "PM" && hour === 12) hh24 = 12;
  return `${formatTwo(hh24)}:${formatTwo(minute)}`;
}

function formatTimeDisplay(appt) {
  if (!appt) return "";
  return `${formatTwo(appt.hour || 0)}:${formatTwo(appt.minute || 0)} ${appt.ampm || ""}`;
}

function StatusBadge({ status }) {
  const classes = s.statusBadge(status);
  return (
    <span className={classes}>
      {status === "Confirmed" && <CheckCircle className="h-4 w-4" />}
      {status === "Canceled" && <XCircle className="h-4 w-4" />}
      {status}
    </span>
  );
}

function StatusSelect({ appointment, onChange, disabled }) {
  const terminal =
    appointment.status === "Completed" || appointment.status === "Canceled";

  const options = [
    { value: "Pending", label: "Pending" },
    { value: "Confirmed", label: "Confirmed" },
    { value: "Completed", label: "Completed" },
    { value: "Canceled", label: "Canceled" },
  ];

  return (
    <select
      value={appointment.status}
      onChange={(e) => onChange(e.target.value)}
      disabled={terminal || disabled}
      className={s.statusSelect(terminal)}
      title={terminal ? "Status cannot be changed" : "Change status"}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function getTodayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isDateBefore(aDateStr, bDateStr) {
  try {
    const a = new Date(`${aDateStr}T00:00:00`);
    const b = new Date(`${bDateStr}T00:00:00`);
    return a.getTime() < b.getTime();
  } catch {
    return false;
  }
}

function RescheduleButton({ appointment, onReschedule, disabled }) {
  const terminal =
    appointment.status === "Completed" || appointment.status === "Canceled";
  const [editing, setEditing] = useState(false);
  const todayISO = getTodayISO();
  const [date, setDate] = useState(appointment.date || todayISO);
  const [time, setTime] = useState(timePartsToInputValue(appointment));

  useEffect(() => {
    const baseDate = appointment.date || "";
    const initialDate =
      baseDate && !isDateBefore(baseDate, todayISO) ? baseDate : todayISO;
    setDate(initialDate);
    setTime(timePartsToInputValue(appointment));
  }, [appointment, todayISO]);

  function save() {
    if (!date || !time) return;
    if (isDateBefore(date, getTodayISO())) {
      alert("Please choose today or a future date for rescheduling.");
      return;
    }
    onReschedule(date, time);
    setEditing(false);
  }

  function cancel() {
    const baseDate = appointment.date || "";
    const restoreDate =
      baseDate && !isDateBefore(baseDate, getTodayISO())
        ? baseDate
        : getTodayISO();
    setDate(restoreDate);
    setTime(timePartsToInputValue(appointment));
    setEditing(false);
  }

  return (
    <div className="w-full">
      {!editing ? (
        <div className="flex justify-end">
          <button
            onClick={() => setEditing(true)}
            disabled={terminal || disabled}
            title={
              terminal ? "Cannot reschedule completed/canceled" : "Reschedule"
            }
            className={s.rescheduleButton(terminal)}
          >
            Reschedule
          </button>
        </div>
      ) : (
        <div className={s.rescheduleEditContainer}>
          <input
            type="date"
            value={date}
            min={getTodayISO()}
            onChange={(e) => setDate(e.target.value)}
            className={s.rescheduleDateInput}
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={s.rescheduleTimeInput}
          />
          <div className={s.rescheduleActions}>
            <button onClick={save} className={s.rescheduleSaveButton}>
              Save
            </button>
            <button onClick={cancel} className={s.rescheduleCancelButton}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ServiceAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 220);
    return () => clearTimeout(t);
  }, [search]);

  const [statusFilter, setStatusFilter] = useState("");

  async function fetchAppointments() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/service-appointments`);
      if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
      const body = await res.json();
      
      const list = body.appointments || body.data || body || [];
      const normalized = list.map((a) => {
        return {
          id: a._id || a.id,
          patientName: a.patientName || "Anonymous",
          age: a.age || "—",
          gender: a.gender || "—",
          mobile: a.mobile || "—",
          serviceId: a.serviceId || "",
          serviceName: a.serviceName || "Diagnostic Test",
          fees: a.fees || a.amount || 0,
          date: a.date || "",
          hour: a.hour ?? 10,
          minute: a.minute ?? 0,
          ampm: a.ampm || "AM",
          status: a.status || "Pending",
          raw: a,
        };
      });
      setAppointments(normalized);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load diagnostic appointments log");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAppointments();
  }, []);

  function pushToast(title, message) {
    const toastId = Date.now() + Math.random();
    setToasts((t) => [...t, { id: toastId, title, message }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== toastId));
    }, 3500);
  }

  async function changeStatusRemote(id, newStatus) {
    const appt = appointments.find((a) => a.id === id);
    if (!appt) return;
    const oldStatus = appt.status;

    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    );

    try {
      const res = await fetch(`${API_BASE}/api/service-appointments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        throw new Error(`Failed to update status (${res.status})`);
      }
      pushToast("Status updated", `Appointment #${id} is now ${newStatus}`);
    } catch (err) {
      console.error(err);
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: oldStatus } : a))
      );
      pushToast("Update failed", err.message || "Failed to update status");
    }
  }

  async function rescheduleRemote(id, dateStr, time24) {
    const appt = appointments.find((a) => a.id === id);
    if (!appt) return;
    
    const [hh, mm] = time24.split(":").map(Number);
    const hour12 = hh % 12 === 0 ? 12 : hh % 12;
    const ampm = hh >= 12 ? "PM" : "AM";
    const timeStr = `${formatTwo(hour12)}:${formatTwo(mm)} ${ampm}`;

    setAppointments((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              date: dateStr,
              hour: hour12,
              minute: mm,
              ampm,
              status: "Rescheduled",
            }
          : a
      )
    );

    try {
      const res = await fetch(`${API_BASE}/api/service-appointments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rescheduledTo: { date: dateStr, time: timeStr },
          status: "Rescheduled",
        }),
      });
      if (!res.ok) {
        throw new Error(`Reschedule failed (${res.status})`);
      }
      pushToast(
        "Rescheduled",
        `Appointment #${id} moved to ${formatDateNice(dateStr)} ${timeStr}`
      );
    } catch (err) {
      console.error(err);
      pushToast("Reschedule failed", err.message || "Failed to reschedule");
      fetchAppointments();
    }
  }

  async function cancelRemote(id) {
    const appt = appointments.find((a) => a.id === id);
    if (!appt) return;
    if (appt.status === "Canceled") return;
    if (
      !window.confirm(
        `Mark appointment for ${appt.patientName} on ${formatDateNice(
          appt.date
        )} as CANCELED?`
      )
    )
      return;

    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "Canceled" } : a))
    );

    try {
      const res = await fetch(
        `${API_BASE}/api/service-appointments/${id}/cancel`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (!res.ok) throw new Error("Cancel failed");
      pushToast("Canceled", `Appointment #${id} canceled`);
    } catch (err) {
      console.error(err);
      pushToast("Cancel failed", err.message || "Failed to cancel");
      fetchAppointments();
    }
  }

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return appointments
      .filter((a) =>
        q
          ? (a.patientName || "").toLowerCase().includes(q) ||
            (a.serviceName || "").toLowerCase().includes(q)
          : true
      )
      .filter((a) => (statusFilter ? a.status === statusFilter : true));
  }, [appointments, debouncedSearch, statusFilter]);

  function getTimestamp(a) {
    try {
      const [y, m, d] = (a.date || "1970-01-01").split("-").map(Number);
      let hour = Number(a.hour) || 0;
      if ((a.ampm || "AM") === "PM" && hour !== 12) hour += 12;
      if ((a.ampm || "AM") === "AM" && hour === 12) hour = 0;
      const minute = Number(a.minute) || 0;
      return new Date(y, (m || 1) - 1, d || 1, hour, minute).getTime();
    } catch {
      return 0;
    }
  }

  const displayList = useMemo(() => {
    const copy = filtered.slice();
    copy.sort((x, y) => getTimestamp(y) - getTimestamp(x));
    return copy;
  }, [filtered]);

  return (
    <div className={s.container}>
      <style>{s.animatedBorderStyle}</style>
      
      {/* Header Title Section */}
      <div className={s.headerContainer}>
        <div className={s.headerTitleContainer}>
          <h1 className={s.headerTitle}>Diagnostic Logs Console</h1>
          <p className={s.headerSubtitle}>Manage diagnostic slot bookings, status reviews, or reschedule tests.</p>
        </div>

        {/* Search controls */}
        <div className={s.searchContainer}>
          <div className={s.searchInputWrapper}>
            <div className={s.searchLabel}>
              <div className={s.searchIconContainer + " absolute top-3"}>
                <Search className={s.searchIcon} />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient or service name..."
                className={s.searchInput}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className={s.clearSearchButton + " absolute top-2"}
                >
                  <X className={s.clearSearchIcon} />
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm px-3 py-2 cursor-pointer rounded-full border border-emerald-400 bg-white text-emerald-800"
              title="Filter by status"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Rescheduled">Rescheduled</option>
              <option value="Completed">Completed</option>
              <option value="Canceled">Canceled</option>
            </select>
          </div>
          
          <div className={s.searchInfo}>
            <span>{filtered.length} matching test logs</span>
            <button onClick={fetchAppointments} className={s.refreshButton}>
              Refresh logs
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className={s.errorContainer}>
          <AlertCircle className="w-5 h-5 mx-auto mb-1" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid Log */}
      {loading ? (
        <div className={s.loadingContainer}>
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="text-sm font-semibold">Loading log records...</p>
        </div>
      ) : displayList.length === 0 ? (
        <div className={s.noResultsContainer}>
          <span className={s.noResultsIcon}>📋</span>
          <span className={s.noResultsText}>No diagnostic bookings match criteria.</span>
        </div>
      ) : (
        <div className={s.gridContainer}>
          {displayList.map((a) => {
            const isLocked = a.status === "Completed" || a.status === "Canceled";
            return (
              <article key={a.id} className={s.article}>
                <div className={s.cardInner}>
                  <div>
                    <div className={s.cardHeader}>
                      <div className={s.patientInfoContainer}>
                        <div className={s.patientAvatar}>
                          <User className={s.patientAvatarIcon} />
                        </div>
                        <div className={s.patientInfo}>
                          <h3 className={s.patientName}>{a.patientName}</h3>
                          <p className={s.patientDetails}>
                            {a.gender} · {a.age} yrs
                          </p>
                        </div>
                      </div>

                      <div className={s.statusContainer}>
                        <StatusBadge status={a.status} />
                        <div className="mt-1">
                          <StatusSelect
                            appointment={a}
                            onChange={(st) => changeStatusRemote(a.id, st)}
                            disabled={false}
                          />
                        </div>
                      </div>
                    </div>

                    <div className={s.detailsContainer}>
                      <div className={s.detailItem}>
                        <Phone className={s.detailIcon} />
                        <span className="text-sm text-emerald-800 font-semibold truncate">{a.mobile}</span>
                      </div>

                      <div className={s.detailItem}>
                        <BadgeIndianRupee className={s.detailIcon} />
                        <span className="text-sm text-emerald-800 font-bold">
                          Fees: ₹{a.fees}
                        </span>
                      </div>

                      <div className={s.detailItem}>
                        <Calendar className={s.detailIcon} />
                        <span className="text-sm text-emerald-800 font-medium">
                          Date: {formatDateNice(a.date)}
                        </span>
                      </div>

                      <div className={s.detailItem}>
                        <Clock className={s.detailIcon} />
                        <span className="text-sm text-emerald-800 font-medium">
                          Time: {formatTimeDisplay(a)}
                        </span>
                      </div>

                      <div className="text-sm text-slate-500 font-semibold border-t border-slate-50 pt-2.5">
                        Test: <span className="text-emerald-800 font-bold">{a.serviceName}</span>
                      </div>
                    </div>
                  </div>

                  <div className={s.actionsContainer}>
                    <div className={s.actionsInnerContainer}>
                      <div className="flex-grow">
                        <RescheduleButton
                          appointment={a}
                          onReschedule={(d, t) => rescheduleRemote(a.id, d, t)}
                          disabled={false}
                        />
                      </div>

                      <button
                        onClick={() => cancelRemote(a.id)}
                        disabled={isLocked}
                        className={s.cancelButton(isLocked)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Floating toasts alert */}
      {toasts.length > 0 && (
        <div className={s.toastContainer}>
          {toasts.map((t) => (
            <div key={t.id} className={s.toast}>
              <div className={s.toastContent}>
                <div className={s.toastText}>
                  <p className="text-xs font-bold text-emerald-800">{t.title}</p>
                  <p className="text-[10px] text-slate-500">{t.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
