# Main Street plan (Ashland 2) — milestone 1 of 4

Status: M1 = layout groundwork (done, 630daee). **M2 = storefronts (done)** — see §6.
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

## 6. As built (M2 — storefronts)

Files:
- `src/world/park/storefront.js` — the kit. `buildStorefront(ctx, F, lot, {depth, exposed})` → `{ top }` builds one lot in its
  `lotFrame` and returns the roof/finial height used for the lot collider. Shared modules:
  `slab` (wall with real openings, 0.3 m thick), `sash` (glass in the reveal, sash ring + glazing bars, sill, moulded surround,
  hood: keystone `arch` / `pediment` / bracketed `cap`, roller blinds, boards), `shopfront` (piers + slim pilasters, stall risers
  with raised panels, mullioned display windows + transom lights, recessed door with glazed returns and mosaic step, fascia,
  cornice, a shallow dark shop behind with shelves of dusty stock and a display table), `signBoard` (crest / arch / board shapes:
  extruded dark backing + a shaped face with a per-lot canvas texture), `shell` (body, cavity side walls, floor plates, dark back
  plane; back walls with windows + back door; exposed side walls with windows), `flatWin`, `chimney`, `quoins`, `bracket`,
  `ironRail`, `ironCresting`, `finial`.
- `src/world/park/sftex.js` — canvas textures: `shopSign` (gold serif lettering with drop shadow, gilt borders, fade, chips, drips;
  "ASHLAND X" lots get an italic *Ashland* over caps), `glassTex` (dust/grime + alpha: intact, cracked spider-web, smashed star hole),
  `blindTex`.
- Depth layers per facade: wall slab (z -0.3..0) → glass 0.15 m back in the reveal → cavity (z -1.45..-0.3) with floor plates,
  blinds and an `interiorMaterial` back plane (rare warm lamp) → solid body. Glass is a reflective (env-mapped) transparent
  standard material, three damage kinds × two dust variants, merged per material.
- Styles: **A** 3 storeys (storey 3.15 m ± h), centred door, crested board standing on the shop cornice, French doors onto two
  iron balconies on consoles either side of the board, arched keystone windows, pilaster strips, dentils + paired brackets +
  deep cornice, slate mansard with arched dormers (pediment + slate roof), iron cresting on the curb, corner finials, chimney.
  **B** clapboard front gable: canted oriel bay over the shop (panelled base, three glazed facets, lean-to slate roof, brackets),
  side sash with pediment on wide lots, round-headed attic window, corner boards, shingle roof, fretted bargeboards, king post
  + collar + pendant, iron spike finial, chimney. **C** Italianate false front: 2–3 tall segmental windows with bracketed caps,
  quoins, frieze + dentils + paired scroll brackets + cornice, panelled parapet, triangular or segmental pediment, urn/ball
  terminals, low dark roof behind, chimney.
- LOTS fields added: `flip` (door / bay side), `seed` (all per-lot randomness), `dmg` (scales cracked / smashed / boarded glass),
  `smash` (forces one smashed display pane — W1, W7, E1, E7: the hero windows for M3's teddy bear / props). `h` is a height class
  (see the comment on LOTS). `exposure(lot)` finds block ends / taller-than-neighbour walls; those get windows.
- Collider per lot as in M1: one AABB `x ±w/2, y 0..top, z -6..+0.14` (covers pilasters/plinths; balconies, bays and signs are
  overhead). Nav unchanged in principle (lots were already blocked).
- Materials (`materials.js`): paints now use `trueTint` with a new `weather` option `mono` (desaturate the base texture before
  tinting) + `con` (compress its contrast around its mean, stored as `avgL`) — the per-channel tint multipliers (up to ~3× for
  cream) were blowing the texture's pale chips out to white. The weather-peel layer got an optional `peelA` threshold
  (the old `0.7 - peel*0.13` barely changes coverage); storefront paints use small (`peelScale` 8–10), sparse (`peelA` ≈ 0.75) peel.
  All storefront weathering still goes through `weather()` → `DECAY`.
- Kit (`kit.js`): `Builder.add` honours `mat.userData.swapUV` (clapboard planks run horizontally).
- Triangles: parkTris 673.5 k (M1) → 754.0 k; `streetTris` (street surface + storefronts) 30.6 k → 111.0 k, i.e. the 14
  storefronts ≈ 80 k (budget was ≤ 140 k). Sign faces are 14 extra meshes (one canvas texture each); everything else is merged
  per material by the Builder.
- Screenshots: `shots_a2.py URL prefix outdir [views]` now also has `emporium` (W7 at ~6 m, cf. docs/2-emporium-closeup.png),
  `shopb`, `shopc` and `alley`; M2 set in `shots/m2-*.png`.
- Left for M3/M4: awnings, sign lamps, teddy bear behind W7's smashed pane, ivy on facades, flower boxes; consider instancing
  the window modules if M3 pushes the park total over ~0.8 M.

## 7. As built (M3 — street props + decay)

Files:
- `src/world/park/proptex.js` — canvas textures: `awningTex(kind, torn)` (red/cream or plum/cream canvas, sun fade, water
  stains, scalloped + frayed valance with missing scallops, rips as alpha holes), `castleBannerTex(v)` (deep purple, gold
  border, generic Ashland Castle silhouette + stars, swallow-tail foot, fade, streaks, tears/holes), `popcornSignTex`,
  `leafTex` (4-leaf autumn atlas), `streakTex` (unused spare).
- `src/world/park/streetprops.js` — `buildAwnings` (table `AWN`: lot → colour, torn, droop; sloped canvas sheet + valance
  in the lot frame under the fascia at y 3.28 → 2.62, 1.45 m deep, iron wall rail + folding arms + roller bar) and
  `streetLamp` / `buildStreetLamps` (octagonal base, fluted post, collars, two C-scroll arms with side globes, top lantern
  globe, banner arm toward the street centre with a purple castle banner). Lamps at x ±4.95, z 30.5 / 24 / 13.6 / 5 / -5 /
  -11.4. **Real lights unchanged in count**: the two street lamps that were real ((-4.95, 5) west, (4.95, -5) east) keep a
  PointLight; every other lit globe is an emissive material (bloom makes the halo). Some globes are missing (broken bitmask).
- `src/world/park/streetfurniture.js` — `bench` (iron scroll ends + timber slats), `planter` (timber trough, iron corners,
  overgrown: instanced leaf mounds + blooms via `flushFlowers`), `bin` (green iron), `popcornCart2` (red body with POPCORN
  boards both sides, cream trim, glass case of stale corn on brass posts, striped pitched canopy reusing `awningGeo`, spoked
  wheels, castor + push handle; `tipped` lies on its side, case gone). All with AABB colliders.
- `src/world/park/streetdress.js` — layout (`buildStreetDress`, called from `buildArena` after the lamp section): awnings,
  lamps, 6 benches + 6 planters on the walks (bench faces the street), 5 bins by the kerb, `CARTS` (west (-3.45, 21.6), east
  (3.45, -6.2), tipped (-1.9, 9.6) lying toward the kerb); two teddy bears (lumpy matted plush, slumped, head lolling, one
  button eye + a thread from the empty socket) on a crate behind the smashed hero panes of W7 (Emporium) and E1 (Souvenirs);
  9 mirror puddles (dark metallic, env-mapped) on the setts and in the square on top of the shader puddles; ~500 instanced
  autumn leaves (gutters, shop plinths, setts, square). `streetDecay(rr)` feeds `decayLayout`: ivy drapes off upper cornices
  of W1/W3/W7/E1/E2/E6 and climbers up E4/W5, kerb-crack weeds, extra litter on the carriageway, popcorn spills at the carts.
- Removed: the 4 banner poles at (±5.5, 21/27) (bunting now hangs from the lamp tops at y 4.78: across at z 30.5, 24, 13.6,
  -5, along both kerbs 24→30.5 and up to the gate arch), the old street lampPosts and the 3 old popcorn carts (incl. the
  tipped one in the square) and their spills. Finger post moved from (-5.3, 15.6) (covered the Clockwork Toys sign) to
  (-9.6, 19.4) in alley B.
- Grime: storefront plaster/clapboard/trim materials got more `streaks` (1.8 / 1.7 / 1.6) and `grime` — still scaled by `DECAY`.
- Middle of the carriageway (|x| < ~1.3) stays free of colliders from the gate to the square.
