// MAIN STREET (Ashland 2): a straight shop street on x = 0 from the south gate (z ≈ 36) to the castle square
// (z = -14). Worn grey setts on the carriageway with dark gutter setts, chamfered granite kerbs, raised brick
// sidewalks with a sandstone flag band along the kerb; two cross alleys (A at z = 0, lined up with the east/west
// horde gates, and B at z ≈ 18) cut through to the gardens and the midway.
// M1 = layout groundwork: the storefront lots are placeholder blocks (painted body, dark shop window, name
// board, a roof hint for the style) with one full-height collider each. M2 replaces `placeholderLot` with the
// three modular storefront styles, driven by the same LOTS table. See docs/MAINSTREET_PLAN.md.
import * as THREE from 'three';
import { Frame, P, molding, mansard } from './kit.js';
import { paintedSign } from './signs.js';
import { buildStorefront } from './storefront.js';

// cross-section (|x|, metres) and the blocks along z
export const STREET = {
  road: 4.5,        // carriageway half-width (kerb face)
  gutter: 0.35,     // gutter sett strip inside the kerb
  kerbW: 0.24, kerbH: 0.16,
  walk: 7.5,        // sidewalk outer edge = facade line
  walkY: 0.15,      // sidewalk surface height (walk colliders)
  depth: 6,         // lot depth behind the facade line
  south: 35.9,      // street runs from the gate ...
  north: -14,       // ... to the castle square
  apron: 33.5,      // last lot ends here; gate apron beyond
  blocks: [[20, 33.5], [2.5, 16.5], [-14, -2.5]],   // sidewalks + lots
  alleys: [[-2.5, 2.5], [16.5, 20]],                 // A (horde gates at z = 0), B
};

// style: A = 3-storey mansard emporium, B = 2½-storey front gable, C = 2-storey Italianate false front
// side: -1 west (facade faces +x), +1 east (faces -x). z0 < z1. h = placeholder eaves height.
export const LOTS = [
  { id: 'W1', side: -1, z0: 26.5, z1: 33.5, style: 'A', paint: 'paintCream', h: 12.5, name: 'ASHLAND CONFECTIONERY', sign: '#5a2440' },
  { id: 'W2', side: -1, z0: 20, z1: 26.5, style: 'C', paint: 'paintMustard', h: 9.0, name: 'KETTLE CORN CO.', sign: '#2f4a46' },
  { id: 'W3', side: -1, z0: 12, z1: 16.5, style: 'B', paint: 'paintTeal', h: 10.5, name: 'CLOCKWORK TOYS', sign: '#5a2440' },
  { id: 'W4', side: -1, z0: 7, z1: 12, style: 'C', paint: 'paintCoral', h: 8.5, name: 'PHOTOGRAPHS', sign: '#2f4a46' },
  { id: 'W5', side: -1, z0: 2.5, z1: 7, style: 'B', paint: 'paintPlum', h: 10.0, name: 'HAT & RIBBON', sign: '#3a2a4a' },
  { id: 'W6', side: -1, z0: -7.5, z1: -2.5, style: 'B', paint: 'paintMustard', h: 10.5, name: 'PENNY ARCADE', sign: '#5a2440' },
  { id: 'W7', side: -1, z0: -14, z1: -7.5, style: 'A', paint: 'paintTeal', h: 13.0, name: 'ASHLAND EMPORIUM', sign: '#5a2440' },
  { id: 'E1', side: 1, z0: 26.5, z1: 33.5, style: 'A', paint: 'paintCoral', h: 12.5, name: 'ASHLAND SOUVENIRS', sign: '#5a2440' },
  { id: 'E2', side: 1, z0: 20, z1: 26.5, style: 'B', paint: 'paintBrick', h: 10.5, name: 'CANDY & TREATS', sign: '#5a2440' },
  { id: 'E3', side: 1, z0: 12, z1: 16.5, style: 'C', paint: 'paintCream', h: 8.5, name: 'ICE CREAM PARLOUR', sign: '#2f4a46' },
  { id: 'E4', side: 1, z0: 7, z1: 12, style: 'B', paint: 'paintTeal', h: 10.0, name: 'THE LANTERN SHOP', sign: '#3a2a4a' },
  { id: 'E5', side: 1, z0: 2.5, z1: 7, style: 'C', paint: 'paintMustard', h: 9.0, name: 'ASHLAND GAZETTE', sign: '#2f4a46' },
  { id: 'E6', side: 1, z0: -7.5, z1: -2.5, style: 'C', paint: 'paintPlum', h: 8.5, name: 'MUSIC BOXES', sign: '#2f4a46' },
  { id: 'E7', side: 1, z0: -14, z1: -7.5, style: 'A', paint: 'paintCream', h: 13.0, name: 'STARLIGHT CINEMA', sign: '#5a2440' },
];

export function buildMainStreet(ctx) {
  const { B, M } = ctx, S = STREET;
  for (const m of [M.streetSett, M.gutterSett, M.walkBrick, M.walkFlag]) { m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -2; }
  const t0 = countTris(B);

  // ---------- carriageway: setts down the middle, gutters both sides; alleys and the gate apron in setts too ----------
  const flat = (mat, x0, x1, z0, z1, y) => { const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, Math.max(1, Math.round((x1 - x0) / 5)), Math.max(1, Math.round((z1 - z0) / 5))); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2); B.add(mat, g); };
  const gi = S.road - S.gutter;
  flat(M.streetSett, -gi, gi, S.north, S.south, 0.003);
  for (const s of [-1, 1]) flat(M.gutterSett, s < 0 ? -S.road : gi, s < 0 ? -gi : S.road, S.north, S.south, 0.004);
  for (const s of [-1, 1]) {
    const xa = s < 0 ? -S.walk - S.depth : S.road, xb = s < 0 ? -S.road : S.walk + S.depth;
    for (const [z0, z1] of S.alleys) flat(M.streetSett, xa, xb, z0, z1, 0.003);
    flat(M.streetSett, s < 0 ? -S.walk - S.depth : S.road, s < 0 ? -S.road : S.walk + S.depth, S.apron, S.south, 0.003);
  }

  // ---------- raised sidewalks: chamfered kerb along the road and round both ends, flag band, brick ----------
  // kerb section in (across, up): across = 0 at the road face, + toward the facade
  const kerbShape = () => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(S.kerbW, 0); s.lineTo(S.kerbW, S.kerbH); s.lineTo(0.035, S.kerbH); s.lineTo(0, S.kerbH - 0.035); s.closePath(); return s; };
  const kerbRun = (F, x0, x1) => { // along local x from x0 to x1, road face at local z = 0, kerb extends to -z
    const g = new THREE.ExtrudeGeometry(kerbShape(), { depth: x1 - x0, bevelEnabled: false, curveSegments: 1 });
    // shape x (across) -> local -z, shape y -> up, extrusion -> local x
    g.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0)));
    g.translate(x0, 0, 0); F.geo(M.kerb, g);
  };
  for (const s of [-1, 1]) for (const [z0, z1] of S.blocks) {
    // frame on the kerb face: local +z points into the road, local x runs along the kerb
    const F = new Frame(B, s * S.road, (z0 + z1) / 2, s < 0 ? Math.PI / 2 : -Math.PI / 2), L = z1 - z0, hl = L / 2;
    kerbRun(F, -hl, hl);
    // returns at both block ends (kerb turns the corner into the alley / square / apron)
    const across = S.walk - S.road;
    for (const e of [-1, 1]) { const R = F.sub(e * hl, -across / 2, e > 0 ? Math.PI / 2 : -Math.PI / 2); e > 0 ? kerbRun(R, -across / 2 + S.kerbW, across / 2) : kerbRun(R, -across / 2, across / 2 - S.kerbW); }
    // flag band along the kerb, brick behind it (local z: 0 .. -across)
    const top = (mat, a0, a1, b0, b1) => { const g = new THREE.PlaneGeometry(b1 - b0, a1 - a0, Math.max(1, Math.round((b1 - b0) / 5)), 1); g.rotateX(-Math.PI / 2); g.translate((b0 + b1) / 2, S.walkY, -(a0 + a1) / 2); F.geo(mat, g); };
    top(M.walkFlag, S.kerbW, 0.85, -hl + S.kerbW, hl - S.kerbW);
    top(M.walkBrick, 0.85, across, -hl + S.kerbW, hl - S.kerbW);
    // body under the walk, hidden by the kerb faces (fills the gap where a lot is set back or missing)
    B.col(s < 0 ? -S.walk : S.road, s < 0 ? -S.road : S.walk, 0, S.walkY, z0, z1, { walk: true });
  }

  // ---------- storefronts (M2, park/storefront.js): one collider per lot ----------
  for (const lot of LOTS) {
    if (!READY.has(lot.style)) { placeholderLot(ctx, lot); continue; }
    const F = lotFrame(B, lot), w = lot.z1 - lot.z0;
    const { top } = buildStorefront(ctx, F, lot, { depth: S.depth, exposed: exposure(lot) });
    F.col(-w / 2, w / 2, 0, top, -S.depth, 0.14, { surface: 'concrete' });
  }
  return { tris: countTris(B) - t0 };
}

const READY = new Set(['A', 'B', 'C']);
// which ends of a lot show a bare side wall: local -x / +x (west lots: -x is the z1 end; east lots: -x is z0),
// exposed from the ground at a block end, or above a lower neighbour
function exposure(lot) {
  const out = [];
  for (const end of [-1, 1]) {
    const atZ1 = (end < 0) === (lot.side < 0), z = atZ1 ? lot.z1 : lot.z0;
    const nb = LOTS.find((o) => o.side === lot.side && (atZ1 ? o.z0 === z : o.z1 === z));
    if (!nb) out.push({ end, from: 0 }); else if (nb.h < lot.h - 1.2) out.push({ end, from: nb.h });
  }
  return out;
}

// frame for a lot: origin at the facade centre on the facade line, local +z out into the street, x along the facade
export function lotFrame(B, lot) {
  return new Frame(B, lot.side * STREET.walk, (lot.z0 + lot.z1) / 2, lot.side < 0 ? Math.PI / 2 : -Math.PI / 2);
}

function placeholderLot(ctx, lot) {
  const { B, M, scene } = ctx, S = STREET;
  const F = lotFrame(B, lot), w = lot.z1 - lot.z0, hw = w / 2 - 0.03, d = S.depth, h = lot.h, body = M[lot.paint];
  const trim = lot.paint === 'paintCream' ? M.paintPlum : M.paintCream;
  F.col(-w / 2, w / 2, 0, h, -d, 0, { surface: 'concrete' });
  F.box(body, -hw, hw, 0, h, -d, 0);
  F.box(M.kerb, -hw - 0.02, hw + 0.02, 0, 0.5, -d, 0.06);                      // plinth
  F.box(M.interior, -hw + 0.5, hw - 0.5, 0.5, 3.1, -0.1, 0.012);               // shop window / door opening
  F.box(trim, -hw + 0.3, hw - 0.3, 3.1, 3.3, -0.05, 0.08);                     // transom rail
  F.geo(trim, molding(P.cornice(0.7), -hw - 0.05, hw + 0.05, h - 0.42, 0));    // eaves cornice
  // name board over the shop window
  const sw = Math.min(w - 0.9, 6.2), sm = new THREE.Mesh(new THREE.PlaneGeometry(sw, 0.78), new THREE.MeshStandardMaterial({ map: paintedSign(lot.name, { bg: lot.sign, fg: '#e2c27a', w: 1536, h: 192 }), roughness: 0.8 }));
  sm.position.copy(F.point(0, 3.85, 0.1)); sm.rotation.y = F.rotY; sm.castShadow = true; sm.receiveShadow = true; scene.add(sm);
  F.box(trim, -sw / 2 - 0.12, sw / 2 + 0.12, 3.38, 4.32, -0.02, 0.08);
  // upper-floor window openings so the storey count reads
  const floors = Math.max(1, Math.floor((h - 4) / 3.2)), bays = Math.max(2, Math.round(w / 2.2));
  for (let f = 0; f < floors; f++) for (let b = 0; b < bays; b++) {
    const x = -w / 2 + (b + 0.5) * (w / bays), y = 4.6 + f * 3.2;
    F.box(M.interior, x - 0.45, x + 0.45, y, y + 1.9, -0.1, 0.012);
    F.box(trim, x - 0.55, x + 0.55, y - 0.12, y, -0.05, 0.1);
  }
  // roof hint per style
  if (lot.style === 'A') { // slate mansard set on the eaves
    const g = mansard(w - 0.1, d - 0.2, 2.6, 0.7, 0.9); g.translate(0, h, -d / 2); F.geo(M.slate, g);
  } else if (lot.style === 'B') { // steep front gable facing the street
    const s = new THREE.Shape(); s.moveTo(-w / 2 - 0.25, 0); s.lineTo(0, w * 0.55); s.lineTo(w / 2 + 0.25, 0); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: d + 0.3, bevelEnabled: false }); g.translate(0, h, -d); F.geo(M.slate, g);
  } else { // flat roof behind a parapet with a pediment
    F.box(body, -hw, hw, h, h + 1.1, -0.35, 0);
    const s = new THREE.Shape(); s.moveTo(-1.4, 0); s.lineTo(0, 0.9); s.lineTo(1.4, 0); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.35, bevelEnabled: false }); g.translate(0, h + 1.1, -0.35); F.geo(trim, g);
    F.geo(trim, molding(P.cornice(0.5), -hw - 0.05, hw + 0.05, h + 1.0, 0));
  }
}

function countTris(B) { let n = 0; for (const geos of B.buckets.values()) for (const g of geos) n += g.attributes.position.count / 3; return n; }
