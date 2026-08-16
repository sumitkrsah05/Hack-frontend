import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crosshair, Cloud, FileCode2, ArrowRight, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import DecryptedText from "@/components/DecryptedText";
import TeamBadge from "@/components/TeamBadge";
import { alpha } from "@/lib/utils";

const STATIC_MODES = {
  black_box: {
    name: "BLACK-BOX",
    desc: "External / network attack.",
    tools: ["nmap", "nuclei", "nikto"],
    provide: "a target URL / host.",
    icon: Crosshair,
    color: "var(--c-primary)",
  },
  gray_box: {
    name: "GRAY-BOX",
    desc: "Cloud / config assessment.",
    tools: ["prowler", "trivy"],
    provide: "cloud account IDs.",
    icon: Cloud,
    color: "var(--c-accent)",
  },
  white_box: {
    name: "WHITE-BOX",
    desc: "Static source analysis (SAST).",
    tools: ["semgrep", "gitleaks", "checkov", "trivy"],
    provide: "server-side repo paths.",
    icon: FileCode2,
    color: "var(--c-warn)",
  },
};

export default function ModeSelector() {
  const navigate = useNavigate();
  const [modes, setModes] = useState(STATIC_MODES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .getModes()
      .then((data) => {
        if (!alive) return;
        // The API wraps the contract: {"modes": {black_box: {...}, ...}}
        const spec = data && typeof data === "object" ? data.modes || data : null;
        if (!spec) return;
        // Presentation (icon/color/copy) stays local; the server owns the toolchain.
        setModes((prev) => {
          const next = { ...prev };
          for (const key of Object.keys(next)) {
            const tools = spec[key]?.tools;
            if (Array.isArray(tools) && tools.length)
              next[key] = { ...next[key], tools };
          }
          return next;
        });
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const entries = Object.entries(modes).filter(([k]) => STATIC_MODES[k]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <TeamBadge
        color="var(--c-red-team)"
        icon={Crosshair}
        label="RED TEAM"
        sub="Attack Simulation"
        className="mb-6"
      />
      <div className="label-xs mb-3">// STEP 01 — SELECT ENGAGEMENT MODE</div>
      <h1 className="font-display font-bold text-3xl md:text-4xl text-foreground mb-2">
        <DecryptedText text="AI Scenerio Orchestration Engine" />
      </h1>
      <p className="font-mono text-sm text-muted-foreground mb-10">
        Each mode runs a fixed toolchain under a safety-gated, audited ROE.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground font-mono text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          fetching mode contract from /api/v1/modes…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {entries.map(([key, meta], i) => {
            const Icon = meta.icon || Crosshair;
            const color = meta.color || "var(--c-primary)";
            return (
              <button
                key={key}
                onClick={() => navigate(`/scan/${key}`)}
                className="group relative text-left panel p-6 hover:border-primary/50 hover:-translate-y-1 transition-all duration-200 overflow-hidden"
                style={{ animation: `float-up 0.4s ease-out ${i * 0.08}s both` }}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: `radial-gradient(circle at 50% 0%, ${alpha(color, 8)}, transparent 70%)`,
                  }}
                />
                <div className="relative">
                  <div className="flex items-center justify-between mb-5">
                    <Icon
                      className="w-8 h-8"
                      style={{ color, filter: `drop-shadow(0 0 8px ${alpha(color, 50)})` }}
                    />
                    <span className="font-mono text-[9px] text-muted-foreground/50 tracking-widest">
                      0{i + 1}
                    </span>
                  </div>
                  <div
                    className="font-mono font-bold text-lg tracking-wide"
                    style={{ color }}
                  >
                    {meta.name}
                  </div>
                  <p className="font-mono text-xs text-foreground/70 mt-1.5 mb-5 leading-relaxed">
                    {meta.desc}
                  </p>

                  <div className="space-y-3 border-t border-border/15 pt-4">
                    <div>
                      <div className="label-xs mb-1.5">TOOLS</div>
                      <div className="flex flex-wrap gap-1">
                        {meta.tools.map((t) => (
                          <span
                            key={t}
                            className="px-1.5 py-0.5 bg-secondary border border-border/30 font-mono text-[10px] text-foreground/80 rounded-sm"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="label-xs mb-1">YOU PROVIDE</div>
                      <div className="font-mono text-xs text-foreground/70">
                        {meta.provide}
                      </div>
                    </div>
                  </div>

                  <div
                    className="mt-5 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color }}
                  >
                    configure <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}