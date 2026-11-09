"""Genera le 4 pagine unità da un unico modello.
Dati: tools/unita.json (estratti una volta dalle pagine originali).
Uso: python3 tools/genera_unita.py
"""
import json, re, html

D = json.load(open('tools/unita.json'))
ORD = ['app-a', 'app-b', 'attico', 'villa-c']
ARR = '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 7h10M8 3l4 4-4 4"/></svg>'
CHK = '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M2 7l3.5 3.5L12 3"/></svg>'
L = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M10 3L5 8l5 5"/></svg>'
R = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>'
UPR = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M7 17 17 7M9 7h8v8"/></svg>'
e = html.escape


def misura(val):
    """'129,9 m²' -> numero da far contare + unità piccola"""
    m = re.match(r'([\d.,]+)\s*(.*)', val)
    if not m:
        return e(val)
    num, unit = m.group(1), m.group(2)
    u = f'<small>{e(unit)}</small>' if unit else ''
    return f'<b data-n="{num}">{num}{u}</b>'


def pagina(k):
    u = D[k]
    i = ORD.index(k)
    prev, nxt = ORD[i - 1], ORD[(i + 1) % 4]
    sp = u['specs']
    slides = ''.join(
        f'<div class="slide{" on" if j == 0 else ""}"><img src="{s}" alt="{e(a)}" '
        f'loading="{"eager" if j < 2 else "lazy"}" decoding="async"'
        f'{" fetchpriority=\"high\"" if j == 0 else ""}{" style=\"view-transition-name:hero\"" if j == 0 else ""}></div>'
        for j, (s, a) in enumerate(u['slides']))
    thumbs = ''.join(
        f'<button type="button" aria-label="Foto {j+1}"><img src="{s}" alt="" loading="lazy" decoding="async"></button>'
        for j, (s, a) in enumerate(u['slides']))
    feats = ''.join(f'<li>{CHK}<span>{e(f)}</span></li>' for f in u['feats'])
    others = ''.join(
        f'<a class="ocard rv" href="{o["href"]}"><img src="{o["img"]}" alt="{e(o["alt"])}" loading="lazy">'
        f'<div class="in"><span class="ty">{e(o["alt"])}</span><h3>{e(o["name"])}</h3><p>{e(o["sub"])}</p></div></a>'
        for o in u['others'])
    og = '\n'.join(f'<meta {"name" if k2.startswith("twitter") else "property"}="{k2}" content="{e(v)}">' for k2, v in u['og'].items() if v)
    mnav = ''.join(f'<a href="{x}.html"{" aria-current=\"page\"" if x == k else ""}>{D[x]["name"]}</a>' for x in ORD)
    est_label = sp[2][1].lower()
    return f'''<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{e(u["title"])}</title>
<meta name="description" content="{e(u["desc"])}">
<meta name="theme-color" content="#080808">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%23080808'/><text x='16' y='24' font-size='20' font-weight='bold' text-anchor='middle' fill='%239dc0aa' font-family='Arial'>8</text></svg>">
{og}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Schibsted+Grotesk:wght@700;800;900&display=swap" rel="stylesheet">
<link rel="preload" as="image" href="{u["slides"][0][0]}" fetchpriority="high">
<link rel="stylesheet" href="assets/v8.css">
<link rel="stylesheet" href="assets/unita.css">
</head>
<body>
<script>document.documentElement.classList.add('js');</script>

<header class="top" id="top-bar">
  <a class="brand" href="index.html" aria-label="Residenza Verdi 8, homepage">VERD<em>I</em>8</a>
  <span class="by"><span>un progetto</span><img src="images/index_2.png" alt="Edilnord RE"></span>
  <div class="unav">
    <a href="{prev}.html" aria-label="Unità precedente: {D[prev]["name"]}" title="{D[prev]["name"]}">{L}</a>
    <span class="pos">{i+1} / 4</span>
    <a href="{nxt}.html" aria-label="Unità successiva: {D[nxt]["name"]}" title="{D[nxt]["name"]}">{R}</a>
  </div>
  <a class="all" href="index.html#unita" data-back>Tutte le unità</a>
  <span class="tb" title="Proposte d'acquisto: Tecnobriantea Immobiliare"><img src="images/index_3.png" alt="Tecnobriantea Immobiliare"></span>
  <a class="tcta" href="#contatti"><span class="lbl-l">Prenota una visita</span><span class="lbl-s">Visita</span><span class="arr" aria-hidden="true">{UPR}</span></a>
  <button class="burger" type="button" aria-label="Menu" aria-expanded="false" aria-controls="mnav"><span></span><span></span><span></span></button>
</header>
<nav class="mnav" id="mnav" aria-label="Menu" aria-hidden="true">
  <a href="index.html#unita" data-back>Tutte le unità</a>{mnav}
  <span class="mtb">Proposte d'acquisto con <img src="images/index_3.png" alt="Tecnobriantea Immobiliare"></span>
</nav>

<main class="wrap scheda">
  <section class="media" aria-label="Foto, planimetria e modello 3D di {e(u["name"])}">
    <div class="mbox">
      <div class="mtabs" role="tablist" aria-label="Cosa vuoi vedere">
        <span class="pill" aria-hidden="true"></span>
        <button type="button" role="tab" data-v="foto" aria-selected="true">Foto</button>
        <button type="button" role="tab" data-v="plan" aria-selected="false">Planimetria</button>
        <button type="button" role="tab" data-v="3d" aria-selected="false">3D</button>
      </div>
      <div class="mview mfoto on" data-v="foto">
        <div class="track" id="track">{slides}</div>
        <button class="gnav gprev" type="button" aria-label="Foto precedente">{L}</button>
        <button class="gnav gnext" type="button" aria-label="Foto successiva">{R}</button>
        <div class="gcount"><span id="gNow">01</span> <span>/ {len(u["slides"]):02d}</span></div>
        <button class="gzoom" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>Schermo intero</button>
        <div class="gbar"><i></i></div>
      </div>
      <div class="mview mplan" data-v="plan">{"".join(u["plans"])}</div>
      <div class="mview m3d" data-v="3d" data-u="{k}">
        <canvas class="v8-gl" id="unitGl" aria-label="Modello 3D di {e(u["name"])}, trascina per ruotarlo"></canvas>
        <span class="src">Ricostruito dalle tavole di progetto</span>
        <p class="hint">Trascina per ruotare</p>
      </div>
    </div>
    <div class="thumbs" aria-label="Miniature">{thumbs}</div>
  </section>

  <article class="info">
    <nav class="crumb" aria-label="Percorso"><a href="index.html">Residenza Verdi 8</a><span aria-hidden="true">›</span><a href="index.html#unita" data-back>Unità</a><span aria-hidden="true">›</span><span>{e(u["name"])}</span></nav>
    <p class="tag">{e(u["tag"])}</p>
    <h1>{e(u["h1"])}</h1>
    <p class="addr">Via Giuseppe Verdi 8, 20861 Brugherio (MB)</p>
    <div class="price"><b>{e(u["price"])}</b><span>{e(u["price_note"])}</span></div>
    <div class="ruler">
      <div>{misura(sp[0][0])}<span>superficie commerciale</span></div>
      <div>{misura(sp[1][0])}<span>locali</span></div>
      <div>{misura(sp[2][0])}<span>{e(est_label)}</span></div>
    </div>
    <div class="energy" aria-label="Classe energetica A">
      <div class="row"><span>Classe energetica</span><b>A</b></div>
      <div class="ebar" aria-hidden="true"><span>A</span><span>B</span><span>C</span><span>D</span><span>E</span><span>F</span><span>G</span></div>
    </div>
    <div class="ctas" id="contatti">
      <a class="btn-mag" href="https://www.edilnordre.it" target="_blank" rel="noopener">Prenota una visita privata{ARR}</a>
      <a class="btn-ghost" href="#casa">Caratteristiche</a>
    </div>
    <p class="note">{u["cta_note"]}</p>
  </article>
</main>

<section class="blk" id="casa">
  <div class="wrap">
    <div class="blk-head rv">
      <h2>La casa</h2>
      <p class="lead">{e(u["info"])}</p>
    </div>
    <ul class="feats rv">{feats}</ul>
  </div>
</section>

<section class="blk">
  <div class="wrap">
    <h2 class="rv">Le altre unità</h2>
    <div class="ogrid">{others}</div>
  </div>
</section>

<section class="valuta">
  <div class="in wrap rv">
    <p class="section-tag">Edilnord RE · Servizi</p>
    <h2>Devi vendere il tuo <em>immobile?</em></h2>
    <p class="l1">Scopri quanto vale in 2 minuti. Valutazione professionale <strong>gratuita e senza impegno</strong>, con dati OMI 2026.</p>
    <p class="l2">Da oltre vent'anni a Brugherio e nella Monza-Brianza: due consulenti che conoscono ogni via. Ti accompagniamo nella vendita, nell'acquisto, nella locazione e nella gestione del tuo patrimonio, con chiarezza e cura in ogni passo.</p>
    <div class="vstats"><div><b>20+</b><small>anni di esperienza</small></div><div><b>8</b><small>comuni serviti</small></div><div><b>2 min</b><small>per la stima</small></div></div>
    <a class="btn-mag" href="https://edilnordre.it/valutazione-immobile-gratuita-brugherio/" target="_blank" rel="noopener">Valutazione gratuita{ARR}</a>
  </div>
</section>

<footer class="foot">
  <div class="wrap">
    <div class="brand">VERD<em>I</em>8</div>
    <div class="who">
      <a href="https://www.edilnordre.it" target="_blank" rel="noopener"><img src="images/index_2.png" alt="Edilnord RE"></a>
      <a class="tb" href="https://www.tecnobriantea.it" target="_blank" rel="noopener"><img src="images/index_3.png" alt="Tecnobriantea Immobiliare">Tecnobriantea Immobiliare</a>
    </div>
    <p class="legal">{u["foot_note"]}</p>
  </div>
</footer>

<div class="lb" id="lb" role="dialog" aria-modal="true" aria-label="Foto a schermo intero" aria-hidden="true">
  <img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==">
  <button class="x" type="button" aria-label="Chiudi"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 3l10 10M13 3L3 13"/></svg></button>
  <button class="p" type="button" aria-label="Foto precedente">{L}</button>
  <button class="n" type="button" aria-label="Foto successiva">{R}</button>
  <span class="c"></span>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://unpkg.com/lenis@1.1.14/dist/lenis.min.js"></script>
<script src="assets/v8.js"></script>
<script src="assets/unita.js"></script>
</body>
</html>
'''


for k in ORD:
    open(f'{k}.html', 'w').write(pagina(k))
    print('scritta', k)
