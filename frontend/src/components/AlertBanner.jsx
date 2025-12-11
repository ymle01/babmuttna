import React from "react";

const AlertBanner = ({ open, title, desc, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed left-1/2 top-2 sm:top-4 z-[1000] w-[min(95vw,740px)] -translate-x-1/2 px-2 sm:px-0">
      <div className="rounded-lg sm:rounded-xl border border-red-300 bg-gradient-to-r from-red-50 to-red-100/90 backdrop-blur p-3 sm:p-5 text-red-800 shadow-xl relative">
        <div className="flex items-start gap-2 sm:gap-3">
          <div className="text-xl sm:text-2xl leading-none mt-0.5 flex-shrink-0">⚠️</div>
          <div className="flex-1 min-w-0 pr-16 sm:pr-20">
            <p className="font-bold text-sm sm:text-[16px]">{title || "안내"}</p>
            {desc && <p className="text-xs sm:text-sm mt-1 leading-relaxed">{desc}</p>}
          </div>

          {/* 닫기 버튼 - 오른쪽 상단 */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-[13px] font-semibold text-red-700 bg-white/70 border border-red-200 rounded-md shadow-sm hover:bg-red-100 hover:text-red-800 transition-all"
            aria-label="닫기"
            title="닫기"
          >
            <span className="hidden sm:inline">닫기 </span>✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertBanner;

