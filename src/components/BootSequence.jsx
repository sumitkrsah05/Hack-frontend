import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks";

const LINES = [
  "> initializing redagent core...",
  "> loading scanner modules [nuclei, nikto, semgrep, gitleaks, trivy]",
  "> establishing tamper-evident audit chain...",
  "> audit chain: intact",
  "> calibrating safety gates // ROE lock",
  "> ready.",
];

export default function BootSequence({ onDone }) {
  const reduced = usePrefersReducedMotion();
  const [lines, setLines] = useState([]);
  const timer = useRef();

  useEffect(() => {
    if (reduced) {
      onDone();
      return;
    }
    let i = 0;
    let local = [];
    const step = () => {
      if (i >= LINES.length) {
        setTimeout(onDone, 280);
        return;
      }
      local = [...local, LINES[i]];
      setLines(local);
      i++;
      timer.current = setTimeout(step, 210);
    };
    step();
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (reduced) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-background grid-bg flex items-center justify-center cursor-pointer font-mono"
      onClick={() => {
        clearTimeout(timer.current);
        onDone();
      }}
    >
      <div className="w-full max-w-xl px-6">
        <div className="label-xs mb-4 text-primary/70">REDAGENT // BOOT</div>
        {lines.map((l, idx) => (
          <div key={idx} className="text-primary text-sm md:text-base mb-1.5">
            <span className="text-muted-foreground">
              [{String(idx + 1).padStart(2, "0")}]
            </span>{" "}
            {l}
          </div>
        ))}
        <span className="cursor-block" />
        <div className="mt-6 h-0.5 bg-secondary overflow-hidden">
          <div
            className="h-full bg-primary"
            style={{
              animation: "boot-bar 1.3s ease-out forwards",
              boxShadow: "0 0 10px hsl(var(--primary)/0.7)",
            }}
          />
        </div>
      </div>
    </div>
  );
}