import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks";

const GLYPHS = "!<>-_\\/[]{}=+*^?#01ABCDEFξψλΣ";

export default function DecryptedText({
  text,
  className,
  style,
  duration = 1100,
  as: Tag = "span",
}) {
  const reduced = usePrefersReducedMotion();
  const [out, setOut] = useState(reduced ? text : "");

  useEffect(() => {
    if (reduced) {
      setOut(text);
      return;
    }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const revealed = Math.floor(p * text.length);
      let s = "";
      for (let i = 0; i < text.length; i++) {
        if (i < revealed) s += text[i];
        else if (text[i] === " ") s += " ";
        else s += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setOut(s);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setOut(text);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, duration, reduced]);

  return (
    <Tag className={className} style={style}>
      {out}
    </Tag>
  );
}