# Ashland 2 — Main Street rebuild brief (read this first, every session)

Ashland is a three.js + Vite browser horde FPS (zombies) in an abandoned fairy-tale theme park:
"a grand park after the apocalypse", ~70% magic / 30% decay. This repo (ashland-2) is a separate copy.

## Reference images (AI concept renders — match the FEEL, layout, palette and props, not photoreal parity)
- docs/1-street-to-castle.png — THE MAIN TARGET: the spawn view. Straight cobbled street, 2–3 storey Victorian
  shopfronts on both sides (left "Ashland Confectionery", right "Souvenirs"), red/cream striped frayed awnings,
  gold-letter plum signboards, black iron double-globe lamp posts, purple castle banners on the lamp posts,
  bunting strung across the street, popcorn cart, benches, planters with flowers, bins, puddles reflecting sky,
  scattered paper/leaves/spilled popcorn, ivy. The castle (ours) closes the end of the street, with its fountain
  in a small open square in front.
- docs/2-emporium-closeup.png — storefront detail: "Ashland Emporium" arched signboard, smashed shop windows
  (star-shaped hole, cracked glass), a dusty teddy bear behind broken glass (should read creepy, not cute),
  iron balcony railing above, arched upper windows with trim, pilasters, ivy hanging, wooden bench, flower planter.
- docs/3-long-street-gate.png — long street view: "Ashland Souvenirs", "Candy & Treats", repeating popcorn
  carts and lamps receding, wrought-iron balconies, peaked/mansard roofs with finials and cresting.
  The gate at the end is NOT ours — our castle replaces it.
- docs/castle.jpg etc. and /workspace/ash-shots/v13-*.png show the CURRENT game for comparison.

## Hard rules (Tara)
- Original IP only: no Disney/copyrighted characters, logos or specific rides. Generic castle silhouettes on
  banners are fine (they're our Ashland Castle).
- AAA look: real textured materials (procedural canvas textures / existing texture pipeline in
  src/world/textures.js + src/world/park/materials.js), normal/roughness variation, trim, depth. NOT low-poly,
  NOT blocky, NOT kiddie. Muted, weathered palette: faded teal, plum, coral, mustard, cream; gold lettering.
- Keep late-afternoon daylight. ALL lighting numbers stay in src/world/lighting.js (do not scatter lights
  settings elsewhere; nightfall.js blends from there).
- Keep every gameplay system working: guns, zombies, waves, doors, the two locked buy areas
  (Clock Terrace — stair/gate around (-20..-23, -30), roof (-30,-31); The Grotto — shutter around (31, 25..27)).
  Mouse-look speed exactly 0.0045, walk 5.4, sprint 8.4. Saved settings keep the `ash-` prefix. Graphics
  quality defaults to medium.
- Keep Ashland Castle (src/world/park/castle.js) as the anchor at the end of Main Street, incl. the 3-tier
  courtyard fountain around (4, -29) with collision.
- Grime/weathering amount is controlled by the `UPKEEP` table in src/world/park/materials.js — use it for new
  materials too.
- Arena is about ±35.4 m (ARENA.half = 36). Forward = (-sin(yaw), 0, -cos(yaw)); yaw 0 looks toward -z (castle).
- Triangle budget (from pass 4): park ~0.68M, props ~0.61M, skyline ~0.17M. Stay in that range (use
  InstancedMesh / merged geometry for repeated parts; reuse modules).
- Spawn: currently (0, 2.0, 1.5) on the hub bandstand, yaw 0, pitch ~0.12, set in BOTH the constructor and
  reset() in src/player.js. For this pass the spawn may move to the south end of the new street at ground level
  (still x=0, yaw 0, facing the castle, slight pitch ~0.03–0.06) so the first view matches image 1. Update both places.
- Do NOT build the future lands (Storybook/Tomorrow/Adventure, coaster). Don't touch git remotes, don't deploy.

## This pass (approved plan)
1. Turn the spawn/hub area into a straight shop street pointed at the castle: first view = shops on both
   sides, castle at the end. Keep a small open square in front of the castle as the main fighting space.
   Street about one block long (the map is small).
2. ~3 modular Victorian storefront styles, 2–3 storeys: bay windows, balconies, trim, peaked/mansard roofs,
   recoloured in faded teal, plum, coral, mustard, cream. Names: Ashland Confectionery, Souvenirs, Ashland
   Emporium, Candy & Treats (+ a few more original ones).
3. Props: frayed striped awnings, gold-letter signs, some smashed windows, ivy, lamps, benches, purple castle
   banners, popcorn carts, bins.
4. Decay: puddles, paper, leaves, spilled popcorn; 1–2 dusty teddy bears behind broken glass, creepy not cute.
Realistic for a three.js FPS; don't copy every ornament. Cohesive, good-looking, fully playable > photoreal.
Facades need collision (players and zombies must not walk through), and the nav grid must stay valid.

## Tools
- `npm run build` must pass. Dev server: `npx vite --port 5199 --host 127.0.0.1` (run in background).
- Doors test: `python3 test_m13.py http://127.0.0.1:5199/` (must still pass).
- Screenshots: playwright with /usr/bin/google-chrome + swiftshader (see shots_world.py for the pattern:
  wait for `window.__ready === true`, `__debug.start(); __debug.god(true); __debug.quality('medium'); game.horde.running=false; game.horde.reset();`,
  `__debug.teleport(x,y,z); __debug.look(yaw,pitch)`). Triangle stats: `game.arena.stats`.
- Save milestone screenshots in shots/ and LOOK at them (Read the png) before finishing.
