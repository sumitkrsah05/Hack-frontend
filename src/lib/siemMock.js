// Frontend-only mock data for the SIEM Telemetry analysis mode.
// No backend calls are made from this path — everything here exists so the
// SOC workflow can be demonstrated visually before real SIEM ingestion lands.

export const SIEM_PLATFORMS = [
  "Splunk",
  "Microsoft Sentinel",
  "Elastic",
  "QRadar",
  "Wazuh",
  "Generic SIEM",
];

export const TIME_RANGES = [
  { key: "15m", label: "Last 15 minutes" },
  { key: "1h", label: "Last 1 hour" },
  { key: "6h", label: "Last 6 hours" },
  { key: "24h", label: "Last 24 hours" },
  { key: "7d", label: "Last 7 days" },
  { key: "custom", label: "Custom" },
];

export const SEVERITY_FILTERS = [
  { key: "critical", label: "Critical", color: "var(--c-danger)" },
  { key: "high", label: "High", color: "var(--c-orange)" },
  { key: "medium", label: "Medium", color: "var(--c-warn)" },
  { key: "low", label: "Low", color: "var(--c-accent)" },
  { key: "info", label: "Informational", color: "var(--c-info)" },
];

export const EVENT_TYPES = [
  "Authentication",
  "Network",
  "Endpoint",
  "Process Execution",
  "DNS",
  "Firewall",
  "Cloud",
  "Malware",
  "Privilege Escalation",
];

export const CAPABILITIES = [
  { key: "threat_detection", label: "Threat Detection" },
  { key: "root_cause", label: "Root Cause Analysis" },
  { key: "mitre", label: "MITRE ATT&CK Mapping" },
  { key: "risk_scoring", label: "Risk Scoring" },
  { key: "timeline", label: "Attack Timeline" },
  { key: "correlation", label: "Threat Correlation" },
  { key: "remediation", label: "Recommended Remediation" },
  { key: "detection_rules", label: "Detection Rule Suggestions" },
];

export const RUN_PHASES = [
  "COLLECTING TELEMETRY...",
  "NORMALIZING EVENTS...",
  "CORRELATING ACTIVITY...",
  "BUILDING THREAT MODEL...",
];

export const PASTE_PLACEHOLDER = `{
  "timestamp": "2026-08-14T14:32:21Z",
  "event_type": "authentication_failure",
  "severity": "high",
  "source_ip": "10.20.4.15",
  "destination_ip": "10.20.4.10",
  "username": "admin",
  "message": "Authentication failure"
}`;

// Normalized event shape the real ingestion pipeline is expected to emit.
export const MOCK_EVENTS = [
  {
    timestamp: "2026-08-14T14:21:04Z",
    source: "Microsoft Sentinel",
    eventType: "authentication_failure",
    severity: "high",
    sourceIp: "10.20.4.15",
    destinationIp: "10.20.4.10",
    sourceHost: "HR-LAPTOP-23",
    destinationHost: "AD-SERVER-01",
    username: "admin",
    action: "failed",
    process: null,
    command: null,
    eventId: "4625",
    rawEvent: {},
  },
  {
    timestamp: "2026-08-14T14:22:13Z",
    source: "Microsoft Sentinel",
    eventType: "authentication_success",
    severity: "critical",
    sourceIp: "10.20.4.15",
    destinationIp: "10.20.4.10",
    sourceHost: "HR-LAPTOP-23",
    destinationHost: "AD-SERVER-01",
    username: "admin",
    action: "success",
    process: null,
    command: null,
    eventId: "4624",
    rawEvent: {},
  },
  {
    timestamp: "2026-08-14T14:23:02Z",
    source: "Microsoft Sentinel",
    eventType: "process_creation",
    severity: "high",
    sourceIp: "10.20.4.10",
    destinationIp: null,
    sourceHost: "AD-SERVER-01",
    destinationHost: null,
    username: "admin",
    action: "created",
    process: "powershell.exe",
    command: "powershell.exe -enc JABzAD0A...",
    eventId: "4688",
    rawEvent: {},
  },
];

export const MOCK_RESULT = {
  summary: {
    eventsAnalyzed: 1284,
    threatsDetected: 7,
    criticalFindings: 2,
    riskScore: 91,
  },
  topFinding: {
    severity: "critical",
    title: "Possible Credential Attack",
    confidence: 94,
    description:
      "Multiple authentication failures were followed by a successful privileged login from the same source address.",
  },
  timeline: [
    { time: "14:21:04", label: "17 failed authentication attempts" },
    { time: "14:22:13", label: "Successful privileged login" },
    { time: "14:22:31", label: "Privileged account accessed" },
    { time: "14:23:02", label: "PowerShell process created" },
  ],
  entities: [
    { label: "SOURCE IP", value: "10.20.4.15" },
    { label: "TARGET", value: "AD-SERVER-01" },
    { label: "USER", value: "admin" },
    { label: "SOURCE HOST", value: "HR-LAPTOP-23" },
    { label: "EVENTS", value: "1,284" },
  ],
  mitre: [
    { id: "T1110", name: "Brute Force" },
    { id: "T1078", name: "Valid Accounts" },
    { id: "T1059", name: "Command and Scripting Interpreter" },
  ],
  risk: {
    score: 91,
    confidence: 94,
    businessImpact: "HIGH",
    severity: "CRITICAL",
  },
  actions: [
    "Disable potentially compromised account",
    "Isolate affected endpoint",
    "Reset privileged credentials",
    "Review authentication activity",
    "Investigate source IP",
    "Create detection rule",
  ],
  detectionRule: {
    name: "Possible Brute Force → Valid Account Usage",
    severity: "Critical",
    condition:
      "Multiple authentication failures from the same source followed by successful privileged authentication within a defined time window.",
    mitre: ["T1110", "T1078"],
  },
};
