import { useEffect, useRef } from "react";
import * as THREE from "three";
import { usePrefersReducedMotion } from "@/lib/hooks";

const GREEN = 0x00ff9c;
const CYAN = 0x22d3ee;
const SAFFRON = 0xff9933;

function makeGlowTexture(hex) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  const c = new THREE.Color(hex);
  const rgb = `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`;
  g.addColorStop(0, `rgba(${rgb},0.55)`);
  g.addColorStop(0.4, `rgba(${rgb},0.16)`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function makeShieldShape() {
  const s = new THREE.Shape();
  s.moveTo(0, 1.18);
  s.lineTo(0.82, 0.96);
  s.quadraticCurveTo(1.04, 0.34, 0.86, -0.34);
  s.quadraticCurveTo(0.6, -1.02, 0, -1.46);
  s.quadraticCurveTo(-0.6, -1.02, -0.86, -0.34);
  s.quadraticCurveTo(-1.04, 0.34, -0.82, 0.96);
  s.closePath();
  return s;
}

export default function KavachShield({ className }) {
  const mountRef = useRef(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
    camera.position.set(0, 0.15, 6);

    const root = new THREE.Group();
    scene.add(root);

    const disposables = [];
    const track = (obj) => (disposables.push(obj), obj);

    /* ---- shield plate ---- */
    const shieldGroup = new THREE.Group();
    root.add(shieldGroup);

    const shieldGeo = track(
      new THREE.ExtrudeGeometry(makeShieldShape(), {
        depth: 0.16,
        bevelEnabled: true,
        bevelThickness: 0.05,
        bevelSize: 0.05,
        bevelSegments: 3,
        curveSegments: 24,
      })
    );
    shieldGeo.center();
    const shieldMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x0c1613,
        metalness: 0.85,
        roughness: 0.32,
        emissive: GREEN,
        emissiveIntensity: 0.12,
      })
    );
    const shield = new THREE.Mesh(shieldGeo, shieldMat);
    shieldGroup.add(shield);

    const edgesGeo = track(new THREE.EdgesGeometry(shieldGeo, 18));
    const edgesMat = track(
      new THREE.LineBasicMaterial({ color: GREEN, transparent: true, opacity: 0.85 })
    );
    shieldGroup.add(new THREE.LineSegments(edgesGeo, edgesMat));

    /* ---- inner emblem ring + core ---- */
    const emblemGeo = track(new THREE.TorusGeometry(0.52, 0.012, 8, 64));
    const emblemMat = track(
      new THREE.MeshBasicMaterial({
        color: CYAN,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    const emblem = new THREE.Mesh(emblemGeo, emblemMat);
    emblem.position.z = 0.24;
    shieldGroup.add(emblem);

    const coreGeo = track(new THREE.OctahedronGeometry(0.3, 0));
    const coreMat = track(
      new THREE.MeshBasicMaterial({
        color: GREEN,
        wireframe: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.z = 0.3;
    shieldGroup.add(core);

    /* ---- glow sprite behind shield ---- */
    const glowTex = track(makeGlowTexture(GREEN));
    const glowMat = track(
      new THREE.SpriteMaterial({
        map: glowTex,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.8,
      })
    );
    const glow = new THREE.Sprite(glowMat);
    glow.scale.setScalar(5.2);
    glow.position.z = -0.6;
    root.add(glow);

    /* ---- protective wireframe dome ---- */
    const domeGeo = track(new THREE.IcosahedronGeometry(2.15, 1));
    const domeMat = track(
      new THREE.MeshBasicMaterial({
        color: CYAN,
        wireframe: true,
        transparent: true,
        opacity: 0.1,
      })
    );
    const dome = new THREE.Mesh(domeGeo, domeMat);
    root.add(dome);

    /* ---- orbiting particles ---- */
    const COUNT = 260;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const palette = [new THREE.Color(GREEN), new THREE.Color(CYAN), new THREE.Color(SAFFRON)];
    for (let i = 0; i < COUNT; i++) {
      const r = 1.9 + Math.random() * 0.9;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      const c = palette[Math.random() < 0.08 ? 2 : Math.random() < 0.5 ? 0 : 1];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    const pGeo = track(new THREE.BufferGeometry());
    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    pGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const pMat = track(
      new THREE.PointsMaterial({
        size: 0.035,
        vertexColors: true,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      })
    );
    const particles = new THREE.Points(pGeo, pMat);
    root.add(particles);

    /* ---- vertical scan ring ---- */
    const ringGeo = track(new THREE.TorusGeometry(1.6, 0.008, 8, 96));
    const ringMat = track(
      new THREE.MeshBasicMaterial({
        color: GREEN,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    const scanRing = new THREE.Mesh(ringGeo, ringMat);
    scanRing.rotation.x = Math.PI / 2;
    root.add(scanRing);

    /* ---- floor grid ---- */
    const gridGeo = track(new THREE.RingGeometry(0.4, 2.4, 48, 4));
    const gridMat = track(
      new THREE.MeshBasicMaterial({
        color: GREEN,
        wireframe: true,
        transparent: true,
        opacity: 0.05,
      })
    );
    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = -2.1;
    root.add(grid);

    /* ---- lights ---- */
    scene.add(new THREE.AmbientLight(0x334455, 1.2));
    const keyLight = new THREE.PointLight(GREEN, 18, 20);
    keyLight.position.set(2.5, 2, 3.5);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(CYAN, 14, 20);
    rimLight.position.set(-3, -1, -2.5);
    scene.add(rimLight);

    /* ---- sizing ---- */
    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) renderer.render(scene, camera);
    });
    ro.observe(mount);

    /* ---- pointer parallax ---- */
    const target = { x: 0, y: 0 };
    const onPointer = (e) => {
      const rect = mount.getBoundingClientRect();
      target.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      target.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    const onLeave = () => {
      target.x = 0;
      target.y = 0;
    };
    mount.addEventListener("pointermove", onPointer);
    mount.addEventListener("pointerleave", onLeave);

    /* ---- animation ---- */
    let raf = 0;
    let inView = true;
    const clock = new THREE.Clock();

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      root.rotation.y += (target.x * 0.45 - root.rotation.y) * 0.05;
      root.rotation.x += (target.y * 0.25 - root.rotation.x) * 0.05;

      shieldGroup.rotation.y = Math.sin(t * 0.4) * 0.18;
      shieldGroup.position.y = Math.sin(t * 0.8) * 0.06;

      const pulse = 0.12 + (Math.sin(t * 2.2) * 0.5 + 0.5) * 0.22;
      shieldMat.emissiveIntensity = pulse;
      glowMat.opacity = 0.55 + pulse;

      emblem.rotation.z = t * 0.6;
      core.rotation.y = t * 1.4;
      core.rotation.x = t * 0.7;

      dome.rotation.y = t * 0.12;
      dome.rotation.x = Math.sin(t * 0.3) * 0.1;
      particles.rotation.y = -t * 0.05;

      const cycle = (t * 0.35) % 1;
      scanRing.position.y = -1.8 + cycle * 3.6;
      ringMat.opacity = Math.sin(cycle * Math.PI) * 0.6;

      renderer.render(scene, camera);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (reduced) return;
        if (inView && !raf) {
          clock.start();
          animate();
        } else if (!inView && raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { threshold: 0.05 }
    );
    io.observe(mount);

    if (reduced) {
      root.rotation.y = -0.25;
      root.rotation.x = 0.08;
      renderer.render(scene, camera);
    } else if (inView) {
      animate();
    }

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      mount.removeEventListener("pointermove", onPointer);
      mount.removeEventListener("pointerleave", onLeave);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [reduced]);

  return <div ref={mountRef} className={className} aria-hidden="true" />;
}
