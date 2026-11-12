// ASHLAND — the arena. Same footprint, cover, gates and locked areas as Hordefall; the setting is a
// fairy-tale theme park: Ashland Castle and its fountain (north), Main Street, the hotels and the gate
// (south), the Midway halls and carousel (east), the Gardens and orangery (west), with the coaster's
// steel skeleton over the skyline. Built from Poly Haven CC0 PBR sets + scanned models (see CREDITS.md).
import * as THREE from 'three';
import { buildSkyline } from './skyline.js';
import { mulberry } from '../core/util.js';
import { AREAS } from '../tuning.js';
import { Builder, Frame, P, molding, moldingRing, lathe, merge, balustrade, column, ironRailing, deadTree, pilaster } from './park/kit.js';
import { makeMaterials, weather } from './park/materials.js';
import { buildCastle } from './park/castle.js';
import { Festive } from './park/festive.js';
import { buildEsplanade } from './park/esplanade.js';
import { buildMidway, buildCarousel, stall } from './park/midway.js';
import { buildGardens } from './park/gardens.js';
import { flushBulbs } from './park/showfront.js';
import { parkMap, popcornCart, fingerPost } from './park/themed.js';
import { buildDecay } from './park/decay.js';
import { buildMainStreet, STREET } from './park/mainstreet.js';

export const ARENA = { half: 36, cell: 1 };
export let PARK_MATS = null;

export function buildArena(scene, quality, A) {
  const B = new Builder();
  const colliders = B.colliders;
  const M = (PARK_MATS = makeMaterials(A));
  const H = ARENA.half, rr = mulberry(1337);
  const props = [];
  const UP = new THREE.Vector3(0, 1, 0);
  // place a scanned model: height = target height in metres (model is normalised: footprint centred, base on y)
  const propAt = (id, x, y, z, rotY = 0, height = 1, o = {}) => props.push({ id, m: new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(UP, rotY).multiply(o.q || new THREE.Quaternion()), new THREE.Vector3(1, 1, 1)), height, o });
  const lights = [], fires = [];
  const inArea = (x, z, m = 0.8) => AREAS.list.some(({ rect: [x0, z0, x1, z1] }) => x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m);
  const festive = new Festive(), anim = [];
  const ctx = { B, M, A, rr, scene, propAt, lights, quality, inArea, H, bulbs: [], festive, anim };

  // ---------- ground: wet herringbone brick, marble plaza, gardens of gravel and trampled beds ----------
  for (const m of [M.marbleFloor, M.gravel, M.leaves, M.mud, M.mossCobble, M.hubCobble, M.streetBrick, M.terracotta, M.inlayBlue]) { m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -2; }
  const plane = (mat, x0, x1, z0, z1, y = 0) => { const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, Math.max(1, Math.round((x1 - x0) / 6)), Math.max(1, Math.round((z1 - z0) / 6))); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2); B.add(mat, g); };
  plane(M.paving, -110, 110, -110, 110);
  colliders.push({ minX: -200, maxX: 200, minY: -1, maxY: 0, minZ: -200, maxZ: 200, walk: true, mat: 'concrete', ground: true });
  const ring = (mat, r0, r1, x, z, y) => { const g = new THREE.RingGeometry(r0, r1, 64, 1); g.rotateX(-Math.PI / 2); g.translate(x, y, z); B.add(mat, g); };
  // the castle square: colour-cobbles from the end of Main Street (z -14) to the castle, a terracotta and blue ring round the fountain
  plane(M.hubCobble, -20, 20, -35.9, -25, 0.002); plane(M.hubCobble, -14.5, 14.5, -25, -14, 0.002);
  ring(M.terracotta, 2.5, 3.6, 0, -30.4, 0.004); ring(M.inlayBlue, 3.6, 3.85, 0, -30.4, 0.004);
  const curb = (x0, x1, z0, z1, h = 0.12, mat = M.marbleTrim) => { for (const [a0, a1, b0, b1] of [[x0, x1, z0, z0 + 0.22], [x0, x1, z1 - 0.22, z1], [x0, x0 + 0.22, z0, z1], [x1 - 0.22, x1, z0, z1]]) { const g = new THREE.BoxGeometry(a1 - a0, h, b1 - b0); g.translate((a0 + a1) / 2, h / 2, (b0 + b1) / 2); B.add(mat, g); } };
  // Main Street: setts, gutters, kerbs, raised sidewalks and the storefront lots (park/mainstreet.js)
  const streetStats = buildMainStreet(ctx);
  // gardens (west): gravel walks with sunken lawn beds gone to mud and leaf litter
  plane(M.gravel, -35.9, -9.5, -26.8, 35.9, 0.003);
  for (const [x0, x1, z0, z1, mat] of [[-34, -23.5, 8.5, 20, M.mud], [-20.5, -11, 18.5, 33.5, M.leaves], [-34, -23.5, 23, 33.5, M.leaves], [-20.5, -11, 5, 15.5, M.mud], [-20.5, -15, -25, -11, M.leaves], [-34, -23.5, -25, -8.5, M.mud]]) {
    plane(mat, x0, x1, z0, z1, 0.006); curb(x0, x1, z0, z1, 0.16, M.stoneDark);
  }
  // midway (east): mossy setts in a ring round the carousel
  { const g = new THREE.CircleGeometry(5.6, 48); g.rotateX(-Math.PI / 2); g.translate(19.5, 0.004, 9); B.add(M.mossCobble, g); }

  // ---------- the four edges ----------
  buildCastle(ctx);
  buildEsplanade(ctx);
  // beyond the north and south gates: walled service courts (where the horde comes from), so the gate
  // arches frame the park's own faded stucco (stained, peeling, ivy-grown) and a failing lamp, not fog
  for (const F of [new Frame(B, 0, -36, 0), new Frame(B, 0, 36, Math.PI)]) {
    const z0 = -9.5, z1 = -19;
    F.box(M.stuccoCream, -11, 11, 0, 8.5, z1 - 0.8, z1);
    for (const s of [-1, 1]) F.box(M.stuccoCream, s * 11, s * 11.8, 0, 8.5, z1 - 0.8, z0);
    F.geo(M.castleTrim, molding(P.cornice(0.6), -11.8, 11.8, 8.5, z1));
    F.geo(M.castleTrim, molding(P.plinth(0.7), -11, 11, 0, z1));
    for (const x of [-7, 0, 7]) { F.box(M.castleTrim, x - 1.6, x + 1.6, 0, 4.6, z1 - 0.3, z1 + 0.05); F.box(M.shutter, x - 1.3, x + 1.3, 0.1, 4.0, z1 - 0.2, z1 + 0.1); }
    const lp = F.point(-3.5, 0, z1 + 0.6); propAt('street_lamp_02', lp.x, 0, lp.z, F.rotY, 4.6);
  }
  buildMidway(ctx);
  buildGardens(ctx);

  // spawn points just outside each gate
  const spawns = [];
  for (const [x, z] of [[0, -H], [0, H], [-H, 0], [H, 0]]) { const out = new THREE.Vector3(x, 0, z).normalize(); spawns.push(new THREE.Vector3(x + out.x * 6, 0, z + out.z * 6)); }

  // stone stairs with marble nosings
  const stairs = (x, z, dirX, dirZ, width, height, steps, mat = M.stone) => {
    const run = 0.5, rise = height / steps;
    for (let i = 0; i < steps; i++) {
      const h = rise * (i + 1), along = (steps - i - 0.5) * run, cx = x + dirX * along, cz = z + dirZ * along;
      if (dirX) B.col(cx - run / 2, cx + run / 2, 0, h, cz - width / 2, cz + width / 2, { walk: true }); else B.col(cx - width / 2, cx + width / 2, 0, h, cz - run / 2, cz + run / 2, { walk: true });
      const g = dirX ? new THREE.BoxGeometry(run, h, width) : new THREE.BoxGeometry(width, h, run); g.translate(cx, h / 2, cz); B.add(mat, g);
      const nx = cx + dirX * (run / 2 - 0.04), nz = cz + dirZ * (run / 2 - 0.04);
      const n = dirX ? new THREE.BoxGeometry(0.1, 0.05, width + 0.02) : new THREE.BoxGeometry(width + 0.02, 0.05, 0.1); n.translate(nx, h - 0.02, nz); B.add(M.marbleTrim, n);
    }
  };
  // ---------- boarded game stalls (old container footprints: cover + the climbable stack) ----------
  const stalls = [[-22.5, -8, 0, 0, 0, -1], [-22.5, -5.4, 0, 1, 0, 1], [-22.5, -8, 0, 2, 2.6, -1], [-17.5, 9.5, 0, 3, 0, 1], [20, -15, 1, 4, 0, 1], [8, -20, 0, 5, 0, -1], [-24, 22, 1, 6, 0, -1], [24, 24, 0, 7, 0, -1]];
  for (const [x, z, rot, i, y0, cs] of stalls) stall(ctx, x, z, rot, i, y0, cs);
  stairs(-19.45, -5.4, 1, 0, 2.2, 2.6, 10, M.boards);
  buildCarousel(ctx, 19.5, 9);
  // the park hub: a faded park guide by the way in, popcorn carts left where they stood, finger posts to the rides
  parkMap(ctx, -10.5, -17.2, 0.35);
  popcornCart(ctx, -3.3, 14, 0.15, 1); popcornCart(ctx, 3.3, -8.5, -2.9, 2); popcornCart(ctx, -6, -16.5, 2.0, 3, { tipped: true });
  const toward = (x, z, tx, tz) => Math.atan2(-(tz - z), tx - x);
  fingerPost(ctx, -5.3, 15.6, [['ASHLAND CASTLE', toward(-5.3, 15.6, 0, -36), '#2f63c4'], ['MIDWAY  ·  GAMES', toward(-5.3, 15.6, 30, 0), '#2f8a78'], ['THE GRAND WHEEL', toward(-5.3, 15.6, -64, -14), '#8a6a1c']]);
  fingerPost(ctx, -14, 0, [['SPLASH FLUME', toward(-14, 0, -29, 0), '#1f5b57'], ['IRON COMET', toward(-14, 0, 70, 0), '#5a1a14'], ['MAIN GATE', toward(-14, 0, 0, 40), '#3b2f5a']]);


  // ---------- stone planters gone wild (old jersey-barrier cover) ----------
  const blooms = [], tufts = [];
  const weedIds = ['weed_plant_02#weed_plant_02_a_LOD0', 'weed_plant_02#weed_plant_02_c_LOD0', 'weed_plant_02#weed_plant_02_e_LOD0', 'nettle_plant#nettle_plant_small_a_LOD0', 'nettle_plant#nettle_plant_small_b_LOD0', 'fern_02#fern_02_a', 'fern_02#fern_02_c'];
  const planter = (x, z, rot) => {
    const w = rot ? 0.6 : 3, d = rot ? 3 : 0.6;
    B.col(x - w / 2, x + w / 2, 0, 0.95, z - d / 2, z + d / 2);
    const F = new Frame(B, x, z, rot ? Math.PI / 2 : 0);
    F.box(M.stone, -1.45, 1.45, 0, 0.72, -0.27, 0.27);
    F.geo(M.marbleTrim, moldingRing(P.plinth(0.45), 2.9, 0.54, 0));
    F.geo(M.marbleTrim, moldingRing([[0, 0], [0.05, 0], [0.07, 0.06], [0.07, 0.2], [0, 0.23]], 2.96, 0.6, 0.72));
    F.box(M.mud, -1.38, 1.38, 0.72, 0.9, -0.22, 0.22);
    // gone wild: a leggy shrub, nettles and weeds, and a few dusty blooms hanging on
    { const p = F.point((rr() - 0.5) * 1.6, 0.88, 0); propAt('shrub_04', p.x, p.y, p.z, rr() * 6, 0.9 + rr() * 0.4); }
    for (const k of [-1.05, 0.15, 1.05]) { const p = F.point(k + (rr() - 0.5) * 0.3, 0.88, (rr() - 0.5) * 0.2); propAt(weedIds[Math.floor(rr() * 5)], p.x, p.y, p.z, rr() * 6, 0.45 + rr() * 0.4); }
    for (let k = 0; k < 14; k++) blooms.push(F.point((rr() - 0.5) * 2.7, 0.92 + rr() * 0.22, (rr() - 0.5) * 0.4));
    for (const e of [-1, 1]) for (let k = 0; k < 4; k++) { const p = F.point((rr() - 0.5) * 3.1, 0, e * (0.36 + rr() * 0.12)); tufts.push([p.x, p.z, 0.25 + rr() * 0.3]); }
  };
  [[-12, -19.8, 0], [12, -23.5, 0], [16.5, -10.5, 1], [-22, 2, 1], [23, -2, 1], [-27, -18, 0], [28, 16, 0], [17.5, 21, 1], [-10, -22.5, 1]]
    .forEach(([x, z, rot]) => planter(x, z, rot));

  // ---------- ride queue fencing (old crate cover spots): iron panels between brass-capped posts ----------
  const queueRail = (x, z, rot, len = 2.6) => {
    const F = new Frame(B, x, z, rot);
    const rail = ironRailing(len, 1.0, 0.12); F.geo(M.iron, rail);
    for (const u of [-len / 2, len / 2]) {
      const post = lathe([[0.075, 0], [0.075, 0.06], [0.05, 0.1], [0.045, 1.02], [0.07, 1.06], [0.075, 1.12], [0.05, 1.18], [0, 1.2]], 12);
      post.translate(u, 0, 0); F.geo(M.iron, post);
      const cap = new THREE.SphereGeometry(0.07, 12, 8); cap.translate(u, 1.22, 0); F.geo(M.brass, cap);
    }
    const top = new THREE.CylinderGeometry(0.03, 0.03, len, 10); top.rotateZ(Math.PI / 2); top.translate(0, 1.05, 0); F.geo(M.brass, top);
    const a = F.point(-len / 2 - 0.08, 0, -0.12), b = F.point(len / 2 + 0.08, 0, 0.12);
    B.col(Math.min(a.x, b.x), Math.max(a.x, b.x), 0, 1.15, Math.min(a.z, b.z), Math.max(a.z, b.z), { surface: 'metal' });
  };
  [[-14.8, -15.6, 0], [22.5, 17.5, 0], [16, -6, Math.PI / 2], [-19, 13.6, Math.PI / 2], [26, 6, 0], [-28.5, -6, Math.PI / 2], [4, -29, 0]]
    .forEach(([x, z, r]) => queueRail(x, z, r));

  // ---------- cast-iron lamp standards (4 real lights + unlit / dying ones along the walks) ----------
  const lampPost = (x, z, rot, lit, real) => {
    const post = lathe([[0.26, 0], [0.26, 0.12], [0.2, 0.18], [0.21, 0.5], [0.15, 0.58], [0.12, 0.9], [0.14, 1.0], [0.085, 1.1], [0.075, 3.4], [0.11, 3.48], [0.08, 3.56], [0.065, 4.3], [0.12, 4.38], [0, 4.4]], 16);
    post.translate(x, 0, z); B.add(M.iron, post);
    const arm = []; for (const s of [-1, 1]) { const c = new THREE.TorusGeometry(0.32, 0.025, 6, 16, Math.PI); c.rotateY(rot); c.translate(x + Math.sin(rot + s * Math.PI / 2) * 0.32, 4.05, z + Math.cos(rot + s * Math.PI / 2) * 0.32); arm.push(c); }
    const bar = new THREE.BoxGeometry(1.35, 0.05, 0.05); bar.rotateY(rot + Math.PI / 2); bar.translate(x, 4.36, z); arm.push(bar); B.add(M.iron, merge(arm));
    B.col(x - 0.2, x + 0.2, 0, 4.4, z - 0.2, z + 0.2, { surface: 'metal' });
    for (const s of [-1, 1]) {
      const hx = x + Math.sin(rot + Math.PI / 2) * 0.62 * s, hz = z + Math.cos(rot + Math.PI / 2) * 0.62 * s;
      propAt('Lantern_01', hx, 3.7, hz, rot, 0.62, { hang: true });
      if (lit && (s > 0 || lit > 1)) {
        const glow = null; // the bloom pass makes the halo from the bulb itself
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 4.2, 2.4) })); head.position.set(hx, 3.45, hz); scene.add(head);
        if (real && s > 0) { const L = new THREE.PointLight('#ffad52', 22, 20, 1.6); L.position.set(hx, 3.4, hz); scene.add(L); lights.push({ light: L, base: 22, flicker: 0.04, head }); }
        else lights.push({ light: { position: head.position, intensity: 0, color: new THREE.Color() }, base: 0, flicker: 0, head, glow, fake: true });
      }
    }
  };
  lampPost(-5.1, 5, 0, 2, true); lampPost(5.1, -5, Math.PI, 2, true); lampPost(-20, -26, 0, 1, true); lampPost(21, 20, Math.PI, 1, true);
  for (const [x, z, lit] of [[-5.1, -11, 1], [5.1, 12.5, 0], [-31, -7, 0], [-30, 15.5, 1], [-5.1, 28.6, 1], [5.1, 28.6, 0], [31, -10, 1], [30, 2.5, 0], [-5.1, 24, 0], [17, -27, 1], [-14.5, -27.5, 0]]) if (!inArea(x, z, 1)) lampPost(x, z, Math.abs(x) > Math.abs(z) && Math.abs(x) > 6 ? Math.PI / 2 : 0, lit, false);

  // ---------- iron braziers (the old burning barrels: same spots, same fire) ----------
  const brazier = (x, z) => {
    const bowl = lathe([[0, 0.55], [0.16, 0.56], [0.3, 0.62], [0.36, 0.72], [0.38, 0.86], [0.42, 0.9], [0.4, 0.93], [0.33, 0.9], [0.3, 0.8], [0.2, 0.7], [0, 0.68]], 20); bowl.translate(x, 0, z); B.add(M.iron, bowl);
    const legs = []; for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; const c = new THREE.CatmullRomCurve3([new THREE.Vector3(Math.cos(a) * 0.34, 0, Math.sin(a) * 0.34), new THREE.Vector3(Math.cos(a) * 0.22, 0.35, Math.sin(a) * 0.22), new THREE.Vector3(Math.cos(a) * 0.3, 0.62, Math.sin(a) * 0.3), new THREE.Vector3(Math.cos(a) * 0.4, 0.94, Math.sin(a) * 0.4)]); const t = new THREE.TubeGeometry(c, 10, 0.025, 5); t.translate(x, 0, z); legs.push(t); }
    B.add(M.iron, merge(legs));
    const coals = new THREE.CircleGeometry(0.3, 16); coals.rotateX(-Math.PI / 2); coals.translate(x, 0.84, z); B.add(M.dark, coals);
    colliders.push({ minX: x - 0.36, maxX: x + 0.36, minY: 0, maxY: 0.95, minZ: z - 0.36, maxZ: z + 0.36, walk: false, mat: 'metal' });
    const L = new THREE.PointLight('#ff6a1c', 14, 12, 1.8); L.position.set(x, 1.4, z); scene.add(L); lights.push({ light: L, base: 14, flicker: 0.35 });
    fires.push(new THREE.Vector3(x, 0.92, z));
  };
  brazier(-17.5, 17.2); brazier(14, -13); brazier(-18, -14); brazier(17, 14);

  // ---------- great stone urns + bronze busts along the edges (old parked-car cover) ----------
  const urn = (x, z) => {
    const p = merge([new THREE.BoxGeometry(1.3, 0.25, 1.3).translate(0, 0.125, 0), new THREE.BoxGeometry(1.0, 0.8, 1.0).translate(0, 0.65, 0), new THREE.BoxGeometry(1.2, 0.12, 1.2).translate(0, 1.11, 0)]); p.translate(x, 0, z); B.add(M.stone, p);
    const u = lathe([[0, 0], [0.32, 0], [0.34, 0.08], [0.2, 0.16], [0.17, 0.3], [0.3, 0.42], [0.58, 0.62], [0.66, 0.85], [0.6, 0.98], [0.7, 1.04], [0.66, 1.1], [0.5, 1.06], [0, 1.0]], 28); u.translate(x, 1.17, z); B.add(M.marble, u);
    B.col(x - 0.65, x + 0.65, 0, 1.35, z - 0.65, z + 0.65);
    propAt(rr() < 0.5 ? 'nettle_plant#nettle_plant_tall_b_LOD0' : 'shrub_04', x, 2.05, z, rr() * 6, 0.9 + rr() * 0.6);
  };
  for (const [x, z] of [[-20, 31.6], [-9, -31.7], [25, -31.6], [31.6, -25], [31.8, 11], [-31.6, 27], [-31.7, -12]]) if (!inArea(x, z)) urn(x, z);

  // ---------- litter: leaves, weeds through the paving, fallen boughs ----------
  // inside the locked areas: the Grotto's mossy rocks, ferns and a cut-glass chandelier gone dark; a saint
  // on the Clock Terrace pedestal (dressing only: kept against walls so the old colliders/nav still hold)
  { const rocks = ['rock_moss_set_01#rock_moss_set_01_rock01', 'rock_moss_set_01#rock_moss_set_01_rock03', 'rock_moss_set_01#rock_moss_set_01_rock05'];
    [[35.0, 28.2], [35.1, 30.4], [26.9, 29.5], [26.9, 33.8], [31.5, 35.1], [28.3, 35.1]].forEach(([x, z], i) => propAt(rocks[i % 3], x, 0, z, i * 1.7, 0.55 + (i % 3) * 0.2, { sx: 1.6 }));
    [[35.0, 29.2], [27.0, 31.2], [29.6, 35.0], [27.1, 35.0], [35.0, 31.6]].forEach(([x, z], i) => propAt(i % 2 ? 'fern_02#fern_02_b' : 'fern_02#fern_02_d', x, 0, z, i * 2.1, 0.7));
    propAt('Chandelier_01', 30.6, 3.88, 31.2, 0.3, 1.1, { hang: true });
    propAt('gothic_statue', -34.6, AREAS.list[0].roofY + 1.2, -34.6, Math.PI * 0.75, 1.7); }
  for (let i = 0; i < 50; i += 2) {
    let x, z; const side = Math.floor(rr() * 4), t = (rr() * 2 - 1) * (H - 3);
    if (i < 50) [x, z] = side === 0 ? [t, -H + 0.5 + rr() * 1.5] : side === 1 ? [t, H - 0.5 - rr() * 1.5] : side === 2 ? [-H + 0.5 + rr() * 1.5, t] : [H - 0.5 - rr() * 1.5, t];
    else { x = (rr() * 2 - 1) * (H - 3); z = (rr() * 2 - 1) * (H - 3); }
    if (inArea(x, z, 0.5) || (Math.abs(x) < 4 && Math.abs(z) > 30)) continue;
    if (colliders.some((c) => !c.ground && x > c.minX - 0.3 && x < c.maxX + 0.3 && z > c.minZ - 0.3 && z < c.maxZ + 0.3)) continue;
    propAt(weedIds[i % weedIds.length], x, 0, z, rr() * 6, 0.25 + rr() * 0.45);
  }
  propAt('dead_tree_trunk_02', -27, 0, -21.5, 0.4, 0.75); colliders.push({ minX: -29, maxX: -25, minY: 0, maxY: 0.7, minZ: -22.3, maxZ: -20.7, walk: false, mat: 'wood' });

  // ---------- years of neglect: ivy, grass in the cracks, litter, spilled popcorn, a tipped bin and a fallen bench ----------
  const decayStats = buildDecay(ctx, decayLayout(tufts, rr, inArea, colliders));
  { // a toppled litter bin, lid rolled off (dressing only, no collision; kept to the edges)
    for (const [x, z, a] of [[-33.6, 5.2, 0.6], [11.2, 33.3, 2.4], [-20.8, -33.7, -0.9]]) {
      const bin = lathe([[0.27, 0], [0.29, 0.04], [0.27, 0.08], [0.28, 0.85], [0.31, 0.9], [0.29, 0.94], [0.0, 0.94]], 18); bin.rotateZ(Math.PI / 2); bin.translate(0.47, 0.29, 0); bin.rotateY(a); bin.translate(x, 0, z); B.add(M.ironGreen, bin);
      const lid = new THREE.CylinderGeometry(0.33, 0.33, 0.05, 18); lid.rotateX(0.12); lid.translate(x + Math.cos(a) * 1.5, 0.03, z - Math.sin(a) * 1.5 + 0.3); B.add(M.ironGreen, lid);
    }
    // a bench pitched onto its back by the gardens wall, another on its side by a lodge porch
    const bench = (x, z, ry, tip) => { // park bench: green slats on cast-iron ends, built upright then tipped
      const wood = [], iron = [];
      for (let k = 0; k < 4; k++) wood.push(new THREE.BoxGeometry(1.8, 0.035, 0.09).translate(0, 0.45, -0.17 + k * 0.115));
      for (let k = 0; k < 3; k++) wood.push(new THREE.BoxGeometry(1.8, 0.09, 0.03).rotateX(-0.25).translate(0, 0.62 + k * 0.13, -0.27 - k * 0.032));
      for (const e of [-0.8, 0.8]) { iron.push(new THREE.BoxGeometry(0.05, 0.45, 0.05).translate(e, 0.225, 0.15), new THREE.BoxGeometry(0.05, 0.9, 0.05).rotateX(-0.25).translate(e, 0.43, -0.22), new THREE.BoxGeometry(0.05, 0.04, 0.52).translate(e, 0.43, -0.04)); }
      const T = new THREE.Matrix4().makeRotationY(ry).premultiply(new THREE.Matrix4().makeTranslation(x, 0, z)).multiply(tip);
      const gw = merge(wood).applyMatrix4(T), gi = merge(iron).applyMatrix4(T); gw.computeBoundingBox(); gi.computeBoundingBox();
      const dy = -Math.min(gw.boundingBox.min.y, gi.boundingBox.min.y); gw.translate(0, dy, 0); gi.translate(0, dy, 0); B.add(M.woodGreen, gw); B.add(M.ironGreen, gi);
    };
    bench(-33.3, 10.6, Math.PI / 2, new THREE.Matrix4().makeTranslation(0, 0.3, 0).multiply(new THREE.Matrix4().makeRotationX(-1.5)).multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.3)));
    bench(-13.4, 33.4, 0.1, new THREE.Matrix4().makeTranslation(0, 0.05, 0).multiply(new THREE.Matrix4().makeRotationX(1.45)).multiply(new THREE.Matrix4().makeTranslation(0, 0, -0.18)));
  }
  // flowers left in the planters: a few dusty, sun-faded blooms
  { const pal = ['#b9706a', '#cdb36e', '#ddd6c6', '#bf8a9e', '#8c7a9a', '#c99470'].map((c) => new THREE.Color(c));
    const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.075, 0), new THREE.MeshStandardMaterial({ roughness: 0.75 }), blooms.length), mx = new THREE.Matrix4();
    blooms.forEach((p, i) => { const s = 0.8 + rr() * 0.7; im.setMatrixAt(i, mx.compose(p, new THREE.Quaternion(), new THREE.Vector3(s, s * 0.7, s))); im.setColorAt(i, pal[Math.floor(rr() * pal.length)]); });
    im.castShadow = false; im.receiveShadow = true; scene.add(im); }
  B.flush(scene, { noShadow: new Set([M.interior, M.glass, M.marbleFloor, M.gravel, M.leaves, M.mud, M.paving, M.hubCobble, M.streetBrick, M.terracotta, M.inlayBlue]) });
  festive.flush(scene, M.woodCream);
  flushBulbs(scene, M, ctx.bulbs);

  // ---------- scanned models, instanced per mesh, weathered by the shared shader ----------
  const byKey = new Map();
  for (const p of props) { const k = p.id + (p.o.mat ? '@' + p.o.mat : ''); if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(p); }
  const box = new THREE.Box3(), Mx = new THREE.Matrix4(), wetted = new Set();
  let propTris = 0;
  for (const [key, list] of byKey) {
    const [idSub, matKey] = key.split('@'); const [id, sub] = idSub.split('#');
    const g = A.models[id]; if (!g) continue;
    g.scene.updateMatrixWorld(true);
    const root = sub ? g.scene.getObjectByName(sub) : g.scene; if (!root) { console.warn('missing node', key); continue; }
    box.setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const hang = list[0].o.hang;
    const off = new THREE.Matrix4().makeTranslation(-(box.min.x + box.max.x) / 2, hang ? -box.max.y : -box.min.y, -(box.min.z + box.max.z) / 2);
    root.traverse((o) => {
      if (!o.isMesh) return;
      let mat = matKey ? M[matKey] : o.material;
      if (!matKey && !wetted.has(mat)) { wetted.add(mat); if (!/leaf|leaves|fern|nettle|weed|shrub|glass/i.test(mat.name + ' ' + id)) weather(mat, { grime: 0.5, streaks: 0.4, wet: 0.5, height: 1.2 }); mat.userData.density = 1; }
      if (Object.keys(o.geometry.morphAttributes).length) { o.geometry = o.geometry.clone(); o.geometry.morphAttributes = {}; }
      const im = new THREE.InstancedMesh(o.geometry, mat, list.length);
      const lm = new THREE.Matrix4().multiplyMatrices(off, o.matrixWorld);
      list.forEach((p, i) => { const k = p.height / size.y, sx = p.o.sx ?? 1; im.setMatrixAt(i, Mx.copy(p.m).multiply(new THREE.Matrix4().makeScale(k * sx, k, k * sx)).multiply(lm)); });
      // small props and foliage skip the shadow pass (it re-renders every caster): only big silhouettes cast
      im.castShadow = list[0].height >= 1.6 && !/glass|leaf|leaves|fern|nettle|weed|shrub/i.test(mat.name + ' ' + id); im.receiveShadow = true;
      im.computeBoundingSphere(); scene.add(im);
      propTris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * list.length;
    });
  }

  // ---------- skyline: the coaster's skeleton, dead woods, far park towers ----------
  const sky = buildSkyline(scene, M);
  const realLights = lights.filter((l) => !l.fake);
  return { anim: (dt, t) => { for (const f of anim) f(dt, t); }, colliders, spawns, lights: realLights, glows: lights.filter((l) => l.fake), fires, nav: buildNav(colliders), stats: { streetTris: Math.round(streetStats.tris), decayTris: decayStats.tris, decayInstances: decayStats.instances, parkTris: Math.round(B.tris), propTris: Math.round(propTris), facadeTris: Math.round(B.tris), skyline: { buildings: sky.count, tris: sky.tris, drawCalls: sky.drawCalls }, festiveTris: Math.round(festive.tris || 0) } };
}

// ---------- navigation grid: floor height per cell + blocked cells ----------
function buildNav(colliders) {
  const H = ARENA.half, N = H * 2;
  const height = new Float32Array(N * N), blocked = new Uint8Array(N * N);
  const margin = 0.35;
  for (let gz = 0; gz < N; gz++) for (let gx = 0; gx < N; gx++) {
    const x = gx - H + 0.5, z = gz - H + 0.5;
    let floor = 0, block = 0;
    for (const c of colliders) {
      if (c.ground || c.minY > 2.5) continue;
      if (x < c.minX - margin || x > c.maxX + margin || z < c.minZ - margin || z > c.maxZ + margin) continue;
      const inside = x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ;
      if (c.walk && inside) floor = Math.max(floor, c.maxY);
      else if (!c.walk) block = 1;
    }
    height[gz * N + gx] = floor; blocked[gz * N + gx] = block;
  }
  return { N, H, height, blocked };
}

// where the neglect shows: ivy up the castle, towers, gate, lodges and service courts; grass along every
// wall base, kerb and seam; litter blown along Main Street, the hub and the courtyard; popcorn spilled
// round the carts. All dressing: nothing here collides.
function decayLayout(tufts, rr, inArea, colliders) {
  const ivy = [];
  // castle front (faces +z at z -35.5) and tower faces
  for (const [x, w, h] of [[-40, 3.2, 8.5], [-31, 2.6, 6.5], [-22, 3.0, 9.5], [-17, 2.2, 5.5], [18, 2.8, 7.5], [24, 3.4, 10], [33, 2.4, 6], [41, 3.0, 8]]) ivy.push([x, 0, -35.45, w, h, 0]);
  for (const [x, z, h] of [[-38.5, -32.7, 11], [-14, -33.25, 8], [14.5, -32.4, 9.5], [37.5, -32.95, 12]]) ivy.push([x + (rr() - 0.5) * 0.6, 0, z, 2.2, h, 0]);
  // drapes hanging off the gatehouse and wing parapets
  for (const [x, y, z, w, h] of [[-4.5, 13.4, -35.25, 2.4, 4.6], [4.6, 13.4, -35.25, 1.8, 3.4], [-26, 11.1, -35.0, 3.0, 4.0], [29, 11.1, -35.0, 2.6, 3.2]]) ivy.push([x, y, z, w, -h, 0]);
  // lodges and gate pylons on the esplanade (face -z)
  for (const [x, w, h] of [[-10.5, 2.4, 6.5], [-16, 3.0, 9], [-23, 2.6, 7], [11, 2.2, 5.5], [17.5, 3.2, 9.5], [24, 2.4, 6]]) ivy.push([x, 0, 35.85, w, h, Math.PI]);
  for (const sx of [-1, 1]) ivy.push([sx * 5, 0, 34.65, 1.5, 5.2, Math.PI]);
  // service-court walls beyond both gates
  for (const [x, h] of [[-8.5, 7.5], [-2.5, 5], [4, 8.2], [9, 6]]) { ivy.push([x, 0, -54.95, 2.8, h, 0]); ivy.push([-x, 0, 54.95, 2.8, h, Math.PI]); }

  // grass and weeds: wall bases, kerbs, seams, basin foot, then random cracks in open paving
  const ok = (x, z) => !inArea(x, z, 0.3) && !colliders.some((c) => !c.ground && !c.walk && c.maxY > 0.2 && x > c.minX - 0.05 && x < c.maxX + 0.05 && z > c.minZ - 0.05 && z < c.maxZ + 0.05);
  const put = (x, z, s) => { if (ok(x, z)) tufts.push([x, z, s]); };
  for (let i = 0; i < 150; i++) { const x = (rr() * 2 - 1) * 35; if (Math.abs(x) > 3.2) put(x, -35.3 + rr() * 0.35, 0.3 + rr() * 0.45); }
  for (let i = 0; i < 120; i++) { const x = (rr() * 2 - 1) * 35; if (Math.abs(x) > 3.2) put(x, 35.3 - rr() * 0.35, 0.3 + rr() * 0.4); }
  // Main Street: grass in the gutters along the kerbs and up against the shop plinths (on the raised walk)
  const onWalk = (z) => STREET.blocks.some(([z0, z1]) => z > z0 + 0.3 && z < z1 - 0.3);
  for (let i = 0; i < 150; i++) { const sx = rr() < 0.5 ? -1 : 1, z = STREET.north + rr() * (STREET.south - STREET.north - 0.5); put(sx * (STREET.road - 0.05 - rr() * 0.3), z, 0.18 + rr() * 0.28); }
  for (let i = 0; i < 110; i++) { const sx = rr() < 0.5 ? -1 : 1, z = STREET.north + rr() * (STREET.apron - STREET.north); if (onWalk(z)) { const x = sx * (STREET.walk - 0.08 - rr() * 0.2); if (ok(x, z)) tufts.push([x, z, 0.2 + rr() * 0.3, STREET.walkY]); } }
  for (let i = 0; i < 40; i++) { const a = rr() * Math.PI * 2; put(Math.cos(a) * 2.68, -30.4 + Math.sin(a) * 2.68, 0.22 + rr() * 0.25); }
  for (let i = 0; i < 130; i++) { const x = (rr() * 2 - 1) * 34, z = (rr() * 2 - 1) * 34; put(x, z, 0.12 + rr() * 0.22); }

  // litter: down Main Street (carriageway and both walks), the alleys, the square, the courtyard
  const litterZones = [[-4.3, 4.3, -14, 35.4, 95], [-7.4, -4.8, -13.8, -2.7, 9, 0.15], [-7.4, -4.8, 2.7, 16.3, 11, 0.15], [-7.4, -4.8, 20.2, 33.3, 11, 0.15], [4.8, 7.4, -13.8, -2.7, 9, 0.15], [4.8, 7.4, 2.7, 16.3, 11, 0.15], [4.8, 7.4, 20.2, 33.3, 11, 0.15], [-13.4, 13.4, -2.4, 2.4, 14], [-13.4, 13.4, 16.6, 19.9, 10], [-14, 14, -24.5, -14.2, 20],
    [-19.5, 19.5, -35.3, -25.5, 55], [-34, 34, -34, 34, 70], [-8, 8, -54, -45, 18], [-8, 8, 45, 54, 18]];
  const spills = [[-6.6, -15.6, 1.5, 180], [-2.6, 14.6, 0.7, 45], [2.7, -9.0, 0.6, 35], [2, 22, 0.4, 14], [-3, -27.5, 0.5, 18]];
  return { ivy, tufts, litterZones, spills };
}
