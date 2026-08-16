import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks";

export default function CountUp({
  value = 0,
  duration = 900,
  className,
  suffix = "",
  style,
  format,
}) {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : 0);
  const prevRef = useRef(reduced ? value : 0);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      prevRef.current = value;
      return;
    }
    const from = prevRef.current;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (value - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else prevRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduced]);

  const isInt = Number.isInteger(value);
  const decimals = isInt ? 0 : Number(value.toFixed(1)) % 1 === 0 ? 0 : 1;
  return (
    <span className={className} style={style}>
      {format ? format(display) : display.toFixed(decimals)}
      {suffix}
    </span>
  );
}