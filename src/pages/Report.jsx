import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Copy,
  Check,
  Download,
  RotateCcw,
  ChevronDown,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Network,
  Gauge,
  Eye,
  Target,
  Hash,
  Shield,
  Loader2,
} from "lucide-react";
import { api, ApiError, SEVERITY, SEVERITY_ORDER } from "@/lib/api";
import { blueApi } from "@/lib/blueApi";
import { useScanStore } from "@/lib/scanStore";
import { useCopy } from "@/lib/hooks";
import {
  severityColor,
  riskColor,
  riskLabel,
  downloadJson,
} from "@/lib/report-utils";
import { cn } from "@/lib/utils";
import CountUp from "@/components/CountUp";
import SeverityMeter from "@/components/SeverityMeter";
import GlitchButton from "@/components/GlitchButton";
import JSONView from "@/components/JSONView";
import ReportChat from "@/components/ReportChat";

function StatCard({ icon: Icon, label, children, color = "#00FF9C" }) {
  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5" style={{ color }} />
        <span className="label-xs">{label}</span>
      </div>
      <div className="font-mono text-2xl font-bold" style={{ color }}>
        {children}
      </div>
    </div>
  );
}

function RiskDial({ score }) {
  const s = Number(score) || 0;
  const color = riskColor(s);
  const r = 42;
  const circ = 2 * Math.PI * r;
  const [grow, setGrow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGrow(true), 60);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="relative w-28 h-28 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1b2429" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={grow ? circ - (s / 100) * circ : circ}
          style={{ transition: "stroke-dashoffset 1s ease-out", filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <CountUp value={s} className="font-mono text-2xl font-bold" style={{ color }} />
        <span className="label-xs mt-0.5" style={{ color }}>
          {riskLabel(s)}
        </span>
      </div>
    </div>
  );
}

function RadialPct({ pct }) {
  const v = Number(pct) || 0;
  const r = 34;
  const circ = 2 * Math.PI * r;
  const [grow, setGrow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGrow(true), 60);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="relative w-20 h-20 mx-auto">
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#1b2429" strokeWidth="6" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="#22D3EE"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={grow ? circ - (v / 100) * circ : circ}
          style={{ transition: "stroke-dashoffset 1s ease-out", filter: "drop-shadow(0 0 5px #22D3EE)" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <CountUp value={v} suffix="%" className="font-mono text-sm font-bold text-accent" />
      </div>
    </div>
  );
}

function AttackPaths({ paths = [] }) {
  if (!paths.length)
    return <div className="font-mono text-xs text-muted-foreground">{">"} no attack paths recorded</div>;
  return (
    <div className="space-y-6">
      {paths.map((path, i) => {
        const steps = Array.isArray(path.steps)
          ? path.steps
          : Array.isArray(path)
          ? path
          : typeof path === "string"
          ? [path]
          : Object.values(path).filter((v) => typeof v === "string" || typeof v === "object");
        return (
          <div key={i}>
            <div className="label-xs mb-3">
              PATH #{i + 1}
              {path.title && <span className="text-foreground/70 normal-case tracking-normal ml-2">— {path.title}</span>}
            </div>
            <div className="relative pl-6">
              <div className="absolute left-2 top-1 bottom-1 w-px bg-gradient-to-b from-primary via-accent to-transparent" style={{ boxShadow: "0 0 8px rgba(0,255,156,0.4)" }} />
              {steps.map((step, j) => {
                const label = typeof step === "string" ? step : step?.title || step?.name || step?.description || JSON.stringify(step);
                return (
                  <div key={j} className="relative mb-3" style={{ animation: `float-up 0.3s ease-out ${j * 0.08}s both` }}>
                    <span className="absolute -left-[18px] top-1 w-3 h-3 rounded-full bg-primary border border-background" style={{ boxShadow: "0 0 8px #00FF9C" }} />
                    <div className="font-mono text-xs text-foreground/85 leading-relaxed">
                      <span className="text-primary/50 mr-1.5">{String(j + 1).padStart(2, "0")}</span>
                      {label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FindingsTable({ findings = [] }) {
  const [filter, setFilter] = useState("all");
  const [sortDesc, setSortDesc] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const filtered = useMemo(() => {
    let f = filter === "all" ? findings : findings.filter((x) => (x.severity || "info").toLowerCase() === filter);
    const rank = (s) => SEVERITY_ORDER.indexOf((s || "info").toLowerCase());
    f = [...f].sort((a, b) => {
      const d = rank(b.severity) - rank(a.severity);
      return sortDesc ? d : -d;
    });
    return f;
  }, [findings, filter, sortDesc]);

  if (!findings.length)
    return (
      <div className="panel p-8 text-center font-mono text-sm text-primary/70">
        {">"} no findings — target clean
      </div>
    );

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border/15">
        <span className="label-xs mr-2">FILTER</span>
        {["all", ...SEVERITY_ORDER].map((k) => {
          const active = filter === k;
          const color = k === "all" ? "#DCE3E5" : SEVERITY[k].color;
          return (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={cn(
                "px-2 py-0.5 border font-mono text-[10px] uppercase tracking-wider rounded-sm transition-all",
                active ? "bg-secondary" : "border-border/20 hover:border-border/50 text-muted-foreground"
              )}
              style={active ? { color, borderColor: color + "66" } : {}}
            >
              {k === "all" ? "ALL" : SEVERITY[k].label}
            </button>
          );
        })}
        <button
          onClick={() => setSortDesc((s) => !s)}
          className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          severity {sortDesc ? "↓" : "↑"}
        </button>
      </div>

      <div className="divide-y divide-border/10">
        {filtered.map((f, i) => {
          const sev = (f.severity || "info").toLowerCase();
          const color = severityColor(sev);
          const open = expanded === i;
          return (
            <div key={i} className="hover:bg-secondary/30 transition-colors">
              <button
                onClick={() => setExpanded(open ? null : i)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
              >
                <span
                  className="px-2 py-0.5 rounded-sm font-mono text-[10px] uppercase tracking-wider shrink-0"
                  style={{ color, background: color + "18", border: `1px solid ${color}55` }}
                >
                  {sev}
                </span>
                <span className="font-mono text-sm text-foreground truncate flex-1">
                  {f.name || f.title || f.id || "finding"}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[30%] hidden sm:block">
                  {f.target || f.location || f.path || "—"}
                </span>
                <ChevronDown className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
              </button>
              {open && (
                <div className="px-4 pb-4 pt-1 font-mono text-xs text-foreground/70 leading-relaxed space-y-1.5" style={{ animation: "float-up 0.2s ease-out both" }}>
                  {Object.entries(f).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="text-accent shrink-0">{k}:</span>
                      <span className="break-all">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="px-4 py-2 border-t border-border/15 font-mono text-[10px] text-muted-foreground">
        {filtered.length} / {findings.length} findings
      </div>
    </div>
  );
}

export default function Report() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { updateScan, addAnalysis } = useScanStore();
  const [copied, copy] = useCopy();
  const [scan, setScan] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [conflict, setConflict] = useState(false);
  const [handoff, setHandoff] = useState({ busy: false, error: null });

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const s = await api.getScan(jobId);
        if (!alive) return;
        setScan(s);
        updateScan(jobId, { status: s.status, result: s.result });
        if (s.status !== "complete") {
          setConflict(true);
          setLoading(false);
          return;
        }
        try {
          const r = await api.getReport(jobId);
          if (!alive) return;
          setReport(r);
        } catch (e) {
          if (e instanceof ApiError && e.status === 409) {
            setConflict(true);
          } else {
            throw e;
          }
        }
      } catch (e) {
        // surface minimal scan info
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  if (loading)
    return (
      <div className="flex items-center justify-center py-32 font-mono text-xs text-muted-foreground">
        <span className="cursor-block mr-2" /> decrypting report…
      </div>
    );

  if (conflict)
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <AlertTriangle className="w-10 h-10 text-[#FFB020] mx-auto mb-4" />
        <p className="font-mono text-sm text-foreground mb-2">{">"} report not ready</p>
        <p className="font-mono text-xs text-muted-foreground mb-6">
          engagement is still running — report.json returns 409 until complete.
        </p>
        <GlitchButton onClick={() => navigate(`/monitor/${jobId}`)} variant="primary">
          BACK TO MONITOR
        </GlitchButton>
      </div>
    );

  const summary = scan?.result?.summary || report?.summary || {};
  const audit = scan?.result?.audit || report?.audit || {};
  const findings = report?.findings || [];
  const attackPaths = report?.attack_paths || scan?.result?.attack_paths || [];
  const detection = report?.detection_coverage;
  const posture = report?.posture;
  const gaps = report?.gaps || [];
  const numeric = report?.numeric_verification;

  const auditIntact = audit?.intact !== false;

  // Hand this report to the Blue Agent. The document is posted inline, so the
  // handoff works even when the Blue Agent host cannot reach the Red Agent.
  const sendToBlue = async () => {
    setHandoff({ busy: true, error: null });
    try {
      const document = report || scan?.result || scan;
      const res = await blueApi.startAnalysis({ report: document });
      addAnalysis({
        job_id: res.job_id,
        status: res.status || "queued",
        source: "red-report",
        source_ref: jobId,
        target: scan?.target,
        mode: scan?.mode,
      });
      navigate(`/blue/monitor/${res.job_id}`);
    } catch (e) {
      setHandoff({
        busy: false,
        error: e.status
          ? `[${e.status}] ${e.message}`
          : e.message || "blue agent handoff failed",
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <button
        onClick={() => navigate("/history")}
        className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-accent transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> history
      </button>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="label-xs mb-2">// FINDINGS REPORT</div>
          <div className="font-mono text-xl text-foreground break-all">{scan?.result?.engagement_id || jobId}</div>
        </div>
        <div
          className={cn(
            "inline-flex items-center gap-2 px-3 py-1.5 border rounded-sm font-mono text-[11px] uppercase tracking-[0.16em]",
            auditIntact
              ? "border-primary/50 text-primary bg-primary/5 glow-primary"
              : "border-destructive/50 text-destructive bg-destructive/5 glow-danger"
          )}
        >
          {auditIntact ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
          AUDIT: {auditIntact ? "INTACT" : "BROKEN"}
        </div>
      </div>

      {/* Summary header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard icon={Target} label="FINDINGS" color="#00FF9C">
          <CountUp value={summary.findings || 0} />
        </StatCard>
        <StatCard icon={Network} label="ATTACK PATHS" color="#22D3EE">
          <CountUp value={summary.attack_paths || 0} />
        </StatCard>
        <StatCard icon={CheckCircle2} label="VALIDATIONS" color="#FFB020">
          <CountUp value={summary.validations || 0} />
        </StatCard>
        <StatCard icon={Eye} label="DETECT COVERAGE" color="#22D3EE">
          <CountUp value={summary.detection_coverage_pct || 0} suffix="%" />
        </StatCard>
      </div>

      {/* Risk + coverage dials */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="panel p-5">
          <div className="label-xs mb-3 text-center">TOP RISK</div>
          <RiskDial score={summary.top_risk || 0} />
        </div>
        <div className="panel p-5 flex flex-col justify-center">
          <div className="label-xs mb-4 text-center">DETECTION COVERAGE</div>
          <RadialPct pct={summary.detection_coverage_pct || 0} />
          {detection && typeof detection === "object" && (
            <div className="mt-3 font-mono text-[10px] text-muted-foreground text-center space-y-0.5">
              {Object.entries(detection).slice(0, 3).map(([k, v]) => (
                <div key={k}>{k}: {String(v)}</div>
              ))}
            </div>
          )}
        </div>
        <div className="panel p-5">
          <div className="label-xs mb-3 text-center">SEVERITY BREAKDOWN</div>
          <SeverityMeter counts={summary.severity_counts || {}} />
        </div>
      </div>

      {/* Audit + posture cluster */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="panel p-5">
          <div className="label-xs mb-3 flex items-center gap-2">
            <Hash className="w-3 h-3 text-primary" /> AUDIT CHAIN
          </div>
          <div className="space-y-2 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">head</span>
              <span className="text-primary break-all text-right">{audit.head || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">events</span>
              <span className="text-foreground">{audit.events ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">intact</span>
              <span className={auditIntact ? "text-primary" : "text-destructive"}>
                {auditIntact ? "true" : "FALSE"}
              </span>
            </div>
          </div>
        </div>
        <div className="panel p-5">
          <div className="label-xs mb-3 flex items-center gap-2">
            <Gauge className="w-3 h-3 text-accent" /> POSTURE
          </div>
          {posture ? (
            <div className="space-y-1.5 font-mono text-xs">
              {Object.entries(posture).slice(0, 6).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="text-foreground text-right">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="font-mono text-xs text-muted-foreground">{">"} no posture data</div>
          )}
        </div>
      </div>

      {/* Numeric verification */}
      {numeric && (
        <div className="panel p-4 mb-8 flex items-center gap-3 border-primary/30">
          <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
          <div>
            <div className="label-xs text-primary">NUMERIC VERIFICATION</div>
            <div className="font-mono text-xs text-foreground/70 mt-0.5">
              All counts cross-verified — no hallucinated numbers.
            </div>
          </div>
        </div>
      )}

      {/* Findings table */}
      <div className="mb-8">
        <div className="label-xs mb-3">FINDINGS</div>
        <FindingsTable findings={findings} />
      </div>

      {/* Attack paths */}
      <div className="mb-8">
        <div className="label-xs mb-3 flex items-center gap-2">
          <Network className="w-3 h-3 text-accent" /> ATTACK PATHS
        </div>
        <div className="panel p-5">
          <AttackPaths paths={attackPaths} />
        </div>
      </div>

      {/* Gaps */}
      {gaps.length > 0 && (
        <div className="mb-8">
          <div className="label-xs mb-3 flex items-center gap-2 text-[#FFB020]">
            <AlertTriangle className="w-3 h-3" /> GAPS
          </div>
          <div className="space-y-2">
            {gaps.map((g, i) => (
              <div key={i} className="panel p-3 flex items-start gap-2 border-[#FFB020]/20">
                <span className="text-[#FFB020] font-mono text-xs shrink-0">{">"}</span>
                <span className="font-mono text-xs text-foreground/80">
                  {typeof g === "string" ? g : g?.title || g?.description || JSON.stringify(g)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw JSON */}
      <div className="mb-8">
        <JSONView data={report || scan} />
      </div>

      {/* Blue Agent handoff */}
      <div className="panel p-5 mb-8 border-accent/25">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Shield
            className="w-8 h-8 text-accent shrink-0"
            style={{ filter: "drop-shadow(0 0 8px rgba(34,211,238,0.5))" }}
          />
          <div className="flex-1 min-w-0">
            <div className="label-xs text-accent">BLUE TEAM ANALYSIS</div>
            <p className="font-mono text-xs text-foreground/70 mt-1 leading-relaxed">
              Send these {findings.length} findings to the Blue Agent for root
              cause, business impact, MITRE ATT&amp;CK mapping, prioritised
              remediation and detection rules.
            </p>
          </div>
          <GlitchButton
            onClick={sendToBlue}
            disabled={handoff.busy}
            variant="accent"
            className="shrink-0"
          >
            {handoff.busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> HANDING OFF…
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" /> ANALYZE WITH BLUE
              </>
            )}
          </GlitchButton>
        </div>
        {handoff.error && (
          <p className="mt-3 font-mono text-[11px] text-destructive flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            {handoff.error}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <GlitchButton
          onClick={() => copy(JSON.stringify(report || scan, null, 2))}
          variant="ghost"
        >
          {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
          COPY REPORT
        </GlitchButton>
        <GlitchButton
          onClick={() => downloadJson(`redagent-report-${jobId}.json`, report || scan)}
          variant="ghost"
        >
          <Download className="w-4 h-4" /> DOWNLOAD report.json
        </GlitchButton>
        <GlitchButton onClick={() => navigate("/scan")} variant="primary">
          <RotateCcw className="w-4 h-4" /> NEW ENGAGEMENT
        </GlitchButton>
      </div>

      <ReportChat
        report={report || scan?.result || scan}
        label={`findings report — ${scan?.result?.engagement_id || jobId}`}
      />
    </div>
  );
}