import React from "react";
import { cn, alpha } from "@/lib/utils";

export default function TeamBadge({ color, icon: Icon, label, sub, className }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-sm font-mono font-bold text-sm tracking-[0.16em]",
        className
      )}
      style={{
        color,
        background: `${alpha(color, 8)}`,
        border: `1px solid ${alpha(color, 25)}`,
      }}
    >
      {Icon && <Icon style={{ width: 18, height: 18 }} />}
      {label}
      {sub && (
        <span className="font-normal text-muted-foreground tracking-[0.2em] text-[10px] uppercase">
          {sub}
        </span>
      )}
    </div>
  );
}
