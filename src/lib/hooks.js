import { useEffect, useRef, useState } from "react";

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const handler = () => setReduced(m.matches);
    m.addEventListener("change", handler);
    return () => m.removeEventListener("change", handler);
  }, []);
  return reduced;
}

export function useInterval(callback, delay) {
  const saved = useRef();
  useEffect(() => {
    saved.current = callback;
  });
  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => saved.current && saved.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

export function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  };
  return [copied, copy];
}