// 2D canvas helpers for drawing app screens onto panel textures (Thai-safe).
export const FONT = 'Sarabun';
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const ramp = (t: number, t0: number, d: number) => clamp((t - t0) / d);
export const easeOutBack = (x: number) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
export const pop = (t: number, at: number, d = 0.3) => easeOutBack(ramp(t, at, d));
export const pulse = (t: number, at: number, d = 0.6) => (t > at ? Math.max(0, 1 - (t - at) / d) : 0);

export const UI = {
  panel: '#1f1a16', header: '#29221c', card: '#28211b', inset: '#151210', line: '#3a322b',
  text: '#f4efe9', muted: '#a99e92', sun: '#ffb020', teal: '#12a594',
};

export function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}
export function text(g: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, weight = 400, align: CanvasTextAlign = 'left') {
  g.font = `${weight} ${size}px ${FONT}`;
  g.fillStyle = color;
  g.textAlign = align;
  g.textBaseline = 'middle';
  g.fillText(s, x, y);
}
/** Word-wrap Thai (no spaces between words) using Intl.Segmenter. Set g.font first. */
export function wrap(g: CanvasRenderingContext2D, s: string, maxW: number): string[] {
  const words = [...new Intl.Segmenter('th', {granularity: 'word'}).segment(s)].map((x) => x.segment);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (g.measureText(cur + w).width > maxW && cur) {
      lines.push(cur);
      cur = w.trimStart();
    } else cur += w;
  }
  if (cur) lines.push(cur);
  return lines;
}
/** Typewriter: graphemes so Thai vowels/tone marks never split. */
export const graphemes = (s: string) => [...new Intl.Segmenter('th', {granularity: 'grapheme'}).segment(s)].map((x) => x.segment);

export function glow(g: CanvasRenderingContext2D, color: string, amt: number, f: () => void) {
  g.save();
  if (amt > 0) {
    g.shadowColor = color;
    g.shadowBlur = 50 * amt;
  }
  f();
  g.restore();
}
export function button(g: CanvasRenderingContext2D, r: {x: number; y: number; w: number; h: number}, label: string, fill: string, fg: string, pressed: boolean, glowAmt = 0) {
  const dy = pressed ? 8 : 0;
  rr(g, r.x, r.y + 8, r.w, r.h, 20);
  g.fillStyle = 'rgba(0,0,0,0.45)';
  g.fill();
  glow(g, fill, glowAmt, () => {
    rr(g, r.x, r.y + dy, r.w, r.h, 20);
    g.fillStyle = fill;
    g.fill();
  });
  text(g, label, r.x + r.w / 2, r.y + r.h / 2 + dy, Math.round(r.h * 0.42), fg, 700, 'center');
}
/** Two-tone wordmark + tagline for LogoPlane (1600x520 canvas). */
export function drawWordmark(a: string, b: string, tagline: string) {
  return (g: CanvasRenderingContext2D) => {
    const {width: W, height: H} = g.canvas;
    g.setTransform(W / 1600, 0, 0, H / 520, 0, 0);
    g.clearRect(0, 0, 1600, 520);
    g.font = `700 230px ${FONT}`;
    const wa = g.measureText(a).width, wb = g.measureText(b).width;
    const x0 = 800 - (wa + wb) / 2;
    g.save();
    g.shadowColor = 'rgba(255,176,32,0.6)';
    g.shadowBlur = 40;
    text(g, a, x0, 200, 230, UI.text, 700);
    text(g, b, x0 + wa, 200, 230, UI.sun, 700);
    g.restore();
    text(g, tagline, 800, 420, 72, '#b8e2dc', 400, 'center');
  };
}
