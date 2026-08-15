import React from "react";

export default class PlayerErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[Video Crash]:", error);
    console.error("[Video Crash Info]:", errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-[1.75rem] bg-slate-950 text-white p-8 min-h-[280px] border border-red-500/30">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm font-bold text-red-400 text-center">
            حدث خطأ أثناء تحميل مشغل الفيديو
          </p>
          <p className="text-[11px] text-slate-400 text-center max-w-sm">
            {this.state.error?.message || "Unknown error"}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-5 py-2 rounded-full bg-[#0077B6] hover:bg-[#005f8e] text-white text-xs font-bold transition"
          >
            ↻ إعادة المحاولة
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
