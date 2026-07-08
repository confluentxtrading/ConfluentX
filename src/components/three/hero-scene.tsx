"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Lightformer, RoundedBox } from "@react-three/drei";
import * as THREE from "three";

/**
 * The ConfluentX hero scene.
 *
 * A precision ring ("C") in brushed dark metal wraps two converging bars
 * ("X") — one violet metal, one refractive glass. Lit entirely by an
 * in-memory Lightformer environment (no external HDR fetch), with a slow
 * particle field and camera parallax that follows the pointer.
 */

const VIOLET = new THREE.Color("#6a3dff");
const BLUE = new THREE.Color("#4e6bff");
const LILAC = new THREE.Color("#8a5cff");

function Emblem() {
  const group = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!group.current) return;
    // Slow idle rotation + eased pointer parallax.
    group.current.rotation.y += delta * 0.12;
    const targetX = state.pointer.y * 0.25;
    const targetZ = state.pointer.x * 0.12;
    group.current.rotation.x = THREE.MathUtils.lerp(
      group.current.rotation.x,
      targetX,
      0.04
    );
    group.current.rotation.z = THREE.MathUtils.lerp(
      group.current.rotation.z,
      targetZ,
      0.04
    );
  });

  return (
    <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.6}>
      <group ref={group}>
        {/* Precision ring — the "C" (open arc) */}
        <mesh rotation={[0, 0, Math.PI * 0.62]}>
          <torusGeometry args={[1.85, 0.16, 48, 200, Math.PI * 1.62]} />
          <meshStandardMaterial
            color="#14141d"
            metalness={1}
            roughness={0.22}
            envMapIntensity={1.4}
          />
        </mesh>

        {/* Ring end-caps */}
        {[Math.PI * 0.62, Math.PI * 0.62 + Math.PI * 1.62].map((angle, i) => (
          <mesh
            key={i}
            position={[Math.cos(angle) * 1.85, Math.sin(angle) * 1.85, 0]}
          >
            <sphereGeometry args={[0.16, 32, 32]} />
            <meshStandardMaterial
              color={LILAC}
              metalness={0.9}
              roughness={0.15}
              emissive={VIOLET}
              emissiveIntensity={0.6}
            />
          </mesh>
        ))}

        {/* Violet metal bar of the X */}
        <RoundedBox args={[0.42, 2.5, 0.42]} radius={0.12} smoothness={6} rotation={[0, 0, Math.PI / 4]}>
          <meshStandardMaterial
            color={VIOLET}
            metalness={0.95}
            roughness={0.18}
            emissive={VIOLET}
            emissiveIntensity={0.22}
            envMapIntensity={1.6}
          />
        </RoundedBox>

        {/* Glass bar of the X */}
        <RoundedBox args={[0.42, 2.5, 0.42]} radius={0.12} smoothness={6} rotation={[0, 0, -Math.PI / 4]}>
          <meshPhysicalMaterial
            color="#dfe4ff"
            metalness={0}
            roughness={0.06}
            transmission={1}
            thickness={1.1}
            ior={1.5}
            envMapIntensity={1.8}
            clearcoat={1}
            clearcoatRoughness={0.08}
          />
        </RoundedBox>

        {/* Core glow at the confluence point */}
        <mesh>
          <sphereGeometry args={[0.14, 32, 32]} />
          <meshBasicMaterial color={LILAC} toneMapped={false} />
        </mesh>
        <pointLight color={VIOLET} intensity={6} distance={5} decay={2} />
      </group>
    </Float>
  );
}

function Particles({ count = 700 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [VIOLET, BLUE, LILAC, new THREE.Color("#3a3a55")];
    for (let i = 0; i < count; i++) {
      // Spherical shell distribution around the emblem.
      const r = 3.2 + Math.random() * 5.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi) - 1.5;
      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return { positions, colors };
  }, [count]);

  useFrame((state, delta) => {
    if (!points.current) return;
    points.current.rotation.y += delta * 0.015;
    points.current.rotation.x = THREE.MathUtils.lerp(
      points.current.rotation.x,
      state.pointer.y * 0.06,
      0.02
    );
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        vertexColors
        transparent
        opacity={0.75}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function CameraRig() {
  useFrame((state) => {
    // Gentle dolly following the pointer — the "volumetric" drift.
    const x = THREE.MathUtils.lerp(state.camera.position.x, state.pointer.x * 0.6, 0.03);
    const y = THREE.MathUtils.lerp(state.camera.position.y, state.pointer.y * 0.35, 0.03);
    state.camera.position.set(x, y, state.camera.position.z);
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function HeroScene() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 7], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      className="!absolute inset-0"
      aria-hidden
    >
      <CameraRig />
      <ambientLight intensity={0.15} />
      <directionalLight position={[4, 6, 5]} intensity={0.8} color="#c8cdfF" />

      <Emblem />
      <Particles />

      {/* In-memory studio environment — violet key, blue rim, white top strip */}
      <Environment resolution={256}>
        <Lightformer
          intensity={4}
          position={[0, 4, -4]}
          scale={[10, 1.5, 1]}
          color="#ffffff"
        />
        <Lightformer
          intensity={5}
          position={[-5, 1, 2]}
          rotation-y={Math.PI / 2}
          scale={[6, 2, 1]}
          color="#6a3dff"
        />
        <Lightformer
          intensity={4}
          position={[5, -1, 2]}
          rotation-y={-Math.PI / 2}
          scale={[6, 2, 1]}
          color="#4e6bff"
        />
        <Lightformer
          intensity={1.5}
          position={[0, -4, 0]}
          rotation-x={Math.PI / 2}
          scale={[8, 8, 1]}
          color="#12121a"
        />
      </Environment>

      <fog attach="fog" args={["#050507", 9, 16]} />
    </Canvas>
  );
}
