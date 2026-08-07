import React from "react";

// Determinate progress bar; falls back to an indeterminate shimmer while the
// job has not reported a total yet (BlueAgent sends total: null until parse).
export default function ProgressBar({
  percent,
  indeterminate = false,
  color = "#22D3EE",
}) {
  const pct = Math.max(0, Math.min(100, Number(percent) || 0));
  return (
    <div className="h-2 w-full bg-secondary rounded-sm overflow-hidden border border-border/30">
      {indeterminate ? (
        <div
          className="h-full w-1/3"
          style={{
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
            boxShadow: `0 0 10px ${color}`,
            animation: "sweep-x 1.4s ease-in-out infinite",
          }}
        />
      ) : (
        <div
          className="h-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: `0 0 10px ${color}`,
          }}
        />
      )}
    </div>
  );
}
