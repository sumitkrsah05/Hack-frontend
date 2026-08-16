const MAP = {
  queued: {
    label: "QUEUED",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
    glow: "",
    border: "border-border/30",
  },
  running: {
    label: "RUNNING",
    text: "text-severity-medium",
    dot: "bg-severity-medium animate-pulse",
    glow: "shadow-[0_0_14px_hsl(var(--severity-medium)/0.45)]",
    border: "border-severity-medium/40",
  },
  complete: {
    label: "COMPLETE",
    text: "text-primary",
    dot: "bg-primary",
    glow: "shadow-[0_0_14px_hsl(var(--primary)/0.5)]",
    border: "border-primary/50",
  },
  // BlueAgent spells the terminal success state "completed".
  completed: {
    label: "COMPLETED",
    text: "text-primary",
    dot: "bg-primary",
    glow: "shadow-[0_0_14px_hsl(var(--primary)/0.5)]",
    border: "border-primary/50",
  },
  error: {
    label: "ERROR",
    text: "text-destructive",
    dot: "bg-destructive",
    glow: "shadow-[0_0_14px_hsl(var(--destructive)/0.5)]",
    border: "border-destructive/50",
  },
  interrupted: {
    label: "INTERRUPTED",
    text: "text-destructive",
    dot: "bg-destructive",
    glow: "shadow-[0_0_14px_hsl(var(--destructive)/0.5)]",
    border: "border-destructive/50",
  },
};

export default function StatusBadge({ status }) {
  const s = MAP[status] || MAP.queued;
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 border ${s.border} bg-card/60 font-mono text-[11px] uppercase tracking-[0.18em] rounded-sm ${s.text} ${s.glow}`}
    >
      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}