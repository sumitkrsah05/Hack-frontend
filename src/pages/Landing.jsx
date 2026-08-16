import React, { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck, Activity, Lock, Shield } from "lucide-react";
import { api } from "@/lib/api";
import { blueApi } from "@/lib/blueApi";
import GlitchButton from "@/components/GlitchButton";
import DecryptedText from "@/components/DecryptedText";
import MatrixRain from "@/components/MatrixRain";
const KavachShield = lazy(() => import("@/components/KavachShield"));
const HeroKavachDefense = lazy(() => import("@/components/HeroKavachDefense"));

const FEATURES = [
  "Black-box · Gray-box · White-box",
  "Tamper-evident audit chain",
  "Non-destructive ROE",
];

function CoreChip({ health, label, tone = "primary" }) {
  const on =
    tone === "accent"
      ? "border-accent/40 text-accent bg-accent/5"
      : "border-primary/40 text-primary bg-primary/5";
  const dot = tone === "accent" ? "bg-accent" : "bg-primary";
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 border rounded-sm font-mono text-[11px] tracking-[0.14em] ${
        health === "ok"
          ? on
          : health === "offline"
          ? "border-destructive/50 text-destructive bg-destructive/5"
          : "border-border/30 text-muted-foreground"
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          health === "ok"
            ? `${dot} animate-pulse`
            : health === "offline"
            ? "bg-destructive"
            : "bg-muted-foreground"
        }`}
      />
      {label}:{" "}
      {health === "ok" ? "OK" : health === "offline" ? "OFFLINE" : "…"}
    </span>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [health, setHealth] = useState("checking");
  const [blueHealth, setBlueHealth] = useState("checking");

  useEffect(() => {
    let alive = true;
    api
      .health()
      .then(() => alive && setHealth("ok"))
      .catch(() => alive && setHealth("offline"));
    blueApi
      .health()
      .then(() => alive && setBlueHealth("ok"))
      .catch(() => alive && setBlueHealth("offline"));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="relative min-h-full">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <MatrixRain className="w-full h-full" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-14 lg:pt-24 lg:pb-20 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,44%)] gap-8 lg:gap-4 items-center">
          {/* Left — existing hero content */}
          <div className="relative z-10 text-center lg:text-left">
            <img
              src="/esds-logo.png"
              alt="ESDS"
              className="h-20 md:h-24 mx-auto lg:mx-0 mb-6 select-none"
              draggable="false"
            />
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-border/30 bg-card/60 rounded-sm font-mono text-[10px] tracking-[0.2em] text-muted-foreground mb-8">
              <Activity className="w-3 h-3 text-primary" />
              OFFENSIVE SECURITY // CONSOLE
            </div>

            <h1 className="font-display font-extrabold tracking-tight leading-none">
              <DecryptedText
                text="SWARAJ CHAKRA"
                className="block text-5xl sm:text-6xl md:text-7xl 2xl:text-8xl"
                style={{
                  background:
                    "linear-gradient(90deg, #FF9933 0%, #FF9933 32%, var(--flag-white) 50%, #2EB82C 68%, #2EB82C 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  filter: "drop-shadow(0 0 18px rgba(255,153,51,0.25))",
                }}
                duration={1500}
              />
            </h1>

            <p className="mt-8 font-mono text-sm md:text-base text-foreground/80 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              AI Security Validation Platform. Safety-gated offensive security. Three modes. One console.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <GlitchButton
                onClick={() => navigate("/scan")}
                className="px-8 py-3.5 text-base"
              >
                <span className="cursor-block mr-1" />
                INITIATE SCAN
                <ArrowRight className="w-4 h-4" />
              </GlitchButton>
              <button
                onClick={() => navigate("/history")}
                className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground hover:text-accent transition-colors px-4 py-2"
              >
                view history →
              </button>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <CoreChip health={health} label="RED CORE" />
              <CoreChip health={blueHealth} label="BLUE CORE" tone="accent" />
            </div>
          </div>

          {/* Right — Kavach live defense animation */}
          <div className="relative h-[260px] sm:h-[320px] lg:h-[520px] pointer-events-none select-none">
            <Suspense fallback={null}>
              <HeroKavachDefense className="absolute inset-0" />
            </Suspense>
            <div className="absolute top-1 right-1 font-mono text-[9px] tracking-[0.2em] text-primary/50">
              KAVACH SHIELD // ACTIVE
            </div>
            <div className="absolute bottom-1 right-1 font-mono text-[9px] tracking-[0.2em] text-muted-foreground/50">
              THREATS: DEFLECTED
            </div>
          </div>
        </div>
      </section>

      {/* Feature strip */}
      <section className="relative border-t border-border/15 bg-surface-0">
        <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <div
              key={f}
              className="flex items-center gap-3"
              style={{ animation: `float-up 0.4s ease-out ${i * 0.1}s both` }}
            >
              <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              <span className="font-mono text-xs text-muted-foreground tracking-wide">
                {f}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Modes preview */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="label-xs mb-6">CAPABILITIES</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { k: "BLACK-BOX", d: "External / network attack", icon: "▚", c: "text-primary" },
            { k: "GRAY-BOX", d: "Cloud / config assessment", icon: "◈", c: "text-accent" },
            { k: "WHITE-BOX", d: "Static source analysis", icon: "▤", c: "text-severity-medium" },
          ].map((m) => (
            <div
              key={m.k}
              className="panel p-5 hover:border-primary/40 transition-colors group cursor-default"
            >
              <div className={`font-mono text-2xl mb-3 ${m.c}`}>{m.icon}</div>
              <div className={`font-mono text-sm font-bold tracking-wide ${m.c}`}>
                {m.k}
              </div>
              <div className="font-mono text-xs text-muted-foreground mt-1">
                {m.d}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Kavach — active defense layer */}
      <section className="relative border-t border-border/15 overflow-hidden">
        <div className="absolute inset-0 dot-bg opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.06),transparent_65%)]" />

        <div className="relative max-w-5xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-6 items-center">
          {/* Copy */}
          <div>
            <div className="label-xs mb-6">// KAVACH — ACTIVE DEFENSE LAYER</div>
            <h2 className="font-display font-extrabold text-3xl md:text-4xl tracking-tight leading-tight">
              <span className="text-glow-primary text-primary">ARMOUR</span>{" "}
              <span className="text-foreground">FOR YOUR</span>
              <br />
              <span className="text-foreground">ENTIRE STACK</span>
            </h2>
            <p className="mt-5 font-mono text-sm text-foreground/75 leading-relaxed max-w-md">
              Kavach wraps every engagement in a live protective layer —
              continuously scanning the perimeter, gating unsafe actions, and
              sealing findings into a tamper-evident audit chain. Offense runs
              hot; the platform stays shielded.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-3 max-w-md">
              {[
                ["SHIELD", "ACTIVE", "text-primary"],
                ["SCAN", "CONTINUOUS", "text-accent"],
                ["INTEGRITY", "100%", "text-primary"],
              ].map(([k, v, c]) => (
                <div key={k} className="panel p-3 text-center">
                  <div className="label-xs">{k}</div>
                  <div className={`font-mono text-xs font-bold mt-1.5 tracking-wide ${c}`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle animate-pulse ${c === "text-accent" ? "bg-accent" : "bg-primary"}`} />
                    {v}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3D shield */}
          <div className="relative h-[320px] sm:h-[400px] md:h-[460px]">
            {/* corner brackets */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t border-l border-primary/40" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-primary/40" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-primary/40" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b border-r border-primary/40" />

            <Suspense fallback={null}>
              <KavachShield className="absolute inset-0" />
            </Suspense>

            <div className="absolute top-2 left-3 font-mono text-[9px] tracking-[0.2em] text-primary/60">
              KVCH-01 // PERIMETER
            </div>
            <div className="absolute bottom-2 right-3 font-mono text-[9px] tracking-[0.2em] text-muted-foreground/60">
              STATUS: SHIELDED
            </div>
          </div>
        </div>
      </section>

      {/* Blue team handoff */}
      <section className="border-t border-border/15 bg-surface-0">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="label-xs mb-6 text-accent">// THEN, THE BLUE SIDE</div>
          <div className="flex flex-col md:flex-row md:items-center gap-8">
            <div className="flex-1">
              <h2 className="font-display font-bold text-2xl md:text-3xl text-accent text-glow-accent mb-3">
                BlueAgent
              </h2>
              <p className="font-mono text-sm text-foreground/75 leading-relaxed mb-5 max-w-xl">
                Every red engagement can be handed straight to the defensive
                agent. It analyses each finding for root cause and business
                impact, maps it to MITRE ATT&amp;CK, scores likelihood against
                impact, and returns prioritised remediation with detection
                rules.
              </p>
              <GlitchButton
                onClick={() => navigate("/blue")}
                variant="accent"
                className="px-6"
              >
                <Shield className="w-4 h-4" /> RUN BLUE ANALYSIS
                <ArrowRight className="w-4 h-4" />
              </GlitchButton>
            </div>
            <div className="grid grid-cols-2 gap-3 md:w-80 shrink-0">
              {[
                ["ROOT CAUSE", "why it exists"],
                ["MITRE ATT&CK", "tactics + techniques"],
                ["RISK SCORE", "P0 → P3 priority"],
                ["DETECTION", "log source + signal"],
              ].map(([k, d]) => (
                <div key={k} className="panel p-3">
                  <div className="font-mono text-[11px] text-accent tracking-wide">
                    {k}
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground mt-1">
                    {d}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/15 px-6 py-6 flex items-center justify-between font-mono text-[10px] text-muted-foreground/60 tracking-wider">
        <span className="inline-flex items-center gap-1.5">
          <Lock className="w-3 h-3" /> tamper-evident audit chain
        </span>
        <span>REDAGENT // v1.0</span>
      </footer>
    </div>
  );
}