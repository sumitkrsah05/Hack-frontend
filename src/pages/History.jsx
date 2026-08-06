import React from "react";
import { useNavigate } from "react-router-dom";
import { Clock, ArrowRight } from "lucide-react";
import { useScanStore } from "@/lib/scanStore";
import StatusBadge from "@/components/StatusBadge";

function timeAgo(ts) {
  if (!ts) return "—";
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function History() {
  const { history } = useScanStore();
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="label-xs mb-3">// SESSION HISTORY</div>
      <h1 className="font-mono font-bold text-2xl text-foreground mb-1">
        Engagements
      </h1>
      <p className="font-mono text-xs text-muted-foreground mb-8">
        Scans launched this session — stored locally on this device.
      </p>

      {history.length === 0 ? (
        <div className="panel p-12 text-center">
          <Clock className="w-8 h-8 text-muted-foreground/50 mx-auto mb-3" />
          <p className="font-mono text-sm text-muted-foreground">
            {">"} no engagements yet
          </p>
          <button
            onClick={() => navigate("/scan")}
            className="mt-4 font-mono text-xs uppercase tracking-wider text-primary hover:text-glow-primary"
          >
            initiate first scan →
          </button>
        </div>
      ) : (
        <div className="panel divide-y divide-border/10">
          {history.map((s) => (
            <button
              key={s.job_id}
              onClick={() =>
                navigate(
                  s.status === "complete"
                    ? `/report/${s.job_id}`
                    : `/monitor/${s.job_id}`
                )
              }
              className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-secondary/30 transition-colors text-left group"
            >
              <div className="shrink-0">
                <StatusBadge status={s.status} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-xs text-accent truncate">
                  {s.job_id}
                </div>
                <div className="font-mono text-[11px] text-muted-foreground mt-0.5 truncate">
                  {String(s.mode || "—").replace("_", "-")} · {s.input || "—"}
                </div>
              </div>
              <div className="font-mono text-[10px] text-muted-foreground/70 shrink-0 hidden sm:block">
                {timeAgo(s.ts)}
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}