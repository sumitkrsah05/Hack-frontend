import React from "react";
import { ScrollText, ShieldCheck } from "lucide-react";
import DecryptedText from "@/components/DecryptedText";

const PRIORITY_TONE = {
  High: { color: "#FF3B4E", bg: "#FF3B4E1A", border: "#FF3B4E40" },
  Medium: { color: "#FFB020", bg: "#FFB0201A", border: "#FFB02040" },
  Low: { color: "#22D3EE", bg: "#22D3EE1A", border: "#22D3EE40" },
};

const REQUIREMENTS = [
  {
    id: "FR-1.1",
    priority: "High",
    text: "Maintain a centralized Security Asset and Telemetry Inventory (product/service IDs, tenant info, asset inventory, registered security products, telemetry connectors, cloud/infra metadata, ownership, criticality, environment classification, authorization policy) as the authoritative source of truth for the AI Red Team, AI Blue Team, and Purple Team Decision Engine. Only registered and authorized assets/tenants are eligible for validation.",
  },
  {
    id: "FR-1.2",
    priority: "High",
    text: "Validate every Rules of Engagement (ROE) object before activation and reject configurations with missing mandatory attributes, invalid authorization references, undefined execution profiles, invalid scope, or incomplete approval workflows.",
  },
  {
    id: "FR-1.3",
    priority: "High",
    text: "Validate every requested target against the approved engagement scope before reconnaissance, simulation, or telemetry collection. Supported scope objects: IPv4/IPv6, CIDR ranges, domains/subdomains, cloud accounts, Kubernetes clusters, VMs, containers, repositories, APIs, storage services.",
  },
  {
    id: "FR-1.4",
    priority: "High",
    text: "Enforce exclusion policies with the highest evaluation priority — any asset explicitly excluded is denied execution regardless of other matching scope rules.",
  },
  {
    id: "FR-1.5",
    priority: "High",
    text: "Validate execution requests against approved maintenance windows, time zones, blackout periods, and schedules defined in the active ROE before permitting any activity.",
  },
  {
    id: "FR-1.6",
    priority: "High",
    text: "Assign a globally unique Engagement ID to every authorized engagement and maintain full traceability to executed scenarios, evidence, results, and audit records.",
  },
  {
    id: "FR-1.7",
    priority: "Medium",
    text: "Support reusable, version-controlled ROE templates for common scenarios, environments, business units, and compliance requirements.",
  },
  {
    id: "FR-1.8",
    priority: "Low",
    text: "Expose a Scope Validation Service returning Authorized / Restricted / Excluded / Out-of-Scope for a target without executing any validation activity.",
  },
];

function PriorityBadge({ priority }) {
  const tone = PRIORITY_TONE[priority] || PRIORITY_TONE.Low;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-sm font-mono text-[10px] font-bold uppercase tracking-[0.14em]"
      style={{
        color: tone.color,
        background: tone.bg,
        border: `1px solid ${tone.border}`,
      }}
    >
      {priority}
    </span>
  );
}

export default function ROE() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="label-xs mb-3">// 4.1 FEATURE — SCOPE &amp; AUTHORIZATION</div>
      <h1 className="font-display font-bold text-3xl md:text-4xl text-foreground mb-2 flex items-center gap-3">
        <ScrollText
          className="w-8 h-8 text-primary"
          style={{ filter: "drop-shadow(0 0 8px rgba(0,255,156,0.5))" }}
        />
        <DecryptedText text="Rules of Engagement & Scope Management" />
      </h1>
      <p className="font-mono text-sm text-muted-foreground mb-8 leading-relaxed">
        Maintains a centralized Security Asset and Telemetry Inventory and
        enforces the authorization boundaries within which all validation
        activity is permitted.
      </p>

      {/* Authorization banner */}
      <div className="panel p-4 mb-8 flex items-start gap-3 border-primary/30">
        <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="font-mono text-xs text-foreground/80 leading-relaxed">
          Only registered and authorized assets/tenants are eligible for
          validation. Exclusion policies are evaluated with the highest priority
          and always override matching scope rules.
        </p>
      </div>

      <div className="label-xs mb-3">REQUIREMENTS</div>
      <div className="space-y-3">
        {REQUIREMENTS.map((req, i) => (
          <div
            key={req.id}
            className="panel p-4 md:p-5"
            style={{ animation: `float-up 0.35s ease-out ${i * 0.05}s both` }}
          >
            <div className="flex items-center gap-3 mb-2.5">
              <span className="font-mono font-bold text-sm text-primary tracking-wide">
                {req.id}
              </span>
              <PriorityBadge priority={req.priority} />
            </div>
            <p className="font-mono text-[13px] text-foreground/80 leading-relaxed">
              {req.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
