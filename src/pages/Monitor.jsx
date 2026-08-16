import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Copy, Check, ArrowLeft, RotateCcw, Radio } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useScanStore } from "@/lib/scanStore";
import { useInterval, useCopy } from "@/lib/hooks";
import { progressLinesForMode } from "@/lib/report-utils";
import StatusBadge from "@/components/StatusBadge";
import TerminalLog from "@/components/TerminalLog";
import GlitchButton from "@/components/GlitchButton";

function Radar({ active }) {
  if (!active) return null;
  return (
    <div className="relative w-24 h-24 mx-auto">
      <div className="absolute inset-0 rounded-full border border-primary/30" />
      <div className="absolute inset-3 rounded-full border border-primary/20" />
      <div className="absolute inset-6 rounded-full border border-primary/10" />
      <div className="absolute left-1/2 top-1/2 w-px h-1/2 bg-primary/40 origin-top" />
      <div
        className="radar-sweep absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, hsl(var(--primary)/0.35), transparent 90deg)",
          maskImage: "radial-gradient(circle, black 60%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(circle, black 60%, transparent 70%)",
        }}
      />
      <div className="absolute left-1/2 top-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary animate-pulse" />
    </div>
  );
}

export default function Monitor() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { updateScan, history } = useScanStore();
  const [copied, copy] = useCopy();

  const existing = history.find((s) => s.job_id === jobId);
  const [scan, setScan] = useState(
    existing || { job_id: jobId, status: "queued", mode: "—" }
  );
  const [lines, setLines] = useState([]);
  const [error, setError] = useState(null);
  const linePool = useRef([]);
  const lineIdx = useRef(0);
  const lastStatus = useRef(null);
  const initialFetched = useRef(false);

  const pushLine = useCallback((text, type = "info") => {
    setLines((prev) => [...prev.slice(-200), { text, type }]);
  }, []);

  useEffect(() => {
    linePool.current = progressLinesForMode(
      scan.mode !== "—" ? scan.mode : "black_box"
    );
  }, [scan.mode]);

  const poll = useCallback(async () => {
    try {
      const data = await api.getScan(jobId);
      setError(null);
      setScan(data);
      updateScan(jobId, { status: data.status, result: data.result });

      if (lastStatus.current !== data.status) {
        const prev = lastStatus.current;
        lastStatus.current = data.status;
        if (data.status === "running" && prev !== "running") {
          pushLine(`> status: ${data.status.toUpperCase()} — engines engaged`, "warn");
        } else if (data.status === "complete") {
          pushLine("> status: COMPLETE — finalizing report", "success");
          pushLine(`> audit head: ${data.result?.audit?.head || "—"}`, "success");
          pushLine("> fetching full report bundle…", "success");
          setTimeout(() => navigate(`/report/${jobId}`), 900);
        } else if (data.status === "error" || data.status === "interrupted") {
          pushLine(`> status: ${data.status.toUpperCase()} — aborted`, "error");
          setError(data.message || `engagement ${data.status}`);
        } else if (data.status === "queued") {
          pushLine("> status: QUEUED — awaiting scheduler", "info");
        }
      }

      if (data.status === "running") {
        if (lineIdx.current < linePool.current.length) {
          pushLine(linePool.current[lineIdx.current], "info");
          lineIdx.current++;
        } else {
          pushLine("> … processing", "info");
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
  }, [jobId, navigate, pushLine, updateScan]);

  useEffect(() => {
    if (!initialFetched.current) {
      initialFetched.current = true;
      pushLine(`> engagement ${jobId} acquired`, "success");
      pushLine("> establishing uplink to scanner core…", "info");
      poll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const terminal = ["queued", "running"].includes(scan.status);
  useInterval(poll, terminal ? 3000 : null);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <button
        onClick={() => navigate("/scan")}
        className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-accent transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> new scan
      </button>

      <div className="label-xs mb-2">// LIVE MONITOR</div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="font-mono text-xl text-foreground mb-1">Engagement</div>
          <button
            onClick={() => copy(scan.job_id)}
            className="group inline-flex items-center gap-2 font-mono text-xs text-accent hover:text-primary transition-colors"
          >
            <span className="break-all">{scan.job_id}</span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Copy className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
            )}
          </button>
        </div>
        <StatusBadge status={scan.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="panel p-6 flex flex-col items-center justify-center">
          <Radar active={terminal} />
          <div className="mt-4 text-center">
            <div className="label-xs">MODE</div>
            <div className="font-mono text-sm text-foreground mt-1 uppercase">
              {String(scan.mode).replace("_", "-")}
            </div>
          </div>
        </div>

        <div className="panel md:col-span-2 flex flex-col h-72 md:h-auto">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/15">
            <div className="label-xs flex items-center gap-2">
              <Radio className="w-3 h-3 text-primary animate-pulse" />
              STREAM LOG
            </div>
            <div className="font-mono text-[10px] text-muted-foreground">
              {lines.length} lines
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <TerminalLog lines={lines} active={terminal} />
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 border border-destructive/40 bg-destructive/5 rounded-sm">
          <div className="font-mono text-sm text-destructive mb-3">
            // {scan.status === "error" ? "ENGAGEMENT FAILED" : "INTERRUPTED"}
          </div>
          <p className="font-mono text-xs text-foreground/80 mb-4">{error}</p>
          <div className="flex gap-3">
            <GlitchButton onClick={() => navigate("/scan")} variant="primary">
              <RotateCcw className="w-4 h-4" /> NEW ENGAGEMENT
            </GlitchButton>
            <GlitchButton onClick={poll} variant="ghost">
              RETRY POLL
            </GlitchButton>
          </div>
        </div>
      )}

      {scan.status === "complete" && !error && (
        <div className="mt-6 p-4 border border-primary/40 bg-primary/5 rounded-sm font-mono text-xs text-primary">
          {">"} report ready — redirecting…
        </div>
      )}
    </div>
  );
}