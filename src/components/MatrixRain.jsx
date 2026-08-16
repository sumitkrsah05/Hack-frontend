import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks";

export default function MatrixRain({ className }) {
  const ref = useRef(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const chars = "01<>{}[]/\\|+-*ABCDEF0123456789#$@%".split("");
    let raf;
    let cols, drops;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const fontSize = 13;
      cols = Math.floor(canvas.offsetWidth / fontSize);
      drops = Array(cols)
        .fill(0)
        .map(() => Math.random() * canvas.offsetHeight);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      // canvas can't resolve CSS variables — pick per-theme colors each frame
      const light = document.documentElement.classList.contains("light");
      ctx.fillStyle = light ? "rgba(242,246,247,0.08)" : "rgba(10,14,15,0.08)";
      ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      ctx.font = "12px JetBrains Mono, monospace";
      const fontSize = 13;
      drops.forEach((y, i) => {
        const c = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillStyle =
          Math.random() > 0.975
            ? light ? "#0891B2" : "#22D3EE"
            : light ? "#00875A" : "#00FF9C";
        ctx.fillText(c, i * fontSize, y);
        drops[i] =
          y > canvas.offsetHeight && Math.random() > 0.975
            ? 0
            : y + fontSize;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [reduced]);

  return (
    <canvas
      ref={ref}
      className={className}
      aria-hidden="true"
      style={{ opacity: reduced ? 0 : 0.5 }}
    />
  );
}