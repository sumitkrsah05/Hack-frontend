import React from "react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  primary:
    "bg-primary text-primary-foreground hover:glow-primary border border-primary/40",
  accent:
    "bg-accent text-accent-foreground hover:glow-accent border border-accent/40",
  danger:
    "bg-destructive text-destructive-foreground hover:glow-danger border border-destructive/40",
  ghost:
    "bg-transparent text-foreground border border-border/30 hover:border-primary/50 hover:text-primary",
  outline:
    "bg-transparent text-primary border border-primary/40 hover:bg-primary/10",
};

export default function GlitchButton({
  children,
  variant = "primary",
  className,
  glitchText,
  ...props
}) {
  const txt = glitchText || (typeof children === "string" ? children : "");
  return (
    <button
      data-text={txt}
      className={cn(
        "glitch-btn group relative inline-flex items-center justify-center gap-2 px-5 py-2.5 font-mono text-sm font-medium uppercase tracking-[0.14em] transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none focus-ring rounded-sm",
        VARIANTS[variant] || VARIANTS.primary,
        className
      )}
      {...props}
    >
      <span className="relative z-10 inline-flex items-center gap-2">
        {children}
      </span>
      {txt && (
        <>
          <span className="glitch-layer glitch-r font-mono text-sm uppercase tracking-[0.14em]">
            {txt}
          </span>
          <span className="glitch-layer glitch-b font-mono text-sm uppercase tracking-[0.14em]">
            {txt}
          </span>
        </>
      )}
    </button>
  );
}