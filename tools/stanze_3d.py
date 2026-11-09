"""Stanze dalle tavole: zone interne separate dai muri, con il punto più lontano dai muri
(dove mettere la telecamera) e un nome dedotto dagli arredi. Uscita: images/3d/<unità>-stanze.json"""
import json, numpy as np
from PIL import Image
from scipy import ndimage as nd

OUT = 'images/3d/'
for u in ['app-a', 'app-b', 'attico', 'villa-c']:
    cut = np.asarray(Image.open(OUT + f'{u}-cut.webp').convert('RGBA')).astype(float)
    rgb, a = cut[..., :3], cut[..., 3] / 255
    keep = a > .5
    muri = np.asarray(Image.open(OUT + f'{u}-muri.png')) > 127
    lum = rgb.mean(2); chroma = rgb.max(2) - rgb.min(2)
    R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    m1 = nd.uniform_filter(lum, 9); m2 = nd.uniform_filter(lum * lum, 9)
    sd = np.sqrt(np.clip(m2 - m1 * m1, 0, None))
    parq = (chroma > 30) & (R > G) & (G > B) & (sd > 6)
    grass = (G > R + 12) & (G > B + 12)
    inside = nd.binary_fill_holes(nd.binary_closing(muri | parq, iterations=10)) & keep & ~grass
    inside = nd.binary_opening(inside, iterations=4)
    # un punto di vista per stanza: i massimi della distanza dai muri, ben separati
    from PIL import ImageDraw
    fm = Image.new('L', (muri.shape[1], muri.shape[0]), 0); dr = ImageDraw.Draw(fm)
    for it in json.load(open(OUT + f'{u}-mobili.json'))['mobili']:
        dr.polygon([tuple(p) for p in it['o']], fill=255)
    furn = np.asarray(fm) > 0
    wall_only = inside & ~nd.binary_dilation(muri, iterations=2)
    free = wall_only & ~nd.binary_dilation(furn, iterations=10)
    d = nd.distance_transform_edt(free)
    peaks = (d == nd.maximum_filter(d, size=121)) & (d > 30)
    ys, xs = np.nonzero(peaks)
    F = json.load(open(OUT + f'{u}-mobili.json'))['mobili']
    cen = [(np.mean([p[0] for p in it['o']]), np.mean([p[1] for p in it['o']]), it['k']) for it in F]
    tiles_m = (lum > 170) & (chroma < 12)
    out = []
    for y, x in sorted(zip(ys, xs), key=lambda t: -d[t[0], t[1]]):
        if any((x - o['p'][0]) ** 2 + (y - o['p'][1]) ** 2 < 120 ** 2 for o in out):
            continue
        near = [k for cx, cy, k in cen if (cx - x) ** 2 + (cy - y) ** 2 < 170 ** 2]
        win = tiles_m[max(0, y-40):y+40, max(0, x-40):x+40].mean()
        if 'letto' in near: name = 'Camera'
        elif 'divano' in near: name = 'Soggiorno'
        elif 'sanitario' in near or win > .6: name = 'Bagno'
        elif 'tavolo' in near or 'sedia' in near or 'cucina' in near: name = 'Cucina'
        else: name = 'Stanza'
        # guardo verso la direzione con più spazio libero davanti
        best = (0, 0.0)
        for ang in np.linspace(0, 2 * np.pi, 48, endpoint=False):
            dx, dy = np.sin(ang), -np.cos(ang); L = 0
            for t in range(4, 900, 4):
                xi, yi = int(x + dx * t), int(y + dy * t)
                if not (0 <= yi < wall_only.shape[0] and 0 <= xi < wall_only.shape[1]) or not wall_only[yi, xi]:
                    break
                L = t
            if L > best[0]:
                best = (L, ang)
        out.append({'n': name, 'p': [int(x), int(y)], 'a': int(d[y, x] * 100), 'r': round(float(d[y, x]), 1), 'y': round(float(best[1]), 3)})
    out.sort(key=lambda r: -r['a'])
    # nomi unici: Camera 1, Camera 2…
    cnt = {}
    for r in out:
        cnt[r['n']] = cnt.get(r['n'], 0) + 1
    seen = {}
    for r in out:
        if cnt[r['n']] > 1:
            seen[r['n']] = seen.get(r['n'], 0) + 1; r['n'] = f"{r['n']} {seen[r['n']]}"
    out = [r for r in out if not r['n'].startswith('Disimpegno')] or out
    json.dump(out, open(OUT + f'{u}-stanze.json', 'w'), separators=(',', ':'))
    print(u, [(r['n'], r['a']) for r in out])
