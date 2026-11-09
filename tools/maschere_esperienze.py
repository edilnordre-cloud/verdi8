"""Maschere per configuratore e sole: pavimento interno (senza muri né mobili) in
images/3d/<unità>-pavimento.png, e dati per la luce (scala e finestre) in -luce.json."""
import json, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd
OUT = 'images/3d/'
META = json.load(open(OUT + 'meta.json'))
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
    fm = Image.new('L', (muri.shape[1], muri.shape[0]), 0); dr = ImageDraw.Draw(fm)
    for it in json.load(open(OUT + f'{u}-mobili.json'))['mobili']:
        dr.polygon([tuple(p) for p in it['o']], fill=255)
    furn = np.asarray(fm) > 0
    floor = inside & ~nd.binary_dilation(muri, iterations=1) & ~furn
    floor = nd.binary_opening(floor, iterations=1)
    Image.fromarray((floor * 255).astype(np.uint8), 'L').save(OUT + f'{u}-pavimento.png', optimize=True)
    wd = META[u]['wood']; pxm = (wd[3] - wd[1]) / 12.0
    geo = json.load(open(OUT + f'{u}-geo.json'))
    json.dump({'pxm': round(pxm, 2), 'finestre': geo['finestre']}, open(OUT + f'{u}-luce.json', 'w'), separators=(',', ':'))
    print(u, round(floor.mean() * 100, 1), '% pavimento', round(pxm, 1), 'px/m', len(geo['finestre']), 'finestre')
