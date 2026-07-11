"use client";

import { useMemo, useRef } from "react";
import { Canvas, extend, useFrame, useThree, type ThreeElement } from "@react-three/fiber";
import { Scroll, ScrollControls, shaderMaterial, useScroll } from "@react-three/drei";
import * as THREE from "three";

/**
 * THE MARKET DIMENSION — scroll-driven WebGL film.
 *
 * Timeline (scroll offset 0→1):
 *   0.00–0.10  Phase 1: flat 2D chart, buy order, risk box
 *   0.10–0.14  the dive-bomb through the stop — shake + red flash
 *   0.14–0.18  calm again — "Go beyond 2 dimensions"
 *   0.18–0.30  Phase 2: the chart shatters; camera punches through shards
 *   0.30–0.45  Phase 3a: Gravity Wells (pure grid deformation, no spiral)
 *   0.45–0.63  Phase 3b: Chronolith + blinding core confluence light
 *   0.63–0.88  Phase 3c: Liquidity Topology terrain
 *   0.88–1.00  resolve to black + CTA
 */

const PAGES = 11;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const span = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));
const ease = (t: number) => t * t * (3 - 2 * t);

/* ── Deterministic RNG so every viewing is the same film ─────────────────── */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

/* ═════════════════ PHASE 1: the 2D chart as a live texture ══════════════ */

interface Candle2D {
  o: number;
  c: number;
  h: number;
  l: number;
}

/**
 * Realistic dive-bomb: markets breathe on the way down. Expanding sell-off
 * legs, green counter-trend retracements between them, upper-wick rejections
 * on the sell legs, lower-wick liquidity sweeps on the bounces.
 */
const CHART_CANDLES: Candle2D[] = (() => {
  const r = rng(1337);
  const out: Candle2D[] = [];
  let p = 100;
  const push = (drift: number, wickUp: number, wickDn: number) => {
    const o = p;
    const c = p + drift;
    out.push({ o, c, h: Math.max(o, c) + wickUp, l: Math.min(o, c) - wickDn });
    p = c;
  };

  // Calm regime — small bodies, honest little wicks both sides.
  for (let i = 0; i < 58; i++) {
    push((r() - 0.47) * 2.2, 0.15 + r() * 1.1, 0.15 + r() * 1.1);
  }

  // The dump — legs down with retracements, ranges expanding leg over leg.
  let leg = 0;
  while (out.length < 84) {
    const legLen = 3 + Math.floor(r() * 3);
    let legDrop = 0;
    for (let j = 0; j < legLen; j++) {
      const d = -(1.1 + r() * 2.2) * (1 + leg * 0.1);
      legDrop -= d;
      // Sellers slam it; buyers poke highs that get rejected → upper wicks.
      push(d, 0.4 + r() * 1.8, 0.15 + r() * 0.7);
    }
    const bounceLen = 1 + Math.floor(r() * 3);
    let remaining = legDrop * (0.3 + r() * 0.3);
    for (let j = 0; j < bounceLen; j++) {
      const d = Math.max(0.25, (remaining / (bounceLen - j)) * (0.7 + r() * 0.6));
      remaining -= d;
      // Bounce candles sweep the lows first → long lower wicks.
      push(d, 0.25 + r() * 0.7, 0.5 + r() * 1.8);
    }
    leg++;
  }

  // Post-shock chop, drifting heavy.
  for (let i = 0; i < 10; i++) {
    push((r() - 0.54) * 1.8, 0.2 + r() * 1.4, 0.2 + r() * 1.4);
  }
  return out;
})();

const ENTRY_INDEX = 46;

function drawChart(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const LEN = CHART_CANDLES.length;
  ctx.fillStyle = "#04060B";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(138,150,177,0.09)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  const shown = Math.max(50, Math.floor(50 + t * (LEN - 50)));
  const candles = CHART_CANDLES.slice(0, Math.min(shown, LEN));
  let min = Infinity, max = -Infinity;
  for (const c of candles) { min = Math.min(min, c.l); max = Math.max(max, c.h); }
  const pad = (max - min) * 0.12;
  min -= pad; max += pad;
  const py = (v: number) => ((max - v) / (max - min)) * H;
  const step = W / LEN;
  const last = candles[candles.length - 1];

  // Right-edge price scale — the borderless terminal feel.
  ctx.font = "500 15px monospace";
  ctx.fillStyle = "rgba(138,150,177,0.55)";
  for (let y = 60; y < H - 20; y += 120) {
    const price = max - ((max - min) * y) / H;
    ctx.fillText(price.toFixed(2), W - 78, y + 5);
  }

  // The long-position risk box, visible once the order is "placed".
  if (shown > ENTRY_INDEX) {
    const entry = CHART_CANDLES[ENTRY_INDEX].c;
    const x0 = ENTRY_INDEX * step;
    ctx.fillStyle = "rgba(0,255,102,0.10)";
    ctx.fillRect(x0, py(entry + 9), W - x0, py(entry) - py(entry + 9));
    ctx.fillStyle = "rgba(255,51,102,0.14)";
    ctx.fillRect(x0, py(entry), W - x0, py(entry - 6) - py(entry));
    ctx.setLineDash([7, 6]);
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath(); ctx.moveTo(x0, py(entry)); ctx.lineTo(W, py(entry)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "600 16px monospace";
    ctx.fillText("LONG 2 @ MKT", x0 + 8, py(entry) - 8);
  }

  candles.forEach((c, i) => {
    const x = i * step;
    const up = c.c >= c.o;
    ctx.strokeStyle = up ? "rgba(0,255,102,0.9)" : "rgba(255,51,102,0.95)";
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = Math.max(1, step * 0.08);
    ctx.beginPath();
    ctx.moveTo(x + step * 0.4, py(c.h));
    ctx.lineTo(x + step * 0.4, py(c.l));
    ctx.stroke();
    ctx.fillRect(x, Math.min(py(c.o), py(c.c)), step * 0.72, Math.max(2, Math.abs(py(c.o) - py(c.c))));
  });

  // Last-price tag riding the newest close.
  if (last) {
    const up = last.c >= last.o;
    const y = py(last.c);
    ctx.fillStyle = up ? "rgba(0,255,102,0.9)" : "rgba(255,51,102,0.95)";
    ctx.fillRect(W - 84, y - 12, 80, 24);
    ctx.fillStyle = "#04060B";
    ctx.font = "700 15px monospace";
    ctx.fillText(last.c.toFixed(2), W - 78, y + 5);
  }

  // Terminal header + watermark.
  ctx.fillStyle = "rgba(244,245,250,0.85)";
  ctx.font = "700 18px monospace";
  ctx.fillText("NQ · 5m", 22, 34);
  if (last) {
    ctx.font = "500 15px monospace";
    ctx.fillStyle = "rgba(138,150,177,0.7)";
    ctx.fillText(
      `O ${last.o.toFixed(2)}  H ${last.h.toFixed(2)}  L ${last.l.toFixed(2)}  C ${last.c.toFixed(2)}`,
      120, 34
    );
  }
  ctx.font = "700 44px monospace";
  ctx.fillStyle = "rgba(244,245,250,0.045)";
  ctx.fillText("CONFLUENTX TERMINAL", W / 2 - 290, H / 2 + 14);
}

const CHART_CAMERA_DISTANCE = 7.5; // camera start z minus plane z
const CHART_FOV_DEG = 60;

/**
 * Plane dimensions that exactly fill the viewport at the camera's starting
 * distance (plus margin for handheld drift) — the borderless terminal.
 */
function useChartPlaneSize(): readonly [number, number] {
  const size = useThree((s) => s.size);
  return useMemo(() => {
    const h = 2 * CHART_CAMERA_DISTANCE * Math.tan(THREE.MathUtils.degToRad(CHART_FOV_DEG / 2)) * 1.06;
    const w = (h * size.width) / Math.max(1, size.height);
    return [w, h] as const;
  }, [size.width, size.height]);
}

function ChartPlane() {
  const scroll = useScroll();
  const mesh = useRef<THREE.Mesh>(null);
  const lastDraw = useRef(-1);
  const [w, h] = useChartPlaneSize();
  const { texture, ctx, canvas } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d")!;
    drawChart(ctx, canvas.width, canvas.height, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return { texture, ctx, canvas };
  }, []);

  useFrame(() => {
    const o = scroll.offset;
    if (!mesh.current) return;
    mesh.current.visible = o < 0.185;
    if (o >= 0.185) return;
    const t = span(o, 0, 0.14);
    if (Math.abs(t - lastDraw.current) > 0.004) {
      lastDraw.current = t;
      drawChart(ctx, canvas.width, canvas.height, t);
      texture.needsUpdate = true;
    }
  });

  return (
    <mesh ref={mesh} position={[0, 0.6, 0]}>
      <planeGeometry key={`${w.toFixed(2)}x${h.toFixed(2)}`} args={[w, h]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

/* ═════════════════ PHASE 2: the shatter ═════════════════════════════════ */

const SHARD_COUNT = 640;

function Shards() {
  const scroll = useScroll();
  const inst = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const [w, h] = useChartPlaneSize();
  const shards = useMemo(() => {
    const r = rng(4242);
    const sizeScale = Math.sqrt((w * h) / (7 * 4.2));
    return Array.from({ length: SHARD_COUNT }, () => {
      // Shards originate across the full-viewport glass.
      const gx = (r() - 0.5) * w;
      const gy = 0.6 + (r() - 0.5) * h;
      return {
        origin: new THREE.Vector3(gx, gy, 0),
        // Outward from the breach point, biased hard toward the camera (+z).
        velocity: new THREE.Vector3(gx * (0.6 + r()), (gy - 0.6) * (0.6 + r()), 4 + r() * 14),
        axis: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(),
        spin: (r() - 0.5) * 14,
        scale: (0.1 + r() * 0.26) * sizeScale,
      };
    });
  }, [w, h]);

  useFrame(() => {
    const im = inst.current;
    if (!im) return;
    const s = span(scroll.offset, 0.18, 0.3);
    im.visible = s > 0 && s < 1;
    if (!im.visible) return;
    const e = ease(s);
    shards.forEach((sh, i) => {
      dummy.position.copy(sh.origin).addScaledVector(sh.velocity, e * 1.6);
      dummy.position.y -= e * e * 1.2; // a little gravity
      dummy.quaternion.setFromAxisAngle(sh.axis, sh.spin * e);
      dummy.scale.setScalar(sh.scale * (1 - e * 0.35));
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={inst} args={[undefined, undefined, SHARD_COUNT]} visible={false}>
      <planeGeometry args={[0.3, 0.22]} />
      <meshBasicMaterial
        color="#9fd8ff"
        transparent
        opacity={0.65}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

/* ═════════════════ PHASE 3a: gravity wells (pure grid, no spiral) ═══════ */

const WellGridMaterial = shaderMaterial(
  { uTime: 0, uWells: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] },
  /* glsl vertex */ `
    uniform float uTime;
    uniform vec3 uWells[3]; // xy = position on grid plane, z = mass
    varying float vWarp;
    void main() {
      vec3 p = position;
      float warp = 0.0;
      for (int i = 0; i < 3; i++) {
        float d = distance(p.xy, uWells[i].xy);
        warp += uWells[i].z / (d * d * 0.55 + 0.6);
      }
      p.z -= warp;
      p.z += sin(p.x * 0.7 + uTime * 0.6) * cos(p.y * 0.7 - uTime * 0.4) * 0.06;
      vWarp = warp;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
  `,
  /* glsl fragment */ `
    varying float vWarp;
    void main() {
      vec3 base = vec3(0.13, 0.16, 0.24);
      vec3 hot  = vec3(0.0, 0.9, 1.0);
      vec3 color = mix(base, hot, clamp(vWarp * 0.55, 0.0, 1.0));
      gl_FragColor = vec4(color, 0.85);
    }
  `
);

/* Blinding radial bloom + anamorphic streak, no post-processing needed. */
const CoreLightMaterial = shaderMaterial(
  { uIntensity: 0 },
  /* glsl vertex */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* glsl fragment */ `
    uniform float uIntensity;
    varying vec2 vUv;
    void main() {
      vec2 c = vUv - 0.5;
      float d = length(c);
      // Hot core with steep falloff …
      float core = pow(clamp(1.0 - d * 2.1, 0.0, 1.0), 3.0);
      // … a wide soft halo …
      float halo = pow(clamp(1.0 - d * 1.15, 0.0, 1.0), 6.0) * 0.6;
      // … anamorphic horizontal streak …
      float streak = pow(clamp(1.0 - abs(c.y) * 14.0, 0.0, 1.0), 2.0)
                   * pow(clamp(1.0 - abs(c.x) * 1.4, 0.0, 1.0), 2.0) * 0.9;
      // … and a faint vertical blade.
      float blade = pow(clamp(1.0 - abs(c.x) * 14.0, 0.0, 1.0), 2.0)
                  * pow(clamp(1.0 - abs(c.y) * 1.8, 0.0, 1.0), 2.0) * 0.4;
      float glow = (core + halo + streak + blade) * uIntensity;
      vec3 color = mix(vec3(0.65, 0.9, 1.0), vec3(1.0), clamp(core * 1.4, 0.0, 1.0));
      gl_FragColor = vec4(color * glow, glow);
    }
  `
);

extend({ WellGridMaterial, CoreLightMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    wellGridMaterial: ThreeElement<typeof WellGridMaterial>;
    coreLightMaterial: ThreeElement<typeof CoreLightMaterial>;
  }
}

const WELLS: [number, number, number][] = [
  [-4.5, 2.5, 2.4],
  [3.8, -1.8, 3.2],
  [0.5, 4.2, 1.5],
];

function GravityWells({ position }: { position: [number, number, number] }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  useFrame((state) => {
    if (mat.current) mat.current.uniforms.uTime.value = state.clock.elapsedTime;
  });
  const wellsUniform = useMemo(() => WELLS.map(([x, y, m]) => new THREE.Vector3(x, y, m)), []);
  return (
    <group position={position} rotation={[-Math.PI / 2.6, 0, 0.3]}>
      <mesh>
        <planeGeometry args={[26, 26, 96, 96]} />
        <wellGridMaterial wireframe transparent uWells={wellsUniform} ref={mat} />
      </mesh>
    </group>
  );
}

/* ═════════════════ PHASE 3b: chronolith + core light ════════════════════ */

const PLANES: { rot: [number, number, number]; tint: string }[] = [
  { rot: [0, 0, 0], tint: "#00E5FF" },
  { rot: [0.5, 0.35, 0], tint: "#7000FF" },
  { rot: [-0.45, -0.3, 0.2], tint: "#00E5FF" },
  { rot: [0.15, -0.55, -0.25], tint: "#8A96B1" },
];
const PLANE_SIZE = 9;

function planeIntersection(a: THREE.Matrix4, b: THREE.Matrix4): THREE.Vector3[] | null {
  const na = new THREE.Vector3(0, 0, 1).transformDirection(a);
  const nb = new THREE.Vector3(0, 0, 1).transformDirection(b);
  const pa = new THREE.Vector3().setFromMatrixPosition(a);
  const pb = new THREE.Vector3().setFromMatrixPosition(b);
  const dir = new THREE.Vector3().crossVectors(na, nb);
  if (dir.lengthSq() < 1e-6) return null;
  dir.normalize();
  const n1n2 = na.dot(nb);
  const d1 = na.dot(pa);
  const d2 = nb.dot(pb);
  const det = 1 - n1n2 * n1n2;
  const c1 = (d1 - d2 * n1n2) / det;
  const c2 = (d2 - d1 * n1n2) / det;
  const point = new THREE.Vector3().addScaledVector(na, c1).addScaledVector(nb, c2);
  const half = PLANE_SIZE * 0.62;
  return [point.clone().addScaledVector(dir, -half), point.clone().addScaledVector(dir, half)];
}

function Chronolith({ position }: { position: [number, number, number] }) {
  const group = useRef<THREE.Group>(null);
  const light = useRef<THREE.ShaderMaterial>(null);
  const scroll = useScroll();

  useFrame((state) => {
    if (group.current) group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.12) * 0.18;
    if (light.current) {
      // The blinding core: ramps as the camera closes on the heart (≈0.53),
      // flickers slightly like an overloaded sensor.
      const proximity = 1 - Math.min(1, Math.abs(scroll.offset - 0.53) / 0.1);
      const flicker = 0.92 + Math.sin(state.clock.elapsedTime * 23) * 0.08;
      light.current.uniforms.uIntensity.value = ease(proximity) * 2.6 * flicker;
    }
  });

  const intersections = useMemo(() => {
    const mats = PLANES.map((p) => {
      const m = new THREE.Matrix4();
      m.makeRotationFromEuler(new THREE.Euler(...p.rot));
      return m;
    });
    const segs: THREE.Vector3[][] = [];
    for (let i = 0; i < mats.length; i++) {
      for (let j = i + 1; j < mats.length; j++) {
        const seg = planeIntersection(mats[i], mats[j]);
        if (seg) segs.push(seg);
      }
    }
    return segs;
  }, []);

  return (
    <group position={position} ref={group}>
      {PLANES.map((p, i) => (
        <mesh key={i} rotation={p.rot}>
          <planeGeometry args={[PLANE_SIZE, PLANE_SIZE]} />
          <meshBasicMaterial color={p.tint} transparent opacity={0.09} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
      {intersections.map((seg, i) => (
        <ConfluenceEdge key={i} from={seg[0]} to={seg[1]} />
      ))}
      {/* The core confluence light — always faces the camera. */}
      <Billboard>
        <mesh>
          <planeGeometry args={[10, 10]} />
          <coreLightMaterial
            ref={light}
            transparent
            depthWrite={false}
            depthTest={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </Billboard>
    </group>
  );
}

function Billboard({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => ref.current?.quaternion.copy(state.camera.quaternion));
  return <group ref={ref}>{children}</group>;
}

function ConfluenceEdge({ from, to }: { from: THREE.Vector3; to: THREE.Vector3 }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const curve = useMemo(() => new THREE.CatmullRomCurve3([from, to]), [from, to]);
  useFrame((state) => {
    if (mat.current) mat.current.opacity = 0.65 + Math.sin(state.clock.elapsedTime * 2.4) * 0.3;
  });
  return (
    <mesh>
      <tubeGeometry args={[curve, 2, 0.035, 6, false]} />
      <meshBasicMaterial ref={mat} color="#FFFFFF" transparent blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

/* ═════════════════ PHASE 3c: liquidity topology ═════════════════════════ */

function LiquidityTopology({ position }: { position: [number, number, number] }) {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(30, 18, 110, 66);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const bid = new THREE.Color("#00FF66");
    const ask = new THREE.Color("#FF3366");
    const floor = new THREE.Color("#0B0E16");
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const ridge =
        Math.sin(x * 0.5) * Math.cos(y * 0.55) +
        Math.sin(x * 1.3 + y * 0.8) * 0.5 +
        Math.sin(x * 2.7) * 0.22;
      const side = Math.tanh(y * 0.55);
      const h = Math.max(0, ridge + 0.8) * 1.4 * Math.abs(side);
      pos.setZ(i, side >= 0 ? h : -h * 0.85);
      const t = Math.min(1, h / 2.4);
      c.copy(floor).lerp(side >= 0 ? bid : ask, 0.25 + t * 0.75);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <group position={position} rotation={[-Math.PI / 2.35, 0, 0]}>
      <mesh geometry={geometry}>
        <meshStandardMaterial vertexColors flatShading metalness={0.2} roughness={0.6} />
      </mesh>
      <mesh geometry={geometry}>
        <meshBasicMaterial vertexColors wireframe transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ═════════════════ Screen FX: shake-synced flash plane ══════════════════ */

function ScreenFlash() {
  const scroll = useScroll();
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const red = useMemo(() => new THREE.Color("#FF3366"), []);
  const white = useMemo(() => new THREE.Color("#FFFFFF"), []);

  useFrame((state) => {
    if (!group.current || !mat.current) return;
    group.current.position.copy(state.camera.position);
    group.current.quaternion.copy(state.camera.quaternion);
    const o = scroll.offset;
    // Red slam flash, white breach flash.
    const slam = Math.sin(span(o, 0.1, 0.145) * Math.PI);
    const breach = Math.sin(span(o, 0.18, 0.225) * Math.PI);
    if (slam > breach) {
      mat.current.color = red;
      mat.current.opacity = slam * 0.28;
    } else {
      mat.current.color = white;
      mat.current.opacity = breach * 0.5;
    }
  });

  return (
    <group ref={group}>
      <mesh position={[0, 0, -1]}>
        <planeGeometry args={[6, 4]} />
        <meshBasicMaterial ref={mat} transparent opacity={0} depthWrite={false} depthTest={false} />
      </mesh>
    </group>
  );
}

/* ═════════════════ Backdrop ═════════════════════════════════════════════ */

function DataDust() {
  const pts = useMemo(() => {
    const r = rng(99);
    const n = 1200;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (r() - 0.5) * 70;
      arr[i * 3 + 1] = (r() - 0.5) * 40;
      arr[i * 3 + 2] = -r() * 120;
    }
    return arr;
  }, []);
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pts, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#8A96B1" size={0.06} transparent opacity={0.5} depthWrite={false} />
    </points>
  );
}

/* ═════════════════ Camera rig: piecewise-remapped flight path ═══════════ */

const ZONE_WELLS: [number, number, number] = [0, -2, -22];
const ZONE_CHRONO: [number, number, number] = [4, 1, -52];
const ZONE_TOPO: [number, number, number] = [-2, -3, -84];

function CameraRig() {
  const scroll = useScroll();
  const path = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(0, 0.6, 7.5), // staring at the 2D chart
          new THREE.Vector3(0, 0.6, 4.6), // slow dolly-in through phase 1
          new THREE.Vector3(0, 0.7, 2.2), // right at the glass at the breach
          new THREE.Vector3(0, 1, -8), // punched through
          new THREE.Vector3(-3, 4.5, -16),
          new THREE.Vector3(2.5, 2, -30),
          new THREE.Vector3(6, 0.5, -44),
          new THREE.Vector3(4, 1, -52.5), // through the chronolith heart
          new THREE.Vector3(-4, 5, -70),
          new THREE.Vector3(0, 1.2, -86),
          new THREE.Vector3(0, 0.4, -98),
        ],
        false,
        "catmullrom",
        0.3
      ),
    []
  );
  const look = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(0, 0.6, 0),
          new THREE.Vector3(0, 0.6, 0),
          new THREE.Vector3(0, 0.7, -2),
          new THREE.Vector3(0, -1, -20),
          new THREE.Vector3(0, -2, -24),
          new THREE.Vector3(4, 1, -50),
          new THREE.Vector3(4, 1, -54),
          new THREE.Vector3(-2, -1, -76),
          new THREE.Vector3(-2, -3, -84),
          new THREE.Vector3(0, -1, -100),
          new THREE.Vector3(0, 0, -110),
        ],
        false,
        "catmullrom",
        0.3
      ),
    []
  );

  const pos = useMemo(() => new THREE.Vector3(), []);
  const tgt = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const o = clamp01(scroll.offset);
    // Piecewise remap: the first 18% of scroll dwells on the short chart
    // segment of the curve; the shatter accelerates through the rest.
    const CHART_CURVE_T = 0.045; // arc-length param where the glass sits
    const t =
      o < 0.18
        ? (o / 0.18) * CHART_CURVE_T
        : CHART_CURVE_T + ease(span(o, 0.18, 1)) * (1 - CHART_CURVE_T);
    path.getPointAt(clamp01(t), pos);
    look.getPointAt(clamp01(t), tgt);

    // Handheld drift.
    pos.x += Math.sin(state.clock.elapsedTime * 0.7) * 0.06;
    pos.y += Math.cos(state.clock.elapsedTime * 0.5) * 0.05;

    // Violent shake during the stop-loss slam.
    const slam = Math.sin(span(o, 0.1, 0.145) * Math.PI);
    if (slam > 0) {
      const a = slam * 0.22;
      pos.x += (Math.random() - 0.5) * a;
      pos.y += (Math.random() - 0.5) * a;
    }

    state.camera.position.lerp(pos, 0.14);
    state.camera.lookAt(tgt);
  });
  return null;
}

/* ═════════════════ Copy beats (top offsets ≈ scrollOffset × 1100vh) ═════ */

const BEATS = [
  { top: "6vh", kicker: "THE MARKET DIMENSION", text: "Scroll. Your wheel is the camera." },
  { top: "128vh", kicker: "ORDER FILLED: STOP LOSS", text: "Tired of losing? Switch to ConfluentX charts.", hot: true },
  { top: "175vh", kicker: "PHASE II", text: "Go beyond 2 dimensions." },
  { top: "390vh", kicker: "01 · GRAVITY WELLS", text: "Liquidity bends price like mass bends space." },
  { top: "560vh", kicker: "02 · THE CHRONOLITH", text: "Timeframes intersect. The light where they agree is confluence." },
  { top: "790vh", kicker: "03 · LIQUIDITY TOPOLOGY", text: "The order book is terrain. Bids build mountains. Asks carve canyons." },
  { top: "1005vh", kicker: "CONFLUENTX", text: "Stop staring at flatland." },
];

export function VisionDimension() {
  return (
    <div style={{ height: "100dvh", background: "#010204" }}>
      <Canvas camera={{ fov: 60, near: 0.1, far: 300, position: [0, 0.6, 7.5] }} dpr={[1, 1.8]}>
        <color attach="background" args={["#010204"]} />
        <fog attach="fog" args={["#010204", 30, 110]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[5, 10, 2]} intensity={0.8} color="#7fbfff" />
        <ScrollControls pages={PAGES} damping={0.18}>
          <CameraRig />
          <ScreenFlash />
          <ChartPlane />
          <Shards />
          <DataDust />
          <GravityWells position={ZONE_WELLS} />
          <Chronolith position={ZONE_CHRONO} />
          <LiquidityTopology position={ZONE_TOPO} />
          <Scroll html>
            <div style={{ width: "100vw", fontFamily: "var(--font-geist-mono), monospace" }}>
              {BEATS.map((b) => (
                <div
                  key={b.kicker}
                  style={{
                    position: "absolute",
                    top: b.top,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "min(760px, 88vw)",
                    textAlign: "center",
                    pointerEvents: "none",
                  }}
                >
                  <div style={{ color: b.hot ? "#FF3366" : "#00E5FF", fontSize: 12, letterSpacing: "0.3em", fontWeight: b.hot ? 700 : 400 }}>
                    {b.kicker}
                  </div>
                  <div
                    style={{
                      color: "#fff",
                      marginTop: 14,
                      fontSize: "clamp(22px, 3.6vw, 44px)",
                      fontFamily: "var(--font-space-grotesk), sans-serif",
                      textShadow: "0 2px 24px rgba(0,0,0,0.9)",
                    }}
                  >
                    {b.text}
                  </div>
                </div>
              ))}
              <a
                href="/register"
                style={{
                  position: "absolute",
                  top: "1035vh",
                  left: "50%",
                  transform: "translateX(-50%)",
                  padding: "16px 42px",
                  borderRadius: 14,
                  background: "linear-gradient(120deg, #00E5FF, #7000FF)",
                  color: "#010204",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Enter the Dimension
              </a>
            </div>
          </Scroll>
        </ScrollControls>
      </Canvas>
    </div>
  );
}
