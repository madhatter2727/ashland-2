// Main Street storefront textures (canvas): gold-lettered shop boards, grimy / cracked / smashed glass,
// faded roller blinds. All small and generated once; per-lot signs are one texture each.
import * as THREE from 'three';

const SERIF = '"Cormorant Garamond", "Playfair Display", "Times New Roman", Georgia, serif';
const rnd = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const tex = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

// Shop board face. `outline(g, W, H)` traces the board's shape (same as the 3D board) in canvas pixels.
// Gold serif lettering with a dark drop shadow, gilt double border, faded / chipped paint, grime at the bottom.
export function shopSign(name, { bg = '#5a2440', fg = '#d8b76a', W = 1024, H = 512, outline, seed = 1, textY = 0.6 } = {}) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), r = rnd(seed * 97 + 13);
  g.fillStyle = '#2a1d16'; g.fillRect(0, 0, W, H);
  g.save(); outline(g, W, H, 0); g.clip();
  // painted ground: base colour, vertical brush grain, sun fade toward the top
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,235,215'},${r() * 0.05})`; g.fillRect(r() * W, r() * H, 1 + r() * 3, 8 + r() * 60); }
  const fade = g.createLinearGradient(0, 0, 0, H); fade.addColorStop(0, 'rgba(225,210,190,.22)'); fade.addColorStop(0.5, 'rgba(225,210,190,.06)'); fade.addColorStop(1, 'rgba(20,10,8,.28)');
  g.fillStyle = fade; g.fillRect(0, 0, W, H);
  g.restore();
  // gilt borders (traced twice, inset)
  g.lineJoin = 'round';
  g.strokeStyle = fg; g.lineWidth = 14; outline(g, W, H, 16); g.stroke();
  g.strokeStyle = 'rgba(40,20,10,.6)'; g.lineWidth = 3; outline(g, W, H, 27); g.stroke();
  g.strokeStyle = fg; g.lineWidth = 4; outline(g, W, H, 36); g.stroke();
  // lettering: "Ashland" in italic over the rest in caps; otherwise one or two lines of caps
  const words = name.split(' '); let lines;
  if (words[0] === 'ASHLAND' && words.length > 1) lines = [['Ashland', 'italic 700', 0.3], [words.slice(1).join(' '), '700', 0.22]];
  else if (W / H < 3.2 && name.length > 11 && words.length > 1) { const k = Math.ceil(words.length / 2); lines = [[words.slice(0, k).join(' '), '700', 0.24], [words.slice(k).join(' '), '700', 0.24]]; }
  else lines = [[name, '700', W / H > 3.2 ? 0.5 : 0.3]];
  const total = lines.reduce((a, l) => a + l[2], 0) * H * 1.08; let y = H * textY - total / 2;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const [txt, wt, sz] of lines) {
    const px = sz * H; y += px * 0.54;
    g.font = `${wt} ${px}px ${SERIF}`;
    const mw = g.measureText(txt).width, k = Math.min(1, (W * 0.7) / mw);
    g.save(); g.translate(W / 2, y); g.scale(k, 1);
    g.fillStyle = 'rgba(15,6,4,.75)'; g.fillText(txt, 5, 6);
    const lg = g.createLinearGradient(0, -px / 2, 0, px / 2); lg.addColorStop(0, '#f1d891'); lg.addColorStop(0.5, fg); lg.addColorStop(1, '#8e6a2e');
    g.fillStyle = lg; g.fillText(txt, 0, 0);
    g.restore(); y += px * 0.54;
  }
  // a little gilt star either side of the top line
  g.fillStyle = fg; for (const sx of [0.12, 0.88]) star(g, W * sx, H * textY, H * 0.035);
  // chips and peel: lost paint showing grey timber, lost gilt
  g.save(); outline(g, W, H, 0); g.clip();
  for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(${95 + r() * 30},${88 + r() * 25},${78 + r() * 20},${0.55 + r() * 0.4})`; g.beginPath(); const x = r() * W, yy = r() * H; g.moveTo(x, yy); for (let k = 0; k < 7; k++) g.lineTo(x + (r() - 0.5) * 70, yy + (r() - 0.5) * 34); g.fill(); }
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(30,18,12,${0.4 + r() * 0.5})`; g.beginPath(); g.arc(r() * W, r() * H, 1 + r() * 3, 0, 6.3); g.fill(); }
  // drip stains from the top edge
  for (let i = 0; i < 14; i++) { const x = r() * W, l = H * (0.2 + r() * 0.6), lg = g.createLinearGradient(0, 0, 0, l); lg.addColorStop(0, 'rgba(30,22,14,.35)'); lg.addColorStop(1, 'rgba(30,22,14,0)'); g.fillStyle = lg; g.fillRect(x, 0, 3 + r() * 8, l); }
  g.restore();
  return tex(c);
}
function star(g, x, y, s) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? s * 0.42 : s; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }

// Glass: colour map (dust, grime at the bottom and corners, rain runs) + alpha map (hole for smashed panes)
// kind: 0 intact, 1 cracked (spider web), 2 smashed (star hole + cracks). Returns { map, alphaMap }.
export function glassTex(kind, seed = 1) {
  const S = 256, r = rnd(seed * 31 + kind * 7 + 3);
  const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const a = document.createElement('canvas'); a.width = a.height = S; const ga = a.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, S, S);
  ga.fillStyle = '#c8c8c8'; ga.fillRect(0, 0, S, S);
  // dust: radial falloff from the edges, heavier at the bottom
  for (let i = 0; i < 900; i++) { const x = r() * S, y = Math.pow(r(), 0.6) * S, e = Math.min(x, S - x, S - y) / S; const al = (0.05 + (1 - y / S) * 0) * (e < 0.15 ? 2.2 : 0.7); g.fillStyle = `rgba(150,138,118,${al * r()})`; g.beginPath(); g.arc(x, y, 3 + r() * 14, 0, 6.3); g.fill(); ga.fillStyle = `rgba(255,255,255,${al * r() * 1.2})`; ga.beginPath(); ga.arc(x, y, 3 + r() * 14, 0, 6.3); ga.fill(); }
  const bot = g.createLinearGradient(0, S, 0, S * 0.55); bot.addColorStop(0, 'rgba(120,105,85,.65)'); bot.addColorStop(1, 'rgba(120,105,85,0)'); g.fillStyle = bot; g.fillRect(0, 0, S, S);
  const bota = ga.createLinearGradient(0, S, 0, S * 0.55); bota.addColorStop(0, 'rgba(255,255,255,.6)'); bota.addColorStop(1, 'rgba(255,255,255,0)'); ga.fillStyle = bota; ga.fillRect(0, 0, S, S);
  for (let i = 0; i < 18; i++) { const x = r() * S, y0 = r() * S * 0.5; g.fillStyle = 'rgba(110,98,80,.25)'; g.fillRect(x, y0, 1 + r() * 2, S * (0.3 + r() * 0.5)); }
  if (kind > 0) {
    const cx = S * (0.3 + r() * 0.4), cy = S * (0.35 + r() * 0.35);
    if (kind === 2) { // jagged star hole
      ga.fillStyle = '#000'; g.fillStyle = '#fff'; ga.beginPath(); const n = 13, R = S * (0.16 + r() * 0.1);
      for (let i = 0; i < n * 2; i++) { const t = (i / (n * 2)) * Math.PI * 2, rr = (i % 2 ? 0.35 + r() * 0.3 : 0.8 + r() * 0.6) * R; ga.lineTo(cx + Math.cos(t) * rr, cy + Math.sin(t) * rr); }
      ga.closePath(); ga.fill();
    }
    // radial cracks + concentric rings: white lines (bright in colour, opaque in alpha)
    const lines = (ctx, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w; const rr = rnd(seed * 31 + kind * 7 + 99);
      const rays = 11 + Math.floor(rr() * 6);
      for (let i = 0; i < rays; i++) { let ang = (i / rays) * Math.PI * 2 + rr() * 0.4, x = cx, y = cy; ctx.beginPath(); ctx.moveTo(x, y); const L = S * (0.35 + rr() * 0.6);
        for (let s = 0; s < 8; s++) { ang += (rr() - 0.5) * 0.35; x += Math.cos(ang) * L / 8; y += Math.sin(ang) * L / 8; ctx.lineTo(x, y); } ctx.stroke(); }
      for (let k = 1; k <= 3; k++) { ctx.beginPath(); const R = S * 0.07 * k * (1 + rr() * 0.4); for (let i = 0; i <= 18; i++) { const t = (i / 18) * Math.PI * 2, j = R * (0.85 + rr() * 0.3); ctx.lineTo(cx + Math.cos(t) * j, cy + Math.sin(t) * j); } ctx.stroke(); } };
    lines(g, 'rgba(235,240,240,.9)', 1.4); lines(ga, 'rgba(255,255,255,1)', 1.6);
  }
  return { map: tex(c), alphaMap: tex(a, false) };
}

// faded roller blind / lace curtain behind upper windows (sun-bleached, water stained, torn bottoms)
export function blindTex(seed = 1) {
  const W = 128, H = 256, r = rnd(seed * 53 + 5), c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const base = ['#b9ab8c', '#a89a7e', '#9c8f86', '#b8a48a'][seed % 4]; g.fillStyle = base; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(80,60,40,${r() * 0.12})`; g.beginPath(); g.arc(r() * W, r() * H, 6 + r() * 30, 0, 6.3); g.fill(); }
  for (let y = 0; y < H; y += 6) { g.fillStyle = 'rgba(0,0,0,.05)'; g.fillRect(0, y, W, 1); }
  g.fillStyle = 'rgba(50,38,28,.5)'; g.fillRect(0, H - 10, W, 10);
  return tex(c);
}
