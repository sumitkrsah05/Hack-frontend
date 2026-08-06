import { useEffect, useState } from "react";
import { SEVERITY, SEVERITY_ORDER } from "@/lib/api";

export default function SeverityMeter({ counts = {} }) {
  const [grow, setGrow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGrow(true), 40);
    return () => clearTimeout(t);
  }, []);

  const entries = SEVERITY_ORDER.map((k) => ({
    key: k,
    ...SEVERITY[k],
    value: counts[k] || 0,
  }));
  const total = entries.reduce((a, b) => a + b.value, 0);

  return (
    <div className="space-y-2.5">
      {entries.map((e) => {
        const pct = total > 0 ? (e.value / total) * 100 : 0;
        return (
          <div key={e.key} className="flex items-center gap-3">
            <span
              className="w-20 font-mono text-[10px] tracking-[0.16em]"
              style={{ color: e.color }}
            >
              {e.label}
            </span>
            <div className="flex-1 h-2.5 bg-secondary rounded-sm overflow-hidden border border-border/30">
              <div
                className="h-full transition-all duration-700 ease-out"
                style={{
                  width: grow ? `${pct}%` : "0%",
                  background: e.color,
                  boxShadow: `0 0 10px ${e.color}`,
                }}
              />
            </div>
            <span
              className="w-8 text-right font-mono text-sm"
              style={{ color: e.color }}
            >
              {e.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}