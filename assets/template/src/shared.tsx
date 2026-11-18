// Pieces shared by every clip: math, canvas-textured slabs, the mascot, hop motion,
// camera rig (landscape + portrait) and the bloom/tone-mapping pass.
import {useThree} from '@react-three/fiber';
import {Bloom, EffectComposer, ToneMapping} from '@react-three/postprocessing';
import {ToneMappingMode} from 'postprocessing';
import React, {createContext, useContext, useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const smooth = (x: number) => x * x * (3 - 2 * x);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
export const SURFACE_Y = 0.15;
// Brand: mascot body (SUN), accent/antenna (TEAL), studio background (BG). Change per project.
export const SUN = '#ffb020';
export const TEAL = '#12a594';
export const BG = '#16110d';

// ---------- format (landscape / portrait) ----------
export const FormatCtx = createContext<{portrait: boolean}>({portrait: false});
export const usePortrait = () => useContext(FormatCtx).portrait;

// ---------- panels ----------
export type PanelSpec = {wx: number; wz: number; ww: number; wh: number; px: number; py: number};
export const toWorld = (p: PanelSpec, x: number, y: number): [number, number] => [
  p.wx + (x / p.px - 0.5) * p.ww,
  p.wz + (y / p.py - 0.5) * p.wh,
];

export function useCanvasTex(w: number, h: number) {
  return useMemo(() => {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return {cv, g: cv.getContext('2d')!, tex};
  }, [w, h]);
}

/** Flat floating slab with a live canvas UI on top. fallAt: seconds when it drops away (Infinity = never). */
export function Slab({spec, draw, t, scale = 1.5, fallAt = Infinity, glowColor, glow = 1}: {
  spec: PanelSpec; draw: (g: CanvasRenderingContext2D, t: number) => void; t: number; scale?: number;
  fallAt?: number; glowColor?: string; glow?: number;
}) {
  const {g, tex} = useCanvasTex(Math.round(spec.px * scale), Math.round(spec.py * scale));
  draw(g, t);
  tex.needsUpdate = true;
  const s = t - fallAt;
  const y = s > 0 ? -0.5 * 22 * s * s : 0;
  const alpha = 1 - clamp(s / 0.6);
  if (alpha <= 0) return null;
  const rot = y < 0 ? Math.min(0.5, -y * 0.05) : 0;
  return (
    <group position={[spec.wx, y, spec.wz]} rotation={[rot, 0, rot * 0.3]}>
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[spec.ww + 0.3, 0.3, spec.wh + 0.3]} />
        <meshStandardMaterial color="#0e0b09" roughness={0.25} metalness={0.2} transparent opacity={alpha} />
      </mesh>
      <mesh position={[0, SURFACE_Y - 0.009, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[spec.ww, spec.wh]} />
        <meshBasicMaterial map={tex} toneMapped={false} transparent opacity={alpha} />
      </mesh>
      {glowColor && <pointLight position={[0, 1.2, 0]} intensity={6 * alpha * glow} distance={9} color={glowColor} />}
    </group>
  );
}

// ---------- hops ----------
export type Pt = {panel: string; x: number; y: number};
export type Hop = {t0: number; t1: number; from: Pt; to: Pt; h: number};
export function makeMotion(panels: Record<string, PanelSpec>, start: Pt, hops: Hop[], extraImpacts: number[] = []) {
  const world = (p: Pt) => {
    const [x, z] = toWorld(panels[p.panel], p.x, p.y);
    return V(x, SURFACE_Y, z);
  };
  const feet = (t: number): THREE.Vector3 => {
    let pos = world(start);
    for (const h of hops) {
      if (t < h.t0) break;
      const a = world(h.from), b = world(h.to);
      if (t <= h.t1) {
        const k = (t - h.t0) / (h.t1 - h.t0);
        const p = a.clone().lerp(b, k);
        p.y += 4 * h.h * k * (1 - k);
        return p;
      }
      pos = b;
    }
    return pos;
  };
  const yaw = (t: number, idle = 0): number => {
    for (const h of hops) {
      const a = world(h.from), b = world(h.to);
      const hy = Math.atan2(b.x - a.x, b.z - a.z);
      if (t >= h.t0 - 0.12 && t <= h.t1) return hy;
      if (t > h.t1 && t < h.t1 + 0.35) return lerp(hy, idle, smooth((t - h.t1) / 0.35));
    }
    return idle;
  };
  const impacts = [...hops.map((h) => h.t1), ...extraImpacts];
  const squash = (t: number): number => {
    let s = 1;
    for (const i of impacts) {
      const d = t - i;
      if (d >= 0 && d < 0.3) s = Math.min(s, 1 - 0.28 * Math.sin((d / 0.3) * Math.PI) * (1 - d / 0.3));
    }
    for (const h of hops) {
      const d = h.t0 - t;
      if (d >= 0 && d < 0.12) s = Math.min(s, 1 - 0.18 * (1 - d / 0.12));
    }
    return s;
  };
  return {world, feet, yaw, squash};
}

// ---------- mascot ----------
export function MascotModel({pos, yaw, squash, wave = 0, lie = 0, spin = 0, t}: {
  pos: THREE.Vector3; yaw: number; squash: number; wave?: number; lie?: number; spin?: number; t: number;
}) {
  const geo = useMemo(() => ({
    body: new RoundedBoxGeometry(1.2, 0.8, 0.6, 5, 0.16),
    nub: new RoundedBoxGeometry(0.2, 0.26, 0.24, 3, 0.08),
    leg: new RoundedBoxGeometry(0.16, 0.26, 0.16, 3, 0.06),
  }), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({color: SUN, roughness: 0.42}), []);
  const eye = useMemo(() => new THREE.MeshStandardMaterial({color: '#111', roughness: 0.3}), []);
  const s = squash;
  const ant = Math.sin(t * 9) * 0.12;
  const flat = lie / (-Math.PI / 2); // 1 = lying flat on its back
  const lift = 0.3 * flat;
  return (
    <group position={[pos.x, pos.y + lift, pos.z + 0.62 * flat]} rotation={[lie, yaw + spin, 0]}>
      <group scale={[1 / Math.sqrt(s), s, 1 / Math.sqrt(s)]}>
        {[[-0.4, 0.17], [0.4, 0.17], [-0.4, -0.17], [0.4, -0.17]].map(([x, z], i) => (
          <mesh key={i} geometry={geo.leg} material={mat} position={[x, 0.13, z]} />
        ))}
        <mesh geometry={geo.body} material={mat} position={[0, 0.62, 0]} />
        <mesh geometry={geo.nub} material={mat} position={[-0.68, 0.62, 0]} />
        <group position={[0.62, 0.68, 0]} rotation={[0, 0, wave]}>
          <mesh geometry={geo.nub} material={mat} position={[0.06, 0, 0]} />
        </group>
        {[-0.2, 0.2].map((x) => (
          <mesh key={x} material={eye} position={[x, 0.68, 0.302]}>
            <boxGeometry args={[0.07, 0.2, 0.01]} />
          </mesh>
        ))}
        <group position={[0.18, 1.02, 0]} rotation={[0, 0, ant]}>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.2, 8]} />
            <meshStandardMaterial color="#0e7468" />
          </mesh>
          <mesh position={[0, 0.24, 0]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color={TEAL} emissive={TEAL} emissiveIntensity={4} toneMapped={false} />
          </mesh>
        </group>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -pos.y + SURFACE_Y + 0.005 - lift, -0.62 * flat]}>
        <circleGeometry args={[0.75, 32]} />
        <meshBasicMaterial color="#000" transparent opacity={0.45 / (1 + (pos.y - SURFACE_Y) * 0.8)} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ---------- camera ----------
export type Shot = {pos: THREE.Vector3; look: THREE.Vector3};
export function mixShot(a: Shot, b: Shot, k: number): Shot {
  const e = smooth(clamp(k));
  return {pos: a.pos.clone().lerp(b.pos, e), look: a.look.clone().lerp(b.look, e)};
}
/** Smoothed follow shot behind/above the mascot. */
export function followShot(feet: (t: number) => THREE.Vector3, t: number, offset = V(0.6, 4.6, 6.4), yFollow = 0.35): Shot {
  const m = V(0, 0, 0);
  const N = 6;
  for (let i = 0; i < N; i++) m.add(feet(t - (i / N) * 0.35));
  m.multiplyScalar(1 / N);
  m.y = lerp(SURFACE_Y, m.y, yFollow);
  return {pos: m.clone().add(offset), look: m.clone().add(V(0, 0.7, 0))};
}
export function CameraRig({shot}: {shot: Shot}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const portrait = usePortrait();
  useLayoutEffect(() => {
    // Portrait: same horizontal coverage-ish by widening the vertical FOV and pulling back.
    const pull = portrait ? 1.08 : 1;
    const pos = shot.look.clone().add(shot.pos.clone().sub(shot.look).multiplyScalar(pull));
    camera.position.copy(pos);
    camera.lookAt(shot.look);
    camera.fov = portrait ? 58 : 38;
    camera.near = 0.1;
    camera.far = 200;
    camera.updateProjectionMatrix();
  }, [shot, camera, portrait]);
  return null;
}

// ---------- lights, floor, post ----------
export function Studio() {
  return (
    <>
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 22, 55]} />
      <ambientLight intensity={0.35} color="#ffe2c4" />
      <hemisphereLight args={['#ffd9b0', '#1a0f08', 0.5]} />
      <directionalLight position={[-6, 12, 8]} intensity={2.2} color="#fff1df" />
      <pointLight position={[8, 6, -8]} intensity={40} distance={30} color="#ff9a4a" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]}>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#120d0a" roughness={0.35} metalness={0.1} />
      </mesh>
    </>
  );
}
export function Post() {
  return (
    <EffectComposer multisampling={4}>
      <Bloom mipmapBlur intensity={0.9} luminanceThreshold={0.82} luminanceSmoothing={0.25} radius={0.7} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
    </EffectComposer>
  );
}

/** Logo plane (steamkid + tagline) rising into view. */
export function LogoPlane({t, at, position, rotation, draw}: {
  t: number; at: number; position: [number, number, number]; rotation: [number, number, number]; draw: (g: CanvasRenderingContext2D) => void;
}) {
  const {g, tex} = useCanvasTex(1600, 520);
  useMemo(() => {
    draw(g);
    tex.needsUpdate = true;
  }, [g, tex, draw]);
  if (t < at) return null;
  const k = smooth(clamp((t - at) / 0.8));
  return (
    <mesh position={[position[0], lerp(position[1] - 6, position[1], k), position[2]]} rotation={rotation}>
      <planeGeometry args={[8.4, 2.73]} />
      <meshBasicMaterial map={tex} transparent opacity={k} toneMapped={false} color={new THREE.Color(1.35, 1.35, 1.35)} />
    </mesh>
  );
}
