// MAIN STREET PROPS (M3): frayed striped awnings over the shop windows, black cast-iron lamp standards along both
// kerbs (fluted post, scroll arms, globe heads) carrying faded purple Ashland Castle banners. Everything repeated
// is merged per material through the Builder (one draw call per material); only the two street lamps that were
// already real lights stay real — the rest glow with emissive globes.
import * as THREE from 'three';
import { lathe, merge } from './kit.js';
import { weather } from './materials.js';
import { LOTS, STREET, lotFrame } from './mainstreet.js';
import { awningTex, castleBannerTex } from './proptex.js';

const UP = new THREE.Vector3(0, 1, 0);
const cloth = (map, o = {}) => { const m = new THREE.MeshStandardMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.95, ...o }); weather(m, { grime: 0.3, streaks: 0.3, wet: 0.2, height: 4 }); m.userData.density = 1; return m; };

// awning sheet in frame space: wall edge at z 0 / y y0, front edge at z p / y y1, valance vh deep below the front.
// sag: canvas bellies between the rods; droop: the +x end of the front edge has let go and hangs lower.
export function awningGeo(aw, p, y0, y1, vh, sag, droop, nx = 10) {
  const pos = [], uv = [], idx = [], rows = [0, 0.25, 0.5, 0.75, 1, 1, 2];   // 5 slope rows, then valance top/bottom
  for (let j = 0; j < rows.length; j++) for (let i = 0; i <= nx; i++) {
    const u = i / nx, x = -aw / 2 + u * aw, d = droop * Math.max(0, (u - 0.55) / 0.45) ** 1.5, s = sag * Math.sin(Math.PI * u) ** 0.6;
    let y, z, v;
    if (j < 5) { const t = rows[j]; z = p * t; y = y0 + (y1 - y0) * t - s * Math.sin(Math.PI * t) - d * t * t; v = 1 - t * 0.78; }
    else { z = p + (j === 6 ? 0.03 : 0); y = y1 - d - (j === 6 ? vh : 0); v = j === 6 ? 0 : 0.219; }
    pos.push(x, y, z); uv.push((x + aw / 2) / 3, v);
  }
  for (let j = 0; j < rows.length - 1; j++) { if (j === 4) continue; for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + nx + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// which lots get awnings, colour (0 red/cream, 1 plum/cream), torn canvas, a sagging corner
const AWN = { W1: [0, 0, 0], W2: [1, 1, 0.35], W3: [0, 0, 0], W4: [0, 1, 0], W5: [1, 0, 0], W7: [1, 1, 0], E1: [0, 0, 0], E2: [1, 0, 0], E3: [1, 0, 0.5], E4: [0, 1, 0], E6: [0, 0, 0], E7: [1, 0, 0] };

export function buildAwnings(ctx) {
  const { B, M } = ctx;
  const mats = [[0, 0], [0, 1], [1, 0], [1, 1]].map(([k, t]) => cloth(awningTex(k, t)));
  for (const lot of LOTS) {
    const a = AWN[lot.id]; if (!a) continue;
    const [kind, torn, droop] = a, F = lotFrame(B, lot), w = lot.z1 - lot.z0, aw = w - 1.0, p = 1.45, y0 = 3.28, y1 = 2.62;
    F.geo(mats[kind * 2 + torn], awningGeo(aw, p, y0, y1, 0.3, 0.07, droop), 'keep');
    // iron: wall rail, two folding arms, the front roller bar
    const iron = [new THREE.CylinderGeometry(0.025, 0.025, aw, 6).rotateZ(Math.PI / 2).translate(0, y0 + 0.02, 0.04)];
    for (const x of [-aw / 2 + 0.06, aw / 2 - 0.06]) {
      const dy = x > 0 ? droop : 0, c = new THREE.Vector3(x, y1 - dy - 0.01, p), s = new THREE.Vector3(x, 2.35, 0.03), l = c.distanceTo(s);
      iron.push(new THREE.CylinderGeometry(0.018, 0.018, l, 5).applyMatrix4(new THREE.Matrix4().compose(c.clone().add(s).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(UP, c.clone().sub(s).normalize()), new THREE.Vector3(1, 1, 1))));
    }
    if (!droop) iron.push(new THREE.CylinderGeometry(0.03, 0.03, aw, 6).rotateZ(Math.PI / 2).translate(0, y1, p));
    F.geo(M.iron, merge(iron));
  }
}

// ---------- lamp standards ----------
function fluted(g, y0, y1, k = 0.14) {   // ripple the lathe radius between y0 and y1 into flutes
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < y0 || y > y1) continue; const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), f = 1 + k * Math.cos(a * 12); p.setX(i, x * f); p.setZ(i, z * f); }
  g.computeVertexNormals(); return g;
}
function scroll(sx, h) {   // a C-scroll arm from the post out to a globe at sx metres, curling under itself
  const pts = []; for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push(new THREE.Vector3(sx * (0.06 + t * 0.6), h + Math.sin(t * Math.PI) * 0.22 - t * 0.04, 0)); }
  const curl = []; for (let i = 0; i <= 10; i++) { const a = Math.PI * 0.5 + (i / 10) * Math.PI * 1.6, r = 0.12 * (1 - i / 16); curl.push(new THREE.Vector3(sx * (0.28 + Math.cos(a) * r), h - 0.16 + Math.sin(a) * r, 0)); }
  return [new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.022, 4), new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curl), 8, 0.016, 4)];
}
let LAMP = null;
function lampParts() {
  if (LAMP) return LAMP;
  const iron = [
    lathe([[0.27, 0], [0.27, 0.1], [0.23, 0.14], [0.23, 0.42], [0.2, 0.46], [0.16, 0.62], [0.17, 0.72], [0.12, 0.84], [0.13, 0.9], [0, 0.9]], 8),
    fluted(lathe([[0.1, 0.88], [0.1, 1.0], [0.085, 1.04], [0.075, 3.2], [0, 3.2]], 24, Math.PI * 2), 1.06, 3.15),
    lathe([[0.11, 1.0], [0.12, 1.04], [0.11, 1.08], [0, 1.08]], 16), lathe([[0.1, 3.18], [0.12, 3.24], [0.09, 3.3], [0.065, 3.36], [0.065, 3.9], [0.1, 3.96], [0.09, 4.02], [0, 4.02]], 16),
    ...scroll(1, 3.62), ...scroll(-1, 3.62),
    // top lantern cap + finial, side cups and caps
    lathe([[0.04, 4.02], [0.1, 4.04], [0.11, 4.1], [0, 4.1]], 12), lathe([[0, 4.47], [0.2, 4.47], [0.14, 4.55], [0.05, 4.62], [0.03, 4.8], [0.06, 4.84], [0, 4.92]], 12),
  ];
  for (const sx of [-1, 1]) iron.push(lathe([[0.03, 3.78], [0.08, 3.8], [0.09, 3.86], [0, 3.86]], 10).translate(sx * 0.66, 0, 0), lathe([[0, 4.12], [0.15, 4.12], [0.1, 4.18], [0.03, 4.24], [0, 4.3]], 10).translate(sx * 0.66, 0, 0));
  // banner arm toward the street: bar + a little scroll brace
  iron.push(new THREE.CylinderGeometry(0.022, 0.022, 0.86, 5).rotateZ(Math.PI / 2).translate(0.45, 3.42, 0), new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.07, 2.95, 0), new THREE.Vector3(0.2, 3.2, 0), new THREE.Vector3(0.42, 3.4, 0)]), 8, 0.015, 4));
  const globe = (x, y, r) => new THREE.SphereGeometry(r, 10, 7).scale(1, 1.15, 1).translate(x, y, 0);
  LAMP = { iron: merge(iron), globes: [globe(0, 4.28, 0.2), globe(-0.66, 3.99, 0.15), globe(0.66, 3.99, 0.15)] };
  return LAMP;
}

// x, z at the kerb; side -1 west / +1 east (banner arm points at the street centre); lit: 0 dark, 1 top globe,
// 2 all three; real: the top globe carries a real point light; broken: which globes are gone (bitmask 1 top, 2 / 4 sides)
export function streetLamp(ctx, x, z, side, { lit = 0, real = false, broken = 0, banner = 0 } = {}) {
  const { B, M, scene, lights } = ctx;
  const P = lampParts(), T = new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(UP, side > 0 ? Math.PI : 0), new THREE.Vector3(1, 1, 1));
  B.add(M.iron, P.iron.clone().applyMatrix4(T));
  if (!ctx.lampMats) {
    ctx.lampMats = { on: new THREE.MeshStandardMaterial({ color: '#f3e2bc', emissive: '#ffc778', emissiveIntensity: 1.6, roughness: 0.4 }), off: new THREE.MeshStandardMaterial({ color: '#b9b2a0', roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.85 }),
      banners: [0, 1].map((v) => cloth(castleBannerTex(v))) };
    ctx.lampMats.on.userData.density = 1; ctx.lampMats.off.userData.density = 1;
  }
  P.globes.forEach((gg, i) => {
    if (broken & (1 << i)) return;
    const on = i === 0 ? lit > 0 : lit > 1;
    B.add(on ? ctx.lampMats.on : ctx.lampMats.off, gg.clone().applyMatrix4(T), 'keep');
    if (!on) return;
    const c = new THREE.Vector3(i === 0 ? 0 : i === 1 ? -0.66 : 0.66, i === 0 ? 4.28 : 3.99, 0).applyMatrix4(T);
    if (real && i === 0) { const L = new THREE.PointLight('#ffad52', 22, 20, 1.6); L.position.copy(c).y -= 0.25; scene.add(L); lights.push({ light: L, base: 22, flicker: 0.04, head: null }); }
    else lights.push({ light: { position: c, intensity: 0, color: new THREE.Color() }, base: 0, flicker: 0, head: null, glow: null, fake: true });
  });
  B.col(x - 0.24, x + 0.24, 0, 4.4, z - 0.24, z + 0.24, { surface: 'metal' });
  if (banner) {   // purple castle banner on the street-side arm, a little wind in it
    const g = new THREE.PlaneGeometry(0.62, 1.55, 2, 6); const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) { const yy = p.getY(k); p.setZ(k, Math.sin(yy * 2.2 + x) * 0.05 + (0.775 - yy) * 0.05 * (banner === 2 ? 1 : 0.3)); }
    g.computeVertexNormals(); g.translate(0.5, 3.4 - 0.775 - 0.02, 0); g.applyMatrix4(T);
    B.add(ctx.lampMats.banners[banner - 1], g, 'keep');
  }
}

// the street's lamps: both kerbs, the two real lights where they always were (west z 5, east z -5)
export function buildStreetLamps(ctx) {
  const k = STREET.road + 0.45;
  const W = [[30.5, 1, 0, 0, 1], [24, 0, 0, 2, 2], [13.6, 1, 0, 0, 1], [5, 2, 1, 0, 1], [-5, 0, 0, 1, 2], [-11.4, 1, 0, 0, 1]];
  const E = [[30.5, 0, 0, 4, 1], [24, 1, 0, 0, 1], [13.6, 0, 0, 0, 2], [5, 1, 0, 0, 1], [-5, 2, 1, 0, 1], [-11.4, 0, 0, 2, 2]];
  for (const [z, lit, real, broken, banner] of W) streetLamp(ctx, -k, z, -1, { lit, real: !!real, broken, banner });
  for (const [z, lit, real, broken, banner] of E) streetLamp(ctx, k, z, 1, { lit, real: !!real, broken, banner });
  return { kerbX: k, zs: W.map((w) => w[0]) };
}
