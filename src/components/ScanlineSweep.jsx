import { useEffect, useState } from "react";

export default function ScanlineSweep({ trigger }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(true);
    const t = setTimeout(() => setActive(false), 560);
    return () => clearTimeout(t);
  }, [trigger]);

  if (!active) return null;
  return <div className="sweep-overlay" aria-hidden="true" />;
}