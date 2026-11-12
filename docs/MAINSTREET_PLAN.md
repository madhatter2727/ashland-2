# Main Street plan (Ashland 2) — milestone 1 of 4

Status: M1 = layout groundwork (this doc + street surface + placeholder lots with colliders + spawn).
M2 = storefronts (3 modular styles), M3 = props/decay, M4 = polish. Update this file as things change.

## 1. How the current world is built (pass 5 baseline)

| piece | file | notes |
|---|---|---|
| ground planes (paving, hub cobbles + rings, Main Street brick, gravel/beds, carousel setts) | `src/world/arena.js` `buildArena()` top | `plane()`/`ring()` helpers, all `B.add(mat, geo)` merged per material by `Builder` (kit.js) |
| castle (wings, gatehouse at x ±6.2, front plane z ≈ -35.3, towers) + courtyard fountain (0, -30.4) | `src/world/park/castle.js` `buildCastle()` → `buildFountain(ctx, 0, -30.4)` | colliders via `F.col`, fountain stepped-octagon colliders |
| south gate (pylons x ±3.5..6.4, z ≈ 33.8..37.2), ticket kiosks (±7.85, 36), 4 lodge hotels (outside, z 36..44), banner poles (±5.5, 21/27) + bunting | `src/world/park/esplanade.js` `buildEsplanade()` | hotels face -z into the park from outside the ±36 wall |
| north/south service courts beyond the gates | `arena.js` (Frame loop after `buildEsplanade`) | |
| midway halls (outside x > 36), `stall()` booths, carousel | `src/world/park/midway.js` | stalls & carousel placed from `arena.js` |
| gardens / orangery / flume (outside x < -36) | `src/world/park/gardens.js` | |
| hub bandstand terrace (x ±5, z ±4.5, deck y 2.0), balustrades, stairs (z ±4.5..8.5), tent roof, lantern light, bunting to the eaves | `arena.js` "central bandstand terrace" block | **removed in M1** |
| stalls, planters, queue rails, lamp posts (4 real lights), braziers (4 fire lights), urns, park map, finger posts, popcorn carts | `arena.js` | coordinate lists inline |
| decay (ivy, grass tufts, litter zones, popcorn spills) | `arena.js` `decayLayout()` → `park/decay.js` | litter zones/kerb tufts reference the old hub & street |
| locked areas: Clock Terrace (rect -36..-20.2 × -36..-27.2, gate x -20.3 z -30), Grotto (rect 26..36 × 27..36, shutter (31, 27)) | `src/world/areas.js`, `AREAS` in `src/tuning.js` | **untouched** |
| wall-buys | `src/world/wallbuys.js` (smg on stall (-12,15), sg on stall (8,-20), mr on carousel west face, lmg on stall (20,-15)) | |
| crate spots / forge / drinks | `CRATE`, `FORGE`, `DRINKS` in `src/tuning.js`, built in `stations.js` / `drinks.js` | |
| colliders | `Builder.colliders` (kit.js `B.col`) + `colliders.push` | AABBs; `walk:true` = standable |
| nav | `buildNav()` in `arena.js` (1 m cells, ±36) → `src/nav.js` flow fields in the horde | built from colliders; areas rebake on open |
| stats | `game.arena.stats` returned by `buildArena` (`parkTris` = Builder tris, `propTris` = scanned instanced models, decay, skyline, festive) | |
| spawn | `src/player.js` constructor + `reset()` | was (0, 2.0, 1.5/2) on the bandstand |
| horde spawns | `arena.js` 6 m outside each gate: (0,-42), (0,42), (-42,0), (42,0) + area spawns | east/west ones enter at z ≈ 0 → need the cross alleys |

## 2. New layout

Axis: **x = 0**, running from the south gate (z = 35) north to the castle square. Yaw 0 looks -z (castle).

Cross-section (x):
- carriageway (worn cobbles, crowned look, y = 0): **x -4.5 .. 4.5** (9 m)
- gutters: 0.35 m dark sett strips at |x| 4.15..4.5 (on the carriageway)
- kerb stones: |x| 4.5..4.72, top y 0.15
- sidewalks (brick herringbone with flag edge band), raised **y = 0.15** with `walk:true` colliders: **|x| 4.5 .. 7.5** (3 m)
- facade line: **|x| = 7.5**; lot depth **6 m** (backs at |x| = 13.5)

Blocks (z), south → north:
| z range | what |
|---|---|
| 33.5 .. 36 | gate apron (pylons/kiosks as is) |
| 26.5 .. 33.5 | south block, lot 1 (7 m) |
| 20 .. 26.5 | south block, lot 2 (6.5 m) |
| 16.5 .. 20 | **cross alley B** (3.5 m) — into gardens (W) / midway (E) |
| 12 .. 16.5 | middle block lot 3 (4.5 m) |
| 7 .. 12 | middle block lot 4 (5 m) |
| 2.5 .. 7 | middle block lot 5 (4.5 m) |
| -2.5 .. 2.5 | **cross alley A** (5 m) — lines up with the east/west horde gates at z = 0 |
| -7.5 .. -2.5 | north block lot 6 (5 m) |
| -14 .. -7.5 | north block lot 7 (6.5 m) |
| **-14 .. -35.3** | **castle square** (x ±20 cobbles, fountain at (0, -30.4)) |

Sidewalks and kerbs also turn the corners into the alleys (kerb returns) and stop at z = -14 where the square paving begins.

### Lots (front at |x| = 7.5, depth 6 m). Styles: A = 3-storey mansard emporium (arched upper windows, iron balcony, dormers, cresting); B = 2½-storey front-gable (bay window, bargeboard, finial); C = 2-storey Italianate false front (bracketed cornice, pediment parapet).

| id | side | z0..z1 | w | style | body colour | height (placeholder) | shop |
|---|---|---|---|---|---|---|---|
| W1 | west | 26.5..33.5 | 7.0 | A | faded cream / plum sign | 12.5 | Ashland Confectionery |
| W2 | west | 20..26.5 | 6.5 | C | mustard | 9.0 | Kettle Corn Co. |
| W3 | west | 12..16.5 | 4.5 | B | faded teal | 10.5 | Clockwork Toys |
| W4 | west | 7..12 | 5.0 | C | coral | 8.5 | Main Street Photographs |
| W5 | west | 2.5..7 | 4.5 | B | plum | 10.0 | Hat & Ribbon Shoppe |
| W6 | west | -7.5..-2.5 | 5.0 | B | mustard | 10.5 | Penny Arcade |
| W7 | west | -14..-7.5 | 6.5 | A | faded teal | 13.0 | Ashland Emporium |
| E1 | east | 26.5..33.5 | 7.0 | A | coral | 12.5 | Ashland Souvenirs |
| E2 | east | 20..26.5 | 6.5 | B | brick red | 10.5 | Candy & Treats |
| E3 | east | 12..16.5 | 4.5 | C | cream | 8.5 | Ice Cream Parlour |
| E4 | east | 7..12 | 5.0 | B | faded teal | 10.0 | The Lantern Shop |
| E5 | east | 2.5..7 | 4.5 | C | mustard | 9.0 | Ashland Gazette |
| E6 | east | -7.5..-2.5 | 5.0 | C | plum | 8.5 | Music Box Repairs |
| E7 | east | -14..-7.5 | 6.5 | A | cream | 13.0 | Starlight Cinema |

The table lives in code as `LOTS` in `src/world/park/mainstreet.js` (single source for M2).
Colliders: one full-height AABB per lot (`minY 0 .. maxY h`), so nav marks the lot cells blocked and bullets stop.

### Castle square
Starts at **z = -14**; the existing courtyard colour-cobble plane (x ±20, z -35.9..-25) is extended to z -14 with the
same material. Fountain stays at (0, -30.4) with its colliders. The planter that sat at (0, -26) between the street and
the fountain is removed so the fountain reads from the spawn; stall (8, -20) (sg wall-buy) and the castle kiosks stay.

### Spawn
`(0, 0, 33)`, yaw 0, pitch 0.045 — ground level at the south end of the street just inside the gate arch, looking up the
street at the castle (at z = 31 W1/E1 fell outside the horizontal FOV; at 33 they frame the left/right edges). Set in **both** the `Player` constructor and `reset()`.

## 3. Removed / moved pieces

| piece | was | now |
|---|---|---|
| bandstand terrace, balustrades, stairs, tent roof, finial, lantern + its point light, eave bunting | hub (0,0) | removed |
| hub cobble plane, terracotta/blue rings, hub kerb, Main Street brick + terracotta edging | x ±9 z ±12; x ±7.6 z 12..36 | replaced by `mainstreet.js` street |
| stall + smg wall-buy | (-12, 15) | (-17.5, 9.5); wall-buy (-17.5, 8.27) facing -z |
| climbable stall stack + board stairs | stalls (-16, -8)/(-16, -5.4), stairs from x -12.95 | shifted 6.5 m west: (-22.5, …), stairs from x -19.45 |
| queue rail | (-26, -6) | (-28.5, -6) (clear of the moved stack) |
| carousel + moss setts + mr wall-buy | (15.7, 9), wall-buy x 12.67 | (19.5, 9), wall-buy x 16.47 |
| real lamp posts | (-9, 6), (10, -5) | (-5.1, 5), (5.1, -5) (kerb line) |
| unlit lamps in lots / walks | (-9,-12.5), (9,12.6), (-9.2,23), (-6.5,30), (6.5,31) | (-5.1,-11), (5.1,12.5), (-5.1,24), (-5.1,28.6), (5.1,28.6) |
| planters on sidewalks/lots/street | (-6,-12), (6,12), (-9,9), (10,-8), (0,-26), (0,26), (13,22), (-10,-22) | (-12,-19.8), (12,-23.5) flanking the square, (16.5,-10.5,rot), (17.5,21,rot), (-10,-22.5,rot); (-9,9), (0,±26) dropped |
| queue rails in the way | (-4,-15.4), (7,17), (-19,12), (-26,-6) | (-14.8,-15.6), (22.5,17.5), (-19,13.6), (-28.5,-6) |
| brazier | (-5, 10.5) | (-17.5, 17.2) |
| popcorn carts | (-6,13.5), (12,-4), (-8,-14 tipped) | (-3.3,14), (3.3,-8.5) on the carriageway by the kerb (M3 lifts carts onto walks), (-6,-16.5 tipped, square) |
| park map / finger post | (-9,18) / (-2,12) | (-10.5,-17.2) in the square / (-5.3,15.6) on the W3 walk |
| crate spot | (-8, 24, π) | (-15, 23.4, -π/2) behind W2, reached from alley B |
| drink SNAPLOAD | (10, 25, π) | (14.6, 24.5, π/2) behind E2, facing the midway |
| urn | (12, 31.8) | dropped |
| leaves bed | x -20.5..-11, z -25..-11 | x -20.5..-15 (clear of the square paving) |
| decay | hub rings / old street edging tufts, hub litter strips | gutter + facade-base tufts, litter on carriageway/walks (y 0.15)/alleys/square; spills follow the carts |

Clock Terrace (stair/gate x -20..-23, z -30) and the Grotto (shutter (31, 27)) are outside the street footprint
and unchanged; the square (x ±20, z -14..-35) keeps open ground to the Clock Terrace gate, and the Grotto is reached
from the midway side through alley A/B or around the east lots (open ground x 13.5..36).

`test_m13.py` positions that land inside lots (player (8,0,10), (-10,0,-8); boss start (10,14)) get moved to the
nearest open ground with the same intent ("plaza"/"out of the area").

## 4. Triangle budget

Baseline (pass 5): park ≈ 0.68 M, props ≈ 0.61 M, skyline ≈ 0.17 M.

| piece | budget |
|---|---|
| street surface (carriageway, gutters, kerbs, sidewalks, kerb returns) | ≤ 15 k |
| M1 placeholder lots (14 boxes) | < 1 k |
| M2 storefronts: style A ≤ 22 k, B ≤ 16 k, C ≤ 12 k each; repeated parts (windows, brackets, balusters, cresting) merged per material or instanced | ≤ 230 k total for 14 |
| M3 street props (lamps, benches, carts, planters, bins, banners, awnings) | ≤ 120 k (InstancedMesh) |
| freed by removals (bandstand, hub rings) | ≈ 30–50 k |

Target after M2/M3: park ≤ ~0.85 M; if over, drop the outside lodge porches' detail (hidden behind the spawn) first.

## 5. Notes / as built (M1)

- The weathering table the brief calls `UPKEEP` is named `DECAY` in `src/world/park/materials.js`; the new street
  and paint materials go through `weather()` so they follow it.
- New materials (materials.js): `streetSett`, `gutterSett`, `kerb`, `walkBrick`, `walkFlag`, and shop paints
  `paintTeal/Plum/Coral/Mustard/Cream/Brick` (peeling painted wall / red brick). The paint peel pattern reads large on
  the placeholders — M2 should tighten its density when the facades get real detail.
- `buildMainStreet(ctx)` is called from `buildArena` right after the ground planes; `game.arena.stats.streetTris`
  reports the street + placeholder geometry.
- `lotFrame(B, lot)` gives M2 a frame per lot: origin at the facade centre, local +z into the street, x along the facade.
- test_m13.py: three "plaza" points that now fall inside lots moved onto the street (see the comment in the test).
