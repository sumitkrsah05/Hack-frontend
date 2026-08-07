import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  Terminal,
  Crosshair,
  ListTree,
  Settings,
  ShieldCheck,
  Shield,
  Stethoscope,
} from "lucide-react";
import { api } from "@/lib/api";
import { blueApi, BLUE_DEFAULT_BASE } from "@/lib/blueApi";
import { useScanStore } from "@/lib/scanStore";
import { cn } from "@/lib/utils";
import BootSequence from "@/components/BootSequence";
import ScanlineSweep from "@/components/ScanlineSweep";

const RED_NAV = [
  { to: "/", label: "Home", icon: Terminal, match: (p) => p === "/" },
  {
    to: "/scan",
    label: "New Scan",
    icon: Crosshair,
    match: (p) => p.startsWith("/scan") || p.startsWith("/monitor"),
  },
  {
    to: "/history",
    label: "History",
    icon: ListTree,
    match: (p) => p.startsWith("/history") || p.startsWith("/report"),
  },
];

const BLUE_NAV = [
  {
    to: "/blue",
    label: "Analyze",
    icon: Shield,
    match: (p) =>
      p === "/blue" || p.startsWith("/blue/monitor") || p.startsWith("/blue/report"),
  },
  {
    to: "/blue/history",
    label: "Analyses",
    icon: Stethoscope,
    match: (p) => p.startsWith("/blue/history"),
  },
];

function HealthChip({ status, label, accent = "primary" }) {
  const tone =
    accent === "accent"
      ? { c: "text-accent", d: "bg-accent animate-pulse" }
      : { c: "text-primary", d: "bg-primary animate-pulse" };
  const map = {
    ok: { ...tone, t: `${label}: OK` },
    offline: {
      c: "text-destructive",
      d: "bg-destructive",
      t: `${label}: OFFLINE`,
    },
    checking: {
      c: "text-muted-foreground",
      d: "bg-muted-foreground",
      t: `${label}: …`,
    },
  };
  const s = map[status] || map.checking;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 border border-border/30 bg-card/60 font-mono text-[10px] tracking-[0.14em] rounded-sm",
        s.c
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", s.d)} />
      {s.t}
    </span>
  );
}

function ApiBaseEditor({ label, value, onSave, fallback, accentClass }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-2 py-1.5 border border-border/20 hover:border-accent/40 rounded-sm text-left transition-colors"
      >
        <Settings className="w-3 h-3 text-accent shrink-0" />
        <span className="font-mono text-[10px] text-muted-foreground truncate">
          {value}
        </span>
      </button>
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 panel-raised p-3 z-50">
          <div className="label-xs mb-1.5">{label}</div>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full bg-background border border-border/40 rounded-sm px-2 py-1.5 font-mono text-xs text-foreground outline-none focus:border-accent"
            spellCheck={false}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                onSave(draft);
                setOpen(false);
              }}
              className={cn(
                "flex-1 font-mono text-[11px] uppercase tracking-wider py-1.5 rounded-sm",
                accentClass
              )}
            >
              Save
            </button>
            <button
              onClick={() => setDraft(fallback)}
              className="px-2 border border-border/40 text-muted-foreground font-mono text-[11px] rounded-sm hover:text-foreground"
            >
              reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NavGroup({ title, items, pathname, onNavigate, accent }) {
  const activeCls =
    accent === "accent"
      ? "bg-accent/10 text-accent border-accent/30 glow-accent"
      : "bg-primary/10 text-primary border-primary/30 glow-primary";
  return (
    <div className="space-y-1">
      <div className="label-xs px-3 pt-3 pb-1">{title}</div>
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-sm font-mono text-xs uppercase tracking-[0.14em] transition-all border border-transparent",
            item.match(pathname)
              ? activeCls
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          )}
        >
          <item.icon className="w-4 h-4" />
          {item.label}
        </Link>
      ))}
    </div>
  );
}

export default function Layout() {
  const location = useLocation();
  const {
    booted,
    finishBoot,
    apiBase,
    setApiBase,
    blueApiBase,
    setBlueApiBase,
  } = useScanStore();
  const [health, setHealth] = useState("checking");
  const [blueHealth, setBlueHealth] = useState("checking");
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    let alive = true;
    const poll = () => {
      api
        .health()
        .then(() => alive && setHealth("ok"))
        .catch(() => alive && setHealth("offline"));
      blueApi
        .health()
        .then(() => alive && setBlueHealth("ok"))
        .catch(() => alive && setBlueHealth("offline"));
    };
    poll();
    const id = setInterval(poll, 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [apiBase, blueApiBase]);

  const closeNav = () => setMobileNav(false);

  return (
    <div className="relative min-h-screen flex bg-background scanlines crt-noise">
      {!booted && <BootSequence onDone={finishBoot} />}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static z-40 inset-y-0 left-0 w-60 shrink-0 bg-[#0B0F11] border-r border-border/15 flex flex-col transition-transform duration-300",
          mobileNav ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <Link
          to="/"
          onClick={closeNav}
          className="flex items-center gap-2.5 px-5 h-16 border-b border-border/15"
        >
          <span className="relative">
            <ShieldCheck
              className="w-6 h-6 text-primary"
              style={{ filter: "drop-shadow(0 0 6px rgba(0,255,156,0.6))" }}
            />
          </span>
          <div className="leading-none">
            <div className="font-mono font-bold text-foreground text-sm tracking-tight">
              Red<span className="text-primary">Agent</span>
              <span className="text-muted-foreground"> / </span>
              <span className="text-accent">Blue</span>
            </div>
            <div className="font-mono text-[9px] text-muted-foreground tracking-[0.2em] mt-0.5">
              OPSEC CONSOLE
            </div>
          </div>
        </Link>

        <nav className="flex-1 p-3 overflow-y-auto">
          <NavGroup
            title="// RED — OFFENSE"
            items={RED_NAV}
            pathname={location.pathname}
            onNavigate={closeNav}
          />
          <NavGroup
            title="// BLUE — DEFENSE"
            items={BLUE_NAV}
            pathname={location.pathname}
            onNavigate={closeNav}
            accent="accent"
          />
        </nav>

        <div className="p-3 space-y-2 border-t border-border/15">
          <div className="flex flex-col gap-1.5">
            <HealthChip status={health} label="RED CORE" />
            <ApiBaseEditor
              label="API_BASE_URL (red · 8000)"
              value={apiBase}
              onSave={setApiBase}
              fallback="http://localhost:8000"
              accentClass="bg-primary text-primary-foreground hover:glow-primary"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <HealthChip status={blueHealth} label="BLUE CORE" accent="accent" />
            <ApiBaseEditor
              label="BLUE_API_BASE_URL (blue · 8001)"
              value={blueApiBase}
              onSave={setBlueApiBase}
              fallback={BLUE_DEFAULT_BASE}
              accentClass="bg-accent text-accent-foreground hover:glow-accent"
            />
          </div>
          <div className="font-mono text-[9px] text-muted-foreground/60 leading-relaxed pt-1">
            v1.0 · safety-gated
            <br />
            offensive + defensive
          </div>
        </div>
      </aside>

      {mobileNav && (
        <div
          className="fixed inset-0 z-30 bg-background/70 lg:hidden"
          onClick={closeNav}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between h-14 px-4 border-b border-border/15 bg-[#0B0F11]">
          <button
            onClick={() => setMobileNav((n) => !n)}
            className="font-mono text-xs text-primary uppercase tracking-wider"
          >
            ☰ menu
          </button>
          <span className="font-mono text-sm font-bold">
            Red<span className="text-primary">Agent</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-accent">Blue</span>
          </span>
          <span className="w-8" />
        </header>

        <main className="relative flex-1 grid-bg overflow-y-auto">
          <ScanlineSweep trigger={location.pathname} />
          <div
            key={location.pathname}
            style={{ animation: "float-up 0.35s ease-out both" }}
            className="min-h-full"
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
