// Ashland building kit: every static piece is authored in a local "facade frame" (x along the wall, y up,
// z out of the wall toward the visitor), transformed into the world, given world-space box-projected UVs
// (so PBR textures keep a constant texel density on any shape) and merged per material.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _n = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();

// cubic projection in world space; density = texture repeats per metre
export function boxUV(g, density = 0.5) {
  if (g.index) g = g.toNonIndexed();
  const p = g.attributes.position, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i += 3) {
    _a.fromBufferAttribute(p, i); _b.fromBufferAttribute(p, i + 1); _c.fromBufferAttribute(p, i + 2);
    _n.subVectors(_c, _b).cross(_a.clone().sub(_b)).normalize();
    const ax = Math.abs(_n.x), ay = Math.abs(_n.y), az = Math.abs(_n.z);
    for (let k = 0; k < 3; k++) {
      const v = k === 0 ? _a : k === 1 ? _b : _c;
      let u, w;
      if (ay >= ax && ay >= az) { u = v.x; w = v.z; }
      else if (ax >= az) { u = v.z * Math.sign(_n.x || 1) * -1; w = v.y; }
      else { u = v.x * Math.sign(_n.z || 1); w = v.y; }
      uv[(i + k) * 2] = u * density; uv[(i + k) * 2 + 1] = w * density;
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

// Degenerate profile segments can yield NaN vertices; drop those triangles rather than poison a merged bucket.
function dropNaN(g) {
  const pos = g.attributes.position.array;
  let bad = false;
  for (let i = 0; i < pos.length; i++) if (pos[i] !== pos[i]) { bad = true; break; }
  if (!bad) return g;
  if (typeof window !== 'undefined') { (window.__nanGeo ??= []).push(new Error().stack.split('\n').slice(2, 5).join(' | ')); }
  const keep = [], n = g.attributes.position.count / 3;
  for (let t = 0; t < n; t++) { let ok = true; for (let j = t * 9; j < t * 9 + 9; j++) if (pos[j] !== pos[j]) { ok = false; break; } if (ok) keep.push(t); }
  if (!keep.length) return null;
  const out = new THREE.BufferGeometry();
  for (const [k, a] of Object.entries(g.attributes)) {
    const s = a.itemSize, arr = new Float32Array(keep.length * 3 * s);
    keep.forEach((t, i) => arr.set(a.array.subarray(t * 3 * s, t * 3 * s + 3 * s), i * 3 * s));
    out.setAttribute(k, new THREE.BufferAttribute(arr, s));
  }
  return out;
}

export class Builder {
  constructor() { this.buckets = new Map(); this.colliders = []; this.tris = 0; }
  // geo already in world space; uv: 'box' (default) keeps world density, 'keep' keeps authored UVs
  add(mat, geo, uv = 'box') {
    let g = geo.index ? geo.toNonIndexed() : geo;
    g = dropNaN(g);
    if (!g) return;
    if (!g.attributes.normal) g.computeVertexNormals();
    if (uv === 'box') g = boxUV(g, mat.userData.density ?? 0.5);
    if (uv === 'box' && mat.userData.swapUV) { const a = g.attributes.uv.array; for (let i = 0; i < a.length; i += 2) { const t = a[i]; a[i] = a[i + 1]; a[i + 1] = t; } }
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!this.buckets.has(mat)) this.buckets.set(mat, []);
    this.buckets.get(mat).push(g);
  }
  col(minX, maxX, minY, maxY, minZ, maxZ, o = {}) {
    const c = { minX, maxX, minY, maxY, minZ, maxZ, walk: !!o.walk, mat: o.surface || 'concrete', ...(o.top ? { top: o.top } : {}) };
    this.colliders.push(c); return c;
  }
  flush(scene, { noShadow = new Set() } = {}) {
    for (const [mat, geos] of this.buckets) {
      const merged = mergeGeometries(geos, false);
      const m = new THREE.Mesh(merged, mat);
      m.castShadow = !noShadow.has(mat) && !mat.transparent; m.receiveShadow = true;
      m.matrixAutoUpdate = false; m.updateMatrix();
      scene.add(m);
      this.tris += merged.attributes.position.count / 3;
    }
    this.buckets.clear();
  }
}

// A local frame on a wall: origin at (ox, 0, oz), rotY turns local +z (outward) into the world.
export class Frame {
  constructor(B, ox, oz, rotY, oy = 0) {
    this.B = B; this.m = new THREE.Matrix4().compose(new THREE.Vector3(ox, oy, oz), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY), new THREE.Vector3(1, 1, 1));
    this.rotY = rotY;
  }
  sub(x, z, rotY = 0, y = 0) { const f = new Frame(this.B, 0, 0, 0); f.m = this.m.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY), new THREE.Vector3(1, 1, 1))); f.rotY = this.rotY + rotY; return f; }
  geo(mat, g, uv = 'box') { g.applyMatrix4(this.m); this.B.add(mat, g, uv); return g; }
  // axis-aligned (in the frame) box by extents
  box(mat, x0, x1, y0, y1, z0, z1) { const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return this.geo(mat, g); }
  point(x, y, z) { return new THREE.Vector3(x, y, z).applyMatrix4(this.m); }
  // collider from frame extents (frames are always axis-aligned in 90° steps)
  col(x0, x1, y0, y1, z0, z1, o) {
    const a = this.point(x0, y0, z0), b = this.point(x1, y1, z1);
    return this.B.col(Math.min(a.x, b.x), Math.max(a.x, b.x), y0 + this.m.elements[13], y1 + this.m.elements[13], Math.min(a.z, b.z), Math.max(a.z, b.z), o);
  }
}

// ---------- profiles (closed polygons in (out, up) space) ----------
export const P = {
  // classical cornice: fascia, ovolo, corona with drip, cyma recta on top
  cornice: (s = 1) => scaleP([[0, 0], [0.06, 0], [0.06, 0.08], [0.12, 0.1], [0.16, 0.16], [0.18, 0.22], [0.42, 0.24], [0.44, 0.28], [0.42, 0.36], [0.5, 0.42], [0.56, 0.5], [0.58, 0.56], [0, 0.56]], s),
  string: (s = 1) => scaleP([[0, 0], [0.08, 0.02], [0.12, 0.06], [0.12, 0.14], [0.08, 0.18], [0, 0.2]], s),
  plinth: (s = 1) => scaleP([[0, 0], [0.22, 0], [0.22, 0.4], [0.16, 0.46], [0.12, 0.5], [0.08, 0.6], [0, 0.62]], s),
  sill: (s = 1) => scaleP([[0, 0], [0.04, 0], [0.04, 0.03], [0.1, 0.05], [0.12, 0.09], [0.12, 0.12], [0, 0.12]], s),
  rail: (s = 1) => scaleP([[0, 0], [0.16, 0], [0.18, 0.04], [0.16, 0.08], [0.14, 0.12], [0, 0.12]], s, true),
};
function scaleP(p, s, centre = false) { return p.map(([a, b]) => [centre ? (a - 0.08) * s : a * s, b * s]); }

// extrude a profile along local x from x0 to x1 (profile out = +z, up = +y)
export function molding(profile, x0, x1, y = 0, z = 0) {
  const sh = new THREE.Shape(profile.map(([o, u]) => new THREE.Vector2(o, u)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: x1 - x0, bevelEnabled: false, curveSegments: 1 });
  g.rotateY(-Math.PI / 2); // profile x -> +z, extrusion z -> -x
  g.translate(x1, y, z);
  return g;
}
// same, around a rectangle (cornice that wraps a pavilion): w x d footprint centred on the origin
export function moldingRing(profile, w, d, y) {
  const out = [];
  for (const [len, rot, ox, oz] of [[w, 0, 0, d / 2], [w, Math.PI, 0, -d / 2], [d, Math.PI / 2, w / 2, 0], [d, -Math.PI / 2, -w / 2, 0]]) {
    const pmax = Math.max(...profile.map((p) => p[0]));
    const g = molding(profile, -len / 2 - pmax, len / 2 + pmax, y, 0);
    g.rotateY(rot); g.translate(ox, 0, oz); out.push(g);
  }
  return merge(out);
}

// lathe from [r, y] pairs
export function lathe(pts, seg = 20, phi = Math.PI * 2) { const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y)), seg, 0, phi); return g; }

// classical column: torus base, fluted tapering shaft (entasis), capital with echinus + abacus
export function column(h, r, { flutes = 20, seg = 40, capital = 'doric' } = {}) {
  const parts = [];
  const base = lathe([[0, 0], [r * 1.42, 0], [r * 1.42, r * 0.22], [r * 1.3, r * 0.3], [r * 1.34, r * 0.42], [r * 1.24, r * 0.55], [r * 1.12, r * 0.62], [r * 1.16, r * 0.72], [r * 1.05, r * 0.8], [0, r * 0.8]], seg);
  parts.push(base);
  const sh0 = r * 0.8, sh1 = h - r * 1.3;
  const shaft = new THREE.CylinderGeometry(r, r, sh1 - sh0, seg + 8, 6, true);
  const p = shaft.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), t = Math.min(1, Math.max(0, (y + (sh1 - sh0) / 2) / (sh1 - sh0)));
    const a = Math.atan2(z, x), taper = 1 - 0.14 * Math.pow(t, 1.6) + 0.02 * Math.sin(t * Math.PI);
    const fl = flutes ? 1 - 0.045 * Math.pow(Math.abs(Math.cos(a * flutes / 2)), 0.6) : 1;
    const k = taper * fl;
    p.setXYZ(i, x * k, y, z * k);
  }
  shaft.translate(0, (sh0 + sh1) / 2, 0); shaft.computeVertexNormals(); parts.push(shaft);
  const rt = r * 0.86;
  const cap = capital === 'ionic' || capital === 'corinthian'
    ? lathe([[0, 0], [rt, 0], [rt * 1.08, r * 0.08], [rt, r * 0.14], [rt * 1.02, r * 0.3], [rt * 1.25, r * 0.65], [rt * 1.45, r * 0.9], [rt * 1.5, r * 0.98], [0, r * 0.98]], seg)
    : lathe([[0, 0], [rt, 0], [rt * 1.06, r * 0.08], [rt, r * 0.14], [rt * 1.05, r * 0.24], [rt * 1.3, r * 0.42], [rt * 1.38, r * 0.5], [0, r * 0.5]], seg);
  cap.translate(0, sh1, 0); parts.push(cap);
  const ab = new THREE.BoxGeometry(r * 2.7, r * 0.3, r * 2.7); ab.translate(0, h - r * 0.15, 0); parts.push(ab);
  if (capital === 'ionic') for (const s of [-1, 1]) { const v = new THREE.TorusGeometry(r * 0.26, r * 0.11, 8, 18); v.scale(1, 1, 2.6); v.translate(s * r * 1.1, sh1 + r * 0.62, 0); parts.push(v); }
  if (capital === 'corinthian') for (let k = 0; k < 8; k++) { const l = new THREE.SphereGeometry(r * 0.3, 8, 6); l.scale(1, 1.6, 0.6); const a = k / 8 * Math.PI * 2; l.translate(Math.cos(a) * rt * 1.18, sh1 + r * 0.42, Math.sin(a) * rt * 1.18); parts.push(l); }
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)).map(clean));
}
export function clean(g) { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); return g; }
export function merge(list) { return mergeGeometries(list.map((g) => clean(g.index ? g.toNonIndexed() : g))); }

// pilaster: flat column against a wall (projects `d` out of the wall)
export function pilaster(h, w, d = 0.16) {
  const parts = [];
  const b = new THREE.BoxGeometry(w * 1.3, 0.35, d + 0.08); b.translate(0, 0.175, (d + 0.08) / 2); parts.push(b);
  const b2 = new THREE.BoxGeometry(w * 1.18, 0.12, d + 0.05); b2.translate(0, 0.41, (d + 0.05) / 2); parts.push(b2);
  const s = new THREE.BoxGeometry(w, h - 0.95, d); s.translate(0, 0.47 + (h - 0.95) / 2, d / 2); parts.push(s);
  // two flutes as recessed strips (shallow boxes darker by AO from the normal map)
  const c1 = new THREE.BoxGeometry(w * 1.2, 0.14, d + 0.05); c1.translate(0, h - 0.41, (d + 0.05) / 2); parts.push(c1);
  const c2 = new THREE.BoxGeometry(w * 1.42, 0.2, d + 0.12); c2.translate(0, h - 0.1, (d + 0.12) / 2); parts.push(c2);
  const ec = new THREE.CylinderGeometry(w * 0.55, w * 0.5, 0.14, 16, 1, false, -Math.PI / 2, Math.PI); ec.translate(0, h - 0.27, d); parts.push(ec);
  return merge(parts);
}

// baluster (lathe vase) and a run of them with top/bottom rails
export function baluster(h = 0.82, r = 0.09) {
  return lathe([[0, 0], [r * 1.3, 0], [r * 1.3, h * 0.08], [r * 0.9, h * 0.12], [r * 0.8, h * 0.18], [r * 1.25, h * 0.38], [r * 1.1, h * 0.52], [r * 0.6, h * 0.66], [r * 0.5, h * 0.74], [r * 0.9, h * 0.8], [r * 1.25, h * 0.86], [r * 1.25, h], [0, h]], 10);
}
export function balustrade(len, { h = 1.0, pitch = 0.3, rail = 0.16 } = {}) {
  const parts = [], n = Math.max(1, Math.floor(len / pitch)), step = len / n, bh = h - rail - 0.12;
  const plinth = new THREE.BoxGeometry(len, 0.12, rail + 0.06); plinth.translate(0, 0.06, 0); parts.push(plinth);
  for (let i = 0; i < n; i++) { const b = baluster(bh, 0.075); b.translate(-len / 2 + step * (i + 0.5), 0.12, 0); parts.push(b); }
  const top = molding(P.rail(1.2), -len / 2, len / 2, h - rail, -0.1); parts.push(top);
  return merge(parts);
}

// arched opening outline (Shape path) — rect below springing line, semicircle or segmental head above
export function archPath(path, x0, x1, y0, ySpring, segmental = 0, cw = true) {
  const w = x1 - x0, cx = (x0 + x1) / 2, r = w / 2;
  const pts = [];
  pts.push([x0, y0], [x1, y0], [x1, ySpring]);
  const steps = 16;
  if (segmental > 0) { // flat arc of height `segmental`
    const R = (r * r + segmental * segmental) / (2 * segmental), cy = ySpring + segmental - R, a0 = Math.asin(r / R);
    for (let i = 1; i < steps; i++) { const a = a0 - (2 * a0 * i) / steps; pts.push([cx + Math.sin(a) * R, cy + Math.cos(a) * R]); }
  } else for (let i = 1; i < steps; i++) { const a = (i / steps) * Math.PI; pts.push([cx + Math.cos(a) * r, ySpring + Math.sin(a) * r]); }
  pts.push([x0, ySpring]);
  const list = cw ? pts : pts.slice().reverse();
  path.moveTo(list[0][0], list[0][1]); for (let i = 1; i < list.length; i++) path.lineTo(list[i][0], list[i][1]); path.closePath();
  return path;
}
// wall panel with openings (each {x0,x1,y0,spring,seg}) extruded `t` back from z=0
export function wallWithOpenings(x0, x1, y0, y1, openings, t = 0.45) {
  const s = new THREE.Shape(); s.moveTo(x0, y0); s.lineTo(x1, y0); s.lineTo(x1, y1); s.lineTo(x0, y1); s.closePath();
  for (const o of openings) s.holes.push(archPath(new THREE.Path(), o.x0, o.x1, o.y0, o.spring, o.seg || 0, false));
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 12 });
  g.translate(0, 0, -t);
  return g;
}
// moulded surround (architrave) following an arched opening: ring of width `w` projecting `d`
export function archSurround(x0, x1, y0, spring, { w = 0.18, d = 0.08, seg = 0 } = {}) {
  // one simple U-shaped polygon (outer arch out, inner arch back) so the opening stays open
  const arc = (a0, a1, y, sp, sg) => { const r = (a1 - a0) / 2, cx = (a0 + a1) / 2, pts = [], steps = 20;
    if (sg > 0) { const R = (r * r + sg * sg) / (2 * sg), cy = sp + sg - R, t0 = Math.asin(r / R); for (let i = 0; i <= steps; i++) { const a = -t0 + (2 * t0 * i) / steps; pts.push([cx + Math.sin(a) * R, cy + Math.cos(a) * R]); } }
    else for (let i = 0; i <= steps; i++) { const a = Math.PI - (i / steps) * Math.PI; pts.push([cx + Math.cos(a) * r, sp + Math.sin(a) * r]); }
    return [[a0, y], ...pts, [a1, y]]; };
  const outer = arc(x0 - w, x1 + w, y0, spring, seg ? seg + w * 0.3 : 0), inner = arc(x0, x1, y0, spring, seg).reverse();
  const s = new THREE.Shape(outer.concat(inner).map(([x, y]) => new THREE.Vector2(x, y)));
  return new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, curveSegments: 12 });
}
// keystone wedge at the crown of an arch
export function keystone(cx, y, h = 0.42, w0 = 0.2, w1 = 0.3, d = 0.14) {
  const s = new THREE.Shape([new THREE.Vector2(-w0 / 2, 0), new THREE.Vector2(w0 / 2, 0), new THREE.Vector2(w1 / 2, h), new THREE.Vector2(-w1 / 2, h)]);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(cx, y, 0); return g;
}
// triangular or segmental pediment over a window
export function pediment(cx, y, w, { h = 0.45, d = 0.22, round = false } = {}) {
  const s = new THREE.Shape();
  if (round) { s.moveTo(-w / 2, 0); for (let i = 0; i <= 16; i++) { const a = Math.PI - (i / 16) * Math.PI; s.lineTo(Math.cos(a) * w / 2, Math.sin(a) * h); } s.lineTo(w / 2, 0); s.lineTo(w / 2 - 0.12, 0); for (let i = 16; i >= 0; i--) { const a = Math.PI - (i / 16) * Math.PI; s.lineTo(Math.cos(a) * (w / 2 - 0.12), Math.sin(a) * (h - 0.1)); } s.closePath(); }
  else { s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath(); }
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1 });
  g.translate(cx, y, 0); return g;
}

// mansard roof over a w x d footprint: steep lower slope (h1, inset i1) then shallow cap (h2)
export function mansard(w, d, h1, i1, h2) {
  const hw = w / 2, hd = d / 2, ihw = hw - i1, ihd = hd - i1, top = Math.min(ihw, ihd) * 0.9;
  const v = [
    [-hw, 0, -hd], [hw, 0, -hd], [hw, 0, hd], [-hw, 0, hd],
    [-ihw, h1, -ihd], [ihw, h1, -ihd], [ihw, h1, ihd], [-ihw, h1, ihd],
    [-ihw + top * 0.6, h1 + h2, -ihd + top * 0.6], [ihw - top * 0.6, h1 + h2, -ihd + top * 0.6], [ihw - top * 0.6, h1 + h2, ihd - top * 0.6], [-ihw + top * 0.6, h1 + h2, ihd - top * 0.6],
  ];
  const f = [];
  const quad = (a, b, c, e) => f.push(a, b, c, a, c, e);
  quad(0, 4, 5, 1); quad(1, 5, 6, 2); quad(2, 6, 7, 3); quad(3, 7, 4, 0);
  quad(4, 8, 9, 5); quad(5, 9, 10, 6); quad(6, 10, 11, 7); quad(7, 11, 8, 4);
  quad(8, 11, 10, 9);
  const pos = []; for (const i of f) pos.push(...v[i]);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return g;
}
// ribbed onion-less dome (Beaux-Arts): drum, dome with ribs, lantern, finial
export function dome(r, { drumH = 1.2, h = r * 1.15, ribs = 12, lanternR = r * 0.18 } = {}) {
  const shell = [], stone = [];
  const prof = []; for (let i = 0; i <= 18; i++) { const a = (i / 18) * Math.PI / 2; prof.push([Math.cos(a) * r, drumH + Math.sin(a) * h]); }
  prof.unshift([r, drumH]);
  shell.push(lathe(prof, 40));
  for (let k = 0; k < ribs; k++) {
    const pts = []; for (let i = 0; i <= 14; i++) { const a = (i / 14) * Math.PI / 2 * 0.92; pts.push(new THREE.Vector3(Math.cos(a) * (r + 0.05), drumH + Math.sin(a) * (h + 0.05), 0)); }
    const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, r * 0.025, 5); tube.rotateY((k / ribs) * Math.PI * 2); shell.push(tube);
  }
  stone.push(lathe([[r * 1.06, 0], [r * 1.06, drumH * 0.15], [r, drumH * 0.2], [r, drumH * 0.85], [r * 1.1, drumH * 0.9], [r * 1.1, drumH], [0, drumH]], 40));
  // lantern: little colonnade + cap
  const ly = drumH + h - 0.05;
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; const c = new THREE.CylinderGeometry(lanternR * 0.12, lanternR * 0.14, lanternR * 2.2, 8); c.translate(Math.cos(a) * lanternR, ly + lanternR * 1.1, Math.sin(a) * lanternR); stone.push(c); }
  stone.push(lathe([[lanternR * 1.3, 0], [lanternR * 1.3, 0.1], [0, 0.1]], 16).translate(0, ly, 0));
  shell.push(lathe([[lanternR * 1.35, 0], [lanternR * 1.35, 0.12], [lanternR * 0.9, lanternR * 0.8], [lanternR * 0.25, lanternR * 1.2], [lanternR * 0.12, lanternR * 2.2], [0.02, lanternR * 3.2], [0, lanternR * 3.2]], 16).translate(0, ly + lanternR * 2.2, 0));
  return { shell: merge(shell), stone: merge(stone), top: ly + lanternR * 5.4 };
}

// wrought-iron railing: square bars with spear finials, two rails, scroll dogs every few bars
export function ironRailing(len, h = 1.1, pitch = 0.14) {
  const parts = [], n = Math.max(2, Math.round(len / pitch));
  for (let i = 0; i <= n; i++) {
    const x = -len / 2 + (i * len) / n;
    const b = new THREE.BoxGeometry(0.022, h, 0.022); b.translate(x, h / 2, 0); parts.push(b);
    const sp = new THREE.ConeGeometry(0.03, 0.12, 4); sp.rotateY(Math.PI / 4); sp.translate(x, h + 0.05, 0); parts.push(sp);
    if (i % 4 === 2) { const c = new THREE.TorusGeometry(0.06, 0.008, 5, 12); c.translate(x, h * 0.18, 0); parts.push(c); }
  }
  for (const y of [0.1, h - 0.12]) { const r = new THREE.BoxGeometry(len, 0.03, 0.04); r.translate(0, y, 0); parts.push(r); }
  return merge(parts);
}

// procedural dead tree: recursive tapered tubes with gnarl
export function deadTree(rand, { h = 8, r = 0.32, depth = 4 } = {}) {
  const parts = [];
  const grow = (o, dir, len, rad, d) => {
    const pts = [o.clone()], seg = 5; let p = o.clone(), dv = dir.clone();
    for (let i = 1; i <= seg; i++) { dv.add(new THREE.Vector3((rand() - 0.5) * 0.35, (rand() - 0.3) * 0.15, (rand() - 0.5) * 0.35)).normalize(); p = p.clone().addScaledVector(dv, len / seg); pts.push(p); }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.TubeGeometry(curve, seg * 2, 1, d > 2 ? 7 : 5, false);
    // taper along the tube
    const pa = tube.attributes.position, segs = seg * 2, rs = d > 2 ? 7 : 5;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs, c = curve.getPointAt(t), rr = rad * (1 - 0.65 * t);
      for (let j = 0; j <= rs; j++) { const k = i * (rs + 1) + j; const v = new THREE.Vector3(pa.getX(k), pa.getY(k), pa.getZ(k)).sub(c).multiplyScalar(rr).add(c); pa.setXYZ(k, v.x, v.y, v.z); }
    }
    tube.computeVertexNormals(); parts.push(tube);
    if (d <= 0) return;
    const nb = 2 + (rand() < 0.5 ? 1 : 0);
    for (let b = 0; b < nb; b++) {
      const t = 0.45 + rand() * 0.5, at = curve.getPointAt(t);
      const nd = dv.clone().add(new THREE.Vector3((rand() - 0.5) * 1.6, 0.25 + rand() * 0.6, (rand() - 0.5) * 1.6)).normalize();
      grow(at, nd, len * (0.55 + rand() * 0.2), rad * (1 - 0.65 * t) * 0.75, d - 1);
    }
  };
  grow(new THREE.Vector3(0, -0.3, 0), new THREE.Vector3(0, 1, 0), h * 0.45, r, depth);
  // root flare
  for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + rand(); const g = new THREE.ConeGeometry(r * 0.5, 1.2, 5); g.rotateZ(Math.PI / 2 - 0.35); g.translate(0.45, 0.05, 0); g.rotateY(a); parts.push(g); }
  return merge(parts);
}
