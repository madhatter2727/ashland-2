// MAIN STREET DRESSING (M3): lays out the street props (awnings, lamps + banners, benches, planters, bins, popcorn
// carts) and the street's own decay: sky-reflecting puddles in the setts, drifts of autumn leaves, and two dusty
// teddy bears slumped behind smashed display glass (Emporium W7, Souvenirs E1) — matted, one button eye gone.
import * as THREE from 'three';
import { mulberry } from '../../core/util.js';
import { weather } from './materials.js';
import { LOTS, STREET, lotFrame } from './mainstreet.js';
import { buildAwnings, buildStreetLamps } from './streetprops.js';
import { bench, planter, bin, popcornCart2, flushFlowers } from './streetfurniture.js';
import { leafTex } from './proptex.js';

const WK = STREET.walkY;
// carts (x, z, yaw, tipped): on the carriageway by the kerbs, the middle lane (|x| < 2.6) left clear
export const CARTS = [[-3.45, 21.6, Math.PI / 2 + 0.06, false], [3.45, -6.2, -Math.PI / 2 - 0.05, false], [-1.9, 9.6, -Math.PI / 2 + 0.35, true]];

// ---------- the bear: lumpy matted plush, slumped forward and to one side, one eye a loose thread ----------
function teddy(scene, M, at, yaw, seed) {
  const r = mulberry(seed), fur = new THREE.MeshStandardMaterial({ color: '#9a8262', roughness: 1 });
  weather(fur, { grime: 1, streaks: 0.4, wet: 0, height: 1.2, fade: 0.5 }); fur.userData.density = 1;
  // matted: bump the sphere vertices so the plush reads clumped and lumpy
  const blob = (rx, ry, rz) => { const g = new THREE.SphereGeometry(1, 14, 10); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = 1 + (r() - 0.5) * 0.12; p.setXYZ(i, p.getX(i) * rx * k, p.getY(i) * ry * k, p.getZ(i) * rz * k); } g.computeVertexNormals(); return g; };
  const bear = new THREE.Group(), mk = (g, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); bear.add(m); return m; };
  const muzzle = new THREE.MeshStandardMaterial({ color: '#8d7860', roughness: 1 }), black = new THREE.MeshStandardMaterial({ color: '#0c0b0a', roughness: 0.3 });
  mk(blob(0.13, 0.16, 0.11), fur, 0, 0.16, 0, 0.25);                           // body, slumped forward
  for (const s of [-1, 1]) mk(blob(0.055, 0.05, 0.1), fur, s * 0.08, 0.05, 0.1, 0, s * 0.3);            // legs out front
  mk(blob(0.045, 0.1, 0.045), fur, -0.14, 0.13, 0.04, 0, 0, -0.5);             // one arm hanging
  mk(blob(0.045, 0.1, 0.045), fur, 0.12, 0.2, 0.08, -1.2, 0, 0.3);             // the other flopped across
  const head = new THREE.Group(); head.position.set(0.02, 0.33, 0.04); head.rotation.set(0.55, 0.2, 0.42); bear.add(head);   // lolling
  const hm = (g, mat, x, y, z) => { const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); head.add(m); };
  hm(blob(0.1, 0.095, 0.09), fur, 0, 0, 0);
  for (const s of [-1, 1]) hm(blob(0.04, 0.04, 0.02), s < 0 ? fur : muzzle, s * 0.075, 0.075, -0.01);
  hm(blob(0.045, 0.035, 0.04), muzzle, 0, -0.025, 0.075); hm(blob(0.014, 0.01, 0.01), black, 0, -0.01, 0.112);
  hm(new THREE.SphereGeometry(0.014, 8, 6), black, -0.035, 0.025, 0.08);                                   // the one button eye
  hm(new THREE.CylinderGeometry(0.008, 0.008, 0.002, 8).rotateX(Math.PI / 2), black, 0.035, 0.025, 0.085);  // empty socket
  const thread = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.035, 0.025, 0.085), new THREE.Vector3(0.045, 0.0, 0.1), new THREE.Vector3(0.04, -0.04, 0.095)]), 6, 0.0025, 3);
  hm(thread, black, 0, 0, 0);
  bear.position.copy(at); bear.rotation.y = yaw; bear.scale.setScalar(1.35); bear.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  scene.add(bear);
}

// smashed display pane of an A lot (first pane of the left display window, as storefront.js picks it)
function heroPane(lot) { const hw = (lot.z1 - lot.z0) / 2 - 0.01, a = -hw + 0.55, d0 = -0.57, n = Math.max(1, Math.round((d0 - a) / 1.15)); return a + (d0 - a) / n / 2; }

export function buildStreetDress(ctx) {
  const { B, M, scene, rr } = ctx, k = STREET.walk, stats = {};
  buildAwnings(ctx);
  const lamps = buildStreetLamps(ctx);
  // furniture on the walks: bench + planter pairs (bench faces the street, back to the shops), bins by the lamps
  const flowers = { leaf: [], bloom: [] };
  const bx = k - 0.75;
  for (const [s, z] of [[-1, 27.4], [-1, 9.4], [-1, -9.2], [1, 21.6], [1, 4.6], [1, -10.4]]) bench(ctx, s * bx, WK, z, s < 0 ? Math.PI / 2 : -Math.PI / 2);
  for (const [s, z] of [[-1, 29.6], [-1, -3.9], [-1, 11.2], [1, 32.0], [1, 9.6], [1, -12.6]]) { planter(ctx, s * (k - 0.5), WK, z, Math.PI / 2, flowers); }
  for (const [s, z] of [[-1, 25.6], [-1, 3.3], [1, 27.6], [1, -8.0], [1, 14.6]]) bin(ctx, s * (lamps.kerbX + 0.1), WK, z);
  stats.flowerTris = flushFlowers(ctx, flowers);
  for (const [x, z, ry, tipped] of CARTS) popcornCart2(ctx, x, z, ry, { tipped });

  // teddy bears behind the broken glass
  for (const id of ['W7', 'E1']) {
    const lot = LOTS.find((l) => l.id === id), F = lotFrame(B, lot), u = heroPane(lot);
    F.box(M.boards, u - 0.24, u + 0.24, 0.32, 0.7, -0.62, -0.28);
    teddy(scene, M, F.point(u + 0.04, 0.7, -0.48), F.rotY + 0.25 * (id === 'W7' ? 1 : -1), id.charCodeAt(0) * 7);
  }

  // puddles: dark mirror pools in the dips of the setts (reflect the sky through the env map)
  const pm = new THREE.MeshStandardMaterial({ color: '#24272a', roughness: 0.03, metalness: 0.45, envMapIntensity: 0.85, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  const pg = [];
  for (const [x, z, rx, rz] of [[-1.3, 27.6, 1.7, 0.9], [2.4, 23.4, 0.9, 0.6], [0.6, 15.2, 1.1, 0.7], [-2.2, 4.6, 1.3, 0.8], [1.6, -3.4, 0.8, 0.55], [-1.0, -11.5, 1.4, 0.9], [3.4, 31.2, 0.6, 0.9], [-6.5, -17.5, 1.5, 1.0], [4.5, -22, 1.2, 0.8]]) {
    const pts = []; for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2, w = 0.75 + rr() * 0.4; pts.push(new THREE.Vector2(Math.cos(a) * rx * w, Math.sin(a) * rz * w)); }
    const g = new THREE.ShapeGeometry(new THREE.Shape(pts)); g.rotateX(-Math.PI / 2); g.translate(x, 0.012, z); pg.push(g);
  }
  for (const g of pg) { const m = new THREE.Mesh(g, pm); m.receiveShadow = true; m.renderOrder = 1; scene.add(m); }

  // autumn leaves: drifts in the gutters and against the shop plinths, a scatter across the setts
  const lt = leafTex(), quads = [0, 1, 2, 3].map((i) => { const g = new THREE.PlaneGeometry(0.11, 0.11); const uv = g.attributes.uv; for (let j = 0; j < uv.count; j++) uv.setX(j, (i + uv.getX(j)) / 4); g.rotateX(-Math.PI / 2); return g; });
  const lm = new THREE.MeshStandardMaterial({ map: lt, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 }), lists = [[], [], [], []], mx = new THREE.Matrix4(), q = new THREE.Quaternion();
  const leaf = (x, y, z) => { const s = 0.7 + rr() * 0.8; q.setFromEuler(new THREE.Euler((rr() - 0.5) * 0.4, rr() * 6.3, (rr() - 0.5) * 0.4)); lists[Math.floor(rr() * 4)].push(mx.compose(new THREE.Vector3(x, y + 0.01 + rr() * 0.01, z), q, new THREE.Vector3(s, 1, s)).clone()); };
  for (let i = 0; i < 520; i++) { const s = rr() < 0.5 ? -1 : 1, z = STREET.north + rr() * (STREET.south - STREET.north), t = rr();
    if (t < 0.45) leaf(s * (STREET.road - 0.05 - Math.pow(rr(), 2) * 0.6), 0, z);
    else if (t < 0.7) { if (STREET.blocks.some(([a, b]) => z > a && z < b)) leaf(s * (k - 0.05 - Math.pow(rr(), 2) * 0.5), WK, z); }
    else if (t < 0.9) leaf((rr() * 2 - 1) * (STREET.road - 0.4), 0, z);
    else leaf((rr() * 2 - 1) * 14, 0, -14 - rr() * 11); }
  lists.forEach((l, i) => { if (!l.length) return; const im = new THREE.InstancedMesh(quads[i], lm, l.length); l.forEach((m, j) => im.setMatrixAt(j, m)); im.receiveShadow = true; scene.add(im); });
  stats.leaves = lists.reduce((a, l) => a + l.length, 0);
  return stats;
}

// decay inputs for decayLayout: ivy down some facades, kerb-crack weeds, extra litter and the corn round the carts
export function streetDecay(rr) {
  const ivy = [];   // [x, y, z, w, h(neg = drape), yaw]: drapes from upper cornices, a climber up a pier
  for (const [id, u, top, w, h] of [['W1', 3.0, 9.6, 1.6, -4.2], ['W3', -1.6, 7.8, 1.2, -3.0], ['W7', 2.9, 10.4, 1.8, -5.0], ['E1', -3.1, 9.8, 1.4, -4.6], ['E2', 2.7, 7.2, 1.3, -2.8], ['E4', -2.2, 0, 1.0, 4.4], ['E6', 2.2, 7.4, 1.2, -3.2], ['W5', -1.9, 0, 0.9, 3.8]]) {
    const lot = LOTS.find((l) => l.id === id), zc = (lot.z0 + lot.z1) / 2, x = lot.side * (STREET.walk - 0.06);
    const z = zc + (lot.side < 0 ? -u : u);
    ivy.push([x, top || (h > 0 ? WK : 0), z, w, h, lot.side < 0 ? Math.PI / 2 : -Math.PI / 2]);
  }
  const tufts = [];
  for (let i = 0; i < 70; i++) { const s = rr() < 0.5 ? -1 : 1; tufts.push([s * (STREET.road + 0.02 + rr() * 0.2), STREET.north + rr() * (STREET.apron - STREET.north), 0.2 + rr() * 0.25, WK + 0.01]); }
  const spills = [[CARTS[2][0] + 0.7, CARTS[2][1] + 0.3, 1.2, 260], [CARTS[0][0] + 0.4, CARTS[0][1] + 1.0, 0.5, 30], [CARTS[1][0] - 0.4, CARTS[1][1] - 1.0, 0.5, 25]];
  return { ivy, tufts, spills, litter: [[-4.0, 4.0, 22, 33, 40], [-4.0, 4.0, -12, 10, 40]] };
}
