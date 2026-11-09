"""Mobili e involucro dalle tavole: riconosce i mobili disegnati (piatti, di colore
uniforme) rispetto al parquet (venato) e alle piastrelle, assegna l'altezza in base al
tipo, e ricava parapetti dei balconi e copertura. Uscita: images/3d/<unità>-mobili.json"""
import json, numpy as np
from PIL import Image
from scipy import ndimage as nd
from skimage import measure

OUT = 'images/3d/'


def contorno(comp, tol=1.0):
    pad = np.pad(comp, 1)
    cs = measure.find_contours(pad.astype(float), .5)
    if not cs:
        return None
    c = max(cs, key=len)
    c = measure.approximate_polygon(c, tol)
    return c


for u in ['app-a', 'app-b', 'attico', 'villa-c']:
    cut = np.asarray(Image.open(OUT + f'{u}-cut.webp').convert('RGBA')).astype(float)
    rgb, a = cut[..., :3], cut[..., 3] / 255
    keep = a > .5
    muri = np.asarray(Image.open(OUT + f'{u}-muri.png')) > 127
    lum = rgb.mean(2); chroma = rgb.max(2) - rgb.min(2)
    R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    # quanto è "piatta" la zona: il parquet è venato, i mobili sono campiture uniformi
    m1 = nd.uniform_filter(lum, 9); m2 = nd.uniform_filter(lum * lum, 9)
    sd = np.sqrt(np.clip(m2 - m1 * m1, 0, None))
    flat = sd < 5.5
    # interno dell'alloggio: ciò che i muri racchiudono
    parq = (chroma > 30) & (R > G) & (G > B) & (sd > 6)
    tiles = (lum > 170) & (lum < 232) & (chroma < 12)
    grass0 = (G > R + 12) & (G > B + 12)
    inside = nd.binary_fill_holes(nd.binary_closing(muri | parq, iterations=10)) & keep & ~grass0
    inside = nd.binary_opening(inside, iterations=4)
    dark = (lum < 125) & (chroma < 28)
    grey = (lum >= 118) & (lum < 182) & (chroma < 22)
    wood = (chroma > 38) & (R > G) & (G > B) & (lum > 95) & (lum < 200)
    white = (lum > 226) & (chroma < 24) & (sd < 10)
    sat = (chroma > 30) & ~wood & ~((G > R) & (G > B))      # coperte colorate dei letti
    furn = (((dark | grey | wood | sat) & flat) | white) & inside & ~nd.binary_dilation(muri, iterations=3)
    furn = nd.binary_fill_holes(nd.binary_closing(nd.binary_opening(furn, iterations=1), iterations=2))
    lab, n = nd.label(furn)
    items = []
    for i, sl in enumerate(nd.find_objects(lab), 1):
        comp = lab[sl] == i
        area = comp.sum()
        if area < 110:
            continue
        h_, w_ = comp.shape
        aspect = max(h_, w_) / max(1, min(h_, w_))
        f = lambda m: float((m[sl] & comp).sum()) / area
        fd, fg, fw, fwh, fs = f(dark), f(grey), f(wood), f(white), f(sat)
        mind = min(h_, w_)
        # un mobile riempie il suo rettangolo; le macchie di parquet no
        if area / float(h_ * w_) < .72:
            continue
        # le doghe del parquet: strisce di legno strette e lunghe
        if fw > .45 and (mind < 22 or aspect > 3.4):
            continue
        if fwh > .45 and aspect > 2.3 and fd < .04:
            hgt, kind = 2.1, 'armadio'
        elif fwh > .35 and aspect > 2.3 and fd >= .04:
            hgt, kind = .9, 'cucina'
        elif fs > .2 or (fwh > .35 and area > 2600):
            hgt, kind = .55, 'letto'
        elif fg > .5:
            hgt, kind = .78, 'divano'
        elif fw > .45:
            if area < 500:
                continue
            hgt, kind = (.76, 'tavolo') if area > 2200 else (.5, 'mobile')
        elif fd > .5:
            hgt, kind = (.82, 'sedia') if area < 1400 else (.5, 'mobile')
        elif fwh > .5:
            hgt, kind = .45, 'sanitario'
        else:
            continue
        c = contorno(comp)
        if c is None or len(c) < 4:
            continue
        oy, ox = sl[0].start - 1, sl[1].start - 1
        col = rgb[sl][comp].mean(0)
        items.append({'o': [[round(float(p[1] + ox), 1), round(float(p[0] + oy), 1)] for p in c],
                      'h': hgt, 'k': kind, 'c': '#%02x%02x%02x' % tuple(int(v) for v in col)})
    # parapetti: bordo esterno delle zone esterne pavimentate (balconi, terrazzi) fuori dall'alloggio
    grass = (G > R + 12) & (G > B + 12)
    est = keep & ~inside & ~grass & ~nd.binary_dilation(muri, iterations=2)
    est = nd.binary_opening(est, iterations=3)
    para = []
    nearin = nd.binary_dilation(inside, iterations=7)
    lab2, n2 = nd.label(est)
    for i, sl in enumerate(nd.find_objects(lab2), 1):
        comp = lab2[sl] == i
        if comp.sum() < 3000:
            continue
        c = contorno(comp, 1.5)
        if c is None:
            continue
        oy, ox = sl[0].start - 1, sl[1].start - 1
        pts = [(float(p[1] + ox), float(p[0] + oy)) for p in c]
        # il parapetto corre solo dove il balcone non tocca la facciata
        run = []
        for x, y in pts:
            yi, xi = int(round(y)), int(round(x))
            free = 0 <= yi < nearin.shape[0] and 0 <= xi < nearin.shape[1] and not nearin[yi, xi]
            if free:
                run.append([round(x, 1), round(y, 1)])
            elif len(run) > 1:
                para.append(run); run = []
            else:
                run = []
        if len(run) > 1:
            para.append(run)
    # copertura: la sagoma dell'alloggio, per chiudere l'ultimo piano come nei render
    roof = contorno(nd.binary_opening(inside, iterations=3), 2.0)
    roof = [[round(float(p[1]), 1), round(float(p[0]), 1)] for p in roof] if roof is not None else []
    json.dump({'mobili': items, 'parapetti': para, 'tetto': roof}, open(OUT + f'{u}-mobili.json', 'w'), separators=(',', ':'))
    from collections import Counter
    print(u, len(items), dict(Counter(x['k'] for x in items)), 'parapetti', len(para), 'tetto', len(roof))
