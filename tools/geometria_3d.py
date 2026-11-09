"""Dalle tavole alla geometria 3D: contorni dei muri, sagoma del solaio, finestre,
pavimento con ombre d'angolo. Uscita in images/3d/<unità>-geo.json e -floor.webp.
Uso: python3 tools/geometria_3d.py (le tavole originali sono in images/3d/*-cut.webp)."""
import json, numpy as np
from PIL import Image
from scipy import ndimage as nd
from skimage import measure

OUT = 'images/3d/'
TOL = 1.2   # semplificazione dei contorni, in pixel


def poligoni(mask, tol=TOL, minarea=40):
    """Contorni esterni con i loro fori, per ogni pezzo di muro."""
    lab, n = nd.label(mask)
    res = []
    for i, sl in enumerate(nd.find_objects(lab), 1):
        comp = lab[sl] == i
        if comp.sum() < minarea:
            continue
        pad = np.pad(comp, 1)
        cs = measure.find_contours(pad.astype(float), .5)
        cs = [measure.approximate_polygon(c, tol) for c in cs if len(c) > 3]
        if not cs:
            continue
        # il contorno con l'area più grande è quello esterno, gli altri sono fori
        def area(c):
            y, x = c[:, 0], c[:, 1]
            return abs(np.dot(x, np.roll(y, 1)) - np.dot(y, np.roll(x, 1))) / 2
        cs.sort(key=area, reverse=True)
        oy, ox = sl[0].start - 1, sl[1].start - 1
        conv = lambda c: [[round(float(p[1] + ox), 1), round(float(p[0] + oy), 1)] for p in c]
        res.append({'o': conv(cs[0]), 'h': [conv(c) for c in cs[1:] if area(c) > 25]})
    return res


for u in ['app-a', 'app-b', 'attico', 'villa-c']:
    cut = np.asarray(Image.open(OUT + f'{u}-cut.webp').convert('RGBA')).astype(float)
    rgb, a = cut[..., :3], cut[..., 3] / 255
    muri = np.asarray(Image.open(OUT + f'{u}-muri.png')) > 127
    keep = a > .5
    lum = rgb.mean(2); R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    # finestre: rettangoli azzurro chiaro accanto ai muri
    win = (B > R + 12) & (B > G + 2) & (lum > 185) & (lum < 240) & keep
    win = nd.binary_opening(win, iterations=1)
    near = nd.binary_dilation(muri, iterations=6)
    wins = []
    lab, n = nd.label(win)
    for i, sl in enumerate(nd.find_objects(lab), 1):
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if max(h, w) < 18 or min(h, w) < 4 or min(h, w) > 30:
            continue
        if not near[sl].any():
            continue
        wins.append([sl[1].start, sl[0].start, sl[1].stop, sl[0].stop])
    # sagoma del solaio (solo il pezzo principale e quelli grandi)
    sag = nd.binary_opening(keep, iterations=2)
    geo = {'muri': poligoni(muri), 'solaio': poligoni(sag, tol=2.0, minarea=4000), 'finestre': wins}
    json.dump(geo, open(OUT + f'{u}-geo.json', 'w'), separators=(',', ':'))
    # pavimento con ombre d'angolo: più scuro vicino ai muri, come la luce vera
    d = nd.distance_transform_edt(~muri)
    ao = 1 - .42 * np.exp(-d / 9.0)
    ao = nd.gaussian_filter(ao, 1.2)
    floor = np.clip(rgb * ao[..., None], 0, 255)
    Image.fromarray(np.dstack([floor, a * 255]).astype(np.uint8), 'RGBA').save(OUT + f'{u}-floor.webp', quality=86, method=6)
    pts = sum(len(p['o']) + sum(len(h) for h in p['h']) for p in geo['muri'])
    print(u, 'muri', len(geo['muri']), 'punti', pts, 'solaio', len(geo['solaio']), 'finestre', len(wins))
