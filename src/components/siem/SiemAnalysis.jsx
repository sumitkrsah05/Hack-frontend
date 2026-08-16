import React, { useEffect, useRef, useState } from "react";
import {
  Upload,
  ClipboardPaste,
  PlugZap,
  Database,
  Filter,
  Cpu,
  Shield,
  ArrowRight,
  ChevronDown,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  Clock3,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import GlitchButton from "@/components/GlitchButton";
import SiemResults from "@/components/siem/SiemResults";
import {
  SIEM_PLATFORMS,
  TIME_RANGES,
  SEVERITY_FILTERS,
  EVENT_TYPES,
  CAPABILITIES,
  RUN_PHASES,
  PASTE_PLACEHOLDER,
  MOCK_EVENTS,
} from "@/lib/siemMock";

const DATA_SOURCES = [
  {
    key: "upload",
    label: "UPLOAD LOGS",
    icon: Upload,
    blurb: "Drop exported telemetry — JSON, CSV, NDJSON, LOG or TXT.",
  },
  {
    key: "paste",
    label: "PASTE LOGS",
    icon: ClipboardPaste,
    blurb: "Paste raw events straight from your SIEM search window.",
  },
  {
    key: "api",
    label: "SIEM API",
    icon: PlugZap,
    blurb: "Pull events directly from a SIEM index over its REST API.",
  },
];

const inputCls =
  "w-full bg-background/60 border border-border/30 rounded-sm px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors";

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

function CollapsePanel({ icon: Icon, title, sub, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border/15 rounded-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-accent" />
          {title}
          {sub && (
            <span className="normal-case tracking-normal text-[10px] text-muted-foreground/70">
              {sub}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn("w-4 h-4 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && <div className="p-4 pt-1 border-t border-border/15">{children}</div>}
    </div>
  );
}

function CheckRow({ checked, onToggle, label, color }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex items-center gap-2.5 px-2.5 py-2 border rounded-sm font-mono text-[11px] uppercase tracking-wider text-left transition-all w-full",
        checked
          ? "border-accent/50 bg-accent/5 text-foreground"
          : "border-border/20 text-muted-foreground hover:text-foreground hover:border-border/50"
      )}
    >
      <span
        className={cn(
          "w-3.5 h-3.5 shrink-0 border rounded-[2px] flex items-center justify-center transition-colors",
          checked ? "border-accent bg-accent/20" : "border-border/40"
        )}
      >
        {checked && <span className="w-1.5 h-1.5 bg-accent" />}
      </span>
      <span style={color && checked ? { color } : undefined}>{label}</span>
    </button>
  );
}

// Normalized-event preview shown after NORMALIZE EVENTS — demonstrates the
// pipeline's target shape without any backend involvement.
function NormalizedPreview() {
  return (
    <div className="border border-accent/25 rounded-sm overflow-x-auto">
      <table className="w-full font-mono text-[11px]">
        <thead>
          <tr className="border-b border-border/20 text-left">
            {["TIME", "EVENT", "SEV", "SRC → DST", "USER"].map((h) => (
              <th key={h} className="label-xs px-3 py-2 font-normal whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MOCK_EVENTS.map((e, i) => (
            <tr key={i} className="border-b border-border/10 last:border-0">
              <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                {e.timestamp.slice(11, 19)}
              </td>
              <td className="px-3 py-2 text-foreground whitespace-nowrap">
                {e.eventType}
              </td>
              <td
                className="px-3 py-2 uppercase whitespace-nowrap"
                style={{
                  color: e.severity === "critical" ? "var(--c-danger)" : "var(--c-orange)",
                }}
              >
                {e.severity}
              </td>
              <td className="px-3 py-2 text-accent whitespace-nowrap">
                {e.sourceIp}
                {e.destinationIp ? ` → ${e.destinationIp}` : ""}
              </td>
              <td className="px-3 py-2 text-foreground whitespace-nowrap">
                {e.username}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export default function SiemAnalysis() {
  const fileRef = useRef(null);

  // input | running | results
  const [view, setView] = useState("input");
  const [dataSource, setDataSource] = useState("upload");
  const [error, setError] = useState(null);

  // Upload state
  const [stagedFile, setStagedFile] = useState(null);

  // Paste state
  const [pastedLogs, setPastedLogs] = useState("");
  const [normalized, setNormalized] = useState(null);

  // SIEM API state
  const [conn, setConn] = useState({
    platform: SIEM_PLATFORMS[0],
    url: "",
    token: "",
    index: "",
  });
  // idle | testing | ok
  const [connState, setConnState] = useState("idle");

  // Filters
  const [timeRange, setTimeRange] = useState("24h");
  const [severities, setSeverities] = useState(
    () => new Set(["critical", "high", "medium"])
  );
  const [eventTypes, setEventTypes] = useState(
    () => new Set(["Authentication", "Endpoint", "Process Execution"])
  );
  const [assets, setAssets] = useState({
    sourceIp: "",
    destinationIp: "",
    host: "",
    username: "",
  });

  // Engine capabilities — all on by default
  const [caps, setCaps] = useState(() => new Set(CAPABILITIES.map((c) => c.key)));

  // Run simulation
  const [phaseIdx, setPhaseIdx] = useState(0);

  useEffect(() => {
    if (view !== "running") return;
    if (phaseIdx >= RUN_PHASES.length) {
      const t = setTimeout(() => setView("results"), 350);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setPhaseIdx((i) => i + 1), 750);
    return () => clearTimeout(t);
  }, [view, phaseIdx]);

  const onFile = (file) => {
    if (!file) return;
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    setStagedFile({
      name: file.name,
      size: file.size,
      format: ["json", "csv", "ndjson", "log", "txt"].includes(ext)
        ? ext.toUpperCase()
        : "RAW",
      // Mock event count derived from file size — real parsing lands later.
      events: Math.max(12, Math.round(file.size / 1960)),
    });
    setError(null);
  };

  const normalizeEvents = () => {
    if (!pastedLogs.trim()) {
      setError("paste at least one event before normalizing");
      return;
    }
    const lines = pastedLogs.split("\n").filter((l) => l.trim()).length;
    setNormalized({ events: Math.max(lines, MOCK_EVENTS.length) });
    setError(null);
  };

  const testConnection = () => {
    if (!conn.url.trim()) {
      setError("enter the SIEM URL first");
      return;
    }
    setError(null);
    setConnState("testing");
    setTimeout(() => setConnState("ok"), 900);
  };

  const toggleSet = (setter) => (key) =>
    setter((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const sourceReady = () => {
    if (dataSource === "upload") return !!stagedFile;
    if (dataSource === "paste") return !!pastedLogs.trim();
    return connState === "ok";
  };

  const run = () => {
    if (!sourceReady()) {
      setError(
        dataSource === "upload"
          ? "select a log file first"
          : dataSource === "paste"
            ? "paste some events first"
            : "test the SIEM connection first"
      );
      return;
    }
    setError(null);
    setPhaseIdx(0);
    setView("running");
  };

  const eventsInScope =
    dataSource === "upload"
      ? stagedFile?.events
      : dataSource === "paste"
        ? normalized?.events
        : connState === "ok"
          ? 24821
          : null;

  if (view === "results") {
    return <SiemResults onReset={() => setView("input")} />;
  }

  if (view === "running") {
    return (
      <div className="panel p-8 mt-2">
        <div className="label-xs mb-6 flex items-center gap-2 text-accent">
          <Shield className="w-3.5 h-3.5" /> BLUE ENGINE — ANALYSIS IN PROGRESS
        </div>
        <div className="space-y-3.5">
          {RUN_PHASES.map((p, i) => {
            const done = i < phaseIdx;
            const active = i === phaseIdx;
            return (
              <div
                key={p}
                className={cn(
                  "flex items-center gap-3 font-mono text-xs tracking-wider transition-colors",
                  done
                    ? "text-primary"
                    : active
                      ? "text-accent"
                      : "text-muted-foreground/40"
                )}
              >
                {done ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : active ? (
                  <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                ) : (
                  <span className="w-3.5 h-3.5 shrink-0 border border-border/30 rounded-full" />
                )}
                {p}
              </div>
            );
          })}
        </div>
        <div className="mt-6 h-1 bg-secondary rounded-sm overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-700 ease-out"
            style={{
              width: `${Math.min(100, (phaseIdx / RUN_PHASES.length) * 100)}%`,
              boxShadow: "0 0 10px hsl(var(--accent)/0.6)",
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Data source */}
      <div>
        <div className="label-xs mb-2 flex items-center gap-2">
          <Database className="w-3 h-3 text-accent" /> DATA SOURCE
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {DATA_SOURCES.map((s) => {
            const active = dataSource === s.key;
            return (
              <button
                key={s.key}
                onClick={() => {
                  setDataSource(s.key);
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
        <p className="font-mono text-[11px] text-muted-foreground mb-3 leading-relaxed">
          {DATA_SOURCES.find((s) => s.key === dataSource)?.blurb}
        </p>

        <div className="panel p-5 space-y-4">
          {dataSource === "upload" && (
            <>
              {!stagedFile ? (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full border border-dashed border-border/40 hover:border-accent/50 rounded-sm py-10 flex flex-col items-center gap-3 text-muted-foreground hover:text-accent transition-colors group"
                >
                  <Upload className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <span className="font-mono text-xs uppercase tracking-[0.14em]">
                    select log file
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    .json · .csv · .ndjson · .log · .txt
                  </span>
                </button>
              ) : (
                <div className="border border-primary/30 bg-primary/5 rounded-sm p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span className="label-xs text-primary">FILE READY</span>
                  </div>
                  <div className="font-mono text-sm text-foreground mb-1 flex items-center gap-2">
                    <FileJson className="w-4 h-4 text-accent shrink-0" />
                    {stagedFile.name}
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground space-x-4">
                    <span className="text-accent">
                      {stagedFile.events.toLocaleString()} events detected
                    </span>
                    <span>{stagedFile.format} format</span>
                    <span>{formatSize(stagedFile.size)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStagedFile(null)}
                    className="mt-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-destructive transition-colors"
                  >
                    × remove file
                  </button>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".json,.csv,.ndjson,.log,.txt,application/json,text/csv,text/plain"
                className="hidden"
                onChange={(e) => {
                  onFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </>
          )}

          {dataSource === "paste" && (
            <>
              <Field label="RAW EVENTS (JSON / NDJSON / SYSLOG)">
                <textarea
                  value={pastedLogs}
                  onChange={(e) => {
                    setPastedLogs(e.target.value);
                    setNormalized(null);
                  }}
                  rows={10}
                  spellCheck={false}
                  placeholder={PASTE_PLACEHOLDER}
                  className={cn(inputCls, "font-mono text-xs resize-y")}
                />
              </Field>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={normalizeEvents}
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-accent/40 text-accent rounded-sm font-mono text-[11px] uppercase tracking-wider hover:bg-accent/10 transition-colors"
                >
                  <Wand2 className="w-3.5 h-3.5" /> NORMALIZE EVENTS
                </button>
                {normalized && (
                  <span className="font-mono text-[11px] text-primary">
                    ✓ {normalized.events.toLocaleString()} events normalized
                  </span>
                )}
              </div>
              {normalized && <NormalizedPreview />}
            </>
          )}

          {dataSource === "api" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="SIEM PLATFORM">
                  <select
                    value={conn.platform}
                    onChange={(e) => {
                      setConn((p) => ({ ...p, platform: e.target.value }));
                      setConnState("idle");
                    }}
                    className={cn(inputCls, "appearance-none cursor-pointer")}
                  >
                    {SIEM_PLATFORMS.map((p) => (
                      <option key={p} value={p} className="bg-surface-1">
                        {p}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="SIEM URL">
                  <input
                    value={conn.url}
                    onChange={(e) => {
                      setConn((p) => ({ ...p, url: e.target.value }));
                      setConnState("idle");
                    }}
                    placeholder="https://siem.internal:8089"
                    spellCheck={false}
                    className={inputCls}
                  />
                </Field>
                <Field label="API TOKEN">
                  <input
                    type="password"
                    value={conn.token}
                    onChange={(e) =>
                      setConn((p) => ({ ...p, token: e.target.value }))
                    }
                    placeholder="••••••••••••••••"
                    spellCheck={false}
                    className={inputCls}
                  />
                </Field>
                <Field label="INDEX / DATA SOURCE">
                  <input
                    value={conn.index}
                    onChange={(e) =>
                      setConn((p) => ({ ...p, index: e.target.value }))
                    }
                    placeholder="security-events-*"
                    spellCheck={false}
                    className={inputCls}
                  />
                </Field>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={testConnection}
                  disabled={connState === "testing"}
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-accent/40 text-accent rounded-sm font-mono text-[11px] uppercase tracking-wider hover:bg-accent/10 transition-colors disabled:opacity-50"
                >
                  {connState === "testing" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <PlugZap className="w-3.5 h-3.5" />
                  )}
                  TEST CONNECTION
                </button>
                {connState === "ok" && (
                  <span className="font-mono text-[11px] text-primary">
                    ✓ CONNECTION SUCCESSFUL · Events available: 24,821
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Analysis filters */}
      <CollapsePanel
        icon={Filter}
        title="ANALYSIS FILTERS"
        sub={`· ${TIME_RANGES.find((t) => t.key === timeRange)?.label.toLowerCase()}`}
      >
        <div className="space-y-5 pt-3">
          <div>
            <div className="label-xs mb-2 flex items-center gap-1.5">
              <Clock3 className="w-3 h-3" /> TIME RANGE
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TIME_RANGES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTimeRange(t.key)}
                  className={cn(
                    "px-2.5 py-1.5 border rounded-sm font-mono text-[11px] tracking-wider transition-all",
                    timeRange === t.key
                      ? "border-accent/60 text-accent bg-accent/10"
                      : "border-border/25 text-muted-foreground hover:text-foreground hover:border-border/50"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {timeRange === "custom" && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Field label="FROM">
                  <input type="datetime-local" className={inputCls} />
                </Field>
                <Field label="TO">
                  <input type="datetime-local" className={inputCls} />
                </Field>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <div className="label-xs mb-2">SEVERITY</div>
              <div className="space-y-1.5">
                {SEVERITY_FILTERS.map((s) => (
                  <CheckRow
                    key={s.key}
                    checked={severities.has(s.key)}
                    onToggle={() => toggleSet(setSeverities)(s.key)}
                    label={s.label}
                    color={s.color}
                  />
                ))}
              </div>
            </div>
            <div>
              <div className="label-xs mb-2">EVENT TYPE</div>
              <div className="flex flex-wrap gap-1.5">
                {EVENT_TYPES.map((t) => {
                  const on = eventTypes.has(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleSet(setEventTypes)(t)}
                      className={cn(
                        "px-2.5 py-1.5 border rounded-sm font-mono text-[11px] tracking-wider transition-all",
                        on
                          ? "border-accent/60 text-accent bg-accent/10"
                          : "border-border/25 text-muted-foreground hover:text-foreground hover:border-border/50"
                      )}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <div className="label-xs mb-2">ASSETS</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                ["sourceIp", "SOURCE IP", "10.20.4.15"],
                ["destinationIp", "DESTINATION IP", "10.20.4.10"],
                ["host", "HOST", "AD-SERVER-01"],
                ["username", "USERNAME", "admin"],
              ].map(([key, label, ph]) => (
                <Field key={key} label={label}>
                  <input
                    value={assets[key]}
                    onChange={(e) =>
                      setAssets((p) => ({ ...p, [key]: e.target.value }))
                    }
                    placeholder={ph}
                    spellCheck={false}
                    className={inputCls}
                  />
                </Field>
              ))}
            </div>
          </div>
        </div>
      </CollapsePanel>

      {/* Analysis engine */}
      <CollapsePanel
        icon={Cpu}
        title="ANALYSIS ENGINE"
        sub={`· ${caps.size}/${CAPABILITIES.length} modules`}
        defaultOpen
      >
        <div className="pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {CAPABILITIES.map((c) => (
              <CheckRow
                key={c.key}
                checked={caps.has(c.key)}
                onToggle={() => toggleSet(setCaps)(c.key)}
                label={c.label}
              />
            ))}
          </div>
          <div className="mt-4 border-l-2 border-accent/40 pl-3">
            <div className="label-xs text-accent mb-1">BLUE ENGINE</div>
            <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
              Normalize telemetry, correlate security events, identify
              suspicious activity and generate prioritized defensive
              recommendations.
            </p>
          </div>
        </div>
      </CollapsePanel>

      {error && (
        <div className="p-3 border border-destructive/40 bg-destructive/5 rounded-sm font-mono text-xs text-destructive flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <GlitchButton
        onClick={run}
        variant="accent"
        className="w-full py-3.5 text-base"
        glitchText="RUN BLUE ANALYSIS"
      >
        <Shield className="w-4 h-4" /> RUN BLUE ANALYSIS
        {eventsInScope != null && (
          <span className="font-mono text-[11px] opacity-70">
            [{eventsInScope.toLocaleString()} events]
          </span>
        )}
        <ArrowRight className="w-4 h-4" />
      </GlitchButton>
    </div>
  );
}
