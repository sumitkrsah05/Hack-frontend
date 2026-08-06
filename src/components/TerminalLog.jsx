import { useEffect, useRef } from "react";

export default function TerminalLog({ lines = [], active = false }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines, active]);

  return (
    <div
      ref={ref}
      className="font-mono text-xs leading-relaxed h-full overflow-y-auto p-4 space-y-1"
    >
      {lines.map((l, i) => (
        <div
          key={i}
          className={
            l.type === "error"
              ? "text-destructive"
              : l.type === "success"
              ? "text-primary"
              : l.type === "warn"
              ? "text-[#FFB020]"
              : "text-muted-foreground"
          }
          style={{ animation: "float-up 0.3s ease-out both" }}
        >
          <span className="text-primary/40">
            {String(i + 1).padStart(3, "0")}
          </span>{" "}
          {l.text}
        </div>
      ))}
      {active && (
        <div className="flex items-center gap-1.5 text-primary pt-1">
          <span className="cursor-block" />
          <span className="text-primary/60">streaming</span>
        </div>
      )}
      {lines.length === 0 && !active && (
        <div className="text-muted-foreground/50">// awaiting telemetry…</div>
      )}
    </div>
  );
}