import React from "react";

interface LoadingSpinnerProps {
  text?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({
  text = "Loading workspace...",
  fullScreen = false,
}: LoadingSpinnerProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center ${
        fullScreen
          ? "min-h-screen bg-slate-50 dark:bg-slate-950"
          : "min-h-[50vh] py-16"
      }`}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent shadow-xs" />
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium animate-pulse">
          {text}
        </p>
      </div>
    </div>
  );
}
