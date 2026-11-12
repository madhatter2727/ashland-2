# Usage: python3 colmap.py URL OUT.png  — top-down map of colliders (grey=walk, red=block, blue=nav blocked)
import sys, json
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw
url, out = sys.argv[1], sys.argv[2]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 320, 'height': 200})
    pg.goto(url); pg.wait_for_function('window.__ready === true', timeout=240000)
    cols = pg.evaluate("game.arena.colliders.filter(c=>!c.ground).map(c=>[c.minX,c.maxX,c.minZ,c.maxZ,c.maxY,c.walk?1:0])")
    nav = pg.evaluate("Array.from(game.horde.nav.blocked)")
    b.close()
S, R = 12, 46
img = Image.new('RGB', (2 * R * S, 2 * R * S), (30, 30, 30)); d = ImageDraw.Draw(img)
X = lambda x: (x + R) * S
N = 72
for i, v in enumerate(nav):
    if v: gx, gz = i % N, i // N; d.rectangle([X(gx - 36), X(gz - 36), X(gx - 35) - 1, X(gz - 35) - 1], fill=(40, 50, 110))
for x0, x1, z0, z1, y, w in cols:
    d.rectangle([X(max(x0, -R)), X(max(z0, -R)), X(min(x1, R)), X(min(z1, R))], outline=(150, 150, 150) if w else (230, 60, 60))
for k in range(-45, 46, 5):
    d.line([X(k), 0, X(k), 2 * R * S], fill=(70, 70, 70) if k else (120, 200, 120)); d.line([0, X(k), 2 * R * S, X(k)], fill=(70, 70, 70) if k else (120, 200, 120))
    d.text((X(k) + 2, 2), str(k), fill=(200, 200, 200)); d.text((2, X(k) + 2), str(k), fill=(200, 200, 200))
d.rectangle([X(-36), X(-36), X(36), X(36)], outline=(200, 200, 0))
img.save(out); print('cols', len(cols))
