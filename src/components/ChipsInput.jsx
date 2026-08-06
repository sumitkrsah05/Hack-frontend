import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ChipsInput({
  values = [],
  onChange,
  placeholder,
  id,
  className,
}) {
  const [input, setInput] = useState("");

  const add = (v) => {
    const t = v.trim();
    if (!t) return;
    if (!values.includes(t)) onChange([...values, t]);
    setInput("");
  };

  return (
    <div
      className={cn(
        "flex flex-wrap gap-1.5 p-2 border border-border/30 bg-background/60 rounded-sm focus-within:ring-1 focus-within:ring-accent focus-within:border-accent/50 min-h-[44px] transition-colors",
        className
      )}
    >
      {values.map((v) => (
        <span
          key={v}
          className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 bg-secondary border border-border/40 text-xs font-mono text-accent rounded-sm"
        >
          {v}
          <button
            type="button"
            onClick={() => onChange(values.filter((x) => x !== v))}
            className="text-muted-foreground hover:text-destructive transition-colors"
            aria-label={`remove ${v}`}
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(input);
          } else if (e.key === "Backspace" && !input && values.length) {
            onChange(values.slice(0, -1));
          }
        }}
        onBlur={() => input && add(input)}
        placeholder={values.length ? "" : placeholder}
        className="flex-1 min-w-[120px] bg-transparent outline-none font-mono text-sm text-foreground placeholder:text-muted-foreground/50"
      />
    </div>
  );
}