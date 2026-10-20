import React, { useState, useEffect, useMemo } from "react";
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  User,
  Phone,
  BookOpen,
  AlertCircle,
  RefreshCw,
  Unlock,
  Filter,
  Check,
  X,
  Send
} from "lucide-react";
import { getAllRetakeRequests, reviewRetakeRequest, unlockStudentExam, subscribeExams } from "../services/courseService.js";

export default function ExamRetakeManager() {
  const [requests, setRequests] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("Pending"); // "Pending" | "Approved" | "Rejected" | "All"
  const [searchQuery, setSearchQuery] = useState("");

  // Quick unlock form
  const [quickPhone, setQuickPhone] = useState("");
  const [quickExamId, setQuickExamId] = useState("");
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickMessage, setQuickMessage] = useState({ text: "", type: "" });

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await getAllRetakeRequests("All");
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading retake requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();

    // Fetch exams for the quick-unlock dropdown
    const unsub = subscribeExams((data) => {
      setExams(Array.isArray(data) ? data : []);
      if (data && data.length > 0 && !quickExamId) {
        setQuickExamId(data[0].id);
      }
    });

    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  const handleReview = async (requestId, action) => {
    try {
      setActionLoadingId(requestId);
      await reviewRetakeRequest(requestId, { action });
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? { ...r, status: action === "approve" ? "Approved" : "Rejected" }
            : r
        )
      );
    } catch (err) {
      alert(err.message || "فشل تنفيذ العملية، حاول مجدداً.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleQuickUnlock = async (e) => {
    e.preventDefault();
    if (!quickPhone.trim()) {
      setQuickMessage({ text: "يرجى إدخال رقم هاتف أو كود الطالب.", type: "error" });
      return;
    }
    if (!quickExamId) {
      setQuickMessage({ text: "يرجى اختيار الامتحان المراد إتاحته.", type: "error" });
      return;
    }

    try {
      setQuickLoading(true);
      setQuickMessage({ text: "", type: "" });
      const res = await unlockStudentExam({
        examId: quickExamId,
        studentPhoneOrId: quickPhone.trim()
      });
      setQuickMessage({
        text: res?.message || `تم فتح الامتحان للطالب بنجاح!`,
        type: "success"
      });
      setQuickPhone("");
      loadRequests();
    } catch (err) {
      setQuickMessage({ text: err.message || "تعذر فتح الامتحان للطالب.", type: "error" });
    } finally {
      setQuickLoading(false);
    }
  };

  // Stats
  const counts = useMemo(() => {
    return {
      pending: requests.filter((r) => r.status === "Pending").length,
      approved: requests.filter((r) => r.status === "Approved").length,
      rejected: requests.filter((r) => r.status === "Rejected").length,
      total: requests.length
    };
  }, [requests]);

  // Filtered
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (activeFilter !== "All" && r.status !== activeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const sName = (r.userName || "").toLowerCase();
        const sPhone = (r.userPhone || "").toLowerCase();
        const eTitle = (r.examTitle || "").toLowerCase();
        return sName.includes(q) || sPhone.includes(q) || eTitle.includes(q);
      }
      return true;
    });
  }, [requests, activeFilter, searchQuery]);

  return (
    <div className="space-y-6 font-['Cairo',_sans-serif]" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0077B6] to-[#00A8E8] text-white flex items-center justify-center shadow-md">
            <RotateCcw size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              طلبات إعادة الامتحانات
            </h2>
            <p className="text-xs font-bold text-slate-500 mt-0.5">
              مراجعة وقبول طلبات الطلاب لإعادة المحاولة، أو فك قفل الامتحان لأي طالب فوراً
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadRequests}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-xs font-black text-slate-700 dark:text-slate-300 transition"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>تحديث الطلبات</span>
        </button>
      </div>

      {/* Quick Unlock Card */}
      <div className="bg-gradient-to-br from-cyan-50/70 via-white to-sky-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80 border border-cyan-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-3 text-[#0077B6] dark:text-[#00A8E8]">
          <Unlock size={20} />
          <h3 className="font-black text-base text-slate-900 dark:text-white">
            إتاحة امتحان لطالب محدد فوراً (بحث برقم الهاتف)
          </h3>
        </div>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-4">
          يمكنك إتاحة محاولة جديدة لأي طالب بدون انتظار طلبه عبر إدخال هاتفه واختيار الامتحان.
        </p>

        <form onSubmit={handleQuickUnlock} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
              رقم هاتف الطالب:
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="مثال: 01501962945"
                value={quickPhone}
                onChange={(e) => setQuickPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 pl-9"
              />
              <Phone size={15} className="absolute left-3 top-3 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
              الامتحان المطلوب إتاحته:
            </label>
            <select
              value={quickExamId}
              onChange={(e) => setQuickExamId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title} {ex.courseTitle ? `(${ex.courseTitle})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={quickLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-black text-xs transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
            >
              {quickLoading ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : (
                <Unlock size={15} />
              )}
              <span>فتح المحاولة للطالب فوراً</span>
            </button>
          </div>
        </form>

        {quickMessage.text && (
          <div
            className={`mt-3 p-3 rounded-xl text-xs font-black flex items-center gap-2 ${
              quickMessage.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-800 dark:text-emerald-200"
                : "bg-rose-50 dark:bg-rose-950/60 border border-rose-300 text-rose-800 dark:text-rose-200"
            }`}
          >
            {quickMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{quickMessage.text}</span>
          </div>
        )}
      </div>

      {/* Stats Counter Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setActiveFilter("Pending")}
          className={`p-4 rounded-2xl border text-right transition ${
            activeFilter === "Pending"
              ? "bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-400"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black">طلبات معلقة</span>
            <Clock size={18} className={activeFilter === "Pending" ? "text-white" : "text-amber-500"} />
          </div>
          <p className="text-2xl font-black">{counts.pending}</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("Approved")}
          className={`p-4 rounded-2xl border text-right transition ${
            activeFilter === "Approved"
              ? "bg-emerald-600 text-white border-emerald-700 shadow-lg shadow-emerald-600/20"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black">تم قبولها</span>
            <CheckCircle2 size={18} className={activeFilter === "Approved" ? "text-white" : "text-emerald-500"} />
          </div>
          <p className="text-2xl font-black">{counts.approved}</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("Rejected")}
          className={`p-4 rounded-2xl border text-right transition ${
            activeFilter === "Rejected"
              ? "bg-rose-600 text-white border-rose-700 shadow-lg shadow-rose-600/20"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-400"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black">تم رفضها</span>
            <XCircle size={18} className={activeFilter === "Rejected" ? "text-white" : "text-rose-500"} />
          </div>
          <p className="text-2xl font-black">{counts.rejected}</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("All")}
          className={`p-4 rounded-2xl border text-right transition ${
            activeFilter === "All"
              ? "bg-slate-800 text-white border-slate-900 shadow-lg shadow-slate-900/20"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-400"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black">إجمالي الطلبات</span>
            <Filter size={18} className={activeFilter === "All" ? "text-white" : "text-slate-500"} />
          </div>
          <p className="text-2xl font-black">{counts.total}</p>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="بحث باسم الطالب أو الهاتف أو الامتحان..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 pl-9"
          />
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "Pending", label: `قيد الانتظار (${counts.pending})` },
            { id: "Approved", label: `المقبولة (${counts.approved})` },
            { id: "Rejected", label: `المرفوضة (${counts.rejected})` },
            { id: "All", label: `الكل (${counts.total})` }
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition ${
                activeFilter === f.id
                  ? "bg-[#0077B6] text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center">
          <RefreshCw size={24} className="animate-spin mx-auto text-[#0077B6] mb-3" />
          <p className="text-xs font-bold text-slate-500">جاري تحميل طلبات الإعادة...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-2">
          <RotateCcw size={32} className="mx-auto text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-black text-slate-700 dark:text-slate-300">
            لا توجد أي طلبات في هذا القسم
          </p>
          <p className="text-xs font-bold text-slate-400">
            عند قيام أي طالب بطلب إعادة الامتحان، ستظهر تفاصيل طلبه هنا مباشرة
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => {
            const isPending = req.status === "Pending";
            const isApproved = req.status === "Approved";
            const isActionBusy = actionLoadingId === req.id;

            return (
              <div
                key={req.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:border-cyan-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <User size={15} className="text-[#0077B6]" />
                      <span>{req.userName || "طالب غير محدد"}</span>
                    </span>

                    {req.userPhone && (
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-black text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <Phone size={11} />
                        <span>{req.userPhone}</span>
                      </span>
                    )}

                    {/* Status Badge */}
                    {isPending ? (
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[11px] font-black flex items-center gap-1 border border-amber-300">
                        <Clock size={11} className="animate-spin" />
                        <span>قيد المراجعة</span>
                      </span>
                    ) : isApproved ? (
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[11px] font-black flex items-center gap-1 border border-emerald-300">
                        <CheckCircle2 size={11} />
                        <span>مقبول ومتاح للطالب</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 text-[11px] font-black flex items-center gap-1 border border-rose-300">
                        <XCircle size={11} />
                        <span>مرفوض</span>
                      </span>
                    )}
                  </div>

                  <div className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <BookOpen size={13} className="text-slate-400" />
                    <span>الامتحان: <strong className="text-slate-900 dark:text-slate-200">{req.examTitle || "امتحان غير معنون"}</strong></span>
                  </div>

                  {req.reason && (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span className="text-slate-400 ml-1">سبب الطلب:</span>
                      <span>"{req.reason}"</span>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock size={11} />
                    <span>
                      تاريخ الطلب: {new Date(req.requestedAt).toLocaleString("ar-EG", { hour12: true })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 w-full md:w-auto shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                  {isPending ? (
                    <>
                      <button
                        type="button"
                        disabled={isActionBusy}
                        onClick={() => handleReview(req.id, "approve")}
                        className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
                      >
                        {isActionBusy ? <RefreshCw size={13} className="animate-spin" /> : <Check size={14} />}
                        <span>قبول وإتاحة الامتحان</span>
                      </button>

                      <button
                        type="button"
                        disabled={isActionBusy}
                        onClick={() => handleReview(req.id, "reject")}
                        className="flex-1 md:flex-none px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-black transition flex items-center justify-center gap-1.5"
                      >
                        <X size={14} />
                        <span>رفض</span>
                      </button>
                    </>
                  ) : isApproved ? (
                    <button
                      type="button"
                      disabled={isActionBusy}
                      onClick={() => handleReview(req.id, "reject")}
                      className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 text-[11px] font-black hover:bg-rose-50"
                    >
                      إلغاء الإتاحة (قفل)
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isActionBusy}
                      onClick={() => handleReview(req.id, "approve")}
                      className="px-3 py-1.5 rounded-xl border border-emerald-200 text-emerald-600 text-[11px] font-black hover:bg-emerald-50"
                    >
                      تغيير إلى قبول
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
