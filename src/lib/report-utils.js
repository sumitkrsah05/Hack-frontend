export function severityColor(sev) {
  const map = {
    critical: "var(--c-danger)",
    high: "var(--c-orange)",
    medium: "var(--c-warn)",
    low: "var(--c-accent)",
    info: "var(--c-info)",
  };
  return map[(sev || "").toLowerCase()] || "var(--c-info)";
}

export function severityLabel(sev) {
  return (sev || "info").toUpperCase();
}

export function riskColor(score) {
  const s = Number(score) || 0;
  if (s >= 70) return "var(--c-danger)";
  if (s >= 40) return "var(--c-orange)";
  if (s >= 20) return "var(--c-warn)";
  return "var(--c-accent)";
}

export function riskLabel(score) {
  const s = Number(score) || 0;
  if (s >= 70) return "CRITICAL";
  if (s >= 40) return "HIGH";
  if (s >= 20) return "MODERATE";
  return "LOW";
}

// plausible progress lines for the live monitor, keyed by mode.
export function progressLinesForMode(mode) {
  const common = [
    "> acquiring safety-gate approval token",
    "> ROE validated — non-destructive scope locked",
    "> writing audit event to chain",
  ];
  const byMode = {
    black_box: [
      "> nmap recon started",
      "> probing target surface…",
      "> nuclei templates loaded (8.4k)",
      "> nikto scan in progress",
      "> correlating service banners",
      "> fingerprinting web stack",
    ],
    gray_box: [
      "> prowler checks enumerating",
      "> trivy scanning IaC / images",
      "> querying cloud config",
      "> mapping IAM exposure",
    ],
    white_box: [
      "> semgrep ruleset loaded",
      "> gitleaks scanning history",
      "> checkov evaluating policies",
      "> trivy scanning dependencies",
      "> indexing source tree",
    ],
  };
  return [...common, ...(byMode[mode] || [])];
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}