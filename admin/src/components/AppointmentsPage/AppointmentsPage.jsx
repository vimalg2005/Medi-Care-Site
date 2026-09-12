import { 
  Calendar, BadgeIndianRupee, Search, X, Filter, AlertCircle,
  Phone, Mail, User, CreditCard, Wallet, Stethoscope 
} from "lucide-react";
import { pageStyles, statusClasses } from "../../assets/themeStyles.js";

const s = pageStyles;
import { API_BASE } from "../../config.js";

function formatDateISO(iso) {
  try {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch (e) {
    return iso;
  }
}

function dateTimeFromSlot(slot) {
  try {
    const [y, m, d] = slot.date.split("-");
    const base = new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);

    const [time, ampm] = slot.time.split(" ");
    let [hh, mm] = time.split(":").map(Number);
    if (ampm === "PM" && hh !== 12) hh += 12;
    if (ampm === "AM" && hh === 12) hh = 0;
    base.setHours(hh, mm, 0, 0);
    return base;
  } catch (e) {
    return new Date(slot.date + "T00:00:00");
  }
}

export default function AppointmentsPage() {
  const isAdmin = true;

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterSpeciality, setFilterSpeciality] = useState("all");
  const [showAll, setShowAll] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/appointments?limit=200`);
      if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
      
      const json = await res.json();
      const list = json.appointments || json.data || json || [];
      
      const items = list.map((a) => {
        const doctorName = (a.doctorId && a.doctorId.name) || a.doctorName || "";
        const speciality = (a.doctorId && a.doctorId.specialization) || a.speciality || "General";
        const doctorImage = (a.doctorId && (a.doctorId.imageUrl || a.doctorId.image)) || a.doctorImage?.url || "";
        const fee = typeof a.fees === "number" ? a.fees : a.fee || 0;
        const paymentMethod = a.payment?.method || "Cash";
        const paymentStatus = a.payment?.status || "Pending";
        return {
          id: a._id || a.id,
          patientName: a.patientName || "",
          age: a.age || "",
          gender: a.gender || "",
          mobile: a.mobile || "",
          email: a.email || "",
          doctorId: (a.doctorId && (a.doctorId._id || a.doctorId.id)) || a.doctorId || "",
          doctorName,
          speciality,
          doctorImage,
          fee,
          paymentMethod,
          paymentStatus,
          slot: {
            date: a.date || (a.slot && a.slot.date) || "",
            time: a.time || (a.slot && a.slot.time) || "00:00 AM",
          },
          status: a.status || a.payment?.status || "Pending",
          raw: a,
        };
      });
      setAppointments(items);
    } catch (err) {
      console.error("Load appointments error:", err);
      setError(err.message || "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const specialities = useMemo(() => {
    const specList = appointments.map((a) => a.speciality || "General");
    const set = new Set(specList);
    return ["all", ...Array.from(set)];
  }, [appointments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return appointments.filter((a) => {
      if (
        filterSpeciality !== "all" &&
        (a.speciality || "").toLowerCase() !== filterSpeciality.toLowerCase()
      )
        return false;
      if (filterDate && a.slot?.date !== filterDate) return false;
      if (!q) return true;
      return (
        (a.doctorName || "").toLowerCase().includes(q) ||
        (a.speciality || "").toLowerCase().includes(q) ||
        (a.patientName || "").toLowerCase().includes(q) ||
        (a.mobile || "").toLowerCase().includes(q) ||
        (a.email || "").toLowerCase().includes(q)
      );
    });
  }, [appointments, query, filterDate, filterSpeciality]);

  const sortedFiltered = useMemo(() => {
    return filtered.slice().sort((a, b) => {
      const da = dateTimeFromSlot(a.slot).getTime();
      const db = dateTimeFromSlot(b.slot).getTime();
      return db - da;
    });
  }, [filtered]);

  const displayed = useMemo(
    () => (showAll ? sortedFiltered : sortedFiltered.slice(0, 8)),
    [sortedFiltered, showAll]
  );

  async function adminCancelAppointment(id) {
    const appt = appointments.find((x) => x.id === id);
    if (!appt) return;

    const statusLower = (appt.status || "").toLowerCase();
    const isCancelled = statusLower === "canceled" || statusLower === "cancelled";
    const isCompleted = statusLower === "completed";

    if (isCancelled || isCompleted) return;

    const ok = window.confirm(
      `As admin, mark appointment for ${appt.patientName} with ${
        appt.doctorName
      } on ${formatDateISO(appt.slot.date)} at ${appt.slot.time} as CANCELLED?`
    );
    if (!ok) return;

    try {
      setAppointments((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "Canceled" } : p))
      );

      const res = await fetch(`${API_BASE}/api/appointments/${id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        throw new Error(`Cancel failed (${res.status})`);
      }

      load();
    } catch (err) {
      console.error("Cancel error:", err);
      setError(err.message || "Failed to cancel appointment");
      load();
    }
  }

  return (
    <div className={s.container}>
      <div className={s.maxWidthContainer}>
        {/* Header */}
        <div className={s.headerContainer}>
          <div className={s.headerTitleSection}>
            <h1 className={s.headerTitle}>Clinical Consultations Log</h1>
            <p className={s.headerSubtitle}>Overview and administrative controls for doctor appointments.</p>
          </div>

          {/* Search Box */}
          <div className={s.headerControlsSection}>
            <div className={s.searchContainer}>
              <Search className={s.searchIcon + " w-4 h-4"} />
              <input
                type="text"
                placeholder="Search patient, doctor..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={s.searchInput}
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-emerald-500 hover:text-emerald-800">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Date Filter & Speciality Selectors */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-6 bg-white p-4 rounded-3xl border border-emerald-100 shadow-sm">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold uppercase text-emerald-800 tracking-wider">Filters:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="text-xs px-3 py-2 rounded-full border border-emerald-200 outline-none text-emerald-800 bg-white"
                title="Filter Date"
              />
            </div>

            <select
              value={filterSpeciality}
              onChange={(e) => setFilterSpeciality(e.target.value)}
              className="text-xs px-3 py-2 rounded-full border border-emerald-200 bg-white text-emerald-800 cursor-pointer"
            >
              <option value="all">All Specialities</option>
              {specialities.filter(sp => sp !== "all").map((sp) => (
                <option key={sp} value={sp}>
                  {sp}
                </option>
              ))}
            </select>

            {(filterDate || filterSpeciality !== "all" || query) && (
              <button
                onClick={() => {
                  setFilterDate("");
                  setFilterSpeciality("all");
                  setQuery("");
                }}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Error/Loading */}
        {error && (
          <div className={s.errorContainer}>
            <AlertCircle className="w-5 h-5 mx-auto mb-1" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className={s.loadingErrorContainer}>
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-2 text-sm font-semibold">Loading consult logs...</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className={s.noResultsContainer}>
            No doctor appointments found matching the current search filters.
          </div>
        ) : (
          /* Cards Grid List */
          <div className={s.gridContainer}>
            {displayed.map((a, idx) => {
              const statusLower = (a.status || "").toLowerCase();
              const isCompleted = statusLower === "completed" || statusLower === "complete";
              const isCancelled = statusLower === "canceled" || statusLower === "cancelled";
              const isDisabled = isCompleted || isCancelled;

              return (
                <div
                  key={a.id}
                  style={{
                    animation: `fadeUp 420ms cubic-bezier(.2,.9,.2,1) forwards`,
                    animationDelay: `${idx * 70}ms`,
                    opacity: 0,
                  }}
                  className={s.card}
                >
                  <div className={s.cardHeader}>
                    <div className="min-w-0 flex-1">
                      {/* Patient Name & Details */}
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold text-xs">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <h3 className={s.cardTitle}>{a.patientName}</h3>
                        <div className={s.patientInfo}>
                          {a.age ? <span>{a.age} yrs</span> : null}
                          {a.age && a.gender ? <span>·</span> : null}
                          {a.gender ? <span>{a.gender}</span> : null}
                        </div>
                      </div>

                      {/* Patient Contact Numbers / Email */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-2 pl-9">
                        {a.mobile ? (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <a href={`tel:${a.mobile}`} className="hover:text-emerald-700 font-medium">{a.mobile}</a>
                          </span>
                        ) : null}
                        {a.email ? (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-emerald-600" />
                            <span className="truncate max-w-[170px]">{a.email}</span>
                          </span>
                        ) : null}
                      </div>

                      {/* Doctor Details */}
                      <div className="flex items-center gap-2 pl-9 mt-1">
                        {a.doctorImage ? (
                          <img src={a.doctorImage} alt={a.doctorName} className="w-6 h-6 rounded-full object-cover border border-emerald-200" />
                        ) : (
                          <Stethoscope className="w-4 h-4 text-emerald-600" />
                        )}
                        <div className={s.doctorInfo}>
                          <span className="font-semibold text-emerald-950">Dr. {a.doctorName.replace(/^Dr\.\s*/i, '')}</span> · <span className={s.doctorSpeciality}>{a.speciality}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={s.feeLabel}>Fees</div>
                      <div className={s.feeAmount}>
                        <BadgeIndianRupee size={16} />
                        <span>{a.fee}</span>
                      </div>
                      <div className="mt-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          a.paymentStatus === 'Paid' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {a.paymentMethod === 'Online' ? <CreditCard className="w-2.5 h-2.5" /> : <Wallet className="w-2.5 h-2.5" />}
                          {a.paymentStatus}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 flex-wrap border-t border-slate-50 pt-2.5 mt-2">
                    <div className={s.slotContainer}>
                      <Calendar size={14} className={s.slotIcon} />
                      <span className="text-xs font-semibold">
                        {formatDateISO(a.slot.date)} — {a.slot.time}
                      </span>
                    </div>

                    <div className={`${s.statusBadge} ${statusClasses(a.status)}`}>
                      {a.status ? a.status.toUpperCase() : "PENDING"}
                    </div>
                  </div>

                  {/* Cancellations admin triggers */}
                  <div className="mt-2 flex items-center justify-end">
                    <button
                      onClick={() => adminCancelAppointment(a.id)}
                      disabled={isDisabled}
                      className={s.cancelButton(isDisabled, isCompleted)}
                    >
                      {isDisabled
                        ? isCompleted
                          ? "Completed"
                          : "Cancelled"
                        : "Cancel Appointment"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Show More toggle */}
        {sortedFiltered.length > displayed.length && (
          <div className={s.showMoreContainer}>
            <button
              onClick={() => setShowAll(true)}
              className={s.showMoreButton}
            >
              Show All Appointments
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
