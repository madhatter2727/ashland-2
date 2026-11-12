// MAIN STREET STOREFRONTS (M2): a modular Victorian shop kit driven by the LOTS table in mainstreet.js.
// Every piece is authored in the lot frame (lotFrame: origin at the facade centre on the facade line, x along the
// facade, y up, +z out into the street; the building fills z -depth..0) and merged per material by the Builder.
// Layers in depth: front wall slab (z -T..0) with real openings -> glass set back in the reveal -> a shallow dark
// "room" (cavity, z -CAV..-T) with floor plates, blinds and shelf silhouettes -> the solid body (z -depth..-CAV).
// Styles (see docs/MAINSTREET_PLAN.md): A 3-storey mansard emporium, B 2½-storey front gable, C Italianate false front.
import * as THREE from 'three';
import { P, molding, archSurround, keystone, pediment, merge, mansard as mansardG } from './kit.js';
import { shopSign, glassTex, blindTex } from './sftex.js';
import { mulberry } from '../../core/util.js';

export const SF = { GF: 4.4, T: 0.3, CAV: 1.45 };   // ground-floor height (to the top of the fascia cornice), wall slab, cavity depth

// ---------- per-material set shared by all lots (built once per material table) ----------
export function sfMats(M) {
  if (M._sf) return M._sf;
  const glass = (kind, seed) => { const t = glassTex(kind, seed); const m = new THREE.MeshStandardMaterial({ color: '#7c8a8e', map: t.map, alphaMap: t.alphaMap, transparent: true, opacity: 0.82, roughness: 0.06, metalness: 0.35, envMapIntensity: 1.5, depthWrite: false, side: THREE.DoubleSide }); m.userData.density = 1; return m; };
  const plain = (c, r = 0.85, o = {}) => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: r, ...o }); m.userData.density = 1; return m; };
  M._sf = {
    glass: [[glass(0, 1), glass(0, 2)], [glass(1, 3), glass(1, 4)], [glass(2, 5), glass(2, 6)]],
    blind: [1, 2, 3].map((s) => plain('#ffffff', 0.95, { map: blindTex(s), side: THREE.DoubleSide })),
    shelf: plain('#2a2019', 0.8), goodsA: plain('#5b4535', 0.75), goodsB: plain('#3c4648', 0.6),
  };
  return M._sf;
}

// ---------- outlines ----------
// opening outline: rect (seg < 0), segmental head (seg > 0) or semicircular head (seg = 0); `top` = crown height
export function outlinePts(o, steps = 12) {
  const { x0, x1, y0, spring } = o, r = (x1 - x0) / 2, cx = (x0 + x1) / 2, pts = [[x0, y0], [x1, y0], [x1, spring]];
  if (o.seg > 0) { const R = (r * r + o.seg * o.seg) / (2 * o.seg), cy = spring + o.seg - R, a0 = Math.asin(r / R); for (let i = 1; i < steps; i++) { const a = a0 - (2 * a0 * i) / steps; pts.push([cx + Math.sin(a) * R, cy + Math.cos(a) * R]); } }
  else if (o.seg === 0) for (let i = 1; i < steps; i++) { const a = (i / steps) * Math.PI; pts.push([cx + Math.cos(a) * r, spring + Math.sin(a) * r]); }
  pts.push([x0, spring]);
  return pts;
}
export const crown = (o) => (o.seg > 0 ? o.spring + o.seg : o.seg === 0 ? o.spring + (o.x1 - o.x0) / 2 : o.spring);

// wall slab x0..x1, y0..y1 with openings, extruded from z = 0 back to -t
export function slab(x0, x1, y0, y1, openings, t = SF.T) {
  const s = new THREE.Shape(); s.moveTo(x0, y0); s.lineTo(x1, y0); s.lineTo(x1, y1); s.lineTo(x0, y1); s.closePath();
  for (const o of openings) s.holes.push(new THREE.Path(outlinePts(o).reverse().map(([x, y]) => new THREE.Vector2(x, y))));
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 1 }); g.translate(0, 0, -t); return g;
}
// flat shape geometry from an outline with 0..1 UVs over its bounding box
export function shapeGeo(pts) {
  const g = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))));
  const p = g.attributes.position, uv = g.attributes.uv; let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
  for (let i = 0; i < p.count; i++) { a = Math.min(a, p.getX(i)); b = Math.max(b, p.getX(i)); c = Math.min(c, p.getY(i)); d = Math.max(d, p.getY(i)); }
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - a) / (b - a), (p.getY(i) - c) / (d - c));
  return g;
}

// fan-triangulated flat outline (star-shaped from c) with 0..1 bbox UVs — earcut drops triangles on the arched boards
export function fanGeo(pts, c) {
  let a = Infinity, b = -Infinity, e = Infinity, d = -Infinity; for (const [x, y] of pts) { a = Math.min(a, x); b = Math.max(b, x); e = Math.min(e, y); d = Math.max(d, y); }
  const pos = [], uv = [], put = ([x, y]) => { pos.push(x, y, 0); uv.push((x - a) / (b - a), (y - e) / (d - e)); };
  let area = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; area += p[0] * q[1] - q[0] * p[1]; }
  for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; put(c); if (area > 0) { put(p); put(q); } else { put(q); put(p); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
}

// Italianate scroll bracket profile (out, up): sits under a cornice, `h` tall, projecting `p`
export const bracketP = (h, p) => [[0, 0], [p * 0.18, 0], [p * 0.3, h * 0.1], [p * 0.36, h * 0.24], [p * 0.48, h * 0.4], [p * 0.66, h * 0.52], [p * 0.86, h * 0.62], [p, h * 0.76], [p, h], [0, h]];
export function bracket(F, mat, x, y, h, p, t = 0.1) { F.geo(mat, molding(bracketP(h, p), x - t / 2, x + t / 2, y, 0)); }

// ---------- a glazed window in an opening: glass in the reveal, sash bars, sill, surround, damage ----------
// o: {x0,x1,y0,spring,seg}; s: {frame, trim, hood: 'arch'|'pediment'|'cap'|null, bars: [cols, rows], dmg, r, blind}
export function sash(F, M, S, o, s) {
  const { x0, x1, y0, spring } = o, top = crown(o), cx = (x0 + x1) / 2, w = x1 - x0, zg = -0.15, fw = 0.06;
  const dmg = s.dmg ?? 0, mat = S.glass[dmg === 3 ? 2 : dmg][Math.floor(s.r() * 2)];
  const pane = shapeGeo(outlinePts(o)); pane.translate(0, 0, zg); F.geo(mat, pane, 'keep');
  // sash frame: inner ring hugging the reveal, meeting rail, glazing bars
  if (o.seg >= 0) F.geo(s.frame, archSurround(x0 + fw, x1 - fw, y0 + fw, spring, { w: fw, d: 0.05, seg: o.seg > 0 ? Math.max(0.01, o.seg - fw * 0.3) : 0 }).translate(0, 0, zg - 0.03));
  else { F.box(s.frame, x0, x1, top - fw, top, zg - 0.03, zg + 0.03); for (const x of [x0, x1 - fw]) F.box(s.frame, x, x + fw, y0, top, zg - 0.03, zg + 0.03); }
  F.box(s.frame, x0, x1, y0, y0 + fw * 1.4, zg - 0.03, zg + 0.04);
  const [cols, rows] = s.bars || [2, 2], mid = y0 + (spring - y0) * 0.52;
  F.box(s.frame, x0, x1, mid - 0.035, mid + 0.035, zg - 0.03, zg + 0.035);
  for (let i = 1; i < cols; i++) { const x = x0 + (w * i) / cols; F.box(s.frame, x - 0.018, x + 0.018, y0, o.seg >= 0 ? spring + (o.seg === 0 ? w * 0.48 : o.seg * 0.8) : top, zg - 0.02, zg + 0.02); }
  for (let j = 1; j < rows; j++) for (const [a, b] of [[y0, mid], [mid, spring]]) { const y = a + ((b - a) * j) / rows; F.box(s.frame, x0, x1, y - 0.015, y + 0.015, zg - 0.02, zg + 0.02); }
  if (o.seg >= 0 && cols > 1) F.box(s.frame, x0, x1, spring - 0.018, spring + 0.018, zg - 0.02, zg + 0.02);
  // sill (projects from the wall face) and the surround
  F.geo(s.trim, molding(P.sill(1.15), x0 - 0.14, x1 + 0.14, y0 - 0.14, 0));
  if (s.surround !== false) F.geo(s.trim, archSurround(x0, x1, y0, spring, { w: 0.12, d: 0.06, seg: o.seg > 0 ? o.seg : 0 }).translate(0, 0, 0));
  if (s.hood === 'arch') F.geo(s.trim, keystone(cx, top - 0.06, 0.38, 0.16, 0.26, 0.13));
  else if (s.hood === 'pediment') F.geo(s.trim, pediment(cx, top + 0.14, w + 0.5, { h: 0.34, d: 0.14 }));
  else if (s.hood === 'cap') { F.geo(s.trim, molding(P.cornice(0.34), x0 - 0.24, x1 + 0.24, top + 0.13, 0)); for (const x of [x0 - 0.12, x1 + 0.12]) bracket(F, s.trim, x, top - 0.28, 0.42, 0.13, 0.08); }
  // a blind pulled part-way down behind the glass
  if (s.blind && dmg < 3) { const bh = (top - y0) * (0.25 + s.r() * 0.6), g = new THREE.PlaneGeometry(w - 0.04, bh); g.translate(cx, top - bh / 2 - 0.02, -SF.T - 0.03); F.geo(S.blind[Math.floor(s.r() * 3)], g, 'keep'); }
  // boarded: weathered planks nailed across the opening, slightly askew
  if (dmg === 3) for (let k = 0; k < 3 + Math.floor(s.r() * 2); k++) {
    const y = y0 + 0.25 + k * ((top - y0 - 0.4) / 3.2) + (s.r() - 0.5) * 0.15, g = new THREE.BoxGeometry(w + 0.35, 0.2 + s.r() * 0.08, 0.035);
    g.rotateZ((s.r() - 0.5) * 0.35); g.translate(cx, y, 0.1 + k * 0.012); F.geo(M.boards, g);
  }
}

// pick damage for a pane: 0 ok, 1 cracked, 2 smashed, 3 boarded
let DMGK = 1;
export function pickDmg(r, k = 1) { k *= DMGK; const v = r(); return v < 0.1 * k ? 2 : v < 0.24 * k ? 1 : v < 0.3 * k ? 3 : 0; }

// ---------- shop board (arched / crested / plain) with a gold-lettered canvas face ----------
const arcPts = (u0, u1, v0, v1, n = 14, finial = 0) => { const out = []; for (let i = 0; i <= n; i++) { const t = i / n, u = u1 + (u0 - u1) * t; out.push([u, v0 + (v1 - v0) * Math.pow(Math.sin(Math.PI * t), 0.75) + finial * Math.exp(-(((u - 0.5) / 0.045) ** 2))]); } return out; };
export const SIGN_SHAPES = {
  crest: [[0, 0], [1, 0], [1, 0.6], [0.94, 0.6], ...arcPts(0.94, 0.06, 0.66, 0.9, 18, 0.1), [0.06, 0.6], [0, 0.6]],
  arch: [[0, 0], [1, 0], ...arcPts(1, 0, 0.74, 1, 16)],
  board: [[0.025, 0], [0.975, 0], [1, 0.1], [1, 0.9], [0.975, 1], [0.025, 1], [0, 0.9], [0, 0.1]],
};
export function signBoard(ctx, F, L, { shape = 'arch', w, h, x = 0, y, z = 0.06 }) {
  const pts = SIGN_SHAPES[shape], textY = shape === 'board' ? 0.5 : shape === 'crest' ? 0.64 : 0.58;
  const scaled = (sw, sh, ox, oy) => pts.map(([u, v]) => [ox + u * sw, oy + v * sh]);
  // backing board (dark joinery) with a moulded edge, a little larger than the face
  const back = new THREE.ExtrudeGeometry(new THREE.Shape(scaled(w + 0.14, h + 0.12, x - w / 2 - 0.07, y - 0.06).map(([a, b]) => new THREE.Vector2(a, b))), { depth: 0.09, bevelEnabled: false, curveSegments: 1 });
  back.translate(0, 0, z - 0.09); F.geo(L.signFrame, back);
  const outline = (g, W, H, ins) => { g.beginPath(); pts.forEach(([u, v], i) => { const px = ins + u * (W - 2 * ins), py = H - ins - v * (H - 2 * ins); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); };
  const map = shopSign(L.lot.name, { bg: L.lot.sign, outline, seed: L.seed, textY, W: 1024, H: Math.round(1024 * Math.min(0.6, h / w)) });
  const face = fanGeo(scaled(w, h, x - w / 2, y), [x, y + h * 0.4]); face.translate(0, 0, z + 0.012); face.applyMatrix4(F.m);
  const mesh = new THREE.Mesh(face, new THREE.MeshStandardMaterial({ map, roughness: 0.62, metalness: 0.15, envMapIntensity: 0.8 }));
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.matrixAutoUpdate = false; ctx.scene.add(mesh);
}

// ---------- ground-floor shopfront: piers + pilasters, stall risers, mullioned display windows, recessed door,
// fascia + cornice, and a shallow dark shop behind (floor, ceiling, shelves of dusty goods, a counter) ----------
export function shopfront(F, M, S, L, { door = 'right', pil = 0.36 } = {}) {
  const { hw, join, trim, r } = L, GF = SF.GF, head = 3.3, a = -hw + 0.55, b = hw - 0.55, cav = -SF.CAV;
  for (const s of [-1, 1]) {
    F.box(L.body, s < 0 ? -hw : b, s < 0 ? a : hw, 0, GF, -SF.T, 0);                                  // brick/plaster pier
    F.box(M.kerb, s < 0 ? -hw : b - 0.02, s < 0 ? a + 0.02 : hw, 0, 0.42, -SF.T, 0.08);               // stone plinth
    const g = pilasterG(GF - 0.46, pil, 0.12); g.translate(s * (hw - 0.27), 0, 0); F.geo(L.pilMat, g);
  }
  F.box(join, a - 0.02, b + 0.02, head, GF - 0.44, -0.26, 0.02);                                     // fascia board
  F.geo(trim, molding(P.cornice(0.78), -hw - 0.08, hw + 0.08, GF - 0.44, 0));                        // shop cornice
  F.geo(trim, molding(P.string(0.6), a, b, head - 0.02, 0.02));                                      // bead under the fascia
  // recessed door
  const dw = 1.0, xd = door === 'centre' ? 0 : door === 'left' ? a + 0.72 : b - 0.72, D = 1.0, d0 = xd - dw / 2 - 0.07, d1 = xd + dw / 2 + 0.07;
  F.box(M.marbleFloor, d0, d1, 0, 0.17, -D - 0.05, 0.02);                                             // mosaic step
  F.box(join, xd - dw / 2, xd + dw / 2, 0.17, 0.95, -D - 0.06, -D);                                  // door: bottom panel
  for (const x of [xd - dw / 2, xd + dw / 2 - 0.1]) F.box(join, x, x + 0.1, 0.95, 2.45, -D - 0.06, -D);
  F.box(join, xd - dw / 2, xd + dw / 2, 2.35, 2.5, -D - 0.06, -D); F.box(join, xd - dw / 2, xd + dw / 2, 3.0, head, -D - 0.06, -D);
  F.box(join, xd - dw / 2 - 0.05, xd + dw / 2 + 0.05, 2.95, 3.05, -D - 0.06, -D + 0.02);
  const pane = (mat, x0, x1, y0, y1, z) => { const g = new THREE.PlaneGeometry(x1 - x0, y1 - y0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, z); F.geo(mat, g, 'keep'); };
  pane(S.glass[Math.min(2, pickDmg(r))][0], xd - dw / 2 + 0.1, xd + dw / 2 - 0.1, 0.95, 2.35, -D - 0.03);
  pane(S.glass[0][1], xd - dw / 2, xd + dw / 2, 2.5, 2.95, -D - 0.03);
  F.box(M.dark, d0, d1, head - 0.06, head + 0.02, -D, -0.1);                                          // recess soffit
  for (const x of [d0, d1]) {                                                                        // glazed returns
    F.box(join, x - 0.04, x + 0.04, 0.17, 0.75, -D, -0.12); F.box(join, x - 0.04, x + 0.04, 2.95, head, -D, -0.12);
    F.box(join, x - 0.04, x + 0.04, 0.17, head, -0.2, -0.1);
    const g = new THREE.PlaneGeometry(D - 0.3, 2.2); g.rotateY(Math.PI / 2); g.translate(x, 1.85, -D / 2 - 0.12); F.geo(S.glass[0][0], g, 'keep');
  }
  // display windows either side of the door
  for (const [x0, x1] of [[a, d0], [d1, b]]) {
    if (x1 - x0 < 0.35) continue;
    F.box(join, x0, x1, 0, 0.72, -0.26, -0.1);                                                       // stall riser
    F.box(join, x0 + 0.1, x1 - 0.1, 0.14, 0.6, -0.1, -0.075);                                         // raised panel
    F.geo(trim, molding(P.sill(0.85), x0, x1, 0.72, -0.12));
    const n = Math.max(1, Math.round((x1 - x0) / 1.15)), pw = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      const p0 = x0 + i * pw, k = L.lot.smash && !L.smashed ? (L.smashed = 2) : pickDmg(r, 1.5);
      pane(S.glass[k === 3 ? 1 : k][Math.floor(r() * 2)], p0, p0 + pw, 0.8, 2.52, -0.16);
      pane(S.glass[r() < 0.2 ? 1 : 0][Math.floor(r() * 2)], p0, p0 + pw, 2.6, head - 0.08, -0.16);       // transom lights
      if (k === 3) for (let j = 0; j < 4; j++) { const g = new THREE.BoxGeometry(pw + 0.25, 0.22, 0.035); g.rotateZ((r() - 0.5) * 0.3); g.translate(p0 + pw / 2, 1.0 + j * 0.42, -0.06 + j * 0.01); F.geo(M.boards, g); }
      if (i) F.box(join, p0 - 0.04, p0 + 0.04, 0.72, head, -0.22, -0.1);                              // mullion
    }
    F.box(join, x0, x1, 2.52, 2.6, -0.22, -0.1); F.box(join, x0, x1, head - 0.1, head, -0.24, -0.08);
    for (const x of [x0, x1]) F.box(join, x - 0.05, x + 0.05, 0.72, head, -0.24, -0.08);
    // the shop inside: floor, ceiling, wall shelves with dusty stock, a display table near the glass
    F.box(S.shelf, x0, x1, 0, 0.32, cav, -0.26); F.box(M.dark, x0, x1, head, head + 0.1, cav, -0.26);
    for (const sy of [1.05, 1.65, 2.25]) {
      F.box(S.shelf, x0 + 0.05, x1 - 0.05, sy - 0.04, sy, cav + 0.02, cav + 0.36);
      for (let gx = x0 + 0.15; gx < x1 - 0.2; gx += 0.16 + r() * 0.22) if (r() < 0.7) { const gh = 0.12 + r() * 0.26, gw = 0.08 + r() * 0.14; F.box(r() < 0.6 ? S.goodsA : S.goodsB, gx, gx + gw, sy, sy + gh, cav + 0.06, cav + 0.06 + 0.1 + r() * 0.15); }
    }
    if (r() < 0.75) { const g = new THREE.BoxGeometry(Math.min(1.2, x1 - x0 - 0.3), 0.08, 0.38); g.translate(0, 0.86, 0); if (r() < 0.35) g.rotateZ(0.3); g.translate((x0 + x1) / 2, 0, -0.62); F.geo(S.shelf, g); for (const s of [-1, 1]) F.box(S.shelf, (x0 + x1) / 2 + s * 0.4 - 0.03, (x0 + x1) / 2 + s * 0.4 + 0.03, 0.32, 0.82, -0.66, -0.6); }
  }
}
// slim pilaster for shop piers (kit's pilaster is sized for grand halls)
function pilasterG(h, w, d) {
  const parts = [], bx = (sx, sy, sz, y, z = sz / 2) => { const g = new THREE.BoxGeometry(sx, sy, sz); g.translate(0, y + sy / 2, z); parts.push(g); };
  bx(w * 1.25, 0.5, d + 0.08, 0); bx(w * 1.12, 0.08, d + 0.05, 0.5); bx(w, h - 0.98, d, 0.58);
  bx(w * 0.62, h - 1.4, 0.03, 0.8, d + 0.015);                                                       // sunk panel face
  bx(w * 1.15, 0.1, d + 0.05, h - 0.4); bx(w * 1.3, 0.14, d + 0.1, h - 0.3); bx(w * 1.16, 0.16, d + 0.06, h - 0.16);
  return merge(parts);
}

// ---------- shell: solid body behind the cavity, cavity side walls, floor plates, dark back plane; plain side
// and back walls with a few applied windows (players walk the alleys and the service ground behind) ----------
export function shell(F, M, S, L) {
  const { hw, d, eaves, r } = L, cav = -SF.CAV, T = SF.T;
  F.box(L.sideMat, -hw, hw, 0, eaves, -d, cav);
  for (const s of [-1, 1]) F.box(L.sideMat, s < 0 ? -hw : hw - 0.22, s < 0 ? -hw + 0.22 : hw, 0, eaves, cav, -T);
  F.box(M.interior, -hw + 0.2, hw - 0.2, 0, eaves, cav, cav + 0.02);
  for (const y of L.floors) F.box(M.dark, -hw + 0.2, hw - 0.2, y - 0.14, y + 0.06, cav, -T);
  F.box(M.kerb, -hw, hw, 0, 0.45, -d - 0.05, cav);                                                   // stone plinth round the body
  // back wall (faces away from the street)
  const Bk = F.sub(0, -d, Math.PI), cols = Math.max(1, Math.round(L.w / 2.4));
  for (let i = 0; i < cols; i++) {
    const x = -hw + (i + 0.5) * (L.w / cols);
    for (const y of L.floors) flatWin(Bk, M, S, L, x, y + 0.85, 0.9, 1.6, pickDmg(r, 1.4));
    if (i === 0) backDoor(Bk, M, L, x); else flatWin(Bk, M, S, L, x, 1.1, 0.9, 1.5, r() < 0.5 ? 3 : pickDmg(r, 1.4));
  }
  // exposed side walls (end of a block or taller than the neighbour)
  for (const e of L.exposed) {
    const Fs = e.end < 0 ? F.sub(-hw, -d / 2, -Math.PI / 2) : F.sub(hw, -d / 2, Math.PI / 2), s = e.end < 0 ? 1 : -1;
    for (const y of L.floors) if (y >= e.from - 0.2) for (const t of [-0.22, 0.2]) flatWin(Fs, M, S, L, s * t * d, y + 0.85, 0.85, 1.6, pickDmg(r, 1.3));
    if (e.from < 1) { flatWin(Fs, M, S, L, -s * 0.22 * d, 1.2, 0.9, 1.6, r() < 0.6 ? 3 : 1); F.geo(L.trim, molding(P.string(0.8), -d / 2, d / 2, SF.GF - 0.3, 0)); }
    // painted ghost advert on the tall blank side walls
    if (e.from < 1 && L.eaves > 8) F.box(L.trim, -d / 2 + 0.6, d / 2 - 0.8, L.floors[L.floors.length - 1] + 2.45, L.floors[L.floors.length - 1] + 2.6, 0, 0.05);
  }
}
// applied window on a plain wall (frame projects so the glass sits in a shallow reveal)
export function flatWin(F, M, S, L, x, y, w, h, dmg = 0) {
  const x0 = x - w / 2, x1 = x + w / 2;
  F.box(M.interior, x0, x1, y, y + h, -0.02, 0.01);
  const g = new THREE.PlaneGeometry(w, h); g.translate(x, y + h / 2, 0.04); F.geo(S.glass[dmg === 3 ? 1 : dmg][Math.floor(L.r() * 2)], g, 'keep');
  F.box(L.join, x0, x1, y + h * 0.5 - 0.03, y + h * 0.5 + 0.03, 0, 0.06); F.box(L.join, x - 0.02, x + 0.02, y, y + h, 0, 0.05);
  for (const [a, b, c, e] of [[x0 - 0.1, x0, y, y + h], [x1, x1 + 0.1, y, y + h], [x0 - 0.1, x1 + 0.1, y + h, y + h + 0.1]]) F.box(L.trim, a, b, c, e, 0, 0.09);
  F.geo(L.trim, molding(P.sill(1), x0 - 0.15, x1 + 0.15, y - 0.12, 0));
  F.geo(L.trim, molding(P.string(0.7), x0 - 0.18, x1 + 0.18, y + h + 0.1, 0));
  if (dmg === 3) for (let k = 0; k < 3; k++) { const p = new THREE.BoxGeometry(w + 0.3, 0.2, 0.035); p.rotateZ((L.r() - 0.5) * 0.3); p.translate(x, y + 0.3 + k * (h - 0.5) / 2, 0.12 + k * 0.01); F.geo(M.boards, p); }
}
function backDoor(F, M, L, x) {
  F.box(L.join, x - 0.5, x + 0.5, 0, 2.2, -0.02, 0.05); F.box(L.trim, x - 0.62, x + 0.62, 2.2, 2.34, 0, 0.12);
  for (const s of [-1, 1]) F.box(L.trim, x + s * 0.56 - 0.06, x + s * 0.56 + 0.06, 0, 2.2, 0, 0.1);
  F.box(M.kerb, x - 0.7, x + 0.7, 0, 0.18, 0, 0.45);                                                 // stone step
  for (const y of [0.4, 1.1, 1.8]) F.box(L.join, x - 0.42, x + 0.42, y, y + 0.06, 0.05, 0.07);
}
// brick chimney stack with a corbelled cap and two clay pots
export function chimney(F, M, x, z, y0, h) {
  F.box(M.brick, x - 0.38, x + 0.38, y0, y0 + h, z - 0.26, z + 0.26);
  F.box(M.brick, x - 0.46, x + 0.46, y0 + h, y0 + h + 0.12, z - 0.34, z + 0.34);
  F.box(M.stoneDark, x - 0.5, x + 0.5, y0 + h + 0.12, y0 + h + 0.2, z - 0.38, z + 0.38);
  for (const s of [-1, 1]) { const g = new THREE.CylinderGeometry(0.09, 0.12, 0.42, 8); g.translate(x + s * 0.2, y0 + h + 0.41, z); F.geo(M.terracotta, g); }
}
// rusticated quoins down a corner (alternating long/short blocks)
export function quoins(F, mat, x, y0, y1, s) {
  for (let y = y0, k = 0; y < y1 - 0.3; y += 0.36, k++) { const l = k % 2 ? 0.34 : 0.52; F.box(mat, s < 0 ? x : x - l, s < 0 ? x + l : x, y + 0.02, y + 0.33, 0, 0.05); }
}

// ---------- lot setup + dispatch ----------
const JOINS = ['joinPlum', 'joinTeal', 'joinGreen', 'joinRed', 'joinNavy'];
// opts.exposed: [{ end: -1|1 (local -x / +x side), from: height the wall is exposed above }]
export function buildStorefront(ctx, F, lot, opts = {}) {
  const { M } = ctx, S = sfMats(M), seed = lot.seed ?? (lot.id.charCodeAt(0) * 31 + lot.id.charCodeAt(1)), r = mulberry(seed * 7919 + 17);
  DMGK = lot.dmg ?? 1;
  const w = lot.z1 - lot.z0, tone = lot.paint.slice(5), plaster = M[lot.paint], clap = M['clap' + tone] || plaster;
  const join = M[lot.join || JOINS[seed % JOINS.length]];
  const L = { lot, w, hw: w / 2 - 0.01, d: opts.depth ?? 6, r, seed, join, trim: M.trimCream, signFrame: join, exposed: opts.exposed || [] };
  L.body = lot.style === 'B' && tone !== 'Brick' ? clap : plaster;
  L.sideMat = tone === 'Brick' ? plaster : lot.style === 'B' ? clap : plaster;
  L.pilMat = tone === 'Cream' ? join : M.trimCream;
  const top = lot.style === 'A' ? styleA(ctx, F, M, S, L) : lot.style === 'B' ? styleB(ctx, F, M, S, L) : styleC(ctx, F, M, S, L);
  return { top };
}

// ---------- C: two-storey Italianate false front: tall segmental windows with bracketed caps, deep bracketed
// cornice with dentils, a parapet with a pediment hiding a low roof ----------
function styleC(ctx, F, M, S, L) {
  const { hw, w, d, r, trim, lot } = L, GF = SF.GF, E = lot.h - 1.0, par = lot.h + 0.25;
  L.floors = [GF]; L.eaves = E;
  shell(F, M, S, L);
  shopfront(F, M, S, L, { door: lot.flip ? 'left' : 'right' });
  signBoard(ctx, F, L, { shape: 'board', w: Math.min(w - 1.3, 4.4), h: 0.78, y: GF - 1.18, z: 0.05 });
  const n = w >= 5.6 ? 3 : 2, ww = 0.92, gap = (w - 0.9 - n * ww) / (n + 1), y0 = GF + 0.7, spring = Math.min(E - 1.05, y0 + 1.9), seg = 0.16;
  const ops = []; for (let i = 0; i < n; i++) { const x0 = -hw + 0.45 + gap + i * (ww + gap); ops.push({ x0, x1: x0 + ww, y0, spring, seg }); }
  F.geo(L.body, slab(-hw, hw, GF, par, ops));
  for (const o of ops) sash(F, M, S, o, { frame: L.join, trim, hood: 'cap', bars: [2, 1], dmg: pickDmg(r), r, blind: r() < 0.6 });
  for (const s of [-1, 1]) quoins(F, trim, s * hw, GF, E - 0.75, s < 0 ? -1 : 1);
  // frieze, dentils, brackets and the cornice
  F.box(trim, -hw, hw, E - 0.75, E, 0, 0.04);
  for (let x = -hw + 0.12; x < hw - 0.1; x += 0.17) F.box(trim, x, x + 0.07, E - 0.14, E, 0.04, 0.12);
  const bx = [-hw + 0.2, ...ops.slice(1).map((o, i) => (ops[i].x1 + o.x0) / 2), hw - 0.2];
  for (const x of bx) for (const k of [-0.09, 0.09]) bracket(F, trim, x + k, E - 0.72, 0.72, 0.44, 0.09);
  F.geo(trim, molding(P.cornice(0.95), -hw - 0.12, hw + 0.12, E, 0));
  // parapet: panelled band, coping, and a pediment (triangular or segmental by seed)
  const pe = E + 0.53;
  if (par - pe > 0.35) { F.box(trim, -hw + 0.4, hw - 0.4, pe + 0.12, par - 0.32, 0, 0.03); F.box(L.body, -hw + 0.5, hw - 0.5, pe + 0.2, par - 0.4, 0, 0.045); }
  F.geo(trim, molding(P.cornice(0.42), -hw - 0.05, hw + 0.05, par - 0.24, 0));
  const pw = Math.min(w * 0.5, 3.0), round = r() < 0.5, pg = pediment(0, par - 0.02, pw, { h: round ? 0.7 : 0.85, d: 0.24, round });
  F.geo(trim, pg);
  if (!round) { const sh = new THREE.Shape([new THREE.Vector2(-pw / 2 + 0.25, 0), new THREE.Vector2(pw / 2 - 0.25, 0), new THREE.Vector2(0, 0.7)]); const g = new THREE.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: false }); g.translate(0, par - 0.02, -0.2); F.geo(L.body, g); }
  for (const s of [-1, 1]) { const g = new THREE.CylinderGeometry(0.1, 0.14, 0.32, 10); g.translate(s * (hw - 0.15), par + 0.16, -0.1); F.geo(trim, g); const b2 = new THREE.SphereGeometry(0.13, 10, 6); b2.translate(s * (hw - 0.15), par + 0.42, -0.1); F.geo(trim, b2); }
  // low roof behind the false front, tar-dark, with a chimney
  F.box(M.stoneDark, -hw, hw, E, E + 0.08, -d, -SF.T);
  F.box(L.sideMat, -hw, hw, E, E + 0.5, -d, -d + 0.25);
  if (r() < 0.7) chimney(F, M, (r() - 0.5) * (w - 1.5), -d + 1.2, E, 1.4 + r() * 0.6);
  return par + (round ? 0.7 : 0.85);
}

// ---------- B: 2½-storey front gable in clapboard: canted oriel bay over the shop, sash windows with little
// pediments, steep shingle roof, fretted bargeboards with a king post and a spike finial ----------
const tri = (F, mat, pts) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3)); g.computeVertexNormals(); F.geo(mat, g); };
function styleB(ctx, F, M, S, L) {
  const { hw, w, d, r, trim, lot } = L, GF = SF.GF, E = Math.max(7.0, lot.h - 2.9), ov = 0.4, a = Math.atan2(hw * 1.15, hw), rise = hw * 1.15, apex = E + rise;
  L.floors = [GF]; L.eaves = E;
  shell(F, M, S, L);
  shopfront(F, M, S, L, { door: lot.flip ? 'left' : 'right' });
  signBoard(ctx, F, L, { shape: 'arch', w: Math.min(w - 1.3, 3.6), h: 1.0, y: 2.95, z: 0.3 });
  // front wall + gable as one slab with the bay opening, a side window (wide lots) and the attic window
  const side = w >= 5.6, bw = Math.min(2.5, w - (side ? 2.9 : 1.4)), bx = side ? (lot.flip ? hw - 0.7 - bw / 2 : -hw + 0.7 + bw / 2) : 0;
  const ops = [{ x0: bx - bw / 2 + 0.08, x1: bx + bw / 2 - 0.08, y0: GF + 0.95, spring: GF + 2.6, seg: -1 }];
  const swx = side ? (lot.flip ? -hw + 1.25 : hw - 1.25) : 0, sw = { x0: swx - 0.45, x1: swx + 0.45, y0: GF + 0.85, spring: GF + 2.6, seg: 0.12 };
  if (side) ops.push(sw);
  const att = { x0: -0.36, x1: 0.36, y0: E + 0.45, spring: E + Math.min(1.3, rise - 1.1), seg: 0 };
  if (rise > 2.1) ops.push(att);
  const sh = new THREE.Shape([[-hw, GF], [hw, GF], [hw, E], [0, apex], [-hw, E]].map(([x, y]) => new THREE.Vector2(x, y)));
  for (const o of ops) sh.holes.push(new THREE.Path(outlinePts(o).reverse().map(([x, y]) => new THREE.Vector2(x, y))));
  const fg = new THREE.ExtrudeGeometry(sh, { depth: SF.T, bevelEnabled: false, curveSegments: 1 }); fg.translate(0, 0, -SF.T); F.geo(L.body, fg);
  const bg = new THREE.ExtrudeGeometry(new THREE.Shape([[-hw, E - 0.01], [hw, E - 0.01], [0, apex]].map(([x, y]) => new THREE.Vector2(x, y))), { depth: 0.2, bevelEnabled: false }); bg.translate(0, 0, -d); F.geo(L.sideMat, bg);
  F.box(M.dark, -hw + 0.2, hw - 0.2, E - 0.1, E, -SF.CAV, -SF.T);
  if (side) sash(F, M, S, sw, { frame: L.join, trim, hood: 'pediment', bars: [2, 1], dmg: pickDmg(r), r, blind: r() < 0.6 });
  if (rise > 2.1) sash(F, M, S, att, { frame: L.join, trim, hood: 'arch', bars: [2, 1], dmg: pickDmg(r), r });
  for (const s of [-1, 1]) F.box(trim, s < 0 ? -hw : hw - 0.16, s < 0 ? -hw + 0.16 : hw, GF, E, 0, 0.05);   // corner boards
  F.geo(trim, molding(P.string(0.9), -hw, hw, E - 0.1, 0));
  // oriel bay: panelled base, three glazed facets with posts, fascia and a lean-to roof
  const p = 0.58, fw = bw - 0.8, ft = [[-bw / 2, 0], [-fw / 2, p], [fw / 2, p], [bw / 2, 0]], Fb = F.sub(bx, 0);
  const prism = (mat, pts, y0, y1, grow = 0) => { const s2 = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x * (1 + grow / bw), -(z + (z > 0 ? grow : 0))))); const g = new THREE.ExtrudeGeometry(s2, { depth: y1 - y0, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, y0, 0); Fb.geo(mat, g); };
  prism(trim, ft, GF + 0.1, GF + 0.24, 0.08); prism(L.body, ft, GF + 0.24, GF + 0.95); prism(trim, ft, GF + 0.95, GF + 1.02, 0.04);
  prism(trim, ft, GF + 2.6, GF + 2.9, 0.06); prism(trim, ft, GF + 2.9, GF + 2.98, 0.12);
  for (let i = 0; i < 3; i++) {
    const [x0, z0] = ft[i], [x1, z1] = ft[i + 1], len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(-(z1 - z0), x1 - x0), k = pickDmg(r, 1.2);
    const g = new THREE.PlaneGeometry(len - 0.08, 1.58); g.rotateY(ang); g.translate((x0 + x1) / 2 - Math.sin(ang) * 0.04, GF + 1.81, (z0 + z1) / 2 - Math.cos(ang) * 0.04); Fb.geo(S.glass[k === 3 ? 2 : k][i % 2], g, 'keep');
    const m = new THREE.BoxGeometry(len, 0.05, 0.05); m.rotateY(ang); m.translate((x0 + x1) / 2, GF + 2.2, (z0 + z1) / 2); Fb.geo(L.join, m);
    if (i === 1) for (const t of [-1, 1]) { const v = new THREE.BoxGeometry(0.05, 1.58, 0.05); v.translate(t * fw / 6, GF + 1.81, p - 0.04); Fb.geo(L.join, v); }
  }
  for (const [x, z] of ft) Fb.box(L.join, x - 0.06, x + 0.06, GF + 1.0, GF + 2.6, z - 0.06, z + 0.06);
  { const y0 = GF + 2.98, y1 = GF + 3.3, o = 0.14, P0 = [-bw / 2 - o, y0, 0], P1 = [-fw / 2 - o * 0.5, y0, p + o], P2 = [fw / 2 + o * 0.5, y0, p + o], P3 = [bw / 2 + o, y0, 0], W0 = [-bw / 2 - o, y1, 0], W1 = [bw / 2 + o, y1, 0];
    tri(Fb, M.slate, [P1, P0, W0, P1, W0, W1, P2, P1, W1, P3, P2, W1]); }
  for (const s of [-1, 1]) bracket(F, trim, bx + s * (bw / 2 - 0.15), GF - 0.35, 0.45, 0.42, 0.1);
  // roof: two shingle slopes with front/back overhang, ridge cap
  const run = hw + ov, len = run / Math.cos(a), cy = E + (rise - ov * Math.tan(a)) / 2 + 0.08;
  for (const s of [-1, 1]) { const g = new THREE.BoxGeometry(len, 0.12, d + 0.75); g.rotateZ(-s * a); g.translate(s * run / 2, cy, -d / 2 + 0.05); F.geo(M.shingle, g); }
  { const g = new THREE.BoxGeometry(0.22, 0.22, d + 0.8); g.rotateZ(Math.PI / 4); g.translate(0, apex + 0.12, -d / 2 + 0.05); F.geo(M.iron, g); }
  // bargeboards: fretted (scalloped lower edge) boards under the front verge, king post + collar, finial
  for (const s of [-1, 1]) {
    const up = [], lo = [], n = Math.ceil(len / 0.26);
    for (let i = 0; i <= n; i++) { const t = i / n, x = s * run * (1 - t), y = E - ov * Math.tan(a) + (rise + ov * Math.tan(a)) * t + 0.02; up.push([x, y]); lo.push([x, y - 0.26 - 0.09 * Math.abs(Math.sin(Math.PI * t * n))]); }
    const pts = s > 0 ? up.concat(lo.reverse()) : lo.concat(up.reverse());
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), { depth: 0.05, bevelEnabled: false }); g.translate(0, 0, ov - 0.08); F.geo(trim, g);
  }
  const ky = apex - rise * 0.42; F.box(trim, -0.05, 0.05, ky, apex - 0.1, 0.25, 0.32); F.box(trim, -(rise * 0.42) / Math.tan(a) - 0.1, (rise * 0.42) / Math.tan(a) + 0.1, ky - 0.07, ky, 0.25, 0.32);
  { const g = new THREE.CylinderGeometry(0.07, 0.04, 0.5, 8); g.translate(0, ky - 0.25, 0.29); F.geo(trim, g); }
  { const g = new THREE.LatheGeometry([[0, 0], [0.09, 0], [0.09, 0.12], [0.05, 0.2], [0.11, 0.36], [0.04, 0.52], [0.03, 0.9], [0.0, 1.15]].map(([x, y]) => new THREE.Vector2(x, y)), 8); g.translate(0, apex + 0.12, ov - 0.06); F.geo(M.iron, g); }
  if (r() < 0.8) chimney(F, M, (lot.flip ? -1 : 1) * hw * 0.42, -d + 1.0, apex - rise * 0.42 - 0.6, rise * 0.42 + 1.3);
  return apex + 1.2;
}

// ---------- A: three-storey mansard emporium: arched upper windows with keystones, French doors onto iron
// balconies either side of a crested shop board, pilaster strips, a deep bracketed cornice, slate mansard
// with arched dormers, iron cresting and corner finials ----------
function styleA(ctx, F, M, S, L) {
  const { hw, w, d, r, trim, lot } = L, GF = SF.GF, SH = 3.15 + (lot.h - 12.5) * 0.3, E = GF + 2 * SH, n = w >= 6 ? 3 : 2, cw = (w - 0.9) / n;
  L.floors = [GF, GF + SH]; L.eaves = E;
  shell(F, M, S, L);
  shopfront(F, M, S, L, { door: 'centre', pil: 0.42 });
  const cx = (i) => -hw + 0.45 + cw * (i + 0.5), mid = (n - 1) / 2;
  const sgW = Math.min(cw + 0.9, 3.4);
  signBoard(ctx, F, L, { shape: 'crest', w: sgW, h: 1.85, y: GF + 0.02, z: 0.2 });
  const ops = [], f2 = [], f3 = [], ww = 1.0;
  for (let i = 0; i < n; i++) {
    const centre = n === 3 && i === 1, y0 = centre ? GF + 2.1 : GF + 0.2, sp = centre ? Math.min(GF + SH - 0.7, y0 + 0.75) : GF + SH - 0.95;
    f2.push({ x0: cx(i) - ww / 2, x1: cx(i) + ww / 2, y0, spring: sp, seg: 0, door: !centre });
    const y3 = GF + SH + 0.65; f3.push({ x0: cx(i) - ww / 2, x1: cx(i) + ww / 2, y0: y3, spring: Math.min(E - 1.25, y3 + 1.5), seg: 0 });
  }
  ops.push(...f2, ...f3);
  F.geo(L.body, slab(-hw, hw, GF, E, ops));
  for (const o of f2) sash(F, M, S, o, { frame: L.join, trim, hood: 'arch', bars: o.door ? [2, 3] : [2, 1], dmg: pickDmg(r), r, blind: !o.door && r() < 0.5 });
  for (const o of f3) sash(F, M, S, o, { frame: L.join, trim, hood: 'arch', bars: [2, 2], dmg: pickDmg(r), r, blind: r() < 0.6 });
  // pilaster strips between the bays with simple capitals; string course at the third floor
  for (let i = 0; i <= n; i++) { const x = i === 0 ? -hw + 0.22 : i === n ? hw - 0.22 : -hw + 0.45 + cw * i; F.box(trim, x - 0.17, x + 0.17, GF, E - 0.85, 0, 0.07); F.box(trim, x - 0.22, x + 0.22, E - 1.0, E - 0.85, 0, 0.12); }
  F.geo(trim, molding(P.string(1), -hw, hw, GF + SH - 0.05, 0));
  // balconies on the outer bays: stone slab on consoles, iron railing on three sides
  for (const i of [0, n - 1]) {
    const e0 = i === 0 ? -hw + 0.25 : sgW / 2 + 0.14, e1 = i === 0 ? -sgW / 2 - 0.14 : hw - 0.25, x = (e0 + e1) / 2, bl = e1 - e0, dp = 0.85;
    F.box(trim, x - bl / 2, x + bl / 2, GF + 0.02, GF + 0.2, 0, dp);
    F.geo(trim, molding(P.string(0.7), x - bl / 2, x + bl / 2, GF + 0.02, dp - 0.08));
    for (const s of [-1, 1]) bracket(F, trim, x + s * (bl / 2 - 0.2), GF - 0.55, 0.57, dp - 0.05, 0.12);
    const front = ironRail(bl - 0.1); front.translate(x, GF + 0.2, dp - 0.08); F.geo(M.iron, front);
    for (const s of [-1, 1]) { const g = ironRail(dp - 0.1); g.rotateY(Math.PI / 2); g.translate(x + s * (bl / 2 - 0.05), GF + 0.2, dp / 2); F.geo(M.iron, g); }
  }
  // frieze, brackets, cornice
  F.box(trim, -hw, hw, E - 0.8, E, 0, 0.04);
  for (let x = -hw + 0.12; x < hw - 0.1; x += 0.17) F.box(trim, x, x + 0.07, E - 0.14, E, 0.04, 0.13);
  for (let i = 0; i <= n; i++) { const x = Math.max(-hw + 0.2, Math.min(hw - 0.2, -hw + 0.45 + cw * i)); for (const k of [-0.1, 0.1]) bracket(F, trim, x + k, E - 0.78, 0.78, 0.5, 0.1); }
  F.geo(trim, molding(P.cornice(1.1), -hw - 0.14, hw + 0.14, E, 0));
  // mansard: steep slate slope, low cap, dormers, cresting on the curb, corner finials
  const mb = E + 0.6, h1 = 2.5, i1 = 0.7, h2 = 0.55, md = d - SF.T + 0.1;
  { const g = mansardFront(w - 0.02, md, h1, i1, h2); g.translate(0, mb, -md / 2 + 0.1); F.geo(M.slate, g); }
  F.box(M.slate, -hw, hw, E + 0.55, mb, -d, 0.12);
  for (let i = 0; i < n; i++) {
    const x = cx(i), dw = 0.62, y0 = mb + 0.35, y1 = mb + 1.75, z = -0.18;
    const dsl = slab(x - dw, x + dw, y0, y1, [{ x0: x - 0.34, x1: x + 0.34, y0: y0 + 0.25, spring: y1 - 0.55, seg: 0 }], 0.2); dsl.translate(0, 0, z); F.geo(trim, dsl);
    F.box(L.sideMat, x - dw, x - dw + 0.08, y0, y1, z - 1.0, z - 0.2); F.box(L.sideMat, x + dw - 0.08, x + dw, y0, y1, z - 1.0, z - 0.2);
    F.box(M.interior, x - dw, x + dw, y0, y1, z - 1.0, z - 0.95);
    { const g = new THREE.PlaneGeometry(0.68, y1 - 0.55 - y0 - 0.25 + 0.34); g.translate(x, (y0 + 0.25 + y1 - 0.21) / 2, z - 0.12); F.geo(S.glass[Math.min(2, pickDmg(r))][1], g, 'keep'); }
    F.geo(trim, pediment(x, y1, dw * 2 + 0.25, { h: 0.5, d: 0.2 }).translate(0, 0, z));
    const rs = new THREE.Shape([[-dw - 0.1, 0], [dw + 0.1, 0], [0, 0.55]].map(([a, b]) => new THREE.Vector2(a, b))); const rg = new THREE.ExtrudeGeometry(rs, { depth: 1.0, bevelEnabled: false }); rg.translate(x, y1, z - 1.0); F.geo(M.slate, rg);
  }
  const cy = mb + h1, ci = i1 - 0.1, cr = ironCresting(w - 2 * i1); cr.translate(0, cy, 0.1 - i1 + 0.02); F.geo(M.iron, cr);
  for (const s of [-1, 1]) { const g = finial(); g.translate(s * (hw - i1 + 0.05), cy, 0.1 - ci); F.geo(M.iron, g); }
  if (r() < 0.9) chimney(F, M, (lot.flip ? -1 : 1) * (hw - 0.5), -d + 1.3, mb, h1 + h2 + 1.0);
  return cy + h2 + 0.9;
}
// mansard roof without the hidden back slope tweak: kit's mansard, re-exported for clarity
function mansardFront(w, d, h1, i1, h2) { return mansardG(w, d, h1, i1, h2); }

// ---------- ironwork (built along local x, base at y 0) ----------
// balcony railing: square bars, top and bottom rails, a scroll ring every third bar, a dog bar band at the foot
export function ironRail(len, h = 1.0, pitch = 0.13) {
  const parts = [], n = Math.max(2, Math.round(len / pitch)), bx = (sx, sy, sz, x, y) => { const g = new THREE.BoxGeometry(sx, sy, sz); g.translate(x, y, 0); parts.push(g); };
  for (let i = 0; i <= n; i++) {
    const x = -len / 2 + (i * len) / n; bx(0.022, h, 0.022, x, h / 2);
    if (i % 3 === 1 && i < n) { const c = new THREE.TorusGeometry(0.055, 0.009, 4, 10); c.translate(x + len / n / 2, h * 0.62, 0); parts.push(c); const c2 = new THREE.TorusGeometry(0.055, 0.009, 4, 10); c2.translate(x + len / n / 2, h * 0.28, 0); parts.push(c2); }
  }
  bx(len + 0.04, 0.05, 0.06, 0, h); bx(len, 0.03, 0.03, 0, 0.12); bx(len, 0.03, 0.03, 0, h * 0.45); bx(len, 0.03, 0.03, 0, h * 0.8);
  return merge(parts);
}
// roof cresting: rail with fleur spikes and little loops
export function ironCresting(len, h = 0.42, pitch = 0.24) {
  const parts = [], n = Math.max(2, Math.round(len / pitch)), bx = (sx, sy, sz, x, y, rz = 0) => { const g = new THREE.BoxGeometry(sx, sy, sz); g.rotateZ(rz); g.translate(x, y, 0); parts.push(g); };
  bx(len, 0.04, 0.04, 0, 0.03); bx(len, 0.025, 0.025, 0, h * 0.45);
  for (let i = 0; i <= n; i++) {
    const x = -len / 2 + (i * len) / n, tall = i % 2 === 0;
    bx(0.02, tall ? h : h * 0.65, 0.02, x, (tall ? h : h * 0.65) / 2);
    if (tall) bx(0.07, 0.07, 0.02, x, h + 0.02, Math.PI / 4);
    else { const c = new THREE.TorusGeometry(0.06, 0.008, 4, 10, Math.PI); c.translate(x, h * 0.45, 0); parts.push(c); }
  }
  return merge(parts);
}
export function finial(h = 1.1) { return new THREE.LatheGeometry([[0, 0], [0.1, 0], [0.1, 0.1], [0.05, 0.18], [0.12, 0.34], [0.05, 0.5], [0.03, 0.8], [0.07, 0.86], [0.02, 0.92], [0, h]].map(([x, y]) => new THREE.Vector2(x, y)), 8); }
