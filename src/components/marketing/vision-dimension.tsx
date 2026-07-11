"use client";

import { useMemo, useRef } from "react";
import { Canvas, extend, useFrame, type ThreeElement } from "@react-three/fiber";
import { Scroll, ScrollControls, shaderMaterial, useScroll } from "@react-three/drei";
import * as THREE from "three";

/**
 * THE MARKET DIMENSION — scroll-driven WebGL fly-through.
 *
 * The user's scroll is the camera playhead: a Catmull-Rom path carries the
 * camera through three environments — Gravity Wells (liquidity as spacetime
 * lensing), the Chronolith (timeframes as intersecting glass planes), and
 * the Liquidity Topology (the order book as terrain).
 *
 * Stage 2 (separate increment): 2D-chart shatter intro + post-processing
 * (chromatic aberration, shake) via @react-three/postprocessing.
 */

const PAGES = 8;

/* ── Gravity-well grid: spacetime-lensing vertex shader ──────────────────── */

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
        // Gravitational well: depth falls off with distance², softened core.
        warp += uWells[i].z / (d * d * 0.55 + 0.6);
      }
      p.z -= warp;
      // Slow breathing so the fabric feels alive.
      p.z += sin(p.x * 0.7 + uTime * 0.6) * cos(p.y * 0.7 - uTime * 0.4) * 0.06;
      vWarp = warp;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
  `,
  /* glsl fragment */ `
    varying float vWarp;
    void main() {
      // Cold slate far from mass; electric cyan where space bends hardest.
      vec3 base = vec3(0.13, 0.16, 0.24);
      vec3 hot  = vec3(0.0, 0.9, 1.0);
      vec3 color = mix(base, hot, clamp(vWarp * 0.55, 0.0, 1.0));
      gl_FragColor = vec4(color, 0.85);
    }
  `
);
extend({ WellGridMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    wellGridMaterial: ThreeElement<typeof WellGridMaterial>;
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

  // Price line spiralling into the dominant well before bursting.
  const spiral = useMemo(() => {
    const target = new THREE.Vector3(WELLS[1][0], WELLS[1][1], 0.4);
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 240; i++) {
      const t = i / 240;
      const angle = t * Math.PI * 7;
      const radius = 8 * (1 - t) + 0.15;
      pts.push(
        new THREE.Vector3(
          target.x + Math.cos(angle) * radius,
          target.y + Math.sin(angle) * radius * 0.75,
          target.z + (1 - t) * 2.2 + Math.sin(t * 40) * 0.12 * (1 - t)
        )
      );
    }
    return new THREE.CatmullRomCurve3(pts);
  }, []);

  const burst = useMemo(() => {
    const n = 500;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = Math.cbrt(Math.random()) * 1.6;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = WELLS[1][0] + r * Math.sin(ph) * Math.cos(th);
      arr[i * 3 + 1] = WELLS[1][1] + r * Math.sin(ph) * Math.sin(th);
      arr[i * 3 + 2] = 0.4 + r * Math.cos(ph) * 0.6;
    }
    return arr;
  }, []);

  return (
    <group position={position} rotation={[-Math.PI / 2.6, 0, 0.3]}>
      <mesh>
        <planeGeometry args={[26, 26, 96, 96]} />
        <wellGridMaterial wireframe transparent uWells={wellsUniform} ref={mat} />
      </mesh>
      <mesh>
        <tubeGeometry args={[spiral, 240, 0.045, 6, false]} />
        <meshBasicMaterial color="#00E5FF" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[burst, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#7000FF" size={0.07} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
    </group>
  );
}

/* ── Chronolith: timeframe planes with white-hot intersections ───────────── */

const PLANES: { rot: [number, number, number]; tint: string }[] = [
  { rot: [0, 0, 0], tint: "#00E5FF" },
  { rot: [0.5, 0.35, 0], tint: "#7000FF" },
  { rot: [-0.45, -0.3, 0.2], tint: "#00E5FF" },
  { rot: [0.15, -0.55, -0.25], tint: "#8A96B1" },
];
const PLANE_SIZE = 9;

/** Analytic intersection segment of two finite planes (clipped to size). */
function planeIntersection(a: THREE.Matrix4, b: THREE.Matrix4): THREE.Vector3[] | null {
  const na = new THREE.Vector3(0, 0, 1).transformDirection(a);
  const nb = new THREE.Vector3(0, 0, 1).transformDirection(b);
  const pa = new THREE.Vector3().setFromMatrixPosition(a);
  const pb = new THREE.Vector3().setFromMatrixPosition(b);
  const dir = new THREE.Vector3().crossVectors(na, nb);
  if (dir.lengthSq() < 1e-6) return null;
  dir.normalize();
  // Point on both planes: solve via the two plane equations.
  const n1n2 = na.dot(nb);
  const d1 = na.dot(pa);
  const d2 = nb.dot(pb);
  const det = 1 - n1n2 * n1n2;
  const c1 = (d1 - d2 * n1n2) / det;
  const c2 = (d2 - d1 * n1n2) / det;
  const point = new THREE.Vector3().addScaledVector(na, c1).addScaledVector(nb, c2);
  const half = PLANE_SIZE * 0.62;
  return [
    point.clone().addScaledVector(dir, -half),
    point.clone().addScaledVector(dir, half),
  ];
}

function Chronolith({ position }: { position: [number, number, number] }) {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (group.current) group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.12) * 0.18;
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
          <meshBasicMaterial
            color={p.tint}
            transparent
            opacity={0.09}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
      {intersections.map((seg, i) => (
        <ConfluenceEdge key={i} from={seg[0]} to={seg[1]} />
      ))}
    </group>
  );
}

/** White-hot pulsing beam where two timeframes agree — the confluence. */
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

/* ── Liquidity Topology: order book as terrain ───────────────────────────── */

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
      // Bid mountains on the near half, ask canyons on the far half; the
      // "spread" runs along y≈0 as a calm valley.
      const ridge =
        Math.sin(x * 0.5) * Math.cos(y * 0.55) +
        Math.sin(x * 1.3 + y * 0.8) * 0.5 +
        Math.sin(x * 2.7) * 0.22;
      const side = Math.tanh(y * 0.55); // -1 asks … +1 bids
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

/* ── Backdrop particles ──────────────────────────────────────────────────── */

function DataDust() {
  const pts = useMemo(() => {
    const n = 1200;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 70;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 40;
      arr[i * 3 + 2] = -Math.random() * 120;
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

/* ── The camera rig: scroll = playhead along a Catmull-Rom flight path ───── */

const ZONE_WELLS: [number, number, number] = [0, -2, -22];
const ZONE_CHRONO: [number, number, number] = [4, 1, -52];
const ZONE_TOPO: [number, number, number] = [-2, -3, -84];

function CameraRig() {
  const scroll = useScroll();
  const path = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(0, 0.5, 8),
          new THREE.Vector3(0, 1.5, -6),
          new THREE.Vector3(-3, 4.5, -16), // high approach over the wells
          new THREE.Vector3(2.5, 2, -30), // dive past them
          new THREE.Vector3(6, 0.5, -44), // slide into the chronolith
          new THREE.Vector3(0, 0, -56), // through its heart
          new THREE.Vector3(-4, 5, -70), // crest above the terrain
          new THREE.Vector3(0, 1.2, -86), // low terrain flight
          new THREE.Vector3(0, 0.4, -98), // resolve into the dark
        ],
        false,
        "catmullrom",
        0.35
      ),
    []
  );
  const look = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(0, 0, -10),
          new THREE.Vector3(0, -1, -22),
          new THREE.Vector3(0, -2, -24), // stare into the wells
          new THREE.Vector3(4, 1, -50),
          new THREE.Vector3(4, 1, -54), // at the chronolith core
          new THREE.Vector3(-2, -1, -76),
          new THREE.Vector3(-2, -3, -84), // down the order-book valley
          new THREE.Vector3(0, -1, -100),
          new THREE.Vector3(0, 0, -110),
        ],
        false,
        "catmullrom",
        0.35
      ),
    []
  );

  const pos = useMemo(() => new THREE.Vector3(), []);
  const tgt = useMemo(() => new THREE.Vector3(), []);
  useFrame((state) => {
    const t = THREE.MathUtils.clamp(scroll.offset, 0, 1);
    path.getPointAt(t, pos);
    look.getPointAt(t, tgt);
    // Micro handheld drift so it feels filmed, not computed.
    pos.x += Math.sin(state.clock.elapsedTime * 0.7) * 0.08;
    pos.y += Math.cos(state.clock.elapsedTime * 0.5) * 0.06;
    state.camera.position.lerp(pos, 0.12);
    state.camera.lookAt(tgt);
  });
  return null;
}

/* ── Scroll-synced copy ──────────────────────────────────────────────────── */

const BEATS = [
  { top: "6vh", kicker: "THE MARKET DIMENSION", text: "Your scroll wheel is the camera. Fly in." },
  { top: "160vh", kicker: "01 · GRAVITY WELLS", text: "Liquidity bends price like mass bends space. Watch it spiral in." },
  { top: "380vh", kicker: "02 · THE CHRONOLITH", text: "Every timeframe is a plane. Where they intersect burns white — confluence." },
  { top: "580vh", kicker: "03 · LIQUIDITY TOPOLOGY", text: "The order book is terrain. Bids build mountains. Asks carve canyons." },
  { top: "740vh", kicker: "CONFLUENTX", text: "Stop staring at flatland." },
];

export function VisionDimension() {
  return (
    <div style={{ height: "100dvh", background: "#010204" }}>
      <Canvas camera={{ fov: 60, near: 0.1, far: 300 }} dpr={[1, 1.8]}>
        <color attach="background" args={["#010204"]} />
        <fog attach="fog" args={["#010204", 30, 110]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[5, 10, 2]} intensity={0.8} color="#7fbfff" />
        <ScrollControls pages={PAGES} damping={0.18}>
          <CameraRig />
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
                  <div style={{ color: "#00E5FF", fontSize: 12, letterSpacing: "0.3em" }}>{b.kicker}</div>
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
                  top: "770vh",
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
