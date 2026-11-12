# Ashland 2 check: walk spawn -> castle square holding W (steering toward x=0), then let zombies spawn and chase. usage: verify_a2.py URL
import sys, json, time
from playwright.sync_api import sync_playwright
url = sys.argv[1]; errs = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 640, 'height': 360})
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    if 'vercel.app' in url: pg.route('**/api/scores', lambda r: r.abort() if r.request.method == 'POST' else r.continue_())
    pg.goto(url); pg.wait_for_function('window.__ready === true', timeout=240000); ev = pg.evaluate
    ev("__debug.start(); __debug.god(true); __debug.quality('medium'); game.horde.running = false; game.horde.reset()")
    print('spawn', ev("[game.player.pos.x, game.player.pos.y, game.player.pos.z, game.player.yaw, game.player.pitch].map(v=>+v.toFixed(3))"))
    print('stats', ev("JSON.stringify(game.arena.stats)"))
    # walk with the real player physics + colliders (stepped in-page at 60 Hz, W held, steering at the square)
    W = ev("""() => { const P = game.player; game.state = 'paused'; P.reset(); const keys = new Set(['KeyW']);
      const inp = { mouse: { dx: 0, dy: 0, left: false, right: false }, sensitivity: 1, down: (k) => keys.has(k), hit: () => false, pressed: new Set(), keys };
      const track = []; let t = 0, stuck = 0, last = P.pos.z;
      for (let i = 0; i < 60 * 30; i++) { P.yaw = Math.atan2(P.pos.x, P.pos.z + 20); inp.mouse.dx = inp.mouse.dy = 0;
        P.update(1 / 60, inp, { lookScale: 1, ads: false, blockSprint: false, weightSpeed: 1 }); t += 1 / 60;
        if (i % 60 === 0) { track.push([+P.pos.x.toFixed(2), +P.pos.y.toFixed(2), +P.pos.z.toFixed(2)]); stuck = Math.abs(P.pos.z - last) < 0.2 ? stuck + 1 : 0; last = P.pos.z; }
        if (P.pos.z <= -19 || stuck >= 3) break; }
      game.state = 'play'; return { track, seconds: +t.toFixed(1), end: [P.pos.x, P.pos.z].map((v) => +v.toFixed(2)) }; }""")
    print('walk', json.dumps(W), 'reached square:', W['end'][1] <= -19, flush=True)
    # zombies: start waves, see they spawn and close on the player standing in the square
    ev("game.horde.running = true"); d0 = None
    for i in range(12):
        ev("__debug.frames(30)")
        n = ev("game.horde.enemies.length")
        d = ev("(() => { const P = game.player.pos; const e = game.horde.enemies; return e.length ? Math.min(...e.map(z => Math.hypot(z.pos.x - P.x, z.pos.z - P.z))) : null; })()")
        if d0 is None and d is not None: d0 = d
        if d is not None and d < 2.5: break
    print('zombies alive', n, 'first nearest dist', d0, 'final nearest dist', d, 'wave', ev("game.horde.wave"))
    print('ERRORS', len(errs), errs[:5])
    b.close()
