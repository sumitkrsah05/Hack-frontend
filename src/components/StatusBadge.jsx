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
    text: "text-[#FFB020]",
    dot: "bg-[#FFB020] animate-pulse",
    glow: "shadow-[0_0_14px_rgba(255,176,32,0.45)]",
    border: "border-[#FFB020]/40",
  },
  complete: {
    label: "COMPLETE",
    text: "text-primary",
    dot: "bg-primary",
    glow: "shadow-[0_0_14px_rgba(0,255,156,0.5)]",
    border: "border-primary/50",
  },
  error: {
    label: "ERROR",
    text: "text-destructive",
    dot: "bg-destructive",
    glow: "shadow-[0_0_14px_rgba(255,46,99,0.5)]",
    border: "border-destructive/50",
  },
  interrupted: {
    label: "INTERRUPTED",
    text: "text-destructive",
    dot: "bg-destructive",
    glow: "shadow-[0_0_14px_rgba(255,46,99,0.5)]",
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