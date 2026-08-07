import React, {
  createContext,
  useContext,
  useState,
  useCallback,
} from "react";
import { getApiBaseUrl, setApiBaseUrl } from "@/lib/api";
import { getBlueApiBaseUrl, setBlueApiBaseUrl } from "@/lib/blueApi";

const ScanContext = createContext(null);
const HISTORY_KEY = "redagent_history";
const BLUE_HISTORY_KEY = "blueagent_history";
const BOOT_KEY = "redagent_booted";

function load(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function loadHistory() {
  return load(HISTORY_KEY);
}

function loadBlueHistory() {
  return load(BLUE_HISTORY_KEY);
}

export function ScanProvider({ children }) {
  const [history, setHistory] = useState(loadHistory);
  const [analyses, setAnalyses] = useState(loadBlueHistory);
  const [apiBase, setApiBaseState] = useState(getApiBaseUrl());
  const [blueApiBase, setBlueApiBaseState] = useState(getBlueApiBaseUrl());
  const [booted, setBooted] = useState(
    () => sessionStorage.getItem(BOOT_KEY) === "1"
  );

  const persist = useCallback((next) => {
    setHistory(next);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const persistBlue = useCallback((next) => {
    setAnalyses(next);
    try {
      localStorage.setItem(BLUE_HISTORY_KEY, JSON.stringify(next));
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

  // ---- Blue Agent analyses (same shape/idioms as the red scan history) ----

  const addAnalysis = useCallback(
    (analysis) => {
      const next = [
        { ts: Date.now(), ...analysis },
        ...loadBlueHistory().filter((a) => a.job_id !== analysis.job_id),
      ].slice(0, 50);
      persistBlue(next);
    },
    [persistBlue]
  );

  const updateAnalysis = useCallback(
    (jobId, patch) => {
      const next = loadBlueHistory().map((a) =>
        a.job_id === jobId ? { ...a, ...patch } : a
      );
      persistBlue(next);
    },
    [persistBlue]
  );

  const removeAnalysis = useCallback(
    (jobId) => {
      persistBlue(loadBlueHistory().filter((a) => a.job_id !== jobId));
    },
    [persistBlue]
  );

  const setApiBase = useCallback((v) => {
    setApiBaseUrl(v);
    setApiBaseState(getApiBaseUrl());
  }, []);

  const setBlueApiBase = useCallback((v) => {
    setBlueApiBaseUrl(v);
    setBlueApiBaseState(getBlueApiBaseUrl());
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
        analyses,
        addAnalysis,
        updateAnalysis,
        removeAnalysis,
        apiBase,
        setApiBase,
        blueApiBase,
        setBlueApiBase,
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
