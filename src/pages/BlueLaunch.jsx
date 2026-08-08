import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Shield,
  AlertTriangle,
  Loader2,
  ChevronDown,
  Upload,
  FileJson,
  Link2,
  ListTree,
  Cpu,
  ZapOff,
  ArrowRight,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { blueApi } from "@/lib/blueApi";
import { useScanStore } from "@/lib/scanStore";
import { cn } from "@/lib/utils";
import GlitchButton from "@/components/GlitchButton";
import DecryptedText from "@/components/DecryptedText";
import TeamBadge from "@/components/TeamBadge";

const SOURCES = [
  {
    key: "scan",
    label: "RED SCAN",
    icon: ListTree,
    blurb: "Pick a completed engagement from this device's history.",
  },
  {
    key: "job",
    label: "RED JOB ID",
    icon: Link2,
    blurb:
      "The Blue Agent fetches the report from the Red Agent itself — the report never transits the browser.",
  },
  {
    key: "paste",
    label: "PASTE / UPLOAD",
    icon: FileJson,
    blurb: "Drop a redagent-report.json straight in.",
  },
];

const DEFAULT_OPTIONS = {
  offline: false,
  concurrency: 4,
  temperature: 0.2,
  max_tokens: 4096,
  model_name: "",
  llm_provider: "",
  allow_offline_fallback: true,
};

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="label-xs mb-1.5 block">{label}</label>
      {children}
      {hint && (
        <p className="mt-1.5 font-mono text-[11px] text-muted-foreground leading-relaxed">
          {hint}
        </p>
      )}
    </div>
  );
}

function Toggle({ value, onChange, onLabel = "ON", offLabel = "OFF" }) {
  return (
    <div className="flex border border-border/30 rounded-sm overflow-hidden">
      {[
        [true, onLabel],
        [false, offLabel],
      ].map(([v, l]) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            "flex-1 py-2 font-mono text-xs uppercase tracking-wider transition-colors",
            value === v
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function BackendPanel({ config, error }) {
  if (error)
    return (
      <div className="panel p-4 border-destructive/40 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
        <div>
          <div className="label-xs text-destructive">BLUE AGENT UNREACHABLE</div>
          <p className="font-mono text-[11px] text-foreground/70 mt-1 leading-relaxed">
            {error} — start it with{" "}
            <span className="text-accent">python serve_api.py</span> (port 8001),
            or change BLUE_API_BASE_URL in the sidebar.
          </p>
        </div>
      </div>
    );

  if (!config)
    return (
      <div className="panel p-4 font-mono text-[11px] text-muted-foreground flex items-center gap-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
        reading /api/v1/config…
      </div>
    );

  const live = config.llm?.configured;
  return (
    <div className="panel p-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-accent" />
          <span className="label-xs">ANALYSIS BACKEND</span>
        </div>
        <span
          className="font-mono text-xs"
          style={{ color: live ? "#00FF9C" : "#FFB020" }}
        >
          {live
            ? `${config.llm.provider} / ${config.llm.model}`
            : "heuristic engine — no LLM configured"}
        </span>
        {config.llm?.degrades_to_heuristics && (
          <span className="font-mono text-[10px] text-muted-foreground">
            degrades to rules on failure
          </span>
        )}
      </div>
      {live && config.llm?.note && (
        <p className="mt-2 font-mono text-[11px] text-muted-foreground leading-relaxed">
          {config.llm.note}
        </p>
      )}
    </div>
  );
}

export default function BlueLaunch() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { history, addAnalysis, apiBase } = useScanStore();
  const fileRef = useRef(null);

  const [source, setSource] = useState("scan");
  const [selectedScan, setSelectedScan] = useState(params.get("scan") || "");
  const [redJobId, setRedJobId] = useState("");
  const [redUrl, setRedUrl] = useState("");
  const [pasted, setPasted] = useState("");
  const [pastedName, setPastedName] = useState("");

  const [opts, setOpts] = useState(DEFAULT_OPTIONS);
  const [showAdv, setShowAdv] = useState(false);
  const [config, setConfig] = useState(null);
  const [configError, setConfigError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    blueApi
      .getConfig()
      .then((c) => alive && (setConfig(c), setConfigError(null)))
      .catch((e) => alive && setConfigError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  const completedScans = useMemo(
    () => history.filter((s) => s.status === "complete"),
    [history]
  );

  const onFile = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      JSON.parse(text); // fail early on a non-JSON drop
      setPasted(text);
      setPastedName(file.name);
      setError(null);
    } catch {
      setError(`${file.name} is not valid JSON`);
    }
  };

  const buildOptions = () => {
    const o = {};
    if (opts.offline) o.offline = true;
    if (Number(opts.concurrency) !== DEFAULT_OPTIONS.concurrency)
      o.concurrency = Number(opts.concurrency);
    if (Number(opts.temperature) !== DEFAULT_OPTIONS.temperature)
      o.temperature = Number(opts.temperature);
    if (Number(opts.max_tokens) !== DEFAULT_OPTIONS.max_tokens)
      o.max_tokens = Number(opts.max_tokens);
    if (opts.model_name.trim()) o.model_name = opts.model_name.trim();
    if (opts.llm_provider.trim()) o.llm_provider = opts.llm_provider.trim();
    if (!opts.allow_offline_fallback) o.allow_offline_fallback = false;
    return o;
  };

  // Exactly one source per the API contract; the tab selection guarantees it.
  const buildBody = async () => {
    if (source === "scan") {
      if (!selectedScan) throw new Error("select an engagement first");
      // Pull the report through the browser so the handoff works regardless of
      // whether the Blue Agent host can reach the Red Agent.
      const report = await api.getReport(selectedScan);
      return { body: { report }, label: selectedScan };
    }
    if (source === "job") {
      const id = redJobId.trim();
      if (!id) throw new Error("enter a Red Agent job id");
      const body = { red_agent_job_id: id };
      if (redUrl.trim()) body.red_agent_url = redUrl.trim();
      return { body, label: id };
    }
    if (!pasted.trim()) throw new Error("paste or upload a report first");
    let report;
    try {
      report = JSON.parse(pasted);
    } catch (e) {
      throw new Error(`report is not valid JSON — ${e.message}`);
    }
    return { body: { report }, label: pastedName || "pasted report" };
  };

  const launch = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const { body, label } = await buildBody();
      const options = buildOptions();
      if (Object.keys(options).length) body.options = options;

      const res = await blueApi.startAnalysis(body);
      addAnalysis({
        job_id: res.job_id,
        status: res.status || "queued",
        source: res.source?.kind || source,
        source_ref: label,
        offline: !!options.offline,
      });
      navigate(`/blue/monitor/${res.job_id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status ? `[${err.status}] ${err.message}` : err.message
        );
      } else {
        setError(err.message || "could not queue the analysis");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const activeSource = SOURCES.find((s) => s.key === source);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <TeamBadge
        color="#22D3EE"
        icon={Shield}
        label="BLUE TEAM"
        sub="Detection Correlation Engine"
        className="mb-6"
      />

      <h1 className="font-display font-bold text-2xl md:text-3xl mb-1 flex items-center gap-3">
        <Shield
          className="w-7 h-7 text-accent"
          style={{ filter: "drop-shadow(0 0 8px rgba(34,211,238,0.6))" }}
        />
        <DecryptedText text="Security Telemetry Collection & Normalization Engine" />
      </h1>
      <p className="font-mono text-xs text-muted-foreground mb-6 leading-relaxed">
        Hand a Red Agent report to the Blue Agent: root cause, business impact,
        MITRE ATT&amp;CK mapping, prioritised remediation and detection rules —
        one pass per finding.
      </p>

      <div className="mb-6">
        <BackendPanel config={config} error={configError} />
      </div>

      {/* Source selection */}
      <div className="label-xs mb-2">REPORT SOURCE</div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {SOURCES.map((s) => {
          const active = source === s.key;
          return (
            <button
              key={s.key}
              onClick={() => {
                setSource(s.key);
                setError(null);
              }}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-2.5 border rounded-sm font-mono text-[11px] uppercase tracking-[0.14em] transition-all",
                active
                  ? "border-accent/60 text-accent bg-accent/10 glow-accent"
                  : "border-border/25 text-muted-foreground hover:text-foreground hover:border-border/50"
              )}
            >
              <s.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          );
        })}
      </div>
      <p className="font-mono text-[11px] text-muted-foreground mb-5 leading-relaxed">
        {activeSource?.blurb}
      </p>

      <div className="panel p-5 space-y-5">
        {source === "scan" &&
          (completedScans.length === 0 ? (
            <div className="text-center py-6">
              <p className="font-mono text-xs text-muted-foreground mb-3">
                {">"} no completed engagements on this device
              </p>
              <button
                onClick={() => navigate("/scan")}
                className="font-mono text-xs uppercase tracking-wider text-primary hover:text-glow-primary"
              >
                run a red scan first →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {completedScans.map((s) => {
                const active = selectedScan === s.job_id;
                return (
                  <button
                    key={s.job_id}
                    onClick={() => setSelectedScan(s.job_id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 border rounded-sm text-left transition-all",
                      active
                        ? "border-accent/60 bg-accent/5"
                        : "border-border/20 hover:border-border/50"
                    )}
                  >
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        active ? "bg-accent" : "bg-muted-foreground/40"
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-xs text-foreground truncate">
                        {s.job_id}
                      </span>
                      <span className="block font-mono text-[11px] text-muted-foreground truncate mt-0.5">
                        {String(s.mode || "—").replace("_", "-")} ·{" "}
                        {s.input || "—"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}

        {source === "job" && (
          <>
            <Field
              label="RED AGENT JOB ID"
              hint="Fetched server-to-server by the Blue Agent."
            >
              <input
                value={redJobId}
                onChange={(e) => setRedJobId(e.target.value)}
                placeholder="a27f2e26f8cb4c4dae35484d98bb6d05"
                spellCheck={false}
                className="w-full bg-background/60 border border-border/30 rounded-sm px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              />
            </Field>
            <Field
              label="RED AGENT URL (optional)"
              hint={`Must be reachable from the Blue Agent host, not the browser. Defaults to RED_AGENT_URL, then http://127.0.0.1:8000. This console talks to ${apiBase}.`}
            >
              <input
                value={redUrl}
                onChange={(e) => setRedUrl(e.target.value)}
                placeholder="http://127.0.0.1:8000"
                spellCheck={false}
                className="w-full bg-background/60 border border-border/30 rounded-sm px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              />
            </Field>
          </>
        )}

        {source === "paste" && (
          <Field label="REDAGENT REPORT (JSON)">
            <textarea
              value={pasted}
              onChange={(e) => {
                setPasted(e.target.value);
                setPastedName("");
              }}
              rows={10}
              spellCheck={false}
              placeholder='{ "engagement_id": "...", "findings": [ ... ] }'
              className="w-full bg-background/60 border border-border/30 rounded-sm px-3 py-2.5 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors resize-y"
            />
            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-border/30 rounded-sm font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-accent hover:border-accent/40 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" /> upload .json
              </button>
              {pastedName && (
                <span className="font-mono text-[11px] text-accent truncate">
                  {pastedName}
                </span>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </div>
          </Field>
        )}
      </div>

      {/* Options */}
      <div className="border border-border/15 rounded-sm mt-5">
        <button
          type="button"
          onClick={() => setShowAdv((s) => !s)}
          className="w-full flex items-center justify-between px-4 py-3 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>Analysis options</span>
          <ChevronDown
            className={cn("w-4 h-4 transition-transform", showAdv && "rotate-180")}
          />
        </button>
        {showAdv && (
          <div className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border/15">
            <Field
              label="OFFLINE (heuristics only)"
              hint="Deterministic rules, no LLM — returns in about a second."
            >
              <Toggle
                value={opts.offline}
                onChange={(v) => setOpts((p) => ({ ...p, offline: v }))}
                onLabel="offline"
                offLabel="use llm"
              />
            </Field>
            <Field
              label="FALL BACK TO HEURISTICS"
              hint="Off means an LLM failure fails the job instead of degrading."
            >
              <Toggle
                value={opts.allow_offline_fallback}
                onChange={(v) =>
                  setOpts((p) => ({ ...p, allow_offline_fallback: v }))
                }
                onLabel="allow"
                offLabel="strict"
              />
            </Field>
            <Field label="CONCURRENCY" hint="Findings analysed in parallel.">
              <input
                type="number"
                min={1}
                max={32}
                value={opts.concurrency}
                onChange={(e) =>
                  setOpts((p) => ({ ...p, concurrency: e.target.value }))
                }
                className="w-full bg-background/60 border border-border/30 rounded-sm px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-accent"
              />
            </Field>
            <Field label="TEMPERATURE">
              <input
                type="number"
                step="0.1"
                min={0}
                max={2}
                value={opts.temperature}
                onChange={(e) =>
                  setOpts((p) => ({ ...p, temperature: e.target.value }))
                }
                className="w-full bg-background/60 border border-border/30 rounded-sm px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-accent"
              />
            </Field>
            <Field label="MAX TOKENS">
              <input
                type="number"
                min={256}
                step={256}
                value={opts.max_tokens}
                onChange={(e) =>
                  setOpts((p) => ({ ...p, max_tokens: e.target.value }))
                }
                className="w-full bg-background/60 border border-border/30 rounded-sm px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-accent"
              />
            </Field>
            <Field label="MODEL (blank = server default)">
              <input
                value={opts.model_name}
                onChange={(e) =>
                  setOpts((p) => ({ ...p, model_name: e.target.value }))
                }
                placeholder={config?.llm?.model || "qwen3-32b"}
                spellCheck={false}
                className="w-full bg-background/60 border border-border/30 rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-accent"
              />
            </Field>
            <Field label="PROVIDER (blank = server default)">
              <input
                value={opts.llm_provider}
                onChange={(e) =>
                  setOpts((p) => ({ ...p, llm_provider: e.target.value }))
                }
                placeholder={config?.llm?.provider || "modal"}
                spellCheck={false}
                className="w-full bg-background/60 border border-border/30 rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-accent"
              />
            </Field>
          </div>
        )}
      </div>

      {opts.offline && (
        <div className="mt-4 flex items-start gap-3 p-3 border border-[#FFB020]/30 bg-[#FFB020]/5 rounded-sm">
          <ZapOff className="w-4 h-4 text-[#FFB020] shrink-0 mt-0.5" />
          <p className="font-mono text-[11px] text-foreground/80 leading-relaxed">
            <span className="text-[#FFB020] font-bold">OFFLINE MODE — </span>
            findings will be analysed by the deterministic rule engine. The
            report will be labelled rule-based, not AI analysis.
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 border border-destructive/40 bg-destructive/5 rounded-sm font-mono text-xs text-destructive flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <GlitchButton
        onClick={launch}
        disabled={submitting}
        variant="accent"
        className="w-full mt-5 py-3.5 text-base"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> QUEUEING…
          </>
        ) : (
          <>
            <Shield className="w-4 h-4" /> RUN BLUE ANALYSIS
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </GlitchButton>
    </div>
  );
}
