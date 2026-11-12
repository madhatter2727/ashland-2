// Ashland surface library: Poly Haven CC0 PBR sets (albedo / normal / AO-rough-metal), each given a world
// texel density for the box-projected UVs, plus one shared "weather" shader patch: soot and damp rising from
// the ground, rain streaks under ledges, moss on up-facing stone, wet sheen, flaking gold leaf, and rippling
// puddles on the paving. All of it keys off world position, so repeated pieces never look stamped.
import * as THREE from 'three';
import { pbr } from '../../assets.js';

export const RAIN = { time: { value: 0 }, wet: { value: 1 } };

const NOISE = /* glsl */ `
  float wh3(vec3 p){ return fract(sin(dot(p, vec3(17.13, 113.71, 51.37))) * 43758.5453); }
  float wn3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(wh3(i), wh3(i+vec3(1,0,0)), f.x), mix(wh3(i+vec3(0,1,0)), wh3(i+vec3(1,1,0)), f.x), f.y),
               mix(mix(wh3(i+vec3(0,0,1)), wh3(i+vec3(1,0,1)), f.x), mix(wh3(i+vec3(0,1,1)), wh3(i+vec3(1,1,1)), f.x), f.y), f.z); }
  float wfbm(vec3 p){ return wn3(p) * 0.5 + wn3(p * 2.03) * 0.28 + wn3(p * 4.1) * 0.14 + wn3(p * 8.3) * 0.08; }
  // cell-edge distance (F2 - F1) for crack networks in paving
  float wcell(vec2 p){ vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)); vec2 o = vec2(wh3(vec3(i + g, 1.0)), wh3(vec3(i + g, 2.0)));
      float d = length(g + o - f); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
    return d2 - d1; }`;

// DECAY: the park was beautiful and has stood empty for years (about 70% magic, 30% apocalypse). Every
// material's weathering is scaled by these before it is compiled; 1 = the material's own full value.
//   grime/streaks/moss/gild/puddles  dirt rising from the ground, rain and rust streaks, moss, lost gilt, standing water
//   fade/peel/rust/cracks            sun-bleached chalky paint, peeled patches, rust bleeding under fixtures, paving cracks
export const DECAY = { grime: 0.9, streaks: 0.9, moss: 0.7, gild: 0.6, puddles: 0.6, fade: 1, peel: 0.75, rust: 1, cracks: 1 };

export function weather(mat, o = {}) {
  const W = { grime: 0.7, streaks: 0.5, wet: 0.5, moss: 0, gild: 0, puddles: 0, height: 2.4, fade: 0, peel: 0, rust: 0, cracks: 0, mono: 0, peelCol: [0.24, 0.21, 0.17], peelScale: 2.0, ...o };
  for (const k of ['grime', 'streaks', 'moss', 'gild', 'puddles', 'fade', 'peel', 'rust', 'cracks']) W[k] *= DECAY[k];
  const pc = W.peelCol.map((v) => Number(v).toFixed(3)).join(', ');
  const f = (v) => Number(v).toFixed(3);
  mat.userData.weather = W;
  mat.customProgramCacheKey = () => 'ash-weather-' + JSON.stringify(W);
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uRainT = RAIN.time; sh.uniforms.uWet = RAIN.wet;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 wp4 = vec4(transformed, 1.0); vec3 wn3 = objectNormal;
        #ifdef USE_INSTANCING
          wp4 = instanceMatrix * wp4; wn3 = mat3(instanceMatrix) * wn3;
        #endif
        vWP = (modelMatrix * wp4).xyz; vWN = normalize(mat3(modelMatrix) * wn3);`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN; uniform float uRainT; uniform float uWet;' + NOISE)
      .replace('#include <map_fragment>', `${W.mono ? 'vec3 wTint = diffuseColor.rgb;' : ''}
        #include <map_fragment>
        ${W.mono ? `{ vec3 tx = diffuseColor.rgb / max(wTint, vec3(1e-4)); float l = dot(tx, vec3(0.2126, 0.7152, 0.0722)); l = ${f(W.avgL ?? 0.2)} + (l - ${f(W.avgL ?? 0.2)}) * ${f(W.con ?? 1)}; diffuseColor.rgb = wTint * mix(tx, vec3(l), ${f(W.mono)}); }` : ''}
        float wUp = clamp(vWN.y, 0.0, 1.0);
        float wN = wfbm(vWP * 0.35);
        float gildLoss = 0.0;
        {
          float h = vWP.y;
          float base = smoothstep(${f(W.height)}, 0.0, h + wN * 1.1) * 0.6;
          float st = wn3(vec3((vWP.x + vWP.z) * 2.7, h * 0.09, 3.0));
          float streak = smoothstep(0.6, 0.95, st) * (0.3 + 0.7 * wn3(vWP * 0.23)) * (1.0 - wUp) * ${f(W.streaks)};
          float blot = smoothstep(0.62, 0.86, wfbm(vWP * 0.17 + 5.0)) * 0.35;
          float g = clamp((base + streak * 0.5 + blot) * ${f(W.grime)}, 0.0, 0.85);
          diffuseColor.rgb *= 1.0 - g * vec3(0.7, 0.72, 0.74);
          ${W.rust > 0 ? `diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.36, 0.17, 0.07) * (0.7 + 0.5 * wn3(vWP * 3.0)), clamp(streak * ${f(W.rust)} * 1.4, 0.0, 0.7));` : ''}
          ${W.fade > 0 ? `{ float fl = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)); float fz = ${f(W.fade)} * (0.55 + 0.45 * wn3(vWP * 0.31 + 3.0)) * (0.6 + 0.4 * wUp + 0.4 * smoothstep(1.0, 6.0, h));
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(fl) * 0.78 + vec3(0.13, 0.125, 0.115), clamp(fz, 0.0, 0.8)); }` : ''}
          ${W.peel > 0 ? `{ float pn = wfbm(vWP * ${f(W.peelScale)} + 21.0) + wn3(vWP * 6.0) * 0.1; float a = ${W.peelA ? f(W.peelA) : `0.7 - ${f(W.peel)} * 0.13`};
            float pm = smoothstep(a, a + 0.008, pn), rim = smoothstep(a - 0.025, a, pn) - pm;
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(${pc}) * (0.75 + 0.5 * wn3(vWP * 9.0)), pm);
            diffuseColor.rgb *= 1.0 - 0.35 * rim; }` : ''}
          ${W.cracks > 0 ? `{ float ce = wcell(vWP.xz * 0.55); float cm = smoothstep(0.62, 0.42, wfbm(vec3(vWP.xz * 0.07, 9.0)));
            float cr = (1.0 - smoothstep(0.0, 0.035, ce)) * cm * ${f(W.cracks)};
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.06, 0.07, 0.03) + diffuseColor.rgb * 0.25, clamp(cr, 0.0, 0.9));
            float cg = (1.0 - smoothstep(0.0, 0.09, ce)) * cm * smoothstep(0.45, 0.7, wn3(vec3(vWP.xz * 0.9, 4.0))) * ${f(W.cracks)};
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.22, 0.07), clamp(cg * 0.7, 0.0, 0.7)); }` : ''}
          ${W.moss > 0 ? `float mo = smoothstep(0.52, 0.78, wfbm(vWP * 0.9 + 11.0) + wUp * 0.25 + smoothstep(1.2, 0.0, h) * 0.25) * ${f(W.moss)};
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.075, 0.095, 0.035) * (0.7 + 0.6 * wn3(vWP * 6.0)), clamp(mo, 0.0, 0.9));` : ''}
          ${W.gild > 0 ? `gildLoss = smoothstep(0.5, 0.56, wfbm(vWP * 2.2 + 7.0) + (1.0 - wUp) * 0.06 + smoothstep(3.0, 0.0, h) * 0.08) * ${f(W.gild)};
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.055, 0.04, 0.03), gildLoss);` : ''}
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        {
          float damp = (0.35 + 0.65 * wUp) * smoothstep(0.25, 0.75, wfbm(vWP * 0.21 + 2.0) + wUp * 0.2) * ${f(W.wet)} * uWet;
          roughnessFactor = mix(roughnessFactor, roughnessFactor * 0.35, damp);
          diffuseColor.rgb *= 1.0 - damp * 0.28;
          roughnessFactor = mix(roughnessFactor, 0.85, gildLoss);
        }`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        metalnessFactor *= 1.0 - gildLoss;`);
    if (W.puddles) {
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          float pField = wfbm(vec3(vWP.xz * 0.12, 1.7)) + wn3(vec3(vWP.xz * 1.1, 4.0)) * 0.04;
          float pud = smoothstep(0.6, 0.64, pField) * ${f(W.puddles)} * uWet;
          float wetEdge = smoothstep(0.5, 0.6, pField) * uWet;
          diffuseColor.rgb *= mix(1.0, 0.7, wetEdge);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.22, pud);
          roughnessFactor = mix(roughnessFactor, roughnessFactor * 0.5, wetEdge);
          roughnessFactor = mix(roughnessFactor, 0.035, pud);`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          {
            // rain rings on standing water: a few expanding ripples per 0.6 m cell
            vec2 rp = vWP.xz / 0.6; vec2 ci = floor(rp); vec2 rip = vec2(0.0);
            for (int k = 0; k < 2; k++) {
              float hh = wh3(vec3(ci, float(k) * 7.1));
              vec2 c = ci + vec2(wh3(vec3(ci, 3.3 + float(k))), wh3(vec3(ci, 9.1 + float(k))));
              float t = fract(uRainT * 0.9 + hh);
              vec2 d = rp - c; float r = length(d);
              float ring = sin((r - t * 0.7) * 40.0) * smoothstep(0.12, 0.0, abs(r - t * 0.7)) * (1.0 - t);
              rip += normalize(d + 1e-4) * ring;
            }
            
            vec3 rw = normalize(vec3(rip.x * 0.22, 1.0, rip.y * 0.22));
            vec3 rv = normalize((viewMatrix * vec4(rw, 0.0)).xyz);
            normal = normalize(mix(normal, rv, pud) + vec3(0.0, 0.0, 1e-4));
          }`);
    }
  };
  return mat;
}

const tint = (m, c) => { m.color.set(c); return m; };
// set the colour so (texture average x colour) = c, in linear space (k scales the result)
const _avg = new Map();
function texAvg(t) {
  const img = t.image; if (_avg.has(img)) return _avg.get(img);
  let out = [0.5, 0.5, 0.5];
  try {
    const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); g.drawImage(img, 0, 0, 32, 32);
    const d = g.getImageData(0, 0, 32, 32).data, lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const s = [0, 0, 0]; for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) s[k] += lin(d[i + k]);
    out = s.map((v) => Math.max(0.02, v / (d.length / 4)));
  } catch (e) { /* no canvas (tests): keep grey */ }
  _avg.set(img, out); return out;
}
export function trueTint(m, c, k = 1) { let a = texAvg(m.map); if (m.userData.weather?.mono) { const l = 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; a = [l, l, l]; m.userData.weather.avgL = l; } const t = new THREE.Color(c); m.color.setRGB(t.r / a[0] * k, t.g / a[1] * k, t.b / a[2] * k); return m; }
export function makeMaterials(A) {
  const P = (id, opt, density, w) => { const m = pbr(A, id, opt); m.userData.density = density; return w === false ? m : weather(m, w || {}); };
  const M = {
    // ground
    paving: P('herringbone_pavement_03', { color: '#d4b498', normalScale: 1.15 }, 1 / 2.4, { grime: 0.6, streaks: 0, wet: 0.9, puddles: 1, height: 0.1 , cracks: 1 }),
    marbleFloor: P('marble_tiles', { color: '#e8dccb', normalScale: 0.8 }, 1 / 2.6, { grime: 0.5, streaks: 0, wet: 0.9, puddles: 0.8, moss: 0.25, height: 0.1 }),
    gravel: P('leaf_scattered_gravel', { color: '#c4b49a' }, 1 / 2.2, { grime: 0, streaks: 0, wet: 0.6, puddles: 0.6, height: 0.1 }),
    leaves: P('forest_leaves_02', { color: '#7d8f4a' }, 1 / 2.4, { grime: 0, streaks: 0, wet: 0.5, height: 0.1 }),
    hedge: P('forest_leaves_02', { color: '#5f8a3a', normalScale: 1.6 }, 1 / 1.3, { grime: 0, streaks: 0, wet: 0.5, height: 0.1 }),
    mud: P('brown_mud_leaves_01', { color: '#7a6a52' }, 1 / 2.4, { grime: 0, streaks: 0, wet: 0.8, puddles: 0.9, height: 0.1 }),
    mossCobble: P('mossy_cobblestone', { color: '#9a958c', normalScale: 1.3 }, 1 / 2, { grime: 0.3, streaks: 0, wet: 1, puddles: 1, height: 0.1 }),
    // masonry
    stone: P('white_sandstone_blocks_02', { color: '#e6d9c2', normalScale: 1.0 }, 1 / 2.2, { grime: 0.9, streaks: 0.9, wet: 0.45, moss: 0.35, height: 3.5 }),
    stoneDark: P('white_sandstone_blocks_02', { color: '#8f877b', normalScale: 1.2 }, 1 / 1.6, { grime: 1, streaks: 0.8, wet: 0.5, moss: 0.5, height: 3 }),
    marble: P('marble_01', { color: '#f2ebe0', normalScale: 0.6 }, 1 / 2.4, { grime: 0.8, streaks: 1, wet: 0.6, moss: 0.25, height: 2.5 }),
    marbleTrim: P('marble_01', { color: '#f0e6d6', normalScale: 0.6 }, 1 / 1.4, { grime: 0.9, streaks: 1, wet: 0.5, moss: 0.2, height: 3 }),
    brick: P('red_bricks_04', { color: '#c07a62', normalScale: 1.1 }, 1 / 2.2, { grime: 0.9, streaks: 0.8, wet: 0.45, height: 3 }),
    brickDeep: P('medieval_red_brick', { color: '#b0654f', normalScale: 1.1 }, 1 / 2.4, { grime: 1, streaks: 0.8, wet: 0.5, height: 3 }),
    grottoRock: P('rock_wall_08', { color: '#7b776d', normalScale: 1.6 }, 1 / 3, { grime: 0.6, streaks: 0.6, wet: 1, moss: 0.8, height: 4 }),
    grottoWall: P('mossy_stone_wall', { color: '#8c887c', normalScale: 1.4 }, 1 / 2.4, { grime: 0.6, streaks: 0.7, wet: 1, moss: 0.4, height: 4 }),
    // roofs + metals
    copper: P('green_metal_rust', { metal: true, color: '#9fd0c0', envMapIntensity: 1.1 }, 1 / 2.5, { grime: 0.5, streaks: 0.9, wet: 0.6, height: -10 }),
    slate: P('roof_slates_02', { color: '#7d7b80', normalScale: 1.3 }, 1 / 2, { grime: 0.4, streaks: 0.4, wet: 0.9, moss: 0.3, height: -10 }),
    gold: P('metal_plate_02', { metal: true, color: '#e8b752', envMapIntensity: 1.5 }, 1 / 0.9, { grime: 0.5, streaks: 0.5, wet: 0.3, gild: 1, height: 1 }),
    brass: P('metal_plate_02', { metal: true, color: '#cf9e55', envMapIntensity: 1.3 }, 1 / 1.2, { grime: 0.7, streaks: 0.6, wet: 0.3, height: 1 }),
    bronzeOld: P('metal_plate_02', { metal: true, color: '#4a3a28', roughness: 0.75, envMapIntensity: 0.6 }, 1 / 0.8, { grime: 0.9, streaks: 0.9, wet: 0.4, height: 2 }),
    iron: tint(P('rusty_metal_02', { metal: true, envMapIntensity: 1 }, 1 / 1.5, { grime: 0.3, streaks: 0.3, wet: 0.5, height: 1 }), '#2e3a44'),
    ironGreen: tint(P('rusty_metal_02', { metal: true, envMapIntensity: 1 }, 1 / 1.5, { grime: 0.3, streaks: 0.5, wet: 0.5, height: 1 }), '#2f5a48'),
    steel: P('rusty_metal_02', { metal: true, envMapIntensity: 1.1 }, 1 / 2, { grime: 0.4, streaks: 0.6, wet: 0.4, height: 1 }),
    coasterRed: tint(P('rusty_metal_02', { metal: true, envMapIntensity: 1.1 }, 1 / 2, { grime: 0.3, streaks: 0.6, wet: 0.4, height: 1 }), '#8a3a30'),
    // timber, paint, fabric
    boards: P('weathered_planks', { color: '#b0a290', normalScale: 1.2 }, 1 / 2, { grime: 0.4, streaks: 0.8, wet: 0.5, height: 2 }),
    shutter: tint(P('wood_peeling_paint_weathered', { normalScale: 1.0 }, 1 / 1.6, { grime: 0.5, streaks: 0.8, wet: 0.4, height: 2 , fade: 0.5, peel: 0.55 }), '#4f9a7a'),
    redPaint: P('red_plaster_weathered', { color: '#c8433a', normalScale: 1.0 }, 1 / 2, { grime: 0.8, streaks: 1, wet: 0.4, height: 3 , fade: 0.5, peel: 0.55 }),
    greenPaint: tint(P('red_plaster_weathered', { normalScale: 1.1 }, 1 / 2, { grime: 0.8, streaks: 1, wet: 0.4, height: 3 , fade: 0.5, peel: 0.55 }), '#2f7a5c'),
    velvet: P('velour_velvet', { color: '#7a1f22', normalScale: 0.8 }, 1 / 1.2, { grime: 0.6, streaks: 0.8, wet: 0.5, height: 1 }),
    // boardwalk timber: board-and-batten painted deep red / bottle green / aged cream, raw plywood, deck planks
    woodRed: tint(P('distressed_painted_planks', { normalScale: 1.2 }, 1 / 2.2, { grime: 0.7, streaks: 0.9, wet: 0.45, moss: 0.15, height: 2, fade: 0.5, peel: 0.5, peelScale: 3.5, peelCol: [0.2, 0.17, 0.13] }), '#d2402f'),
    woodGreen: tint(P('distressed_painted_planks', { normalScale: 1.2 }, 1 / 2.2, { grime: 0.7, streaks: 0.9, wet: 0.45, moss: 0.15, height: 2, fade: 0.5, peel: 0.5, peelScale: 3.5, peelCol: [0.2, 0.17, 0.13] }), '#2f8a78'),
    woodCream: tint(P('distressed_painted_planks', { normalScale: 1.1 }, 1 / 2.2, { grime: 0.8, streaks: 1, wet: 0.4, height: 2, fade: 0.5, peel: 0.5, peelScale: 3.5, peelCol: [0.2, 0.17, 0.13] }), '#f3e6c8'),
    woodYellow: tint(P('distressed_painted_planks', { normalScale: 1.2 }, 1 / 2.2, { grime: 0.75, streaks: 0.9, wet: 0.45, moss: 0.1, height: 2, fade: 0.5, peel: 0.5, peelScale: 3.5, peelCol: [0.2, 0.17, 0.13] }), '#f2c14e'),
    woodTeal: tint(P('distressed_painted_planks', { normalScale: 1.2 }, 1 / 2.2, { grime: 0.7, streaks: 0.9, wet: 0.45, moss: 0.15, height: 2, fade: 0.5, peel: 0.5, peelScale: 3.5, peelCol: [0.2, 0.17, 0.13] }), '#3fb0a8'),
    fauxStone: tint(P('white_sandstone_blocks_02', { normalScale: 1.4 }, 1 / 2.2, { grime: 0.9, streaks: 1, wet: 0.5, moss: 0.35, height: 5 , fade: 0.4, peel: 0.4, peelCol: [0.55, 0.5, 0.43] }), '#efdcc0'),
    shingleRed: tint(P('roof_slates_02', { normalScale: 1.3 }, 1 / 1.6, { grime: 0.5, streaks: 0.6, wet: 0.8, moss: 0.4, height: -10 }), '#c8503c'),
    plywood: tint(P('plywood', { normalScale: 0.8 }, 1 / 2.4, { grime: 0.6, streaks: 0.9, wet: 0.5, height: 1 }), '#9a8366'),
    deck: P('old_planks_02', { color: '#a89a88', normalScale: 1.2 }, 1 / 2.4, { grime: 0.3, streaks: 0, wet: 0.8, puddles: 0.6, moss: 0.2, height: 0.5 }),
    muralWall: tint(P('peeling_painted_wall', { normalScale: 0.8 }, 1 / 3, { grime: 0.8, streaks: 1, wet: 0.4, height: 4 , fade: 0.5, peel: 0.55 }), '#d8664a'),
    // the fairy-tale castle and the kept streets: fresh lime stucco in pastel washes, glazed clay roof tiles,
    // warm brick paving, colour-cobbled hub, terracotta inlay. Light weathering only.
    stuccoBlush: tint(P('white_stucco', { normalScale: 1.0 }, 1 / 2.6, { grime: 0.75, streaks: 1, rust: 0.6, wet: 0.35, moss: 0.4, height: 3.2, fade: 0.4, peel: 0.55, peelCol: [0.6, 0.47, 0.4] }), '#f6dccf'),
    stuccoCream: tint(P('white_stucco', { normalScale: 1.0 }, 1 / 2.6, { grime: 0.75, streaks: 1, rust: 0.6, wet: 0.35, moss: 0.4, height: 3.2, fade: 0.4, peel: 0.55, peelCol: [0.6, 0.47, 0.4] }), '#fbf0dc'),
    stuccoLilac: tint(P('white_stucco', { normalScale: 1.0 }, 1 / 2.6, { grime: 0.75, streaks: 1, rust: 0.6, wet: 0.35, moss: 0.4, height: 3.2, fade: 0.4, peel: 0.55, peelCol: [0.6, 0.47, 0.4] }), '#dcd2ee'),
    castleTrim: P('white_sandstone_blocks_02', { color: '#fff4e2', normalScale: 0.8 }, 1 / 1.4, { grime: 0.8, streaks: 1, rust: 0.4, wet: 0.35, moss: 0.5, height: 2.5, fade: 0.2 }),
    roofBlue: tint(P('roof_tiles_tint', { normalScale: 1.2, envMapIntensity: 1.1 }, 1 / 1.1, { grime: 0.45, streaks: 0.5, wet: 0.25, moss: 0.6, height: -10, fade: 0.45 }), '#2f63c4'),
    roofRose: tint(P('roof_tiles_tint', { normalScale: 1.2, envMapIntensity: 1.1 }, 1 / 1.1, { grime: 0.45, streaks: 0.5, wet: 0.25, moss: 0.6, height: -10, fade: 0.45 }), '#d65a7e'),
    roofTeal: tint(P('roof_tiles_tint', { normalScale: 1.2, envMapIntensity: 1.1 }, 1 / 1.1, { grime: 0.45, streaks: 0.5, wet: 0.25, moss: 0.6, height: -10, fade: 0.45 }), '#2fa39a'),
    roofPlum: tint(P('roof_tiles_tint', { normalScale: 1.2, envMapIntensity: 1.1 }, 1 / 1.1, { grime: 0.45, streaks: 0.5, wet: 0.25, moss: 0.6, height: -10, fade: 0.45 }), '#7a4fb0'),
    streetBrick: tint(P('brick_pave_tint', { normalScale: 1.1 }, 1 / 1.6, { grime: 0.45, streaks: 0, wet: 0.6, puddles: 0.8, moss: 0.4, height: 0.1, cracks: 1 }), '#c46a4e'),
    hubCobble: tint(P('cobblestone_color', { normalScale: 1.1 }, 1 / 2.2, { grime: 0.45, streaks: 0, wet: 0.6, puddles: 0.8, moss: 0.4, height: 0.1, cracks: 1 }), '#e8d8c0'),
    terracotta: tint(P('terracotta_tint', { normalScale: 0.9 }, 1 / 1.2, { grime: 0.45, streaks: 0, wet: 0.6, puddles: 0.8, moss: 0.4, height: 0.1, cracks: 1 }), '#c9714e'),
    inlayBlue: tint(P('terracotta_tint', { normalScale: 0.9 }, 1 / 1.2, { grime: 0.45, streaks: 0, wet: 0.6, puddles: 0.8, moss: 0.4, height: 0.1, cracks: 1 }), '#5a7ea8'),
    // Main Street: worn grey-brown setts on the carriageway, dark gutter setts, granite kerbs, brick sidewalks
    // with a sandstone flag band; and the shop paints (faded teal, plum, coral, mustard, cream, brick red)
    streetSett: tint(P('mossy_cobblestone', { normalScale: 1.35 }, 1 / 1.5, { grime: 0.55, streaks: 0, wet: 1, puddles: 1, moss: 0.5, height: 0.1, cracks: 1 }), '#b3a796'),
    gutterSett: tint(P('cobblestone_color', { normalScale: 1.3 }, 1 / 0.9, { grime: 0.9, streaks: 0, wet: 1, puddles: 1, moss: 0.7, height: 0.1 }), '#6f675d'),
    kerb: tint(P('white_sandstone_blocks_02', { normalScale: 1.2 }, 1 / 1.1, { grime: 0.9, streaks: 0.4, wet: 0.7, moss: 0.5, height: 0.6, cracks: 1 }), '#a49c8f'),
    walkBrick: tint(P('brick_pave_tint', { normalScale: 1.15 }, 1 / 1.3, { grime: 0.6, streaks: 0, wet: 0.7, puddles: 0.7, moss: 0.45, height: 0.1, cracks: 1 }), '#a65f4c'),
    walkFlag: tint(P('herringbone_pavement_03', { normalScale: 1.1 }, 1 / 1.6, { grime: 0.6, streaks: 0, wet: 0.7, puddles: 0.6, moss: 0.4, height: 0.1, cracks: 1 }), '#bcae98'),
    bark: P('tree_bark_03', { color: '#7d756c', normalScale: 1.5 }, 1 / 1.6, { grime: 0.2, streaks: 0.5, wet: 0.5, moss: 0.4, height: 2 }),
  };
  // Main Street storefronts (M2). `trueTint` divides out the texture's own average colour so a cream or teal
  // tint reads as that colour on any base set (the plaster set is red, the plank set grey-green).
  // Bodies: cracked painted plaster (fronts of A/C, all walls), horizontal clapboard (B fronts/sides);
  // cream trim; darker joinery paints for shopfronts; shingle roofs. Peel patches are small (peelScale 6).
  const plaster = (c) => trueTint(P('peeling_painted_wall', { normalScale: 0.85 }, 1 / 0.9, { grime: 0.95, streaks: 1.8, wet: 0.35, moss: 0.15, height: 3.6, fade: 0.25, peel: 0.14, peelA: 0.74, peelScale: 9, peelCol: [0.2, 0.18, 0.15], mono: 1, con: 0.6 }), c, 0.85);
  const clap = (c) => { const m = trueTint(P('distressed_painted_planks', { normalScale: 1.25 }, 1 / 1.9, { grime: 0.9, streaks: 1.7, wet: 0.4, moss: 0.15, height: 3.4, fade: 0.25, peel: 0.12, peelA: 0.75, peelScale: 8, peelCol: [0.22, 0.2, 0.17], mono: 1, con: 0.6 }), c, 0.9); m.userData.swapUV = true; return m; };
  const join = (c) => trueTint(P('distressed_painted_planks', { normalScale: 1.0 }, 1 / 1.2, { grime: 0.6, streaks: 0.9, wet: 0.35, height: 2, fade: 0.3, peel: 0.12, peelA: 0.75, peelScale: 10, peelCol: [0.2, 0.18, 0.15], mono: 1, con: 0.5 }), c, 0.95);
  Object.assign(M, {
    paintTeal: plaster('#7d9a92'), paintPlum: plaster('#7d5a6b'), paintCoral: plaster('#c68a74'), paintMustard: plaster('#c7a35f'), paintCream: plaster('#d9ccb0'),
    paintBrick: P('red_bricks_04', { color: '#b06a56', normalScale: 1.1 }, 1 / 2.2, { grime: 0.9, streaks: 0.9, wet: 0.45, moss: 0.2, height: 3, fade: 0.3 }),
    clapTeal: clap('#7d9a92'), clapPlum: clap('#7d5a6b'), clapCoral: clap('#c68a74'), clapMustard: clap('#c7a35f'), clapCream: clap('#d9ccb0'), clapBrick: clap('#9a5a4a'),
    trimCream: trueTint(P('white_stucco', { normalScale: 0.8 }, 1 / 1.1, { grime: 0.85, streaks: 1.6, wet: 0.35, moss: 0.1, height: 3, fade: 0.3, peel: 0.1, peelA: 0.76, peelScale: 10, peelCol: [0.26, 0.23, 0.2] }), '#cfc1a2', 0.95),
    joinPlum: join('#5b3a4b'), joinTeal: join('#3b5c58'), joinGreen: join('#3d5243'), joinRed: join('#6a3330'), joinNavy: join('#35405a'),
    shingle: tint(P('roof_slates_02', { normalScale: 1.4 }, 1 / 1.3, { grime: 0.4, streaks: 0.5, wet: 0.8, moss: 0.3, height: -10 }), '#857b74'),
  });
  M.popcorn = new THREE.MeshStandardMaterial({ color: '#d9bf7c', roughness: 0.95 }); M.popcorn.userData.density = 1;
  M.glass = new THREE.MeshPhysicalMaterial({ color: '#2a3640', roughness: 0.22, metalness: 0, transparent: true, opacity: 0.7, envMapIntensity: 1.1, depthWrite: false, specularIntensity: 1, ior: 1.52 });
  M.glass.userData.density = 1;
  M.dark = new THREE.MeshStandardMaterial({ color: '#070606', roughness: 0.95 }); M.dark.userData.density = 1;
  M.water = new THREE.MeshStandardMaterial({ color: '#0d3a4a', roughness: 0.05, metalness: 0.1, envMapIntensity: 1.4 }); M.water.userData.density = 0.5;
  M.interior = interiorMaterial();
  M.boothGlow = new THREE.MeshStandardMaterial({ color: '#3a2a1c', emissive: '#ff9a48', emissiveIntensity: 0.32, roughness: 0.9 }); M.boothGlow.userData.density = 1;
  // dead neon: dusty coloured glass tubing, unlit; and incandescent marquee bulbs (a few still burn)
  M.neonDead = new THREE.MeshPhysicalMaterial({ color: '#5a1d18', roughness: 0.22, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.2, emissive: '#ff3b26', emissiveIntensity: 0.05 }); M.neonDead.userData.density = 1;
  M.bulbDead = new THREE.MeshStandardMaterial({ color: '#6a5a46', roughness: 0.25, metalness: 0.3, envMapIntensity: 1.2 }); M.bulbDead.userData.density = 1;
  M.bulbLit = new THREE.MeshBasicMaterial({ color: new THREE.Color(5.5, 3.6, 1.7) }); M.bulbLit.userData.density = 1;
  return M;
}

// interiors behind glazing: dark rooms with depth falloff; a rare warm lamp still burning
export function interiorMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: '#0a0909', roughness: 0.9, metalness: 0 });
  m.userData.density = 1;
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <project_vertex>', '#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;' + NOISE).replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      {
        vec2 q = vec2(vWP.x + vWP.z, vWP.y) / vec2(2.2, 3.4);
        vec2 cell = floor(q), fr = fract(q);
        float r = wh3(vec3(cell, 7.0));
        float vign = smoothstep(0.0, 0.4, fr.y) * smoothstep(1.0, 0.55, fr.y) * smoothstep(0.0, 0.35, fr.x) * smoothstep(1.0, 0.65, fr.x);
        float lit = step(0.93, r) * (0.5 + 0.5 * wh3(vec3(cell, 11.0)));
        totalEmissiveRadiance += vec3(1.0, 0.52, 0.2) * lit * vign * 1.3;
        diffuseColor.rgb *= 0.35 + 0.65 * vign;
      }`);
  };
  return m;
}
