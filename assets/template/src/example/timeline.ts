// ONE source of truth for this clip: panel layout (UI px), hops, events, voice lines (all in REAL seconds).
// Workflow: generate VO first -> measure trimmed lengths -> place `at` -> fit events/hops around the lines.
import type {Hop, PanelSpec, Pt} from '../shared';

export const DURATION = 10; // seconds

export const PANELS: Record<string, PanelSpec> = {
  app: {wx: 0, wz: 0, ww: 12, wh: 6.75, px: 1600, py: 900},
};

export const BTN = {x: 1100, y: 740, w: 380, h: 100};

export const EV = {
  drop: 1.2, // mascot lands
  press: 4.0, // presses the button
  done: 4.2, // result card pops
  fall: 7.0, // panel drops away
  logo: 7.3,
  wave: 7.8,
};

const P = (x: number, y: number): Pt => ({panel: 'app', x, y});
export const START = P(400, 600);
export const HOPS: Hop[] = [
  {t0: 2.0, t1: 2.5, from: START, to: P(800, 620), h: 1.0},
  {t0: 3.4, t1: 4.0, from: P(800, 620), to: P(BTN.x + BTN.w / 2, BTN.y + BTN.h / 2), h: 1.8},
  {t0: 6.0, t1: 6.5, from: P(BTN.x + BTN.w / 2, BTN.y + BTN.h / 2), to: P(800, 450), h: 1.4},
];

// src = file in public/, len = trimmed length after vo.sh, text = caption (portrait only)
export const VO = [
  {src: 'vo1.wav', at: 0.3, len: 2.5, text: 'ตัวอย่างบทพากย์ท่อนแรก'},
  {src: 'vo2.wav', at: 3.6, len: 2.5, text: 'กดปุ่มเดียว ได้ผลทันที'},
  {src: 'vo3.wav', at: 7.4, len: 2.0, text: 'ชื่อแบรนด์ สโลแกน'},
];
