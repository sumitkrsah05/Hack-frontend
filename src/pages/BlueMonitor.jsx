import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Copy,
  RotateCcw,
  Radio,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { ApiError } from "@/lib/api";
import { blueApi } from "@/lib/blueApi";
import { useScanStore } from "@/lib/scanStore";
import { useCopy, useInterval } from "@/lib/hooks";
import StatusBadge from "@/components/StatusBadge";
import TerminalLog from "@/components/TerminalLog";
import ProgressBar from "@/components/ProgressBar";
import GlitchButton from "@/components/GlitchButton";

const STAGE_LINES = [
  "> parsing red agent report",
  "> normalising findings and assets",
  "> loading MITRE ATT&CK technique index",
  "> deriving root cause hypotheses",
  "> scoring likelihood × impact",
  "> drafting remediation horizons",
  "> composing detection rules",
];

export default function BlueMonitor() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { analyses, updateAnalysis } = useScanStore();
  const [copied, copy] = useCopy();

  const existing = analyses.find((a) => a.job_id === jobId);
  const [job, setJob] = useState(
    existing ? { ...existing, status: existing.status } : { job_id: jobId, status: "queued" }
  );
  const [lines, setLines] = useState([]);
  const [error, setError] = useState(null);
  const lastStatus = useRef(null);
  const lastAnalysed = useRef(-1);
  const stageIdx = useRef(0);
  const started = useRef(false);

  const pushLine = useCallback((text, type = "info") => {
    setLines((prev) => [...prev.slice(-200), { text, type }]);
  }, []);

  const poll = useCallback(async () => {
    try {
      const data = await blueApi.getAnalysis(jobId);
      setError(null);
      setJob(data);
      updateAnalysis(jobId, {
        status: data.status,
        target: data.target,
        mode: data.mode,
        overall_risk: data.overall_risk,
        total_findings: data.progress?.total,
      });

      if (lastStatus.current !== data.status) {
        lastStatus.current = data.status;
        if (data.status === "running") {
          pushLine("> status: RUNNING — analysing findings", "warn");
        } else if (data.status === "completed") {
          pushLine(
            `> status: COMPLETED — overall risk ${String(
              data.overall_risk || "—"
            ).toUpperCase()}`,
            "success"
          );
          if (data.metadata?.degraded)
            pushLine("> NOTE: degraded run — heuristic engine used", "warn");
          pushLine("> fetching blue_analysis.json…", "success");
          setTimeout(() => navigate(`/blue/report/${jobId}`), 900);
        } else if (data.status === "error") {
          const msg = data.error?.message || "analysis failed";
          pushLine(`> status: ERROR — ${msg}`, "error");
          setError(msg);
        } else if (data.status === "queued") {
          pushLine("> status: QUEUED — awaiting a worker", "info");
        }
      }

      const analysed = data.progress?.analysed ?? 0;
      const total = data.progress?.total;
      if (data.status === "running") {
        if (analysed !== lastAnalysed.current && total) {
          lastAnalysed.current = analysed;
          pushLine(`> finding ${analysed}/${total} analysed`, "success");
        } else if (stageIdx.current < STAGE_LINES.length) {
          pushLine(STAGE_LINES[stageIdx.current], "info");
          stageIdx.current++;
        } else {
          pushLine("> … waiting on the model", "info");
        }
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError(`unknown job_id: ${jobId}`);
        pushLine(`> ERROR — unknown job_id: ${jobId}`, "error");
      } else {
        pushLine(`> poll retry — ${err.message}`, "warn");
      }
    }
  }, [jobId, navigate, pushLine, updateAnalysis]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    pushLine(`> analysis ${jobId} acquired`, "success");
    pushLine("> uplink to blue agent (:8001) established", "info");
    poll();
  }, [jobId, poll, pushLine]);

  const active = ["queued", "running"].includes(job.status);
  // A 404 means the job is gone — polling it forever is pointless.
  useInterval(poll, active && !error ? 2000 : null);

  const analysed = job.progress?.analysed ?? 0;
  const total = job.progress?.total;
  const percent = job.progress?.percent ?? 0;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <button
        onClick={() => navigate("/blue")}
        className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-accent transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> new analysis
      </button>

      <div className="label-xs mb-2 text-accent">// BLUE ANALYSIS MONITOR</div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="font-mono text-xl text-foreground mb-1 flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" />
            Analysis
          </div>
          <button
            onClick={() => copy(job.job_id || jobId)}
            className="group inline-flex items-center gap-2 font-mono text-xs text-accent hover:text-primary transition-colors"
          >
            <span className="break-all">{job.job_id || jobId}</span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Copy className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
            )}
          </button>
        </div>
        <StatusBadge status={job.status} />
      </div>

      <div className="panel p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="label-xs">FINDINGS ANALYSED</span>
          <span className="font-mono text-xs text-accent">
            {total ? `${analysed} / ${total}` : "parsing report…"}
            {total ? ` · ${percent}%` : ""}
          </span>
        </div>
        <ProgressBar
          percent={percent}
          indeterminate={active && !total}
          color="var(--c-accent)"
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
          {[
            ["TARGET", job.target || "—"],
            ["MODE", String(job.mode || "—").replace("_", "-")],
            ["ENGAGEMENT", job.engagement_id || "—"],
            ["SOURCE", job.source?.kind || existing?.source || "—"],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="label-xs">{k}</div>
              <div className="font-mono text-xs text-foreground/85 mt-1 break-all">
                {v}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel flex flex-col h-80">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/15">
          <div className="label-xs flex items-center gap-2">
            <Radio className="w-3 h-3 text-accent animate-pulse" />
            ANALYSIS LOG
          </div>
          <div className="font-mono text-[10px] text-muted-foreground">
            {lines.length} lines
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <TerminalLog lines={lines} active={active} />
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 border border-destructive/40 bg-destructive/5 rounded-sm">
          <div className="font-mono text-sm text-destructive mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> // ANALYSIS FAILED
          </div>
          <p className="font-mono text-xs text-foreground/80 mb-4 break-all">
            {error}
          </p>
          <div className="flex gap-3">
            <GlitchButton onClick={() => navigate("/blue")} variant="accent">
              <RotateCcw className="w-4 h-4" /> NEW ANALYSIS
            </GlitchButton>
            <GlitchButton onClick={poll} variant="ghost">
              RETRY POLL
            </GlitchButton>
          </div>
        </div>
      )}

      {job.status === "completed" && !error && (
        <div className="mt-6 p-4 border border-accent/40 bg-accent/5 rounded-sm font-mono text-xs text-accent">
          {">"} analysis ready — redirecting…
        </div>
      )}

      <p className="mt-6 font-mono text-[11px] text-muted-foreground leading-relaxed">
        {">"} the model endpoint scales to zero — the first analysis after an
        idle period can take a couple of minutes before the first finding lands.
      </p>
    </div>
  );
}
