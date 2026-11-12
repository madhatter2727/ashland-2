// M3 street-prop canvas textures: faded striped awning canvas (scalloped, frayed, torn), purple Ashland Castle
// banners (gold castle silhouette, faded, torn), the POPCORN cart sign, autumn leaves, a grime-streak card.
import * as THREE from 'three';
import { mulberry } from '../../core/util.js';

const cache = new Map();
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const texOf = (c, wrap = false) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (wrap) t.wrapS = THREE.RepeatWrapping; return t; };
const memo = (k, f) => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k); };
// mottled dirt + sun fade over whatever is drawn
function grime(g, w, h, r, n = 260, a = 0.16) {
  for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${50 + r() * 30},${40 + r() * 20},${25},${r() * a})`; g.beginPath(); g.ellipse(r() * w, r() * h, 4 + r() * 30, 3 + r() * 18, r() * 3, 0, 7); g.fill(); }
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,245,220,0.18)'); gr.addColorStop(1, 'rgba(60,45,30,0.22)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
}

// awning canvas: u along the shop (stripes), v from the wall (top) to the front edge (bottom).
// The bottom 22% is the valance: scalloped, frayed threads, the odd scallop torn away. torn = holes in the canvas.
export function awningTex(kind, torn) {
  return memo(`aw${kind}${torn}`, () => {
    const [c, g] = canvas(512, 512), r = mulberry(kind * 97 + (torn ? 13 : 1));
    const col = kind === 0 ? ['#962a1f', '#b4a07a'] : ['#552247', '#b3a27e'];
    const sw = 512 / 10, val = 400;
    for (let i = 0; i < 10; i++) { g.fillStyle = col[i % 2]; g.fillRect(i * sw, 0, sw, 512); }
    // canvas weave + sun-bleached top, water stains
    for (let y = 0; y < 512; y += 3) { g.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.03})`; g.fillRect(0, y, 512, 1); }
    grime(g, 512, val, r, 220, 0.2);
    for (let i = 0; i < 14; i++) { const x = r() * 512; const gr = g.createLinearGradient(0, 0, 0, val); gr.addColorStop(0, 'rgba(70,55,35,0)'); gr.addColorStop(1, 'rgba(70,55,35,0.35)'); g.fillStyle = gr; g.fillRect(x, 0, 6 + r() * 20, val); }
    g.fillStyle = 'rgba(40,30,20,0.55)'; g.fillRect(0, val - 8, 512, 6);             // seam between canvas and valance
    // valance: scallops cut with destination-out, frayed threads hanging
    g.globalCompositeOperation = 'destination-out';
    const n = 10, pw = 512 / n;
    for (let i = 0; i < n; i++) {
      const cx = i * pw + pw / 2, gone = r() < (torn ? 0.3 : 0.1);
      g.beginPath(); g.moveTo(i * pw, 512); g.lineTo(i * pw, 512 - 10);
      if (gone) g.lineTo(i * pw + 4, val + 6 + r() * 30); else g.quadraticCurveTo(cx, 512 + 30, (i + 1) * pw, 512 - 10);
      if (gone) g.lineTo((i + 1) * pw - 4, val + 6 + r() * 30);
      g.lineTo((i + 1) * pw, 512); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(i * pw, 512); g.lineTo(i * pw, 488); g.lineTo(i * pw + 3, 512); g.fill();
      for (let k = 0; k < 9; k++) { const x = i * pw + r() * pw, y = 470 + r() * 38; g.fillRect(x, y, 1.5 + r() * 2, 512 - y); }
    }
    if (torn) for (let i = 0; i < 5; i++) {                      // rips: ragged holes in the canvas
      const x = 40 + r() * 430, y = 60 + r() * 300, s = 14 + r() * 40; g.beginPath();
      for (let k = 0; k < 11; k++) { const a = (k / 11) * 6.28, rr = s * (0.4 + r() * 0.8); g.lineTo(x + Math.cos(a) * rr * 1.4, y + Math.sin(a) * rr); }
      g.closePath(); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
    return texOf(c);
  });
}

// Ashland Castle banner: deep purple, gold border, the castle silhouette and stars; swallow-tail foot; faded + torn
export function castleBannerTex(variant) {
  return memo('cb' + variant, () => {
    const [c, g] = canvas(256, 640), r = mulberry(variant * 41 + 5);
    g.fillStyle = variant ? '#3d2556' : '#472a62'; g.fillRect(0, 0, 256, 640);
    g.strokeStyle = '#c9a04a'; g.lineWidth = 9; g.strokeRect(14, 14, 228, 560);
    g.lineWidth = 3; g.strokeRect(26, 26, 204, 536);
    // the castle: central keep with three spires, two side towers, gate arch
    g.fillStyle = '#d4ad55';
    const tower = (x, w, y0, y1, sp) => { g.fillRect(x - w / 2, y0, w, y1 - y0); g.beginPath(); g.moveTo(x - w / 2 - 4, y0); g.lineTo(x, y0 - sp); g.lineTo(x + w / 2 + 4, y0); g.fill(); g.fillRect(x - 1, y0 - sp - 14, 2, 14); };
    g.fillRect(58, 330, 140, 110);
    tower(128, 44, 220, 440, 80); tower(88, 26, 270, 440, 56); tower(168, 26, 270, 440, 56); tower(62, 20, 300, 440, 40); tower(194, 20, 300, 440, 40);
    for (let x = 58; x < 198; x += 14) g.fillRect(x, 322, 8, 10);
    g.fillStyle = g.createLinearGradient(0, 0, 0, 0); g.fillStyle = variant ? '#3d2556' : '#472a62';
    g.beginPath(); g.moveTo(112, 440); g.lineTo(112, 400); g.arc(128, 400, 16, Math.PI, 0); g.lineTo(144, 440); g.fill();
    for (const [x, y] of [[128, 260], [88, 300], [168, 300]]) g.fillRect(x - 3, y, 6, 12);
    g.fillStyle = '#d4ad55';
    const star = (x, y, s) => { g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? s * 0.42 : s; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); };
    star(60, 90, 16); star(196, 110, 12); star(128, 70, 20); star(80, 170, 9); star(176, 175, 10);
    g.fillRect(40, 480, 176, 6);
    // fade, grime, rain streaks
    g.fillStyle = 'rgba(200,180,200,0.12)'; g.fillRect(0, 0, 256, 640);
    grime(g, 256, 640, r, 160, 0.22);
    for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(30,20,30,${0.08 + r() * 0.12})`; g.fillRect(r() * 256, r() * 200, 2 + r() * 5, 200 + r() * 400); }
    // swallow-tail foot + tears
    g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.moveTo(0, 640); g.lineTo(128, 560); g.lineTo(256, 640); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(0, 600); g.lineTo(0, 640); g.lineTo(30, 640); g.fill(); g.beginPath(); g.moveTo(256, 600); g.lineTo(256, 640); g.lineTo(226, 640); g.fill();
    const tears = variant ? 4 : 2;
    for (let i = 0; i < tears; i++) { const x = r() < 0.5 ? 0 : 256, y = 200 + r() * 380, d = 30 + r() * 70; g.beginPath(); g.moveTo(x, y - 18 - r() * 20); g.lineTo(Math.abs(x - d), y + (r() - 0.5) * 20); g.lineTo(x, y + 14 + r() * 30); g.fill(); }
    for (let i = 0; i < tears + 2; i++) { const x = 30 + r() * 196, y = 120 + r() * 420, s = 3 + r() * 9; g.beginPath(); g.ellipse(x, y, s, s * (1 + r()), r() * 3, 0, 7); g.fill(); }
    for (let i = 0; i < 40; i++) { const x = r() * 256; g.fillRect(x, 560 + Math.abs(x - 128) * 0.62 - 8 - r() * 14, 1.5, 22); }
    g.globalCompositeOperation = 'source-over';
    return texOf(c);
  });
}

export function popcornSignTex() {
  return memo('pop', () => {
    const [c, g] = canvas(512, 128), r = mulberry(3);
    g.fillStyle = '#7e2a24'; g.fillRect(0, 0, 512, 128);
    g.strokeStyle = '#d7b25a'; g.lineWidth = 6; g.strokeRect(8, 8, 496, 112);
    g.font = 'bold 76px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillText('POPCORN', 259, 70); g.fillStyle = '#e6c46a'; g.fillText('POPCORN', 256, 66);
    grime(g, 512, 128, r, 120, 0.25);
    return texOf(c);
  });
}

// autumn leaves atlas (4 × 1): alpha cut-outs in rust, ochre, brown, dull red
export function leafTex() {
  return memo('leaf', () => {
    const [c, g] = canvas(256, 64), r = mulberry(17);
    const cols = ['#9a4a22', '#b8862e', '#6e4a2a', '#8e2e22'];
    cols.forEach((col, i) => { g.save(); g.translate(i * 64 + 32, 32); g.rotate(r() * 6); g.fillStyle = col; g.beginPath();
      for (let k = 0; k < 14; k++) { const a = (k / 14) * 6.28, rr = (k % 2 ? 14 : 26) * (0.8 + r() * 0.3); g.lineTo(Math.cos(a) * rr * 0.8, Math.sin(a) * rr); } g.fill();
      g.strokeStyle = 'rgba(40,20,10,0.6)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -24); g.lineTo(0, 26); g.stroke(); g.restore(); });
    return texOf(c);
  });
}

// soot / rain-streak card for under sills and cornices: dark at the top, running down in streaks, alpha out
export function streakTex() {
  return memo('streak', () => {
    const [c, g] = canvas(256, 256), r = mulberry(29);
    for (let i = 0; i < 70; i++) { const x = r() * 256, w = 2 + r() * 10, h = 40 + r() * 210, a = 0.12 + r() * 0.3;
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, `rgba(30,24,18,${a})`); gr.addColorStop(1, 'rgba(30,24,18,0)'); g.fillStyle = gr; g.fillRect(x, 0, w, h); }
    const gr = g.createLinearGradient(0, 0, 0, 40); gr.addColorStop(0, 'rgba(25,20,15,0.45)'); gr.addColorStop(1, 'rgba(25,20,15,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 40);
    return texOf(c);
  });
}
