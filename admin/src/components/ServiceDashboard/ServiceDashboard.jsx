import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Calendar, CheckCircle, XCircle, BadgeIndianRupee, 
  Search, Grid, RefreshCw, AlertCircle, Sparkles 
} from "lucide-react";
import { serviceDashboardStyles } from "../../assets/themeStyles.js";

const s = serviceDashboardStyles;
import { API_BASE } from "../../config.js";

const formatCurrency = (v) => {
  return `₹ ${Number(v || 0).toLocaleString()}`;
};


function normalizeService(doc) {
  if (!doc) return null;
  const id = doc._id || doc.id || String(Math.random()).slice(2);
  const name = doc.name || doc.title || doc.serviceName || "Untitled Service";
  const price = Number(doc.price ?? doc.fee ?? doc.fees ?? doc.cost ?? doc.amount) || 0;
  const image = doc.imageUrl || doc.image || "https://images.unsplash.com/photo-1579684389782-64d84b5e901a?auto=format&fit=crop&q=80&w=150";
  
  const totalAppointments = doc.totalAppointments ?? doc.appointments?.total ?? doc.count ?? doc.bookings ?? 0;
  const completed = doc.completed ?? doc.appointments?.completed ?? doc.completedAppointments ?? 0;
  const canceled = doc.canceled ?? doc.appointments?.canceled ?? doc.canceledAppointments ?? 0;

  return {
    id,
    name,
    price,
    image,
    totalAppointments: Number(totalAppointments) || 0,
    completed: Number(completed) || 0,
    canceled: Number(canceled) || 0,
    raw: doc,
  };
}

export default function ServiceDashboard({ services: servicesProp = null }) {
  const [services, setServices] = useState(
    Array.isArray(servicesProp) ? servicesProp.map(normalizeService) : []
  );
  const [loading, setLoading] = useState(!Array.isArray(servicesProp));
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const fetchingRef = useRef(false);

  async function fetchServices({ showLoading = true } = {}) {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      if (showLoading) {
        setLoading(true);
        setError(null);
      }

      // Fetch diagnostic services
      const res = await fetch(`${API_BASE}/api/services`);
      if (!res.ok) {
        throw new Error(`Failed to fetch services (${res.status})`);
      }
      const body = await res.json();

      let list = [];
      if (Array.isArray(body)) list = body;
      else if (Array.isArray(body.services)) list = body.services;
      else if (Array.isArray(body.data)) list = body.data;
      else if (Array.isArray(body.items)) list = body.items;

      const normalized = list.map(normalizeService).filter(Boolean);
      setServices(normalized);
    } catch (err) {
      console.error("fetchServices error:", err);
      setError(err.message || "Failed to load service dashboard statistics");
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }

  useEffect(() => {
    if (!servicesProp) {
      fetchServices();
    }
  }, [servicesProp]);

  const totals = useMemo(() => {
    const totalServices = services.length;
    const totalAppointments = services.reduce((s, x) => s + x.totalAppointments, 0);
    const completed = services.reduce((s, x) => s + x.completed, 0);
    const canceled = services.reduce((s, x) => s + x.canceled, 0);
    const totalEarnings = services.reduce((s, x) => s + (x.completed * x.price), 0);
    
    return {
      totalServices,
      totalAppointments,
      completed,
      canceled,
      totalEarnings,
    };
  }, [services]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return services;
    const q = searchQuery.trim().toLowerCase();
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        String(s.price).includes(q)
    );
  }, [services, searchQuery]);

  const INITIAL_COUNT = 8;
  const visibleServices = showAll ? filtered : filtered.slice(0, INITIAL_COUNT);

  return (
    <div className={s.container}>
      <div className={s.innerContainer}>
        {/* Header */}
        <div className={s.header.container}>
          <div>
            <h1 className={s.header.title}>Services & Diagnostics Dashboard</h1>
            <p className={s.header.subtitle}>Overview of medical screening tests bookings, analytics, and revenue.</p>
          </div>
          
          <div className={s.refresh.container}>
            <span className={s.refresh.countText}>
              {services.length} services configured
            </span>
            <button
              onClick={() => fetchServices()}
              className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-emerald-50 rounded-full border border-emerald-200 text-xs font-semibold text-emerald-800 shadow-sm cursor-pointer transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        </div>

        {/* Stats Grid Cards */}
        <div className={s.statGrid}>
          {/* Card 1: Total Services */}
          <div className={s.statCard.container}>
            <div className={s.statCard.iconContainer}>
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <p className={s.statCard.label}>Total Services</p>
              <h4 className={s.statCard.value}>{totals.totalServices}</h4>
            </div>
          </div>

          {/* Card 2: Total Appointments */}
          <div className={s.statCard.container}>
            <div className={s.statCard.iconContainer}>
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className={s.statCard.label}>Total Bookings</p>
              <h4 className={s.statCard.value}>{totals.totalAppointments}</h4>
            </div>
          </div>

          {/* Card 3: Total Completed */}
          <div className={s.statCard.container}>
            <div className={s.statCard.iconContainer}>
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className={s.statCard.label}>Completed Tests</p>
              <h4 className={s.statCard.value}>{totals.completed}</h4>
            </div>
          </div>

          {/* Card 4: Total Canceled */}
          <div className={s.statCard.container}>
            <div className={s.statCard.iconContainer}>
              <XCircle className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <p className={s.statCard.label}>Canceled Tests</p>
              <h4 className={s.statCard.value}>{totals.canceled}</h4>
            </div>
          </div>

          {/* Card 5: Revenue */}
          <div className={s.statCard.container}>
            <div className={s.statCard.iconContainer}>
              <BadgeIndianRupee className="w-5 h-5" />
            </div>
            <div>
              <p className={s.statCard.label}>Services Revenue</p>
              <h4 className={s.statCard.value}>₹{totals.totalEarnings.toLocaleString()}</h4>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className={s.search.container}>
          <div className={s.search.inputContainer}>
            <Search className="w-4 h-4 text-emerald-500" />
            <input
              type="text"
              placeholder="Search diagnostic tests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={s.search.input}
            />
          </div>
        </div>

        {/* Services Listings Table */}
        <div className={s.table.container}>
          {error && (
            <div className={s.states.error}>
              <AlertCircle className="w-6 h-6 mx-auto mb-1 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className={s.states.loading}>
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-600 mx-auto mb-2"></div>
              <span>Fetching diagnostics records...</span>
            </div>
          ) : visibleServices.length === 0 ? (
            <div className={s.states.empty}>
              No diagnostic test records configured yet.
            </div>
          ) : (
            <div className={s.table.body}>
              
              {/* Desktop Header */}
              <div className={s.table.headerLg}>
                <div className="col-span-4 text-left font-bold text-emerald-800">Diagnostic Service</div>
                <div className="col-span-2 text-right font-bold text-emerald-800">Unit Price</div>
                <div className="col-span-1.5 text-center font-bold text-emerald-800">Total Bookings</div>
                <div className="col-span-1.5 text-center font-bold text-emerald-800">Completed</div>
                <div className="col-span-1.5 text-center font-bold text-emerald-800">Canceled</div>
                <div className="col-span-1.5 text-right font-bold text-emerald-800">Total Revenue</div>
              </div>

              {/* Rows Mapping */}
              {visibleServices.map((svc) => {
                const earning = svc.completed * svc.price;
                return (
                  <div key={svc.id} className={s.table.row}>
                    
                    {/* Desktop View */}
                    <div className={s.table.desktopView}>
                      <div className="col-span-4 flex items-center gap-3">
                        <img
                          src={svc.image}
                          alt={svc.name}
                          className={s.table.desktopImage}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "https://images.unsplash.com/photo-1579684389782-64d84b5e901a?auto=format&fit=crop&q=80&w=150";
                          }}
                        />
                        <span className={s.table.desktopServiceName}>{svc.name}</span>
                      </div>
                      <div className="col-span-2 text-right font-semibold text-slate-700">
                        {formatCurrency(svc.price)}
                      </div>
                      <div className="col-span-1.5 text-center font-semibold text-slate-700">
                        {svc.totalAppointments}
                      </div>
                      <div className="col-span-1.5 text-center font-bold text-emerald-600">
                        {svc.completed}
                      </div>
                      <div className="col-span-1.5 text-center font-semibold text-rose-500">
                        {svc.canceled}
                      </div>
                      <div className="col-span-1.5 text-right font-extrabold text-emerald-800">
                        {formatCurrency(earning)}
                      </div>
                    </div>

                    {/* Tablet View */}
                    <div className={s.table.tabletView}>
                      <div className="col-span-2 flex items-center gap-3">
                        <img src={svc.image} alt={svc.name} className={s.table.tabletImage} />
                        <div className={s.table.tabletTextContainer}>
                          <h3 className={s.table.tabletServiceName}>{svc.name}</h3>
                          <span className={s.table.tabletPrice}>{formatCurrency(svc.price)}</span>
                        </div>
                      </div>
                      <div className={s.table.tabletCell}>Bookings: {svc.totalAppointments}</div>
                      <div className={s.table.tabletCell + " text-emerald-600 font-bold"}>Done: {svc.completed}</div>
                      <div className={s.table.tabletCell + " text-rose-500"}>Cancel: {svc.canceled}</div>
                      <div className="text-right font-bold text-emerald-800">{formatCurrency(earning)}</div>
                    </div>

                    {/* Mobile View */}
                    <div className={s.table.mobileView}>
                      <div className="flex items-start gap-3">
                        <img src={svc.image} alt={svc.name} className={s.table.mobileImage} />
                        <div className="flex-grow min-w-0">
                          <div className={s.table.mobileServiceHeader}>
                            <h3 className={s.table.mobileServiceName}>{svc.name}</h3>
                            <span className="font-semibold text-xs text-slate-700">{formatCurrency(svc.price)}</span>
                          </div>
                          
                          <div className={s.table.mobileStatsContainer}>
                            <span className="bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                              Booked: {svc.totalAppointments}
                            </span>
                            <span className="bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 text-emerald-700 flex items-center gap-1">
                              Done: {svc.completed}
                            </span>
                            <span className="bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 text-rose-600 flex items-center gap-1">
                              Cancel: {svc.canceled}
                            </span>
                            <span className="bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 font-bold text-emerald-800">
                              Earnings: {formatCurrency(earning)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

          {/* Show More toggle */}
          {filtered.length > visibleServices.length && (
            <div className={s.showMore.container}>
              <button
                onClick={() => setShowAll(true)}
                className={s.showMore.button}
              >
                Show All Analytics
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
