# Ashland 2 milestone shots. Usage: python3 shots_a2.py URL [prefix=m1] [outdir=shots]
# views: spawn (the spawn pose from player.reset()), square (castle square looking at the castle),
# side (free camera high over the west roofs, looking across the street to the east side). Prints game.arena.stats, render info and console errors.
import sys, json, time
from playwright.sync_api import sync_playwright
url = sys.argv[1]; pre = sys.argv[2] if len(sys.argv) > 2 else 'm1'; out = sys.argv[3] if len(sys.argv) > 3 else 'shots'
errors = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    pg.on('console', lambda m: m.type == 'error' and errors.append(m.text))
    pg.on('pageerror', lambda e: errors.append(str(e)))
    t0 = time.time(); pg.goto(url); pg.wait_for_function('window.__ready === true', timeout=240000); print('load s', round(time.time() - t0, 1), flush=True)
    ev = pg.evaluate
    def gt(sec):
        t0 = ev('game.time')
        while ev('game.time') - t0 < sec: pg.wait_for_timeout(50)
    ev("__debug.start(); __debug.god(true); __debug.quality('medium'); game.horde.running=false; game.horde.reset(); game.fx.clear()")
    gt(0.6)
    print('spawn pose', ev("JSON.stringify({pos: game.player.pos.toArray(), yaw: game.player.yaw, pitch: game.player.pitch})"))
    pg.screenshot(path=f'{out}/{pre}-spawn.png'); print('shot spawn', flush=True)
    views = [('square', (0, 0, -12), (0, 0.16)), ('side', (-17, 21, 24), (-0.62, -0.42)),
             ('emporium', (-1.6, 0, -8.2), (1.14, 0.2)),      # ~6 m from W7 Ashland Emporium (cf. docs/2-emporium-closeup.png)
             ('shopc', (-1.6, 0, 19.2), (2.19, 0.18)),        # W2 Kettle Corn (style C) from across the walk
             ('shopb', (-2.0, 0, 11.0), (2.1, 0.22)),         # W3 Clockwork Toys (style B)
             ('alley', (-16, 0, 18.2), (-1.75, 0.1)),          # alley B from the gardens side, looking east
             ('souvenirs', (3.4, 0, 26.2), (-1.3, 0.12))]     # E1 Ashland Souvenirs' smashed pane (M3 teddy)
    only = sys.argv[4].split(',') if len(sys.argv) > 4 else None
    views = [v for v in views if not only or v[0] in only]
    for name, pos, look in views:
        if name == 'side':  # free camera (no player collision) above the west lots
            ev(f"__debug.cam({pos[0]}, {pos[1]}, {pos[2]}, {look[0]}, {look[1]})")
        else:
            ev(f"__debug.cam(); __debug.teleport({pos[0]}, {pos[1]}, {pos[2]}); __debug.look({look[0]}, {look[1]})")
        gt(0.6)
        pg.screenshot(path=f'{out}/{pre}-{name}.png'); print('shot', name, flush=True)
    ev("__debug.cam()")
    print('stats', ev('JSON.stringify(game.arena.stats)'))
    print('render', ev('JSON.stringify(game.renderer.info.render)'))
    print('info', json.dumps(ev('__debug.info()')))
    print('ERRORS:', len(errors)); [print('  ', e[:300]) for e in errors[:10]]
    b.close()
