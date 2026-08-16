import React, { useState } from "react";
import {
  Shield,
  Activity,
  Crosshair,
  AlertOctagon,
  Gauge,
  ListOrdered,
  Network,
  Radar,
  Clock3,
  FileDown,
  FileCode2,
  Search,
  Copy,
  X,
  RotateCcw,
  Check,
} from "lucide-react";
import CountUp from "@/components/CountUp";
import GlitchButton from "@/components/GlitchButton";
import { MOCK_RESULT } from "@/lib/siemMock";

const CRITICAL = "var(--c-danger)";
const ACCENT = "var(--c-accent)";
const PRIMARY = "var(--c-primary)";

function StatCard({ icon: Icon, label, value, color = ACCENT, sub }) {
  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5" style={{ color }} />
        <span className="label-xs">{label}</span>
      </div>
      <div className="font-mono text-2xl font-bold" style={{ color }}>
        <CountUp
          value={value}
          format={(n) => Math.round(n).toLocaleString("en-US")}
        />
      </div>
      {sub && (
        <div className="font-mono text-[10px] text-muted-foreground mt-1">
          {sub}
        </div>
      )}
    </div>
  );
}

function Section({ icon: Icon, title, color = ACCENT, children, className }) {
  return (
    <div className={className}>
      <div className="label-xs mb-3 flex items-center gap-2" style={{ color }}>
        <Icon className="w-3 h-3" /> {title}
      </div>
      {children}
    </div>
  );
}

function RiskGauge({ score }) {
  // Simple stroke-dasharray radial — no SVG filters (they misbehave on
  // small filter regions), glow comes from a soft under-stroke instead.
  const r = 52;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, score / 100);
  return (
    <div className="relative w-36 h-36 shrink-0">
      <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="8"
        />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke={CRITICAL}
          strokeOpacity="0.25"
          strokeWidth="12"
          strokeDasharray={`${c * frac} ${c}`}
          strokeLinecap="round"
        />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke={CRITICAL}
          strokeWidth="6"
          strokeDasharray={`${c * frac} ${c}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.9s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-3xl font-bold" style={{ color: CRITICAL }}>
          <CountUp value={score} />
        </span>
        <span className="label-xs">/ 100</span>
      </div>
    </div>
  );
}

function DetectionRuleModal({ rule, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const text = [
      `name: ${rule.name}`,
      `severity: ${rule.severity}`,
      `condition: ${rule.condition}`,
      `mitre: ${rule.mitre.join(", ")}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — nothing to surface in a mock flow */
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80"
      onClick={onClose}
    >
      <div
        className="panel-raised w-full max-w-lg p-5 glow-accent"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="label-xs text-accent flex items-center gap-2">
            <FileCode2 className="w-3.5 h-3.5" /> DETECTION RULE
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 font-mono text-xs">
          <div>
            <div className="label-xs mb-1">NAME</div>
            <div className="text-foreground">{rule.name}</div>
          </div>
          <div>
            <div className="label-xs mb-1">SEVERITY</div>
            <span
              className="px-2 py-0.5 rounded-sm text-[10px] uppercase tracking-wider"
              style={{
                color: CRITICAL,
                background: CRITICAL + "18",
                border: `1px solid ${CRITICAL}55`,
              }}
            >
              {rule.severity}
            </span>
          </div>
          <div>
            <div className="label-xs mb-1">CONDITION</div>
            <p className="text-foreground/80 leading-relaxed">{rule.condition}</p>
          </div>
          <div>
            <div className="label-xs mb-1.5">MITRE</div>
            <div className="flex gap-1.5">
              {rule.mitre.map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded-sm text-[10px] tracking-wider"
                  style={{
                    color: ACCENT,
                    background: ACCENT + "14",
                    border: `1px solid ${ACCENT}40`,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={copy}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-accent/40 text-accent rounded-sm font-mono text-[11px] uppercase tracking-wider hover:bg-accent/10 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" /> COPIED
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> COPY RULE
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border/40 text-muted-foreground rounded-sm font-mono text-[11px] uppercase tracking-wider hover:text-foreground transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SiemResults({ onReset }) {
  const r = MOCK_RESULT;
  const [ruleOpen, setRuleOpen] = useState(false);
  const [exported, setExported] = useState(false);
  const [investigation, setInvestigation] = useState(false);

  const exportReport = () => {
    // Frontend-only export — hand the mock investigation to the browser.
    const blob = new Blob([JSON.stringify(r, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "blue-siem-investigation.json";
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 1600);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="label-xs text-accent mb-1 flex items-center gap-2">
            <Radar className="w-3 h-3" /> SIEM TELEMETRY ANALYSIS
          </div>
          <h2 className="font-display font-bold text-xl md:text-2xl text-foreground">
            SECURITY INVESTIGATION
          </h2>
        </div>
        <button
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-3 py-2 border border-border/30 rounded-sm font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-accent hover:border-accent/40 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" /> NEW ANALYSIS
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Activity}
          label="EVENTS ANALYZED"
          value={r.summary.eventsAnalyzed}
        />
        <StatCard
          icon={Crosshair}
          label="THREATS DETECTED"
          value={r.summary.threatsDetected}
          color="var(--c-orange)"
        />
        <StatCard
          icon={AlertOctagon}
          label="CRITICAL FINDINGS"
          value={r.summary.criticalFindings}
          color={CRITICAL}
        />
        <StatCard
          icon={Gauge}
          label="RISK SCORE"
          value={r.summary.riskScore}
          color={CRITICAL}
          sub="/ 100"
        />
      </div>

      {/* Top finding */}
      <Section icon={AlertOctagon} title="TOP FINDING" color={CRITICAL}>
        <div
          className="panel p-5 border-l-2"
          style={{ borderLeftColor: CRITICAL }}
        >
          <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
            <span
              className="px-2 py-0.5 rounded-sm font-mono text-[10px] uppercase tracking-wider"
              style={{
                color: CRITICAL,
                background: CRITICAL + "18",
                border: `1px solid ${CRITICAL}55`,
              }}
            >
              CRITICAL
            </span>
            <div className="flex items-center gap-2">
              <span className="label-xs">CONFIDENCE</span>
              <span className="font-mono text-sm font-bold text-accent">
                {r.topFinding.confidence}%
              </span>
            </div>
          </div>
          <div className="font-mono text-lg font-bold text-foreground mb-2">
            {r.topFinding.title}
          </div>
          <div className="h-1 bg-secondary rounded-sm overflow-hidden mb-3 max-w-xs">
            <div
              className="h-full transition-all duration-700"
              style={{
                width: `${r.topFinding.confidence}%`,
                background: ACCENT,
                boxShadow: `0 0 8px ${ACCENT}`,
              }}
            />
          </div>
          <p className="font-mono text-xs text-foreground/70 leading-relaxed">
            {r.topFinding.description}
          </p>
        </div>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attack timeline */}
        <Section icon={Clock3} title="ATTACK TIMELINE">
          <div className="panel p-5">
            <div className="relative pl-5">
              <span
                className="absolute left-[5px] top-2 bottom-2 w-px"
                style={{ background: `${ACCENT}40` }}
              />
              <div className="space-y-5">
                {r.timeline.map((t, i) => (
                  <div key={i} className="relative">
                    <span
                      className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full border"
                      style={{
                        background:
                          i === r.timeline.length - 1 ? CRITICAL : "hsl(var(--surface-1))",
                        borderColor: i === r.timeline.length - 1 ? CRITICAL : ACCENT,
                        boxShadow: `0 0 8px ${
                          i === r.timeline.length - 1 ? CRITICAL : ACCENT
                        }66`,
                      }}
                    />
                    <div className="font-mono text-[11px] text-accent">
                      {t.time}
                    </div>
                    <div className="font-mono text-xs text-foreground mt-0.5">
                      {t.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Entities */}
        <Section icon={Network} title="ENTITIES">
          <div className="panel p-5">
            <div className="divide-y divide-border/10">
              {r.entities.map((e) => (
                <div
                  key={e.label}
                  className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                >
                  <span className="label-xs">{e.label}</span>
                  <span className="font-mono text-xs text-foreground">
                    {e.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </div>

      {/* MITRE */}
      <Section icon={Radar} title="MITRE ATT&CK">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {r.mitre.map((t) => (
            <div
              key={t.id}
              className="panel p-3 hover:border-accent/40 transition-colors"
            >
              <div className="font-mono text-sm font-bold text-accent">
                {t.id}
              </div>
              <div className="font-mono text-[11px] text-muted-foreground mt-0.5">
                {t.name}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Risk assessment */}
      <Section icon={Gauge} title="RISK ASSESSMENT" color={CRITICAL}>
        <div className="panel p-5 flex flex-col sm:flex-row items-center gap-6">
          <RiskGauge score={r.risk.score} />
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              ["CONFIDENCE", `${r.risk.confidence}%`, ACCENT],
              ["BUSINESS IMPACT", r.risk.businessImpact, "var(--c-orange)"],
              ["SEVERITY", r.risk.severity, CRITICAL],
            ].map(([label, value, color]) => (
              <div key={label}>
                <div className="label-xs mb-1">{label}</div>
                <div className="font-mono text-lg font-bold" style={{ color }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Recommended actions */}
      <Section icon={ListOrdered} title="RECOMMENDED ACTIONS" color={PRIMARY}>
        <div className="panel p-5">
          <ol className="space-y-2.5">
            {r.actions.map((a, i) => (
              <li key={a} className="flex items-start gap-3">
                <span className="font-mono text-[11px] text-primary shrink-0 mt-0.5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-mono text-xs text-foreground">{a}</span>
              </li>
            ))}
          </ol>
          <div className="flex flex-col sm:flex-row gap-2 mt-5">
            <GlitchButton
              variant="ghost"
              className="flex-1 py-2.5 text-xs"
              glitchText="EXPORT REPORT"
              onClick={exportReport}
            >
              <FileDown className="w-3.5 h-3.5" />
              {exported ? "EXPORTED ✓" : "EXPORT REPORT"}
            </GlitchButton>
            <GlitchButton
              variant="accent"
              className="flex-1 py-2.5 text-xs"
              glitchText="GENERATE DETECTION RULE"
              onClick={() => setRuleOpen(true)}
            >
              <FileCode2 className="w-3.5 h-3.5" /> GENERATE DETECTION RULE
            </GlitchButton>
            <GlitchButton
              variant="outline"
              className="flex-1 py-2.5 text-xs"
              glitchText="START INVESTIGATION"
              onClick={() => setInvestigation(true)}
            >
              <Search className="w-3.5 h-3.5" /> START INVESTIGATION
            </GlitchButton>
          </div>
          {investigation && (
            <div className="mt-3 font-mono text-[11px] text-primary flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" />
              INVESTIGATION #INV-2481 OPENED — assigned to SOC tier 2 queue
            </div>
          )}
        </div>
      </Section>

      {ruleOpen && (
        <DetectionRuleModal
          rule={r.detectionRule}
          onClose={() => setRuleOpen(false)}
        />
      )}
    </div>
  );
}
