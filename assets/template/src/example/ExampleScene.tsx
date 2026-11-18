import React from 'react';
import {useCurrentFrame} from 'remotion';
import {
  CameraRig, clamp, followShot, LogoPlane, MascotModel, makeMotion, mixShot, Post, Shot, Slab, Studio, V,
} from '../shared';
import {button, drawWordmark, pop, pulse, ramp, rr, text, UI} from '../ui-kit';
import {BTN, DURATION, EV, HOPS, PANELS, START} from './timeline';

const FPS = 30;
const motion = makeMotion(PANELS, START, HOPS, [EV.drop, EV.press]);

function feetAt(t: number) {
  const p = motion.feet(t);
  if (t < EV.drop) p.y += 12 * (1 - Math.pow(clamp(t / EV.drop), 2)); // falls in from above
  return p;
}

// Draw the app screen for time t (pure function of t — Remotion renders frames out of order).
function drawApp(g: CanvasRenderingContext2D, t: number) {
  g.setTransform(g.canvas.width / 1600, 0, 0, g.canvas.height / 900, 0, 0);
  g.fillStyle = UI.panel;
  g.fillRect(0, 0, 1600, 900);
  g.fillStyle = UI.header;
  g.fillRect(0, 0, 1600, 100);
  text(g, 'ชื่อหน้าจอ', 50, 52, 46, UI.text, 700);
  rr(g, 50, 150, 1500, 520, 26);
  g.fillStyle = UI.inset;
  g.fill();
  text(g, 'พื้นที่เนื้อหา', 100, 210, 34, UI.muted, 700);
  button(g, BTN, 'กดตรงนี้', UI.teal, '#fff', t > EV.press - 0.05 && t < EV.press + 0.2, t > 3.5 && t < EV.press ? 0.6 : 0);
  if (t >= EV.done) {
    const k = pop(t, EV.done, 0.35);
    g.save();
    g.translate(800, 410);
    g.scale(k, k);
    rr(g, -300, -120, 600, 240, 30);
    g.fillStyle = '#10302c';
    g.fill();
    text(g, '✓ สำเร็จ', 0, 0, 80, '#fff', 700, 'center');
    g.restore();
  }
  void ramp; void pulse;
}

const WIDE: Shot = {pos: V(0, 12, 12), look: V(0, 0, 0.5)};
const FINAL: Shot = {pos: V(0.8, 4.5, 11), look: V(0, 1.8, -1)};
function cameraAt(t: number): Shot {
  const f = followShot(feetAt, t, V(0.6, 4.6, 6.4), 0.5);
  if (t < 1.4) return WIDE;
  if (t < 2.4) return mixShot(WIDE, f, t - 1.4);
  if (t < 6.8) return f;
  return mixShot(f, FINAL, (t - 6.8) / 1.0);
}

const logo = drawWordmark('brand', 'name', 'สโลแกนของแบรนด์');

export const ExampleScene: React.FC = () => {
  const t = Math.min(DURATION, useCurrentFrame() / FPS);
  const wave = t > EV.wave ? Math.sin((t - EV.wave) * 12) * 0.5 + 0.6 : 0;
  return (
    <>
      <Studio />
      <CameraRig shot={cameraAt(t)} />
      <Slab spec={PANELS.app} draw={drawApp} t={t} fallAt={EV.fall} glowColor="#ffb98a" glow={0.8} />
      <MascotModel pos={feetAt(t)} yaw={motion.yaw(t)} squash={motion.squash(t)} wave={wave} t={t} />
      <LogoPlane t={t} at={EV.logo} position={[0, 2.6, -3.5]} rotation={[-0.1, 0, 0]} draw={logo} />
      <Post />
    </>
  );
};
