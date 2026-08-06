import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { getApiBaseUrl, setApiBaseUrl } from "@/lib/api";

const ScanContext = createContext(null);
const HISTORY_KEY = "redagent_history";
const BOOT_KEY = "redagent_booted";

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

export function ScanProvider({ children }) {
  const [history, setHistory] = useState(loadHistory);
  const [apiBase, setApiBaseState] = useState(getApiBaseUrl());
  const [booted, setBooted] = useState(
    () => sessionStorage.getItem(BOOT_KEY) === "1"
  );

  const persist = useCallback((next) => {
    setHistory(next);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const addScan = useCallback(
    (scan) => {
      const next = [
        { ts: Date.now(), ...scan },
        ...loadHistory().filter((s) => s.job_id !== scan.job_id),
      ].slice(0, 50);
      persist(next);
    },
    [persist]
  );

  const updateScan = useCallback(
    (jobId, patch) => {
      const cur = loadHistory();
      const next = cur.map((s) =>
        s.job_id === jobId ? { ...s, ...patch } : s
      );
      persist(next);
    },
    [persist]
  );

  const setApiBase = useCallback((v) => {
    setApiBaseUrl(v);
    setApiBaseState(getApiBaseUrl());
  }, []);

  const finishBoot = useCallback(() => {
    setBooted(true);
    try {
      sessionStorage.setItem(BOOT_KEY, "1");
    } catch {}
  }, []);

  return (
    <ScanContext.Provider
      value={{
        history,
        addScan,
        updateScan,
        apiBase,
        setApiBase,
        booted,
        finishBoot,
      }}
    >
      {children}
    </ScanContext.Provider>
  );
}

export function useScanStore() {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error("useScanStore must be used within ScanProvider");
  return ctx;
}