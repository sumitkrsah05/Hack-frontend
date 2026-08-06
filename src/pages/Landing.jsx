import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck, Activity, Lock } from "lucide-react";
import { api } from "@/lib/api";
import GlitchButton from "@/components/GlitchButton";
import DecryptedText from "@/components/DecryptedText";
import MatrixRain from "@/components/MatrixRain";

const FEATURES = [
  "Black-box · Gray-box · White-box",
  "Tamper-evident audit chain",
  "Non-destructive ROE",
];

export default function Landing() {
  const navigate = useNavigate();
  const [health, setHealth] = useState("checking");

  useEffect(() => {
    let alive = true;
    api
      .health()
      .then(() => alive && setHealth("ok"))
      .catch(() => alive && setHealth("offline"));
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

        <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-border/30 bg-card/60 rounded-sm font-mono text-[10px] tracking-[0.2em] text-muted-foreground mb-8">
            <Activity className="w-3 h-3 text-primary" />
            OFFENSIVE SECURITY // CONSOLE
          </div>

          <h1 className="font-display font-extrabold tracking-tight leading-none">
            <DecryptedText
              text="RedAgent"
              className="block text-6xl md:text-8xl text-primary text-glow-primary"
              duration={1500}
            />
          </h1>

          <p className="mt-8 font-mono text-sm md:text-base text-foreground/80 max-w-xl mx-auto leading-relaxed">
            Safety-gated offensive security. Three modes. One console.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
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

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <span
              className={`inline-flex items-center gap-2 px-3 py-1.5 border rounded-sm font-mono text-[11px] tracking-[0.14em] ${
                health === "ok"
                  ? "border-primary/40 text-primary bg-primary/5"
                  : health === "offline"
                  ? "border-destructive/50 text-destructive bg-destructive/5"
                  : "border-border/30 text-muted-foreground"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  health === "ok"
                    ? "bg-primary animate-pulse"
                    : health === "offline"
                    ? "bg-destructive"
                    : "bg-muted-foreground"
                }`}
              />
              {health === "ok"
                ? "CORE: OK"
                : health === "offline"
                ? "CORE: OFFLINE"
                : "CORE: …"}
            </span>
          </div>
        </div>
      </section>

      {/* Feature strip */}
      <section className="relative border-t border-border/15 bg-[#0B0F11]">
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
            { k: "WHITE-BOX", d: "Static source analysis", icon: "▤", c: "text-[#FFB020]" },
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

      <footer className="border-t border-border/15 px-6 py-6 flex items-center justify-between font-mono text-[10px] text-muted-foreground/60 tracking-wider">
        <span className="inline-flex items-center gap-1.5">
          <Lock className="w-3 h-3" /> tamper-evident audit chain
        </span>
        <span>REDAGENT // v1.0</span>
      </footer>
    </div>
  );
}