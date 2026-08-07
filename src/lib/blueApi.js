// BlueAgent API client — mirrors src/lib/api.js, but points at the Blue Agent
// (default port 8001). Submit → poll → fetch: analyses are background jobs.

import { ApiError } from "@/lib/api";

const STORAGE_KEY = "blueagent_api_base_url";
const DEFAULT_BASE = "http://localhost:8001";

export function getBlueApiBaseUrl() {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_BASE;
  } catch {
    return DEFAULT_BASE;
  }
}

export function setBlueApiBaseUrl(v) {
  const val = (v || "").trim() || DEFAULT_BASE;
  try {
    localStorage.setItem(STORAGE_KEY, val);
  } catch {}
  return val;
}

export const BLUE_DEFAULT_BASE = DEFAULT_BASE;

function blueUrl(path) {
  return getBlueApiBaseUrl().replace(/\/+$/, "") + path;
}

async function request(path, { method = "GET", body, signal, asText = false } = {}) {
  const url = blueUrl(path);
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (e) {
    if (e.name === "AbortError") throw e;
    throw new ApiError(0, `Network unreachable — ${getBlueApiBaseUrl()}`, null);
  }

  const text = await res.text();
  let data = null;
  if (text) {
    if (asText && res.ok) {
      data = text;
    } else {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
  }
  if (!res.ok) {
    // BlueAgent errors are always {"error": "..."}; 409 also carries status/progress.
    const message =
      (data && (data.error || data.detail || data.message)) ||
      (typeof data === "string" && data) ||
      `HTTP ${res.status}`;
    throw new ApiError(res.status, message, data);
  }
  return data;
}

export const blueApi = {
  health: (signal) => request("/health", { signal }),
  getConfig: (signal) => request("/api/v1/config", { signal }),

  // Exactly one source: {report} | {red_agent_job_id, red_agent_url?} | {report_path}
  startAnalysis: (payload) =>
    request("/api/v1/analyses", { method: "POST", body: payload }),

  listAnalyses: (limit = 50) =>
    request(`/api/v1/analyses?limit=${encodeURIComponent(limit)}`),

  getAnalysis: (jobId) =>
    request(`/api/v1/analyses/${encodeURIComponent(jobId)}`),

  getReport: (jobId) =>
    request(`/api/v1/analyses/${encodeURIComponent(jobId)}/report`),

  getMarkdown: (jobId) =>
    request(`/api/v1/analyses/${encodeURIComponent(jobId)}/report.md`, {
      asText: true,
    }),

  deleteAnalysis: (jobId) =>
    request(`/api/v1/analyses/${encodeURIComponent(jobId)}`, {
      method: "DELETE",
    }),

  markdownUrl: (jobId, { download = false } = {}) =>
    blueUrl(
      `/api/v1/analyses/${encodeURIComponent(jobId)}/report.md${
        download ? "?download=1" : ""
      }`
    ),
};

// ---------------------------------------------------------------------------
// Palettes / labels for the blue-side vocabulary
// ---------------------------------------------------------------------------

// The Blue Agent adds "unknown" to the Red Agent's severity ladder.
export const BLUE_SEVERITY = {
  critical: { label: "CRITICAL", color: "#FF2E63" },
  high: { label: "HIGH", color: "#FF6B2C" },
  medium: { label: "MEDIUM", color: "#FFB020" },
  low: { label: "LOW", color: "#22D3EE" },
  info: { label: "INFO", color: "#7A8B8F" },
  unknown: { label: "UNKNOWN", color: "#5B6A6E" },
};

export const BLUE_SEVERITY_ORDER = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
  "unknown",
];

export const PRIORITY = {
  P0: { label: "P0", color: "#FF2E63", desc: "act now" },
  P1: { label: "P1", color: "#FF6B2C", desc: "this week" },
  P2: { label: "P2", color: "#FFB020", desc: "this quarter" },
  P3: { label: "P3", color: "#22D3EE", desc: "backlog" },
};

export const PRIORITY_ORDER = ["P0", "P1", "P2", "P3"];

export const HORIZON = {
  immediate: { label: "IMMEDIATE", color: "#FF2E63" },
  short_term: { label: "SHORT TERM", color: "#FFB020" },
  long_term: { label: "LONG TERM", color: "#22D3EE" },
};

export const HORIZON_ORDER = ["immediate", "short_term", "long_term"];

export const BLUE_STATUSES = ["queued", "running", "completed", "error"];

export function riskColorFor(sev) {
  return BLUE_SEVERITY[(sev || "unknown").toLowerCase()]?.color || "#7A8B8F";
}

// risk_assessment.overall_risk_score is a 0–10 scale (not the Red Agent's 0–100).
export function riskScoreColor(score) {
  const s = Number(score) || 0;
  if (s >= 9) return "#FF2E63";
  if (s >= 7) return "#FF6B2C";
  if (s >= 4) return "#FFB020";
  return "#22D3EE";
}

export function priorityColor(p) {
  return PRIORITY[(p || "").toUpperCase()]?.color || "#7A8B8F";
}
