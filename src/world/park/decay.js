// Years of neglect laid back over the park (the 30% in "70% magic, 30% apocalypse"): ivy climbing and
// draping the castle, lodges and service courts; grass and weeds pushing up along wall bases, kerbs and
// seams; litter blown into corners (paper, striped popcorn boxes, faded park maps, spilled popcorn); a
// tipped bin and a fallen bench. Everything here is instanced, alpha-tested cards or tiny meshes, and none
// of it collides, so combat space, doors and paths are exactly as before.
import * as THREE from 'three';
import { mulberry } from '../../core/util.js';

const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const texOf = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };

// ivy: stems climbing from the bottom edge, five-point leaves in a spread of greens, thinning toward the top
function ivyTex(seed) {
  const [c, g] = canvas(512, 1024), r = mulberry(seed);
  const leaf = (x, y, s, a) => { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.moveTo(0, s * 0.5);
    for (let k = 0; k <= 5; k++) { const t = -Math.PI / 2 + (k / 5 - 0.5) * 2.6, rr = k % 2 ? s * 0.55 : s; g.lineTo(Math.cos(t) * rr, Math.sin(t) * rr); } g.closePath(); g.fill(); g.restore(); };
  for (let v = 0; v < 9; v++) {
    let x = 30 + r() * 452, y = 1024, a = -Math.PI / 2; const top = 120 + r() * 600;
    g.strokeStyle = '#3b2e1e'; g.lineWidth = 4;
    while (y > top) {
      const nx = x + Math.cos(a) * 14, ny = y + Math.sin(a) * 14; g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke(); x = nx; y = ny;
      a += (r() - 0.5) * 0.7; a = Math.min(-0.6, Math.max(-2.5, a)); x = Math.max(10, Math.min(502, x));
      const dens = 0.35 + 0.65 * (y - top) / (1024 - top);
      for (let k = 0; k < 3; k++) if (r() < dens) {
        const gr = 60 + r() * 50, gg = 90 + r() * 70, gb = 30 + r() * 30, dry = r() < 0.15;
        g.fillStyle = dry ? `rgb(${120 + r() * 40},${100 + r() * 30},${50})` : `rgb(${gr},${gg},${gb})`;
        leaf(x + (r() - 0.5) * 40, y + (r() - 0.5) * 30, 10 + r() * 12, r() * 6.3);
      }
    }
  }
  const t = texOf(c); return t;
}
function grassTex() {
  // sparse tapered blades with lots of air between them, so a tuft never reads as a card
  const [c, g] = canvas(256, 256), r = mulberry(77);
  for (let i = 0; i < 38; i++) { const x = 50 + r() * 156, h = 50 + r() * 180, lean = (r() - 0.5) * 110, w = 2.5 + r() * 3.5, dry = r() < 0.4;
    g.fillStyle = dry ? `rgb(${135 + r() * 40},${120 + r() * 35},${70 + r() * 20})` : `rgb(${55 + r() * 40},${80 + r() * 45},${30 + r() * 20})`;
    g.beginPath(); g.moveTo(x - w, 256); g.quadraticCurveTo(x + lean * 0.3, 256 - h * 0.55, x + lean, 256 - h); g.quadraticCurveTo(x + lean * 0.3 + w * 0.4, 256 - h * 0.5, x + w, 256); g.closePath(); g.fill(); }
  return texOf(c);
}
function boxTex() {
  const [c, g] = canvas(128, 128);
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#e8dcc2' : '#b8473c'; g.fillRect(i * 16, 0, 16, 128); }
  g.fillStyle = 'rgba(80,60,40,0.25)'; g.fillRect(0, 90, 128, 38); return texOf(c);
}
function mapLeafTex() {
  const [c, g] = canvas(256, 180), r = mulberry(5);
  g.fillStyle = '#d9cba4'; g.fillRect(0, 0, 256, 180); g.fillStyle = '#8f5a4a'; g.fillRect(0, 0, 256, 30);
  g.fillStyle = '#9fb886'; g.fillRect(14, 40, 228, 126); g.strokeStyle = '#efe3c0'; g.lineWidth = 8; g.beginPath(); g.moveTo(128, 166); g.lineTo(128, 60); g.moveTo(40, 100); g.lineTo(216, 100); g.stroke();
  for (const [x, y, col] of [[100, 46, '#7d98c4'], [30, 80, '#c49a4a'], [190, 70, '#b06058']]) { g.fillStyle = col; g.fillRect(x, y, 40, 26); }
  g.strokeStyle = 'rgba(60,40,20,0.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(85, 0); g.lineTo(85, 180); g.moveTo(170, 0); g.lineTo(170, 180); g.stroke();
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(70,50,30,${r() * 0.15})`; g.fillRect(r() * 256, r() * 180, 2 + r() * 14, 2 + r() * 8); }
  return texOf(c);
}

export function buildDecay(ctx, { ivy = [], tufts = [], litterZones = [], spills = [] }) {
  const { scene, M, propAt } = ctx, r = mulberry(9090), mx = new THREE.Matrix4(), q = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0), stats = { tris: 0, instances: 0 };
  const inst = (geo, mat, list, { shadow = false } = {}) => {
    if (!list.length) return; const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((m, i) => { im.setMatrixAt(i, m.m); if (m.c) im.setColorAt(i, m.c); });
    im.castShadow = shadow; im.receiveShadow = true; im.computeBoundingSphere(); scene.add(im);
    stats.tris += (geo.index ? geo.index.count : geo.attributes.position.count) / 3 * list.length; stats.instances += list.length;
  };
  // ---- ivy cards (bottom-anchored); negative height = a drape hanging from the anchor
  const ivyMats = [ivyTex(1), ivyTex(2)].map((t) => new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85 }));
  const card = new THREE.PlaneGeometry(1, 1); card.translate(0, 0.5, 0);
  const ivyL = [[], []];
  for (const [x, y, z, w, h, ny] of ivy) { q.setFromAxisAngle(UP, ny); ivyL[ivyL[0].length > ivyL[1].length ? 1 : 0].push({ m: new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(w, h, 1)) }); }
  ivyL.forEach((l, i) => inst(card, ivyMats[i], l, { shadow: true }));
  // ---- grass tufts: crossed cards
  const gm = new THREE.MeshStandardMaterial({ map: grassTex(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 });
  const tuft = (() => { const a = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), b = a.clone().rotateY(Math.PI / 2); const g = new THREE.BufferGeometry();
    for (const k of ['position', 'normal', 'uv']) g.setAttribute(k, new THREE.BufferAttribute(new Float32Array([...a.attributes[k].array, ...b.attributes[k].array]), a.attributes[k].itemSize));
    g.setIndex([...a.index.array, ...[...b.index.array].map((v) => v + 4)]); return g; })();
  inst(tuft, gm, tufts.map(([x, z, s, y = 0]) => ({ m: new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q.setFromAxisAngle(UP, r() * 6.3).clone(), new THREE.Vector3(s * (0.7 + r() * 0.6), s, s)) })));
  // ---- litter: paper scraps, popcorn boxes, faded park maps
  const papers = [], boxes = [], maps = [], pal = ['#b8b2a2', '#a99f80', '#998880', '#b0a088', '#8894a0', '#a68078'].map((c) => new THREE.Color(c));
  for (const [x0, x1, z0, z1, n, y0 = 0] of litterZones) for (let i = 0; i < n; i++) {
    const p = new THREE.Vector3(x0 + r() * (x1 - x0), 0.012 + r() * 0.01, z0 + r() * (z1 - z0)), k = r();
    p.y += y0 * (k < 0.72 || k >= 0.9 ? 1 : 0);
    if (k < 0.72) papers.push({ m: new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2 + (r() - 0.5) * 0.3, 0, r() * 6.3)), new THREE.Vector3(0.14 + r() * 0.16, 0.18 + r() * 0.16, 1)), c: pal[Math.floor(r() * pal.length)] });
    else if (k < 0.9) { const lying = r() < 0.6; p.y = lying ? 0.045 : 0.065; p.y += y0; boxes.push({ m: new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(lying ? Math.PI / 2 : 0, r() * 6.3, 0, 'YXZ')), new THREE.Vector3(1, 1, 1)) }); }
    else maps.push({ m: new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2 + (r() - 0.5) * 0.25, 0, r() * 6.3)), new THREE.Vector3(0.42, 0.3, 1)) });
  }
  inst(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 0.95, side: THREE.DoubleSide }), papers);
  inst(new THREE.BoxGeometry(0.09, 0.13, 0.07), new THREE.MeshStandardMaterial({ map: boxTex(), roughness: 0.9 }), boxes);
  inst(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: mapLeafTex(), roughness: 0.95, side: THREE.DoubleSide }), maps);
  // ---- spilled popcorn
  const corn = [];
  for (const [x, z, rad, n] of spills) for (let i = 0; i < n; i++) { const a = r() * 6.3, d = Math.pow(r(), 0.7) * rad, s = 0.7 + r() * 0.7;
    corn.push({ m: new THREE.Matrix4().compose(new THREE.Vector3(x + Math.cos(a) * d, 0.02, z + Math.sin(a) * d), new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 6, r() * 6, 0)), new THREE.Vector3(s, s * 0.8, s)), c: new THREE.Color().setHSL(0.12, 0.45, 0.55 + r() * 0.2) }); }
  inst(new THREE.IcosahedronGeometry(0.028, 0), new THREE.MeshStandardMaterial({ roughness: 0.95 }), corn);
  return stats;
}
