import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileText,
  Gauge,
  Layers,
  Radar,
  RotateCcw,
  Shield,
  ShieldAlert,
  Siren,
  Stethoscope,
  Target,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { ApiError } from "@/lib/api";
import {
  blueApi,
  BLUE_SEVERITY,
  BLUE_SEVERITY_ORDER,
  HORIZON,
  HORIZON_ORDER,
  PRIORITY,
  PRIORITY_ORDER,
  priorityColor,
  riskColorFor,
  riskScoreColor,
} from "@/lib/blueApi";
import { useScanStore } from "@/lib/scanStore";
import { useCopy } from "@/lib/hooks";
import { downloadJson } from "@/lib/report-utils";
import { cn } from "@/lib/utils";
import CountUp from "@/components/CountUp";
import SeverityMeter from "@/components/SeverityMeter";
import GlitchButton from "@/components/GlitchButton";
import JSONView from "@/components/JSONView";

function useRecDecisions(jobId) {
  const storageKey = `blue-rec-decisions:${jobId}`;
  const [decisions, setDecisions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey)) || {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      setDecisions(JSON.parse(localStorage.getItem(storageKey)) || {});
    } catch {
      setDecisions({});
    }
  }, [storageKey]);

  const decide = (key, value) => {
    setDecisions((prev) => {
      const next = { ...prev };
      if (value) next[key] = value;
      else delete next[key];
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // storage full / unavailable — decisions still apply for this session
      }
      return next;
    });
  };

  return [decisions, decide];
}

function ConfirmDecisionModal({ pending, onConfirm, onCancel }) {
  useEffect(() => {
    if (!pending) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [pending]);

  if (!pending) return null;
  const accepting = pending.value === "accepted";
  const color = accepting ? "#00FF9C" : "#FF2E63";
  const Icon = accepting ? Check : X;
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div
        className="panel relative w-full max-w-sm p-5"
        style={{ borderColor: color + "55", animation: "float-up 0.15s ease-out both" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-3">
          <Icon className="w-4 h-4" style={{ color }} />
          <span
            className="font-mono text-xs uppercase tracking-[0.14em]"
            style={{ color }}
          >
            confirm {accepting ? "accept" : "reject"}
          </span>
        </div>
        <p className="font-mono text-xs text-foreground/80 leading-relaxed mb-5">
          {accepting
            ? "mark this recommendation as accepted?"
            : "mark this recommendation as rejected?"}
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 border border-border/30 rounded-sm font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:border-border/60 hover:text-foreground transition-all"
          >
            cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 border rounded-sm font-mono text-[11px] uppercase tracking-wider transition-all"
            style={{ color, borderColor: color + "66", background: color + "18" }}
          >
            {accepting ? "accept" : "reject"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function DecisionButton({ active, color, icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      title={active ? `undo ${label.toLowerCase()}` : label.toLowerCase()}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 border rounded-sm font-mono text-[10px] uppercase tracking-wider transition-all",
        !active &&
          "border-border/20 text-muted-foreground hover:border-border/50 hover:text-foreground"
      )}
      style={
        active
          ? { color, borderColor: color + "66", background: color + "18" }
          : {}
      }
    >
      <Icon className="w-3 h-3" /> {label}
    </button>
  );
}

function StatCard({ icon: Icon, label, children, color = "#22D3EE", sub }) {
  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5" style={{ color }} />
        <span className="label-xs">{label}</span>
      </div>
      <div className="font-mono text-2xl font-bold" style={{ color }}>
        {children}
      </div>
      {sub && (
        <div className="font-mono text-[10px] text-muted-foreground mt-1">
          {sub}
        </div>
      )}
    </div>
  );
}

function Pill({ children, color = "#22D3EE", title }) {
  return (
    <span
      title={title}
      className="px-2 py-0.5 rounded-sm font-mono text-[10px] uppercase tracking-wider whitespace-nowrap"
      style={{ color, background: color + "18", border: `1px solid ${color}55` }}
    >
      {children}
    </span>
  );
}

function Section({ icon: Icon, title, color = "#22D3EE", children }) {
  return (
    <div className="mb-8">
      <div className="label-xs mb-3 flex items-center gap-2" style={{ color }}>
        <Icon className="w-3 h-3" /> {title}
      </div>
      {children}
    </div>
  );
}

function Bullets({ items = [], color = "#22D3EE", decisions, onDecide, decideKey }) {
  if (!items.length)
    return (
      <div className="font-mono text-xs text-muted-foreground">{">"} none</div>
    );
  return (
    <ul className="space-y-2">
      {items.map((t, i) => {
        const key = decideKey ? `${decideKey}::${i}` : null;
        const decision = key ? decisions?.[key] : undefined;
        return (
          <li key={i} className="flex flex-wrap items-start gap-x-2 gap-y-1.5">
            <span
              className="font-mono text-xs shrink-0 mt-0.5"
              style={{ color }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span
              className={cn(
                "font-mono text-xs text-foreground/80 leading-relaxed flex-1 min-w-0 [overflow-wrap:anywhere]",
                decision === "rejected" && "line-through opacity-60"
              )}
            >
              {typeof t === "string" ? t : JSON.stringify(t)}
            </span>
            {key && onDecide && !decision && (
              <span className="flex gap-1.5 shrink-0 ml-auto">
                <DecisionButton
                  active={false}
                  color="#00FF9C"
                  icon={Check}
                  label="Accept"
                  onClick={() => onDecide(key, "accepted")}
                />
                <DecisionButton
                  active={false}
                  color="#FF2E63"
                  icon={X}
                  label="Reject"
                  onClick={() => onDecide(key, "rejected")}
                />
              </span>
            )}
            {key && decision === "accepted" && (
              <span className="shrink-0 ml-auto">
                <Pill color="#00FF9C" title="accepted">
                  <Check className="w-3 h-3 inline mr-1 -mt-px" />
                  action performed
                </Pill>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Prose({ text }) {
  if (!text)
    return (
      <div className="font-mono text-xs text-muted-foreground">
        {">"} not provided
      </div>
    );
  return (
    <div className="space-y-2">
      {String(text)
        .split(/\n{2,}/)
        .map((p, i) => (
          <p
            key={i}
            className="font-mono text-xs text-foreground/80 leading-relaxed [overflow-wrap:anywhere]"
          >
            {p}
          </p>
        ))}
    </div>
  );
}

function KeyValues({ data = {}, skip = [] }) {
  const entries = Object.entries(data).filter(
    ([k, v]) => !skip.includes(k) && v !== null && v !== "" && v !== undefined
  );
  if (!entries.length) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
      {entries.map(([k, v]) => (
        <div key={k}>
          <div className="label-xs">{k.replace(/_/g, " ")}</div>
          <div className="font-mono text-xs text-foreground/80 mt-0.5 leading-relaxed [overflow-wrap:anywhere]">
            {typeof v === "object" ? JSON.stringify(v) : String(v)}
          </div>
        </div>
      ))}
    </div>
  );
}

function Finding({ finding, index, decisions, onDecide }) {
  const [open, setOpen] = useState(index === 0);
  const sev = (finding.severity || "unknown").toLowerCase();
  const color = riskColorFor(sev);
  const risk = finding.risk_assessment || {};
  const mitre = finding.mitre_attack || {};
  const recs = finding.recommendations || [];
  const heuristic = finding.analysis_source === "heuristic";

  const recsByHorizon = HORIZON_ORDER.map((h) => ({
    horizon: h,
    items: recs.filter((r) => (r.horizon || "").toLowerCase() === h),
  })).filter((g) => g.items.length);
  const otherRecs = recs.filter(
    (r) => !HORIZON_ORDER.includes((r.horizon || "").toLowerCase())
  );

  return (
    <div className="panel overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 text-left hover:bg-secondary/30 transition-colors"
      >
        <Pill color={color}>{sev}</Pill>
        {risk.priority && (
          <Pill color={priorityColor(risk.priority)} title="priority">
            {risk.priority}
          </Pill>
        )}
        <span className="font-mono text-sm text-foreground flex-1 min-w-0 truncate">
          {finding.title || finding.id || "finding"}
        </span>
        {risk.overall_risk_score != null && (
          <span
            className="font-mono text-sm shrink-0 hidden sm:block"
            style={{ color: riskScoreColor(risk.overall_risk_score) }}
          >
            {Number(risk.overall_risk_score).toFixed(1)}
          </span>
        )}
        {heuristic && (
          <span className="hidden md:block">
            <Pill color="#FFB020" title="analysed by the rule engine">
              rules
            </Pill>
          </span>
        )}
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground shrink-0 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          className="px-3 sm:px-4 pb-5 pt-1 space-y-5 border-t border-border/10"
          style={{ animation: "float-up 0.2s ease-out both" }}
        >
          <div className="flex flex-wrap items-center gap-2 pt-4">
            <span className="label-xs">ASSET</span>
            <span className="font-mono text-xs text-accent break-all">
              {finding.asset || "—"}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground ml-auto">
              {finding.id}
            </span>
          </div>

          <div>
            <div className="label-xs mb-2">ANALYSIS</div>
            <Prose text={finding.analysis} />
          </div>

          {finding.root_cause && (
            <div>
              <div className="label-xs mb-2">ROOT CAUSE</div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {finding.root_cause.primary && (
                  <Pill color="#FF6B2C">{finding.root_cause.primary}</Pill>
                )}
                {(finding.root_cause.categories || []).map((c) => (
                  <Pill key={c} color="#7A8B8F">
                    {c}
                  </Pill>
                ))}
              </div>
              <Prose text={finding.root_cause.explanation} />
            </div>
          )}

          {finding.business_impact && (
            <div>
              <div className="label-xs mb-2">BUSINESS IMPACT</div>
              <Prose text={finding.business_impact.narrative} />
              <div className="mt-3">
                <KeyValues data={finding.business_impact} skip={["narrative"]} />
              </div>
            </div>
          )}

          <div>
            <div className="label-xs mb-2">MITRE ATT&amp;CK</div>
            <div className="flex flex-wrap gap-2 mb-2">
              {(mitre.tactics || []).map((t) => (
                <Pill key={t} color="#22D3EE">
                  {t}
                </Pill>
              ))}
              {!mitre.tactics?.length && (
                <span className="font-mono text-xs text-muted-foreground">
                  {">"} no tactics mapped
                </span>
              )}
            </div>
            <div className="space-y-2">
              {(mitre.techniques || []).map((t) => (
                <div
                  key={t.id + t.name}
                  className="border border-border/20 rounded-sm p-3"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="font-mono text-xs text-accent">{t.id}</span>
                    <span className="font-mono text-xs text-foreground">
                      {t.name}
                    </span>
                    {t.tactic && <Pill color="#7A8B8F">{t.tactic}</Pill>}
                  </div>
                  <p className="font-mono text-[11px] text-foreground/70 leading-relaxed">
                    {t.rationale}
                  </p>
                </div>
              ))}
            </div>
            {mitre.notes && (
              <p className="mt-2 font-mono text-[11px] text-muted-foreground leading-relaxed">
                {mitre.notes}
              </p>
            )}
          </div>

          <div>
            <div className="label-xs mb-2">RISK ASSESSMENT</div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Pill color={riskScoreColor(risk.overall_risk_score)}>
                score {risk.overall_risk_score ?? "—"} / 10
              </Pill>
              {risk.likelihood && (
                <Pill color="#7A8B8F">likelihood: {risk.likelihood}</Pill>
              )}
              {risk.impact && <Pill color="#7A8B8F">impact: {risk.impact}</Pill>}
              {risk.priority && (
                <Pill color={priorityColor(risk.priority)}>
                  {risk.priority} — {PRIORITY[risk.priority]?.desc || ""}
                </Pill>
              )}
            </div>
            <Prose text={risk.reasoning} />
          </div>

          {(recsByHorizon.length > 0 || otherRecs.length > 0) && (
            <div>
              <div className="label-xs mb-2">RECOMMENDATIONS</div>
              <div className="space-y-3">
                {[
                  ...recsByHorizon,
                  ...(otherRecs.length
                    ? [{ horizon: "other", items: otherRecs }]
                    : []),
                ].map((group) => (
                  <div key={group.horizon}>
                    <Pill color={HORIZON[group.horizon]?.color || "#7A8B8F"}>
                      {HORIZON[group.horizon]?.label || group.horizon}
                    </Pill>
                    <div className="mt-2 space-y-2">
                      {group.items.map((r, i) => {
                        const recKey = `${finding.id || finding.title}::${group.horizon}::${i}`;
                        const decision = decisions[recKey];
                        return (
                          <div
                            key={i}
                            className={cn(
                              "border rounded-sm p-3 transition-colors",
                              decision === "accepted"
                                ? "border-[#00FF9C]/40 bg-[#00FF9C]/[0.04]"
                                : decision === "rejected"
                                  ? "border-[#FF2E63]/40 bg-[#FF2E63]/[0.04] opacity-70"
                                  : "border-border/20"
                            )}
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                              <div className="font-mono text-xs text-foreground leading-relaxed">
                                {r.action}
                              </div>
                              {!decision && (
                                <div className="flex gap-1.5 shrink-0">
                                  <DecisionButton
                                    active={false}
                                    color="#00FF9C"
                                    icon={Check}
                                    label="Accept"
                                    onClick={() => onDecide(recKey, "accepted")}
                                  />
                                  <DecisionButton
                                    active={false}
                                    color="#FF2E63"
                                    icon={X}
                                    label="Reject"
                                    onClick={() => onDecide(recKey, "rejected")}
                                  />
                                </div>
                              )}
                              {decision === "accepted" && (
                                <div className="shrink-0">
                                  <Pill color="#00FF9C" title="accepted">
                                    <Check className="w-3 h-3 inline mr-1 -mt-px" />
                                    action performed
                                  </Pill>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {r.category && <Pill color="#7A8B8F">{r.category}</Pill>}
                              {r.effort && (
                                <Pill color="#7A8B8F">effort: {r.effort}</Pill>
                              )}
                            </div>
                            {r.rationale && (
                              <p className="font-mono text-[11px] text-muted-foreground mt-2 leading-relaxed">
                                {r.rationale}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(finding.detection_rules || []).length > 0 && (
            <div>
              <div className="label-xs mb-2">DETECTION</div>
              <div className="space-y-2">
                {finding.detection_rules.map((d, i) => (
                  <div
                    key={i}
                    className="border border-accent/20 bg-accent/[0.03] rounded-sm p-3 font-mono text-[11px] text-foreground/80 leading-relaxed"
                  >
                    {d}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MarkdownPane({ jobId }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || text || error) return;
    blueApi
      .getMarkdown(jobId)
      .then(setText)
      .catch((e) => setError(e.message));
  }, [open, jobId, text, error]);

  return (
    <div className="panel">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 border-b border-border/15 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>blue_report.md</span>
        <ChevronDown
          className={cn("w-4 h-4 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <pre className="overflow-auto p-4 font-mono text-[11px] leading-relaxed text-foreground/80 max-h-96 whitespace-pre-wrap">
          {error ? `// ${error}` : text ?? "// loading…"}
        </pre>
      )}
    </div>
  );
}

export default function BlueReport() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { updateAnalysis } = useScanStore();
  const [copied, copy] = useCopy();

  const [job, setJob] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notReady, setNotReady] = useState(false);
  const [error, setError] = useState(null);

  const [sevFilter, setSevFilter] = useState("all");
  const [prioFilter, setPrioFilter] = useState("all");
  const [recDecisions, decideRec] = useRecDecisions(jobId);
  const [pendingDecision, setPendingDecision] = useState(
    /** @type {{ key: string, value: string } | null} */ (null)
  );

  const requestDecide = (key, value) => {
    if (!value) decideRec(key, null); // undo needs no confirmation
    else setPendingDecision({ key, value });
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const j = await blueApi.getAnalysis(jobId);
        if (!alive) return;
        setJob(j);
        updateAnalysis(jobId, {
          status: j.status,
          overall_risk: j.overall_risk,
          target: j.target,
        });
        if (j.status !== "completed") {
          setNotReady(true);
          return;
        }
        const doc = await blueApi.getReport(jobId);
        if (!alive) return;
        setAnalysis(doc);
      } catch (e) {
        if (!alive) return;
        if (e instanceof ApiError && e.status === 409) setNotReady(true);
        else setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [jobId, updateAnalysis]);

  const findings = analysis?.findings || [];
  const filtered = useMemo(
    () =>
      findings.filter((f) => {
        const sev = (f.severity || "unknown").toLowerCase();
        const prio = (f.risk_assessment?.priority || "").toUpperCase();
        return (
          (sevFilter === "all" || sev === sevFilter) &&
          (prioFilter === "all" || prio === prioFilter)
        );
      }),
    [findings, sevFilter, prioFilter]
  );

  if (loading)
    return (
      <div className="flex items-center justify-center py-32 font-mono text-xs text-muted-foreground">
        <span className="cursor-block mr-2" /> loading blue analysis…
      </div>
    );

  if (notReady)
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <AlertTriangle className="w-10 h-10 text-[#FFB020] mx-auto mb-4" />
        <p className="font-mono text-sm text-foreground mb-2">
          {">"} analysis not complete (status: {job?.status || "unknown"})
        </p>
        <p className="font-mono text-xs text-muted-foreground mb-6">
          the report endpoint returns 409 until the job finishes.
        </p>
        <GlitchButton
          onClick={() => navigate(`/blue/monitor/${jobId}`)}
          variant="accent"
        >
          BACK TO MONITOR
        </GlitchButton>
      </div>
    );

  if (error || !analysis)
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <ShieldAlert className="w-10 h-10 text-destructive mx-auto mb-4" />
        <p className="font-mono text-sm text-destructive mb-6 break-all">
          {error || "analysis unavailable"}
        </p>
        <GlitchButton onClick={() => navigate("/blue")} variant="accent">
          NEW ANALYSIS
        </GlitchButton>
      </div>
    );

  const summary = analysis.summary || {};
  const exec = analysis.executive_summary || {};
  const tech = analysis.technical_summary || {};
  const meta = analysis.metadata || {};
  const risk = (analysis.overall_risk || "unknown").toLowerCase();
  const riskColor = riskColorFor(risk);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <button
        onClick={() => navigate("/blue/history")}
        className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-accent transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> analyses
      </button>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="label-xs mb-2 text-accent">// BLUE TEAM ANALYSIS</div>
          <div className="font-mono text-lg sm:text-xl text-foreground break-all">
            {analysis.engagement_id || jobId}
          </div>
          <div className="font-mono text-xs text-muted-foreground mt-1">
            {analysis.target || "—"} ·{" "}
            {String(analysis.mode || "—").replace("_", "-")} ·{" "}
            {meta.model_name || "—"}
          </div>
        </div>
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 border rounded-sm font-mono text-[11px] uppercase tracking-[0.16em] shrink-0"
          style={{
            color: riskColor,
            borderColor: riskColor + "80",
            background: riskColor + "0D",
            boxShadow: `0 0 16px ${riskColor}40`,
          }}
        >
          <Shield className="w-4 h-4" />
          OVERALL RISK: {risk}
        </div>
      </div>

      {meta.degraded && (
        <div className="mb-6 p-3 border border-[#FFB020]/40 bg-[#FFB020]/5 rounded-sm flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-[#FFB020] shrink-0 mt-0.5" />
          <p className="font-mono text-[11px] text-foreground/80 leading-relaxed">
            <span className="text-[#FFB020] font-bold">
              RULE-BASED ANALYSIS —{" "}
            </span>
            the LLM was unavailable, so {meta.heuristic_analysed ?? "some"} of{" "}
            {meta.findings_analysed ?? findings.length} findings were analysed by
            the deterministic engine.
          </p>
        </div>
      )}

      {/* Headline numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard icon={Target} label="FINDINGS" color="#22D3EE">
          <CountUp value={summary.total_findings || findings.length} />
        </StatCard>
        <StatCard
          icon={Siren}
          label="IMMEDIATE ACTIONS"
          color="#FF2E63"
          sub="do these first"
        >
          <CountUp value={summary.immediate_actions || 0} />
        </StatCard>
        <StatCard
          icon={Gauge}
          label="MAX RISK"
          color={riskScoreColor(summary.max_risk_score)}
          sub="of 10"
        >
          {Number(summary.max_risk_score || 0).toFixed(1)}
        </StatCard>
        <StatCard
          icon={Layers}
          label="MEAN RISK"
          color={riskScoreColor(summary.mean_risk_score)}
          sub="of 10"
        >
          {Number(summary.mean_risk_score || 0).toFixed(1)}
        </StatCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="panel p-5">
          <div className="label-xs mb-3 text-center">SEVERITY</div>
          <SeverityMeter
            counts={summary.severity_counts || {}}
            order={BLUE_SEVERITY_ORDER}
            palette={BLUE_SEVERITY}
          />
        </div>
        <div className="panel p-5">
          <div className="label-xs mb-3 text-center">PRIORITY</div>
          <SeverityMeter
            counts={summary.priority_counts || {}}
            order={PRIORITY_ORDER}
            palette={PRIORITY}
          />
        </div>
        <div className="panel p-5">
          <div className="label-xs mb-3 flex items-center gap-2">
            <Radar className="w-3 h-3 text-accent" /> MITRE TACTICS
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(summary.mitre_tactics_observed || []).map((t) => (
              <Pill key={t} color="#22D3EE">
                {t}
              </Pill>
            ))}
            {!(summary.mitre_tactics_observed || []).length && (
              <span className="font-mono text-xs text-muted-foreground">
                {">"} none observed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Executive summary */}
      <Section icon={Stethoscope} title="EXECUTIVE SUMMARY">
        <div className="panel p-5 space-y-5">
          <div>
            <div className="label-xs mb-2">OVERALL POSTURE</div>
            <Prose text={exec.overall_posture} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <div className="label-xs mb-2 text-[#FF6B2C]">TOP RISKS</div>
              <Bullets items={exec.top_risks} color="#FF6B2C" />
            </div>
            <div>
              <div className="label-xs mb-2 text-destructive">
                MOST DANGEROUS FINDINGS
              </div>
              <Bullets items={exec.most_dangerous_findings} color="#FF2E63" />
            </div>
          </div>
          <div>
            <div className="label-xs mb-2 text-primary">
              RECOMMENDED NEXT STEPS
            </div>
            <Bullets
              items={exec.recommended_next_steps}
              color="#00FF9C"
              // decisions={recDecisions}
              // onDecide={decideRec}
              // decideKey="exec::next_steps"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <div className="label-xs mb-2">SECURITY MATURITY</div>
              <Prose text={exec.security_maturity} />
            </div>
            <div>
              <div className="label-xs mb-2">BUSINESS NARRATIVE</div>
              <Prose text={exec.business_narrative} />
            </div>
          </div>
        </div>
      </Section>

      {/* Technical summary */}
      <Section icon={Wrench} title="TECHNICAL SUMMARY">
        <div className="panel p-5 space-y-5">
          <div>
            <div className="label-xs mb-2">DEVELOPER GUIDANCE</div>
            <Prose text={tech.developer_guidance} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              ["SECURE CODING", tech.secure_coding_guidance],
              ["INFRASTRUCTURE", tech.infrastructure_recommendations],
              ["DEVSECOPS", tech.devsecops_improvements],
              ["ARCHITECTURE", tech.architecture_improvements],
            ].map(([label, items]) => (
              <div key={label}>
                <div className="label-xs mb-2 text-accent">{label}</div>
                <Bullets
                  items={items}
                  decisions={recDecisions}
                  onDecide={requestDecide}
                  decideKey={`tech::${label.toLowerCase().replace(/\s+/g, "_")}`}
                />
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Findings */}
      <Section icon={Zap} title={`FINDINGS (${findings.length})`}>
        <div className="panel p-3 mb-3 flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="label-xs mr-1">SEVERITY</span>
            {["all", ...BLUE_SEVERITY_ORDER].map((k) => {
              const active = sevFilter === k;
              const color = k === "all" ? "#DCE3E5" : BLUE_SEVERITY[k].color;
              return (
                <button
                  key={k}
                  onClick={() => setSevFilter(k)}
                  className={cn(
                    "px-2 py-0.5 border font-mono text-[10px] uppercase tracking-wider rounded-sm transition-all",
                    active
                      ? "bg-secondary"
                      : "border-border/20 hover:border-border/50 text-muted-foreground"
                  )}
                  style={active ? { color, borderColor: color + "66" } : {}}
                >
                  {k === "all" ? "ALL" : BLUE_SEVERITY[k].label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="label-xs mr-1">PRIORITY</span>
            {["all", ...PRIORITY_ORDER].map((k) => {
              const active = prioFilter === k;
              const color = k === "all" ? "#DCE3E5" : PRIORITY[k].color;
              return (
                <button
                  key={k}
                  onClick={() => setPrioFilter(k)}
                  className={cn(
                    "px-2 py-0.5 border font-mono text-[10px] uppercase tracking-wider rounded-sm transition-all",
                    active
                      ? "bg-secondary"
                      : "border-border/20 hover:border-border/50 text-muted-foreground"
                  )}
                  style={active ? { color, borderColor: color + "66" } : {}}
                >
                  {k === "all" ? "ALL" : k}
                </button>
              );
            })}
          </div>
          <span className="lg:ml-auto font-mono text-[10px] text-muted-foreground">
            {filtered.length} / {findings.length}
          </span>
        </div>

        <div className="space-y-2">
          {filtered.map((f, i) => (
            <Finding
              key={f.id || i}
              finding={f}
              index={i}
              decisions={recDecisions}
              onDecide={requestDecide}
            />
          ))}
          {!filtered.length && (
            <div className="panel p-8 text-center font-mono text-sm text-muted-foreground">
              {">"} no findings match the filter
            </div>
          )}
        </div>
      </Section>

      {/* Run metadata */}
      <Section icon={FileText} title="RUN METADATA">
        <div className="panel p-5">
          <KeyValues data={meta} />
        </div>
      </Section>

      <div className="space-y-3 mb-8">
        <MarkdownPane jobId={jobId} />
        <JSONView data={analysis} title="blue_analysis.json" />
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
        <GlitchButton
          onClick={() => copy(JSON.stringify(analysis, null, 2))}
          variant="ghost"
          className="w-full sm:w-auto"
        >
          {copied ? (
            <Check className="w-4 h-4 text-primary" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          COPY ANALYSIS
        </GlitchButton>
        <GlitchButton
          onClick={() =>
            downloadJson(`blue-analysis-${jobId}.json`, analysis)
          }
          variant="ghost"
          className="w-full sm:w-auto"
        >
          <Download className="w-4 h-4" /> DOWNLOAD .json
        </GlitchButton>
        <a
          href={blueApi.markdownUrl(jobId, { download: true })}
          className="glitch-btn group relative inline-flex items-center justify-center gap-2 px-5 py-2.5 font-mono text-sm font-medium uppercase tracking-[0.14em] transition-all duration-150 rounded-sm bg-transparent text-foreground border border-border/30 hover:border-accent/50 hover:text-accent w-full sm:w-auto"
        >
          <FileText className="w-4 h-4" /> DOWNLOAD .md
        </a>
        <GlitchButton
          onClick={() => navigate("/blue")}
          variant="accent"
          className="w-full sm:w-auto"
        >
          <RotateCcw className="w-4 h-4" /> NEW ANALYSIS
        </GlitchButton>
      </div>

      <ConfirmDecisionModal
        pending={pendingDecision}
        onConfirm={() => {
          if (pendingDecision) decideRec(pendingDecision.key, pendingDecision.value);
          setPendingDecision(null);
        }}
        onCancel={() => setPendingDecision(null)}
      />
    </div>
  );
}
