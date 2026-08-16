import React, { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Collapsible, syntax-highlighted raw JSON viewer.
export default function JSONView({ data, title = "report.json" }) {
  const [open, setOpen] = useState(false);
  const html = useMemo(() => {
    const json = JSON.stringify(data, null, 2);
    return json
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(
        /("(\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+\.?\d*/g,
        (m, str, colon, bool) => {
          if (str)
            return colon
              ? `<span style="color:var(--c-accent)">${str}</span>${colon}`
              : `<span style="color:var(--c-primary)">${str}</span>`;
          if (bool) return `<span style="color:var(--c-warn)">${m}</span>`;
          return `<span style="color:var(--c-orange)">${m}</span>`;
        }
      );
  }, [data]);

  return (
    <div className="panel">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 border-b border-border/15 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>{title}</span>
        <ChevronDown
          className={cn("w-4 h-4 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <pre
          className="overflow-x-auto p-4 font-mono text-[11px] leading-relaxed text-foreground/80 max-h-96"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
}
