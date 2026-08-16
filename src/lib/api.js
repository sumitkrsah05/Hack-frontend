// RedAgent API client — all requests go through API_BASE_URL (configurable).

const STORAGE_KEY = "redagent_api_base_url";
const DEFAULT_BASE = "http://localhost:8000";

export function getApiBaseUrl() {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_BASE;
  } catch {
    return DEFAULT_BASE;
  }
}

export function setApiBaseUrl(v) {
  const val = (v || "").trim() || DEFAULT_BASE;
  try {
    localStorage.setItem(STORAGE_KEY, val);
  } catch {}
  return val;
}

export class ApiError extends Error {
  constructor(status, message, payload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function request(path, { method = "GET", body, signal } = {}) {
  const base = getApiBaseUrl().replace(/\/+$/, "");
  let res;
  try {
    res = await fetch(base + path, {
      method,
      headers: { "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (e) {
    if (e.name === "AbortError") throw e;
    throw new ApiError(0, `Network unreachable — ${base}`, null);
  }
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    // RedAgent returns {"error": "..."}; keep detail/message for other backends.
    const message =
      (data && (data.error || data.detail || data.message)) ||
      (typeof data === "string" && data) ||
      `HTTP ${res.status}`;
    throw new ApiError(res.status, message, data);
  }
  return data;
}

export const api = {
  health: (signal) => request("/health", { signal }),
  getModes: () => request("/api/v1/modes"),
  startScan: (payload) =>
    request("/api/v1/scans", { method: "POST", body: payload }),
  getScan: (jobId) => request(`/api/v1/scans/${encodeURIComponent(jobId)}`),
  getReport: (jobId) =>
    request(`/api/v1/scans/${encodeURIComponent(jobId)}/report`),
};

// Severity palette + labels shared across the app.
export const SEVERITY = {
  critical: { label: "CRITICAL", color: "var(--c-danger)" },
  high: { label: "HIGH", color: "var(--c-orange)" },
  medium: { label: "MEDIUM", color: "var(--c-warn)" },
  low: { label: "LOW", color: "var(--c-accent)" },
  info: { label: "INFO", color: "var(--c-info)" },
};

export const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"];