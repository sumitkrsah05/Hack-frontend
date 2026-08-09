import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Clock,
  Loader2,
  RefreshCw,
  Shield,
  Trash2,
  AlertTriangle,
  Blend,
} from "lucide-react";
import TeamBadge from "@/components/TeamBadge";
import { blueApi, riskColorFor } from "@/lib/blueApi";
import { useScanStore } from "@/lib/scanStore";
import { cn } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import ProgressBar from "@/components/ProgressBar";

function when(iso, ts) {
  const t = iso ? Date.parse(iso) : ts;
  if (!t || Number.isNaN(t)) return "—";
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function BlueHistory() {
  const navigate = useNavigate();
  const { analyses, removeAnalysis, blueApiBase } = useScanStore();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const data = await blueApi.listAnalyses(50);
      setRows(data.analyses || []);
      setError(null);
    } catch (e) {
      setError(e.message);
      setRows([]);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, blueApiBase]);

  const forget = async (jobId, e) => {
    e.stopPropagation();
    try {
      await blueApi.deleteAnalysis(jobId);
    } catch {
      // a job the server has already evicted is fine to drop locally
    }
    removeAnalysis(jobId);
    load();
  };

  // The server keeps jobs in memory only, so fall back to this device's
  // record when a restart has wiped the list.
  const list =
    rows && rows.length
      ? rows
      : analyses.map((a) => ({
          job_id: a.job_id,
          status: a.status,
          target: a.target,
          mode: a.mode,
          overall_risk: a.overall_risk,
          created_at: null,
          ts: a.ts,
          local: true,
        }));

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <TeamBadge
            color="#D946EF"
            icon={Blend}
            label="PURPLE TEAM"
            sub="Correlation · Analysis"
            className="mb-3"
          />
          <div className="label-xs mb-3 text-accent"></div>
          <h1 className="font-mono font-bold text-2xl text-foreground mb-1">
            Defensive analyses
          </h1>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-border/30 rounded-sm font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-accent hover:border-accent/40 transition-colors"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", busy && "animate-spin")} />
          refresh
        </button>
      </div>
      <p className="font-mono text-xs text-muted-foreground mb-8">
        Served by {blueApiBase} — job state is in-memory, so a Blue Agent
        restart clears it.
      </p>

      {error && (
        <div className="mb-6 p-3 border border-destructive/40 bg-destructive/5 rounded-sm font-mono text-xs text-destructive flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {rows === null ? (
        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin text-accent" /> loading
          analyses…
        </div>
      ) : list.length === 0 ? (
        <div className="panel p-12 text-center">
          <Clock className="w-8 h-8 text-muted-foreground/50 mx-auto mb-3" />
          <p className="font-mono text-sm text-muted-foreground">
            {">"} no analyses yet
          </p>
          <button
            onClick={() => navigate("/blue")}
            className="mt-4 font-mono text-xs uppercase tracking-wider text-accent hover:text-glow-accent"
          >
            run the first analysis →
          </button>
        </div>
      ) : (
        <div className="panel divide-y divide-border/10">
          {list.map((a) => {
            const running = ["queued", "running"].includes(a.status);
            const color = riskColorFor(a.overall_risk);
            return (
              <div
                key={a.job_id}
                className="flex items-center gap-2 px-2 hover:bg-secondary/30 transition-colors group"
              >
                <button
                  onClick={() =>
                    navigate(
                      a.status === "completed"
                        ? `/blue/report/${a.job_id}`
                        : `/blue/monitor/${a.job_id}`
                    )
                  }
                  className="flex-1 min-w-0 flex items-center gap-4 px-2 py-3.5 text-left"
                >
                  <div className="shrink-0">
                    <StatusBadge status={a.status} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-xs text-accent truncate">
                      {a.job_id}
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground mt-0.5 truncate">
                      {a.target || "—"} ·{" "}
                      {String(a.mode || "—").replace("_", "-")}
                      {a.local && " · local record"}
                    </div>
                    {running && a.progress && (
                      <div className="mt-2 max-w-xs">
                        <ProgressBar
                          percent={a.progress.percent}
                          indeterminate={!a.progress.total}
                        />
                      </div>
                    )}
                  </div>
                  {a.overall_risk && (
                    <span
                      className="px-2 py-0.5 rounded-sm font-mono text-[10px] uppercase tracking-wider shrink-0 hidden sm:block"
                      style={{
                        color,
                        background: color + "18",
                        border: `1px solid ${color}55`,
                      }}
                    >
                      {a.overall_risk}
                    </span>
                  )}
                  <span className="font-mono text-[10px] text-muted-foreground/70 shrink-0 hidden md:block">
                    {when(a.created_at, a.ts)}
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors shrink-0" />
                </button>
                <button
                  onClick={(e) => forget(a.job_id, e)}
                  title="forget this analysis and delete its artefacts"
                  className="shrink-0 p-2 text-muted-foreground/60 hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={() => navigate("/blue")}
        className="mt-8 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-accent hover:text-glow-accent"
      >
       
      </button>
    </div>
  );
}
