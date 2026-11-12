// MAIN STREET FURNITURE (M3): iron + timber benches, weathered timber planters gone wild with flowers, green iron
// litter bins, and the striped POPCORN carts (glass case of stale corn, spoked wheels; one knocked over). Built in
// frame space and merged per material by the Builder; flowers are one InstancedMesh. All have colliders.
import * as THREE from 'three';
import { lathe, merge } from './kit.js';
import { awningGeo } from './streetprops.js';
import { awningTex, popcornSignTex } from './proptex.js';
import { weather } from './materials.js';

const UP = new THREE.Vector3(0, 1, 0);
const TRS = (x, y, z, ry) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(UP, ry), new THREE.Vector3(1, 1, 1));
// collider for a local box (cx ± hx, cz ± hz) under a yaw (90° multiples give exact boxes)
function colAt(B, T, hx, hz, h, y0 = 0) {
  const pts = [[-hx, -hz], [hx, -hz], [-hx, hz], [hx, hz]].map(([a, b]) => new THREE.Vector3(a, 0, b).applyMatrix4(T));
  const xs = pts.map((p) => p.x), zs = pts.map((p) => p.z), y = new THREE.Vector3().setFromMatrixPosition(T).y;
  B.col(Math.min(...xs), Math.max(...xs), y0, y + h, Math.min(...zs), Math.max(...zs));
}

// bench: three cast-iron scroll ends, five timber seat slats + three back slats. Faces local +z.
let BENCH = null;
function benchParts() {
  if (BENCH) return BENCH;
  const wood = [], iron = [];
  for (let k = 0; k < 4; k++) wood.push(new THREE.BoxGeometry(1.7, 0.035, 0.085).translate(0, 0.44, 0.17 - k * 0.1));
  for (let k = 0; k < 3; k++) wood.push(new THREE.BoxGeometry(1.7, 0.1, 0.03).rotateX(0.22).translate(0, 0.6 + k * 0.13, -0.24 - k * 0.03));
  for (const e of [-0.78, 0, 0.78]) {
    const leg = new THREE.CatmullRomCurve3([[0.2, 0], [0.22, 0.2], [0.18, 0.42], [0, 0.42], [-0.18, 0.42], [-0.22, 0.2], [-0.26, 0]].map(([z, y]) => new THREE.Vector3(e, y, z)));
    const back = new THREE.CatmullRomCurve3([[-0.18, 0.42], [-0.24, 0.6], [-0.29, 0.86], [-0.24, 0.96], [-0.2, 0.9]].map(([z, y]) => new THREE.Vector3(e, y, z)));
    iron.push(new THREE.TubeGeometry(leg, 18, 0.025, 5), new THREE.TubeGeometry(back, 12, 0.025, 5));
    if (e) { const arm = new THREE.CatmullRomCurve3([[-0.2, 0.62], [0.05, 0.66], [0.2, 0.62], [0.24, 0.52], [0.16, 0.48]].map(([z, y]) => new THREE.Vector3(e * 1.04, y, z))); iron.push(new THREE.TubeGeometry(arm, 12, 0.025, 5), new THREE.BoxGeometry(0.05, 0.2, 0.04).translate(e * 1.04, 0.52, 0.16)); }
  }
  BENCH = { wood: merge(wood), iron: merge(iron) };
  return BENCH;
}
export function bench(ctx, x, y, z, ry) {
  const { B, M } = ctx, P = benchParts(), T = TRS(x, y, z, ry);
  B.add(M.boards, P.wood.clone().applyMatrix4(T)); B.add(M.iron, P.iron.clone().applyMatrix4(T));
  colAt(B, T, 0.92, 0.3, 0.9);
}

// planter: timber trough on stone feet, iron corner straps, soil, then left to grow wild
export function planter(ctx, x, y, z, ry, flowers) {
  const { B, M, rr } = ctx, T = TRS(x, y, z, ry), L = 1.5, W = 0.62, H = 0.66;
  const wood = []; for (let k = 0; k < 3; k++) for (const s of [-1, 1]) { wood.push(new THREE.BoxGeometry(L, 0.2, 0.05).translate(0, 0.14 + k * 0.21, s * (W / 2 - 0.025)), new THREE.BoxGeometry(0.05, 0.2, W - 0.1).translate(s * (L / 2 - 0.025), 0.14 + k * 0.21, 0)); }
  wood.push(new THREE.BoxGeometry(L + 0.08, 0.05, 0.07).translate(0, H + 0.02, W / 2), new THREE.BoxGeometry(L + 0.08, 0.05, 0.07).translate(0, H + 0.02, -W / 2));
  B.add(M.boards, merge(wood).applyMatrix4(T));
  const iron = []; for (const sx of [-1, 1]) for (const sz of [-1, 1]) iron.push(new THREE.BoxGeometry(0.07, H - 0.06, 0.07).translate(sx * (L / 2 - 0.01), (H + 0.04) / 2 + 0.02, sz * (W / 2 - 0.01)));
  B.add(M.iron, merge(iron).applyMatrix4(T));
  B.add(M.stoneDark, merge([new THREE.BoxGeometry(0.2, 0.06, W).translate(-L / 2 + 0.15, 0.03, 0), new THREE.BoxGeometry(0.2, 0.06, W).translate(L / 2 - 0.15, 0.03, 0)]).applyMatrix4(T));
  B.add(M.mud, new THREE.BoxGeometry(L - 0.1, 0.04, W - 0.1).translate(0, H - 0.06, 0).applyMatrix4(T));
  colAt(B, T, L / 2 + 0.04, W / 2 + 0.04, 0.75);
  // overgrown: leafy mounds, blooms on stalks spilling over the edge
  for (let k = 0; k < 22; k++) flowers.leaf.push(new THREE.Vector3((rr() - 0.5) * (L - 0.1), H + 0.04 + rr() * 0.2, (rr() - 0.5) * (W - 0.05)).applyMatrix4(T));
  for (let k = 0; k < 34; k++) { const over = rr() < 0.25, u = (rr() - 0.5) * L, v = over ? (rr() < 0.5 ? -1 : 1) * (W / 2 + 0.05) : (rr() - 0.5) * W;
    flowers.bloom.push(new THREE.Vector3(u, over ? H - 0.1 - rr() * 0.25 : H + 0.12 + rr() * 0.32, v).applyMatrix4(T)); }
}

export function bin(ctx, x, y, z) {
  const { B, M } = ctx;
  const body = lathe([[0.22, 0], [0.26, 0.04], [0.25, 0.1], [0.27, 0.12], [0.26, 0.8], [0.29, 0.84], [0.27, 0.88], [0, 0.88]], 16); body.translate(x, y, z); B.add(M.ironGreen, body);
  const lid = lathe([[0.3, 0.88], [0.3, 0.92], [0.22, 1.0], [0.06, 1.04], [0.05, 1.1], [0, 1.12]], 16); lid.translate(x, y, z); B.add(M.ironGreen, lid);
  B.col(x - 0.3, x + 0.3, 0, y + 1.1, z - 0.3, z + 0.3);
}

// popcorn cart: red body with the POPCORN board, cream trim, a glass case on brass posts, striped canopy with a
// scalloped valance, two big spoked wheels + a castor at the push end. tipped: lying on its side, case smashed.
let CART = null;
export function popcornCart2(ctx, x, z, ry, { tipped = false } = {}) {
  const { B, M } = ctx;
  if (!CART) {
    CART = { canopy: new THREE.MeshStandardMaterial({ map: awningTex(0, 0), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.95 }), sign: new THREE.MeshStandardMaterial({ map: popcornSignTex(), roughness: 0.8 }) };
    weather(CART.canopy, { grime: 0.3, streaks: 0.3, wet: 0.2, height: 3 }); CART.canopy.userData.density = 1; CART.sign.userData.density = 1;
  }
  let T = TRS(x, 0, z, ry);
  if (tipped) T = T.multiply(new THREE.Matrix4().makeTranslation(0, 0.47, 0)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2 - 0.05));
  const add = (mat, list, uv) => B.add(mat, merge(list).applyMatrix4(T), uv);
  const L = 1.6, W = 0.86;
  add(M.woodRed, [new THREE.BoxGeometry(L, 0.62, W).translate(0, 0.78, 0)]);
  add(M.woodCream, [new THREE.BoxGeometry(L + 0.08, 0.07, W + 0.08).translate(0, 1.12, 0), new THREE.BoxGeometry(L + 0.08, 0.06, W + 0.08).translate(0, 0.46, 0),
    ...[-1, 1].flatMap((s) => [new THREE.BoxGeometry(0.06, 0.62, 0.06).translate(s * L / 2, 0.78, W / 2), new THREE.BoxGeometry(0.06, 0.62, 0.06).translate(s * L / 2, 0.78, -W / 2)])]);
  for (const s of [-1, 1]) { const g = new THREE.PlaneGeometry(1.2, 0.32); if (s < 0) g.rotateY(Math.PI); g.translate(0, 0.8, s * (W / 2 + 0.005)); add(CART.sign, [g], 'keep'); }
  const brass = [], glass = [];
  for (const [a, b] of [[-0.55, -0.32], [0.55, -0.32], [-0.55, 0.32], [0.55, 0.32]]) brass.push(new THREE.BoxGeometry(0.04, 0.72, 0.04).translate(a, 1.52, b));
  brass.push(new THREE.BoxGeometry(1.14, 0.05, 0.68).translate(0, 1.18, 0), new THREE.BoxGeometry(1.14, 0.05, 0.68).translate(0, 1.88, 0));
  for (const [a, b] of [[-0.76, -0.4], [0.76, -0.4], [-0.76, 0.4], [0.76, 0.4]]) brass.push(new THREE.CylinderGeometry(0.02, 0.02, 0.84, 6).translate(a, 1.56, b));
  brass.push(lathe([[0.05, 0], [0.08, 0.06], [0.02, 0.24], [0, 0.26]], 8).translate(0, 2.36, 0));
  add(M.brass, brass);
  if (!tipped) { glass.push(new THREE.BoxGeometry(1.08, 0.66, 0.62).translate(0, 1.53, 0)); add(M.glass, glass, 'keep'); }
  // stale corn heaped in the case (spilled out round it when tipped: see the decay spills)
  const corn = []; for (let k = 0; k < (tipped ? 25 : 80); k++) { const s = new THREE.IcosahedronGeometry(0.024 + ctx.rr() * 0.012, 0); s.translate((ctx.rr() - 0.5) * 1.0, 1.23 + ctx.rr() * 0.16 * ctx.rr(), (ctx.rr() - 0.5) * 0.56); corn.push(s); }
  add(M.popcorn, corn);
  // canopy: two pitched sheets back to back off a ridge along the cart, scalloped valances
  for (const s of [0, Math.PI]) { const g = awningGeo(L + 0.3, 0.6, 2.32, 2.0, 0.16, 0.03, 0, 8); g.rotateY(s); add(CART.canopy, [g], 'keep'); }
  // wheels: rim, tyre, 10 spokes, hub; axle; castor + push handle at -x
  const iron = [];
  for (const sz of [-1, 1]) { const zc = sz * (W / 2 + 0.07);
    iron.push(new THREE.TorusGeometry(0.4, 0.03, 6, 22).translate(0.38, 0.42, zc), new THREE.CylinderGeometry(0.07, 0.07, 0.08, 10).rotateX(Math.PI / 2).translate(0.38, 0.42, zc));
    for (let k = 0; k < 10; k++) iron.push(new THREE.BoxGeometry(0.018, 0.78, 0.018).rotateZ((k / 10) * Math.PI).translate(0.38, 0.42, zc)); }
  iron.push(new THREE.CylinderGeometry(0.025, 0.025, W + 0.2, 6).rotateX(Math.PI / 2).translate(0.38, 0.42, 0));
  iron.push(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 6).translate(-0.62, 0.24, 0), new THREE.TorusGeometry(0.08, 0.02, 5, 10).translate(-0.62, 0.08, 0));
  iron.push(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6).rotateZ(Math.PI / 2 - 0.5).translate(-0.98, 1.1, 0.3), new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6).rotateZ(Math.PI / 2 - 0.5).translate(-0.98, 1.1, -0.3), new THREE.CylinderGeometry(0.025, 0.025, 0.64, 6).rotateX(Math.PI / 2).translate(-1.2, 1.24, 0));
  add(M.iron, iron);
  const c = TRS(x, 0, z, ry);
  if (tipped) { const d = new THREE.Vector3(0, 0, 1).applyAxisAngle(UP, ry); colAt(B, TRS(x + d.x * 1.0, 0, z + d.z * 1.0, ry), L / 2 + 0.1, 1.25, 0.9); } else colAt(B, c, L / 2 + 0.25, W / 2 + 0.12, 1.2);
}

// one InstancedMesh each for leafy mounds and the blooms (dusty pinks, violet, white, gold)
export function flushFlowers(ctx, flowers) {
  const { scene, rr } = ctx, mx = new THREE.Matrix4(), q = new THREE.Quaternion();
  const out = [[flowers.leaf, new THREE.IcosahedronGeometry(0.11, 0), ['#3f5a2c', '#4d6a32', '#5a6e38', '#6b6a3a']], [flowers.bloom, new THREE.IcosahedronGeometry(0.05, 0), ['#c77fa6', '#a679b8', '#e7dcd2', '#d6a64a', '#b9506a', '#9b86c2']]];
  let tris = 0;
  for (const [list, geo, pal] of out) {
    if (!list.length) continue;
    const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.85 }), list.length), cols = pal.map((c) => new THREE.Color(c));
    list.forEach((p, i) => { const s = 0.7 + rr() * 0.8; q.setFromEuler(new THREE.Euler(rr() * 3, rr() * 3, 0)); im.setMatrixAt(i, mx.compose(p, q, new THREE.Vector3(s, s * 0.8, s))); im.setColorAt(i, cols[Math.floor(rr() * cols.length)]); });
    im.receiveShadow = true; scene.add(im); tris += geo.attributes.position.count / 3 * list.length;
  }
  return tris;
}
