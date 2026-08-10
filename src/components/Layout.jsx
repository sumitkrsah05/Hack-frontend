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
  ScrollText,
  Blend,
  Menu,
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
    match: (p) => p === "/blue" || p.startsWith("/blue/monitor"),
  },
];

const PURPLE_NAV = [
  {
    to: "/blue/history",
    label: "Analyses",
    icon: Stethoscope,
    match: (p) => p.startsWith("/blue/history") || p.startsWith("/blue/report"),
  },
];

const GOVERNANCE_NAV = [
  {
    to: "/roe",
    label: "ROE & Scope",
    icon: ScrollText,
    match: (p) => p.startsWith("/roe"),
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

function NavGroup({ team, items, pathname, onNavigate }) {
  const { color, label, sub, Icon } = team;
  return (
    <div
      className="rounded-md border overflow-hidden"
      style={{
        borderColor: `${color}33`,
        background: `linear-gradient(180deg, ${color}0D, transparent 60%)`,
      }}
    >
      {/* Team header */}
      <div
        className="flex items-center gap-2.5 px-3 py-2.5 border-b"
        style={{ borderColor: `${color}22`, background: `${color}0F` }}
      >
        <span
          className="flex items-center justify-center w-7 h-7 rounded-sm shrink-0"
          style={{
            background: `${color}1A`,
            border: `1px solid ${color}40`,
          }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </span>
        <div className="leading-tight min-w-0">
          <div
            className="font-mono font-bold text-[11px] tracking-[0.16em]"
            style={{ color }}
          >
            {label}
          </div>
          <div className="font-mono text-[8px] text-muted-foreground tracking-[0.2em] uppercase truncate">
            {sub}
          </div>
        </div>
      </div>

      {/* Team nav items */}
      <div className="p-1.5 space-y-1">
        {items.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "relative flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-sm font-mono text-xs uppercase tracking-[0.14em] transition-all",
                !active &&
                  "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              )}
              style={
                active
                  ? {
                      color,
                      background: `${color}14`,
                      boxShadow: `inset 0 0 0 1px ${color}40`,
                    }
                  : undefined
              }
            >
              {/* Active edge marker */}
              <span
                className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full transition-opacity"
                style={{ background: color, opacity: active ? 1 : 0 }}
              />
              <item.icon
                className="w-4 h-4 shrink-0"
                style={active ? { color } : undefined}
              />
              {item.label}
            </Link>
          );
        })}
      </div>
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
  const [collapsed, setCollapsed] = useState(true);

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

  const toggleSidebar = () => {
    // On mobile the sidebar is a drawer driven by mobileNav;
    // on desktop the hamburger collapses/expands it.
    if (window.innerWidth < 1024) {
      setMobileNav((n) => !n);
    } else {
      setCollapsed((c) => !c);
    }
  };

  return (
    <div className="relative min-h-screen flex bg-background scanlines crt-noise">
      {!booted && <BootSequence onDone={finishBoot} />}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static z-40 inset-y-0 left-0 w-60 shrink-0 bg-[#0B0F11] border-r border-border/15 flex flex-col transition-all duration-300",
          mobileNav ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed && "lg:-translate-x-full lg:-ml-60"
        )}
      >
        <div className="flex items-center h-16 border-b border-border/15">
        <Link
          to="/"
          onClick={closeNav}
          className="group flex flex-1 items-center gap-3 pl-5 pr-2 h-full relative overflow-hidden"
        >
          {/* Ambient glow sweep on hover */}
          <span
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 20% 50%, rgba(255,153,51,0.14), transparent 60%), radial-gradient(circle at 80% 50%, rgba(19,136,8,0.16), transparent 60%)",
            }}
          />

          {/* Emblem */}
          <span className="relative shrink-0">
            <span
              className="flex items-center justify-center w-9 h-9 rounded-lg relative transition-transform duration-300 group-hover:scale-105"
              style={{
                background:
                  "linear-gradient(135deg, #FF9933 0%, #FFFFFF 50%, #138808 100%)",
                boxShadow:
                  "0 0 12px rgba(255,153,51,0.5), inset 0 0 0 1px rgba(255,255,255,0.15)",
              }}
            >
              <ShieldCheck
                className="w-5 h-5"
                style={{
                  color: "#000080",
                  filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.25))",
                }}
              />
            </span>
            {/* Live status pip */}
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-[#0B0F11] animate-pulse" />
          </span>

          <div className="leading-none relative">
            <div className="font-display font-extrabold text-[15px] tracking-tight">
              <span
                style={{
                  background: "linear-gradient(90deg, #FF9933, #FFFFFF 55%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                SWARAJ
              </span>
              <span
                style={{
                  background: "linear-gradient(90deg, #FFFFFF 45%, #2EB82C)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                CHAKRA
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="h-px w-4 bg-gradient-to-r from-primary to-transparent" />
              <span className="font-mono text-[8px] text-muted-foreground tracking-[0.28em] uppercase">
                OPSEC Console
              </span>
            </div>
          </div>
        </Link>

        <button
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
          className="mr-3 flex items-center justify-center w-8 h-8 shrink-0 rounded-sm border border-border/20 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
        >
          <Menu className="w-4 h-4" />
        </button>
        </div>

        <nav className="flex-1 p-3 space-y-3 overflow-y-auto">
          <NavGroup
            team={{
              color: "#FF3B4E",
              label: "RED TEAM",
              sub: "Offense · Attack Sim",
              Icon: Crosshair,
            }}
            items={RED_NAV}
            pathname={location.pathname}
            onNavigate={closeNav}
          />
          <NavGroup
            team={{
              color: "#22D3EE",
              label: "BLUE TEAM",
              sub: "Defense · Detection",
              Icon: Shield,
            }}
            items={BLUE_NAV}
            pathname={location.pathname}
            onNavigate={closeNav}
          />
          <NavGroup
            team={{
              color: "#D946EF",
              label: "PURPLE TEAM",
              sub: "Correlation · Analysis",
              Icon: Blend,
            }}
            items={PURPLE_NAV}
            pathname={location.pathname}
            onNavigate={closeNav}
          />
          <NavGroup
            team={{
              color: "#A78BFA",
              label: "GOVERNANCE",
              sub: "Authorization · Scope",
              Icon: ScrollText,
            }}
            items={GOVERNANCE_NAV}
            pathname={location.pathname}
            onNavigate={closeNav}
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

      {/* Reopen hamburger when sidebar is collapsed (desktop) */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          aria-label="Open sidebar"
          title="Open sidebar"
          className="hidden lg:flex fixed top-4 left-4 z-40 items-center justify-center w-9 h-9 rounded-sm border border-border/30 bg-[#0B0F11] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
        >
          <Menu className="w-4 h-4" />
        </button>
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
