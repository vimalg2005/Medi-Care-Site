import React, { useState, useEffect, useMemo } from "react";
import { 
  Mail, Search, Trash2, Download, RefreshCw, CheckCircle2, 
  XCircle, Users, Calendar, AlertCircle, ToggleLeft, ToggleRight, ArrowUpDown
} from "lucide-react";
import toast from "react-hot-toast";
import { API_BASE } from "../../config.js";

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc"); // "desc" = newest first, "asc" = oldest first

  // Fetch subscribers from backend
  const fetchSubscribers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/subscribers`);
      const data = await res.json();
      if (res.ok && data.success) {
        setSubscribers(data.subscribers || []);
      } else {
        toast.error(data.message || "Failed to load subscribers.");
      }
    } catch (err) {
      console.error("Subscribers fetch error:", err);
      toast.error("Network error fetching subscribers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, []);

  // Delete subscriber
  const handleDelete = async (id, email) => {
    if (!window.confirm(`Are you sure you want to remove "${email}" from the newsletter list?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/subscribers/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Removed ${email}`);
        setSubscribers((prev) => prev.filter((s) => String(s._id) !== String(id)));
      } else {
        toast.error(data.message || "Failed to delete subscriber.");
      }
    } catch (err) {
      console.error("Delete subscriber error:", err);
      toast.error("Error deleting subscriber.");
    }
  };

  // Toggle active status
  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/subscribers/${id}/status`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || "Status updated");
        setSubscribers((prev) =>
          prev.map((s) =>
            String(s._id) === String(id) ? { ...s, active: !currentStatus } : s
          )
        );
      } else {
        toast.error(data.message || "Failed to update status.");
      }
    } catch (err) {
      console.error("Toggle status error:", err);
      toast.error("Error updating status.");
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (subscribers.length === 0) {
      toast.error("No subscriber data to export.");
      return;
    }

    const headers = ["Email", "Status", "Subscribed Date", "Subscribed Time"];
    const rows = filteredSubscribers.map((s) => {
      const dateObj = s.createdAt ? new Date(s.createdAt) : new Date();
      return [
        `"${s.email}"`,
        s.active !== false ? "Active" : "Inactive",
        `"${dateObj.toLocaleDateString()}"`,
        `"${dateObj.toLocaleTimeString()}"`,
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `medicare_subscribers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Subscriber list exported to CSV!");
  };

  // Filtered & sorted list
  const filteredSubscribers = useMemo(() => {
    return subscribers
      .filter((s) => {
        const matchesSearch = s.email.toLowerCase().includes(searchTerm.toLowerCase());
        if (statusFilter === "active") return matchesSearch && s.active !== false;
        if (statusFilter === "inactive") return matchesSearch && s.active === false;
        return matchesSearch;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
      });
  }, [subscribers, searchTerm, statusFilter, sortOrder]);

  // Summary counts
  const totalCount = subscribers.length;
  const activeCount = subscribers.filter((s) => s.active !== false).length;
  const inactiveCount = totalCount - activeCount;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-emerald-100 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-linear-to-br from-emerald-500 to-green-600 rounded-2xl text-white shadow-md">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
                Newsletter Subscribers
              </h1>
              <p className="text-sm text-slate-500 font-medium">
                Manage registered patients & health insights subscribers
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={fetchSubscribers}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition shadow-2xs cursor-pointer active:scale-95 disabled:opacity-60"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-linear-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold text-sm shadow-md transition cursor-pointer active:scale-95"
            title="Export to CSV"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Subscribers</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3.5 bg-green-50 text-green-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Subscribers</p>
            <p className="text-2xl font-bold text-green-600 mt-0.5">{activeCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Inactive / Paused</p>
            <p className="text-2xl font-bold text-amber-600 mt-0.5">{inactiveCount}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition cursor-pointer"
          >
            <option value="all">All Statuses ({totalCount})</option>
            <option value="active">Active Only ({activeCount})</option>
            <option value="inactive">Inactive Only ({inactiveCount})</option>
          </select>

          <button
            onClick={() => setSortOrder((curr) => (curr === "desc" ? "asc" : "desc"))}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-medium transition cursor-pointer"
            title="Toggle sort order"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">{sortOrder === "desc" ? "Newest First" : "Oldest First"}</span>
          </button>
        </div>
      </div>

      {/* Subscribers Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
            <p className="text-sm font-medium">Loading subscribers...</p>
          </div>
        ) : filteredSubscribers.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-14 h-14 mx-auto mb-4 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
              <Mail className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-700">No Subscribers Found</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto mt-1">
              {searchTerm
                ? `No subscribers matched "${searchTerm}". Try adjusting your search query.`
                : "No patients have subscribed to the newsletter yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 px-6">#</th>
                  <th className="py-4 px-6">Email Address</th>
                  <th className="py-4 px-6">Subscribed Date</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredSubscribers.map((sub, index) => {
                  const dateObj = sub.createdAt ? new Date(sub.createdAt) : null;
                  const formattedDate = dateObj
                    ? dateObj.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "Recent";
                  const formattedTime = dateObj
                    ? dateObj.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "";

                  const isActive = sub.active !== false;

                  return (
                    <tr
                      key={sub._id || index}
                      className="hover:bg-emerald-50/30 transition duration-150"
                    >
                      {/* Index */}
                      <td className="py-4 px-6 text-slate-400 font-mono text-xs">
                        {index + 1}
                      </td>

                      {/* Email */}
                      <td className="py-4 px-6 font-medium text-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {sub.email.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-900">{sub.email}</span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-6 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formattedDate}</span>
                          {formattedTime && (
                            <span className="text-xs text-slate-400 ml-1">({formattedTime})</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => handleToggleStatus(sub._id, isActive)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition hover:opacity-80 active:scale-95 ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                          title={`Click to mark as ${isActive ? "Inactive" : "Active"}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          {isActive ? "Active" : "Inactive"}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleDelete(sub._id, sub.email)}
                          className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer active:scale-95"
                          title="Remove subscriber"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
