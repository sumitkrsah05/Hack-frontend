import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks";

/*
 * KAVACH — animated energy-shield defense scene.
 *
 * Composition (all code-rendered, no image assets):
 *  - Layered SVG shield (gold-trimmed kavach plate + cyan hex-grid energy
 *    field + rotating chakra emblem core), 3D-tilted with perspective.
 *    Edge energy flow, scan sweep and breathing are pure CSS.
 *  - Two canvases driven by one rAF loop:
 *      .ks-bg  (behind the shield): matrix rain, far debris shards.
 *      .ks-fx  (in front): red attack lightning from the left, hex-cell
 *               shield ripples at each impact, ricochet/deflection bolts,
 *               cyan defense arcs, impact bursts, near debris shards.
 *
 * Perf: DPR capped at 1.5, rAF paused on tab-hide and off-viewport (CSS
 * animations pause too via .ks-paused). prefers-reduced-motion renders a
 * single static frame and freezes all CSS animation.
 */

const TAU = Math.PI * 2;

const RED = "255,59,48"; /* #FF3B30 */
const ORN = "255,107,26"; /* #FF6B1A */
const PUR = "155,92,255"; /* #9B5CFF */
const CYN = "56,214,255"; /* #38D6FF */
const GLD = "255,194,75"; /* #FFC24B */
const WHT = "255,255,255";
const GRN = "0,255,140";

const MATRIX_CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF";

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

/* Recursive midpoint-displacement polyline — jagged lightning path. */
function jag(sx, sy, tx, ty, disp, iters = 5) {
  let pts = [[sx, sy], [tx, ty]];
  let d = disp;
  for (let it = 0; it < iters; it++) {
    const next = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1];
      const [bx, by] = pts[i];
      next.push(
        [(ax + bx) / 2 + (Math.random() - 0.5) * d, (ay + by) / 2 + (Math.random() - 0.5) * d],
        [bx, by]
      );
    }
    pts = next;
    d *= 0.55;
  }
  return pts;
}

/* Bolt = main path + 2-3 forks branching off it. */
function buildBolt(sx, sy, tx, ty) {
  const dist = Math.hypot(tx - sx, ty - sy) || 1;
  const main = jag(sx, sy, tx, ty, dist * 0.18);
  const baseAng = Math.atan2(ty - sy, tx - sx);
  const forks = [];
  const n = 2 + ((Math.random() * 2) | 0);
  for (let i = 0; i < n; i++) {
    const idx = 4 + ((Math.random() * Math.max(1, main.length - 10)) | 0);
    const [bx, by] = main[Math.min(idx, main.length - 1)];
    const a = baseAng + rand(-1.15, 1.15);
    const len = dist * rand(0.1, 0.22);
    forks.push(jag(bx, by, bx + Math.cos(a) * len, by + Math.sin(a) * len, len * 0.45, 4));
  }
  return { main, forks };
}

/* ------------------------------------------------------------- shield shape */

/* Heater-shield outline in the SVG's local coords (viewBox centered on 0,0).
   The same control points build the SVG path AND the canvas-side boundary
   samples so bolt impacts land exactly on the drawn rim. */
const SHIELD_TOP = [[-300, -340], [0, -408], [300, -340]]; /* quadratic */
const SHIELD_R = [[300, -340], [330, -60], [250, 230], [0, 435]]; /* cubic */
const SHIELD_L = [[0, 435], [-250, 230], [-330, -60], [-300, -340]]; /* cubic */

const SHIELD_PATH =
  `M ${SHIELD_TOP[0]} Q ${SHIELD_TOP[1]} ${SHIELD_TOP[2]} ` +
  `C ${SHIELD_R[1]} ${SHIELD_R[2]} ${SHIELD_R[3]} ` +
  `C ${SHIELD_L[1]} ${SHIELD_L[2]} ${SHIELD_L[3]} Z`;

const SHIELD_PTS = (() => {
  const pts = [];
  const quad = ([p0, p1, p2], n) => {
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const u = 1 - t;
      pts.push([
        u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
        u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
      ]);
    }
  };
  const cubic = ([p0, p1, p2, p3], n) => {
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const u = 1 - t;
      pts.push([
        u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
      ]);
    }
  };
  quad(SHIELD_TOP, 40);
  cubic(SHIELD_R, 70);
  cubic(SHIELD_L, 70);
  return pts;
})();

/* Hex-cell offsets for shield-surface ripples (pointy-top axial grid, r=2). */
const HEX_CELLS = (() => {
  const cells = [];
  const S = 15;
  for (let q = -2; q <= 2; q++) {
    for (let r = -2; r <= 2; r++) {
      if (Math.abs(q + r) > 2) continue;
      cells.push([S * 1.732 * (q + r / 2), S * 1.5 * r]);
    }
  }
  return cells;
})();

const hexPath = (ctx, x, y, r) => {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (i * Math.PI) / 3;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
};

const hexPoints = (cx, cy, r) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = Math.PI / 6 + (i * Math.PI) / 3;
    return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
  }).join(" ");

/* ---------------------------------------------------------------- styles */

const CSS = `
.kavach-shield{overflow:visible}
.kavach-shield canvas{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none}
.kavach-shield .ks-bg{z-index:0}
.kavach-shield .ks-fx{z-index:4}
.kavach-shield .ks-glow{position:absolute;left:66%;top:50%;width:110%;aspect-ratio:1;
  transform:translate(-50%,-50%);border-radius:50%;z-index:1;
  background:radial-gradient(circle,rgba(56,214,255,.55) 0%,rgba(0,255,140,.22) 45%,rgba(0,255,140,0) 72%);
  filter:blur(110px);opacity:.17}
.kavach-shield .ks-persp{position:absolute;left:66%;top:50%;height:104%;aspect-ratio:1;
  transform:translate(-50%,-50%);perspective:1200px;z-index:2}
.kavach-shield .ks-tilt{width:100%;height:100%;transform:rotateY(-20deg) rotateX(5deg)}
.kavach-shield .ks-tilt svg{width:100%;height:100%;display:block;overflow:visible}
@keyframes ks-cw{to{transform:rotate(360deg)}}
@keyframes ks-ccw{to{transform:rotate(-360deg)}}
@keyframes ks-breathe{from{transform:scale(1)}to{transform:scale(1.015)}}
@keyframes ks-flow{to{stroke-dashoffset:-760}}
@keyframes ks-flow2{to{stroke-dashoffset:700}}
@keyframes ks-hexp{from{opacity:.26}to{opacity:.55}}
@keyframes ks-corepulse{from{opacity:.85;transform:scale(.96)}to{opacity:1;transform:scale(1.06)}}
@keyframes ks-scan{0%{transform:translateY(-470px)}60%{transform:translateY(480px)}100%{transform:translateY(480px)}}
.kavach-shield .ks-breathe{animation:ks-breathe 3.6s ease-in-out infinite alternate}
.kavach-shield .ks-energy{animation:ks-flow 7s linear infinite}
.kavach-shield .ks-energy2{animation:ks-flow2 12s linear infinite}
.kavach-shield .ks-hexgrid{animation:ks-hexp 3.2s ease-in-out infinite alternate}
.kavach-shield .ks-emblem{animation:ks-cw 40s linear infinite}
.kavach-shield .ks-emblem2{animation:ks-ccw 26s linear infinite}
.kavach-shield .ks-core{animation:ks-corepulse 2.2s ease-in-out infinite alternate}
.kavach-shield .ks-scanline{animation:ks-scan 5.5s ease-in-out infinite}
.kavach-shield.ks-paused *{animation-play-state:paused!important}
@media (prefers-reduced-motion:reduce){.kavach-shield *{animation:none!important}}
`;

/* ---------------------------------------------------------------- SVG shield */

/* viewBox is centered on 0,0 so CSS scale/rotate on <g> pivot on the middle. */
function ShieldSVG() {
  return (
    <svg viewBox="-475 -475 950 950" aria-hidden="true">
      <defs>
        <linearGradient id="ksGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFB300" />
          <stop offset="1" stopColor="#FFC24B" />
        </linearGradient>
        <linearGradient id="ksBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#12312B" stopOpacity="0.95" />
          <stop offset="0.55" stopColor="#0A1D1A" stopOpacity="0.97" />
          <stop offset="1" stopColor="#061210" stopOpacity="0.98" />
        </linearGradient>
        <radialGradient id="ksCoreG">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.3" stopColor="#EAFDFF" stopOpacity="0.9" />
          <stop offset="0.6" stopColor="#38D6FF" stopOpacity="0.4" />
          <stop offset="1" stopColor="#38D6FF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ksScanG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#EAFDFF" stopOpacity="0" />
          <stop offset="0.5" stopColor="#BFF6FF" stopOpacity="0.22" />
          <stop offset="1" stopColor="#EAFDFF" stopOpacity="0" />
        </linearGradient>
        {/* pointy-top hex tiling: 26 x 45 tile, offset rows */}
        <pattern id="ksHexP" width="26" height="45" patternUnits="userSpaceOnUse">
          <polygon points={hexPoints(13, 11.25, 15)} fill="none" stroke="rgba(56,214,255,0.5)" strokeWidth="1" />
          <polygon points={hexPoints(0, 33.75, 15)} fill="none" stroke="rgba(56,214,255,0.5)" strokeWidth="1" />
          <polygon points={hexPoints(26, 33.75, 15)} fill="none" stroke="rgba(56,214,255,0.5)" strokeWidth="1" />
        </pattern>
        <clipPath id="ksClip">
          <path d={SHIELD_PATH} />
        </clipPath>
      </defs>

      <g className="ks-breathe">
        {/* Outer energy aura — wide low-alpha halo strokes (filter-free,
            renderer-safe) + two counter-flowing dash streams on the rim. */}
        <g transform="scale(1.1)">
          <path d={SHIELD_PATH} fill="none" stroke="rgba(56,214,255,0.10)" strokeWidth="56" />
          <path d={SHIELD_PATH} fill="none" stroke="rgba(56,214,255,0.22)" strokeWidth="24" />
          <path
            className="ks-energy"
            d={SHIELD_PATH}
            fill="none"
            stroke="#38D6FF"
            strokeWidth="3"
            strokeDasharray="46 30"
            strokeLinecap="round"
            opacity="0.85"
          />
        </g>
        <g transform="scale(1.16)">
          <path
            className="ks-energy2"
            d={SHIELD_PATH}
            fill="none"
            stroke="rgba(0,255,140,0.6)"
            strokeWidth="1.6"
            strokeDasharray="12 58"
            strokeLinecap="round"
          />
        </g>

        {/* Shield body — dark glassy plate */}
        <path d={SHIELD_PATH} fill="url(#ksBody)" />

        {/* Cyan hex-grid energy field, pulsing */}
        <g clipPath="url(#ksClip)" className="ks-hexgrid">
          <rect x="-360" y="-440" width="720" height="920" fill="url(#ksHexP)" />
        </g>

        {/* Scan sweep down the plate */}
        <g clipPath="url(#ksClip)">
          <g className="ks-scanline">
            <rect x="-345" y="-45" width="690" height="90" fill="url(#ksScanG)" />
          </g>
        </g>

        {/* Gold kavach trim — layered halo glow */}
        <path d={SHIELD_PATH} fill="none" stroke="rgba(255,179,0,0.16)" strokeWidth="30" />
        <path d={SHIELD_PATH} fill="none" stroke="url(#ksGold)" strokeWidth="10" />
        <path d={SHIELD_PATH} fill="none" stroke="#FFE9B0" strokeWidth="2" opacity="0.8" />
        <g transform="scale(0.93)">
          <path
            d={SHIELD_PATH}
            fill="none"
            stroke="#FFC24B"
            strokeWidth="1.8"
            strokeDasharray="30 14"
            opacity="0.55"
          />
        </g>

        {/* Chakra emblem — rotating gold spokes + counter-rotating cyan ring */}
        <g className="ks-emblem">
          <circle r="120" fill="none" stroke="url(#ksGold)" strokeWidth="3" opacity="0.9" />
          <circle r="128" fill="none" stroke="rgba(255,179,0,0.25)" strokeWidth="10" />
          {Array.from({ length: 12 }, (_, i) => (
            <line
              key={i}
              x1="0"
              y1="-32"
              x2="0"
              y2="-112"
              stroke="#FFC24B"
              strokeWidth="3.5"
              strokeLinecap="round"
              opacity="0.85"
              transform={`rotate(${i * 30})`}
            />
          ))}
        </g>
        <g className="ks-emblem2">
          <circle r="96" fill="none" stroke="rgba(56,214,255,0.55)" strokeWidth="1.4" strokeDasharray="6 10" />
          <circle r="145" fill="none" stroke="rgba(56,214,255,0.35)" strokeWidth="1" strokeDasharray="2 14" />
        </g>

        {/* White-hot core */}
        <g className="ks-core">
          <circle r="95" fill="url(#ksCoreG)" />
          <circle r="30" fill="url(#ksCoreG)" />
          <circle r="12" fill="#FFFFFF" />
        </g>
      </g>
    </svg>
  );
}

/* ---------------------------------------------------------------- canvases */

function createEngine(root, bgCanvas, fxCanvas, tiltEl, reduced) {
  const bx = bgCanvas.getContext("2d");
  const xx = fxCanvas.getContext("2d");

  let W = 0;
  let H = 0;
  let DPR = 1;
  /* projected shield boundary: center + local→screen scale factors */
  let rim = { cx: 0, cy: 0, sx: 1, sy: 1 };

  let t = 0;
  const redBolts = [];
  const blueBolts = [];
  const sparks = [];
  const flashes = [];
  const ripples = [];
  let farShards = [];
  let nearShards = [];
  let columns = [];
  let nextRed = 0.4;
  let nextBlue = 1.0;

  /* Boundary point of the projected shield nearest to screen-space angle a. */
  const rimPoint = (a) => {
    let best = 0;
    let bd = Infinity;
    for (let i = 0; i < SHIELD_PTS.length; i++) {
      const dx = SHIELD_PTS[i][0] * rim.sx;
      const dy = SHIELD_PTS[i][1] * rim.sy;
      let d = Math.atan2(dy, dx) - a;
      d = Math.abs(Math.atan2(Math.sin(d), Math.cos(d)));
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    return [rim.cx + SHIELD_PTS[best][0] * rim.sx, rim.cy + SHIELD_PTS[best][1] * rim.sy];
  };

  const makeShard = (near) => ({
    x: rand(W * 0.1, W * 0.9),
    y: rand(H * 0.1, H * 0.9),
    z: rand(0.35, 1),
    s: near ? rand(2.5, 5) : rand(1.5, 3.5),
    rot: rand(0, TAU),
    vr: rand(-1.2, 1.2),
    shape: Math.random() < 0.55 ? "cube" : "tri",
    c: pick([RED, CYN, GLD]),
    ph: rand(0, TAU),
  });

  const initField = () => {
    farShards = Array.from({ length: 30 }, () => makeShard(false));
    nearShards = Array.from({ length: 22 }, () => makeShard(true));
    const colW = 26;
    const n = Math.min(24, Math.max(6, (W / colW) | 0));
    columns = Array.from({ length: n }, (_, i) => ({
      x: i * colW + rand(0, 10),
      y: rand(-H, 0),
      sp: rand(28, 75),
      chars: Array.from({ length: 12 + ((Math.random() * 10) | 0) }, () => pick(MATRIX_CHARS)),
    }));
    redBolts.length = blueBolts.length = sparks.length = flashes.length = ripples.length = 0;
  };

  const resize = () => {
    W = root.clientWidth;
    H = root.clientHeight;
    if (!W || !H) return;
    DPR = Math.min(1.5, window.devicePixelRatio || 1);
    for (const c of [bgCanvas, fxCanvas]) {
      c.width = Math.round(W * DPR);
      c.height = Math.round(H * DPR);
    }
    const rr = root.getBoundingClientRect();
    const tr = tiltEl.getBoundingClientRect();
    /* local shield coords (950-unit viewBox) → screen px inside root */
    rim = {
      cx: tr.left + tr.width / 2 - rr.left,
      cy: tr.top + tr.height / 2 - rr.top,
      sx: tr.width / 950,
      sy: tr.height / 950,
    };
    initField();
    if (reduced) drawStatic();
  };

  /* ------------------------------------------------ attack / defense fx */

  const impact = (x, y, outAng, color) => {
    flashes.push({ x, y, age: 0, life: 0.28, r: Math.min(W, H) * rand(0.04, 0.07), c: color });
    /* hex cells of the energy field light up around the hit */
    ripples.push({ x, y, age: 0, life: rand(0.55, 0.75) });
    if (ripples.length > 6) ripples.shift();
    /* ~half the hits visibly ricochet back off the shield */
    if (Math.random() < 0.55) {
      const a = outAng + rand(-0.6, 0.6);
      const len = Math.min(W, H) * rand(0.15, 0.3);
      blueBolts.push({
        ...buildBolt(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len),
        age: 0,
        life: rand(0.2, 0.35),
        w: rand(1, 1.5),
        c: color,
      });
    }
    const n = 8 + ((Math.random() * 7) | 0);
    for (let i = 0; i < n; i++) {
      const a = outAng + rand(-1.1, 1.1);
      const sp = rand(60, 260);
      sparks.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        age: 0,
        life: rand(0.3, 0.6),
        r: rand(0.8, 2),
        c: Math.random() < 0.6 ? color : pick([GLD, CYN, WHT]),
      });
    }
  };

  const spawnRed = () => {
    const th = rand(Math.PI * 0.62, Math.PI * 1.38); /* left face of the shield */
    const [tx, ty] = rimPoint(th);
    const sx = -rand(20, 90);
    const sy = rand(H * 0.08, H * 0.92);
    const roll = Math.random();
    const c = roll < 0.55 ? RED : roll < 0.88 ? ORN : PUR;
    redBolts.push({ ...buildBolt(sx, sy, tx, ty), age: 0, life: rand(0.25, 0.45), w: rand(1.4, 2.2), c });
    impact(tx, ty, th, c);
    /* defense mirrors the attack ~half the time */
    if (Math.random() < 0.5) spawnBlue(th + rand(-0.5, 0.5));
  };

  const spawnBlue = (baseAng) => {
    const a = baseAng ?? rand(0, TAU);
    const [sx, sy] = rimPoint(a);
    const len = Math.min(W, H) * rand(0.12, 0.28);
    const tx = sx + Math.cos(a) * len;
    const ty = sy + Math.sin(a) * len;
    blueBolts.push({ ...buildBolt(sx, sy, tx, ty), age: 0, life: rand(0.25, 0.4), w: rand(1, 1.6), c: CYN });
  };

  const strokePath = (ctx, pts, w, alpha, color) => {
    const passes = [
      [w * 4, `rgba(${color},${0.14 * alpha})`],
      [w * 1.7, `rgba(${color},${0.55 * alpha})`],
      [1, `rgba(${WHT},${0.95 * alpha})`],
    ];
    for (const [lw, style] of passes) {
      ctx.lineWidth = lw;
      ctx.strokeStyle = style;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    }
  };

  const drawBoltList = (ctx, list, dt) => {
    for (let i = list.length - 1; i >= 0; i--) {
      const b = list[i];
      b.age += dt;
      if (b.age >= b.life) {
        list.splice(i, 1);
        continue;
      }
      /* fast per-frame flicker */
      const alpha = (1 - b.age / b.life) * rand(0.7, 1);
      strokePath(ctx, b.main, b.w, alpha, b.c);
      for (const f of b.forks) strokePath(ctx, f, b.w * 0.55, alpha * 0.8, b.c);
    }
  };

  const drawShard = (ctx, s, alpha) => {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    ctx.globalAlpha = alpha;
    const d = s.s;
    if (s.shape === "cube") {
      ctx.fillStyle = `rgba(${s.c},0.7)`;
      ctx.fillRect(-d / 2, -d / 2, d, d);
      ctx.strokeStyle = `rgba(${WHT},0.35)`;
      ctx.lineWidth = 0.6;
      ctx.strokeRect(-d / 2, -d / 2, d, d);
    } else {
      ctx.fillStyle = `rgba(${s.c},0.65)`;
      ctx.beginPath();
      ctx.moveTo(0, -d * 0.7);
      ctx.lineTo(d * 0.6, d * 0.5);
      ctx.lineTo(-d * 0.6, d * 0.5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  };

  const moveShard = (s, dt, speed) => {
    /* parallax drift away from the shield core, toward the viewer edges */
    const dx = s.x - rim.cx;
    const dy = s.y - rim.cy;
    const d = Math.hypot(dx, dy) || 1;
    s.x += (dx / d) * speed * s.z * dt;
    s.y += (dy / d) * speed * s.z * dt;
    s.rot += s.vr * dt;
    if (s.x < -20 || s.x > W + 20 || s.y < -20 || s.y > H + 20) {
      s.x = rim.cx + rand(-W * 0.3, W * 0.3);
      s.y = rim.cy + rand(-H * 0.35, H * 0.35);
    }
  };

  /* ------------------------------------------------ background layer */

  const drawBg = (dt) => {
    bx.setTransform(DPR, 0, 0, DPR, 0, 0);
    bx.clearRect(0, 0, W, H);

    /* matrix rain — far background, 6% */
    bx.font = "11px monospace";
    bx.textAlign = "center";
    for (const col of columns) {
      col.y += col.sp * dt;
      const lh = 14;
      if (col.y - col.chars.length * lh > H) {
        col.y = -rand(20, H * 0.5);
        col.sp = rand(28, 75);
      }
      if (Math.random() < 0.06) col.chars[(Math.random() * col.chars.length) | 0] = pick(MATRIX_CHARS);
      for (let k = 0; k < col.chars.length; k++) {
        const yy = col.y - k * lh;
        if (yy < -lh || yy > H + lh) continue;
        bx.fillStyle = `rgba(${GRN},${(0.06 * (1 - k / col.chars.length)).toFixed(3)})`;
        bx.fillText(col.chars[k], col.x, yy);
      }
    }

    /* far debris shards */
    for (const s of farShards) {
      moveShard(s, dt, 9);
      drawShard(bx, s, (0.25 + 0.2 * s.z) * (0.6 + 0.4 * Math.sin(t * 2 + s.ph)));
    }

    /* faint volumetric light cone from the core toward the upper-left —
       additive so it can only brighten */
    bx.globalCompositeOperation = "lighter";
    const cg = bx.createLinearGradient(rim.cx, rim.cy, W * 0.05, -H * 0.1);
    cg.addColorStop(0, `rgba(200,255,240,0.10)`);
    cg.addColorStop(0.5, `rgba(200,240,255,0.04)`);
    cg.addColorStop(1, `rgba(200,255,240,0)`);
    bx.fillStyle = cg;
    bx.beginPath();
    bx.moveTo(rim.cx, rim.cy);
    bx.lineTo(-W * 0.05, -H * 0.35);
    bx.lineTo(W * 0.55, -H * 0.3);
    bx.closePath();
    bx.fill();
    bx.globalCompositeOperation = "source-over";
  };

  /* ------------------------------------------------ foreground fx layer */

  const drawFx = (dt) => {
    xx.setTransform(DPR, 0, 0, DPR, 0, 0);
    xx.clearRect(0, 0, W, H);

    if (!reduced) {
      nextRed -= dt;
      nextBlue -= dt;
      /* keep 2-4 bolts alive: randomized spawn cadence plus a floor of 2 */
      if (nextRed <= 0 && redBolts.length + blueBolts.length < 4) {
        spawnRed();
        nextRed = rand(0.3, 0.9);
      }
      while (redBolts.length + blueBolts.length < 2) spawnRed();
      if (nextBlue <= 0 && blueBolts.length < 2) {
        spawnBlue();
        nextBlue = rand(0.5, 1.3);
      }
    }

    xx.globalCompositeOperation = "lighter";
    xx.lineCap = "round";
    xx.lineJoin = "round";

    drawBoltList(xx, redBolts, dt);
    drawBoltList(xx, blueBolts, dt);

    /* hex-cell shield ripples — the energy field reacting to each hit */
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.age += dt;
      const k = rp.age / rp.life;
      if (k >= 1) {
        ripples.splice(i, 1);
        continue;
      }
      const ringR = k * 70;
      xx.lineWidth = 1.2;
      for (const [ox, oy] of HEX_CELLS) {
        const d = Math.hypot(ox, oy);
        const a = Math.exp(-((d - ringR) * (d - ringR)) / 500) * (1 - k) * 0.9;
        if (a < 0.04) continue;
        hexPath(xx, rp.x + ox, rp.y + oy, 9);
        xx.strokeStyle = `rgba(${CYN},${a})`;
        xx.stroke();
        xx.fillStyle = `rgba(${CYN},${a * 0.22})`;
        xx.fill();
      }
      /* expanding pressure ring */
      xx.lineWidth = 1.5;
      xx.strokeStyle = `rgba(${WHT},${0.5 * (1 - k)})`;
      xx.beginPath();
      xx.arc(rp.x, rp.y, ringR, 0, TAU);
      xx.stroke();
    }

    /* impact flashes on the shield surface */
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      f.age += dt;
      const k = f.age / f.life;
      if (k >= 1) {
        flashes.splice(i, 1);
        continue;
      }
      const r = f.r * (0.4 + k);
      const gr = xx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
      gr.addColorStop(0, `rgba(${WHT},${0.9 * (1 - k)})`);
      gr.addColorStop(0.35, `rgba(${f.c},${0.5 * (1 - k)})`);
      gr.addColorStop(1, `rgba(${f.c},0)`);
      xx.fillStyle = gr;
      xx.fillRect(f.x - r, f.y - r, r * 2, r * 2);
    }

    /* spark particles — gravity-free decay */
    for (let i = sparks.length - 1; i >= 0; i--) {
      const sp = sparks[i];
      sp.age += dt;
      if (sp.age >= sp.life) {
        sparks.splice(i, 1);
        continue;
      }
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.vx *= 1 - dt * 1.6;
      sp.vy *= 1 - dt * 1.6;
      const a = 1 - sp.age / sp.life;
      xx.fillStyle = `rgba(${sp.c},${a})`;
      xx.beginPath();
      xx.arc(sp.x, sp.y, sp.r, 0, TAU);
      xx.fill();
    }
    if (sparks.length > 160) sparks.splice(0, sparks.length - 160);

    /* near debris shards, in front of the shield */
    xx.globalCompositeOperation = "source-over";
    for (const s of nearShards) {
      moveShard(s, dt, 16);
      drawShard(xx, s, (0.3 + 0.3 * s.z) * (0.55 + 0.45 * Math.sin(t * 2.4 + s.ph)));
    }
  };

  const drawStatic = () => {
    drawBg(0);
    drawFx(0);
  };

  const frame = (dt) => {
    t += dt;
    drawBg(dt);
    drawFx(dt);
  };

  return { resize, frame, drawStatic };
}

/* ---------------------------------------------------------------- component */

export default function HeroKavachDefense({ className }) {
  const rootRef = useRef(null);
  const bgRef = useRef(null);
  const fxRef = useRef(null);
  const tiltRef = useRef(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const root = rootRef.current;
    const bg = bgRef.current;
    const fx = fxRef.current;
    const tilt = tiltRef.current;
    if (!root || !bg || !fx || !tilt) return;

    const engine = createEngine(root, bg, fx, tilt, reduced);

    let raf = 0;
    let last = 0;
    let inView = true;

    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
      last = now;
      engine.frame(dt);
    };
    const start = () => {
      root.classList.remove("ks-paused");
      if (!raf && inView && !document.hidden && !reduced) {
        last = 0;
        raf = requestAnimationFrame(loop);
      }
    };
    const stop = () => {
      root.classList.add("ks-paused");
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    engine.resize();
    if (reduced) engine.drawStatic();
    else start();

    const ro = new ResizeObserver(() => engine.resize());
    ro.observe(root);

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        inView ? start() : stop();
      },
      { threshold: 0.05 }
    );
    io.observe(root);

    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reduced]);

  return (
    <div
      ref={rootRef}
      className={`kavach-shield ${className || ""}`}
      aria-hidden="true"
      style={{ pointerEvents: "none" }}
    >
      <style>{CSS}</style>

      {/* far background: matrix rain, far shards */}
      <canvas ref={bgRef} className="ks-bg" />

      {/* soft cyan-green ambient glow behind the shield */}
      <div className="ks-glow" />

      {/* the kavach shield — 3D-tilted, CSS-animated */}
      <div className="ks-persp">
        <div ref={tiltRef} className="ks-tilt">
          <ShieldSVG />
        </div>
      </div>

      {/* foreground: lightning, hex ripples, impacts, sparks, near shards */}
      <canvas ref={fxRef} className="ks-fx" />
    </div>
  );
}
