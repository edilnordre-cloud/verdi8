"""Estrae i dati delle 4 unità dalle pagine attuali in tools/unita.json (una volta sola)."""
import re, json, html as H
ORD=['app-a','app-b','attico','villa-c']
NAMES={'app-a':'App. A','app-b':'App. B','attico':'Attico','villa-c':'Villa C'}
out={}
for u in ORD:
    s=open(f'{u}.html').read()
    g=lambda p,f=0: (re.search(p,s,re.S|f).group(1).strip() if re.search(p,s,re.S|f) else '')
    slides=re.findall(r'<div class="slide[^"]*" data-i="\d+"><img src="([^"]+)" alt="([^"]*)"',s)
    feats=[H.unescape(re.sub('<[^>]+>','',x)).strip() for x in re.findall(r'<div class="feat">(.*?)</div>',s)]
    specs=[(H.unescape(re.sub('<[^>]+>','',a)),H.unescape(b)) for a,b in re.findall(r'<div class="spec"><b>(.*?)</b><small>(.*?)</small>',s)]
    plans=re.findall(r'<figure class="plan-fig">.*?</figure>',s,re.S)
    others=re.findall(r'<a class="ocard" href="([^"]+)"><img src="([^"]+)" alt="([^"]*)"[^>]*>.*?<div class="ocard-name">(.*?)</div><div class="ocard-sub">(.*?)</div>',s,re.S)
    out[u]={
      'name':NAMES[u],
      'title':g(r'<title>(.*?)</title>'),
      'desc':g(r'<meta name="description" content="([^"]*)"'),
      'og':{k:g(r'<meta (?:property|name)="'+re.escape(k)+r'" content="([^"]*)"') for k in ['og:title','og:description','og:image','og:url','twitter:card']},
      'tag':H.unescape(g(r'<p class="hero-tag">(.*?)</p>')),
      'h1':H.unescape(re.sub('<[^>]+>','',g(r'<h1 class="hero-title">(.*?)</h1>'))),
      'sub':H.unescape(g(r'<p class="hero-sub">(.*?)</p>')),
      'specs':specs,
      'price':g(r'class="pv">(.*?)<'),
      'price_note':H.unescape(re.sub('<[^>]+>','',g(r'class="pn">(.*?)</div>'))),
      'info':H.unescape(g(r'<p class="info-desc[^"]*">(.*?)</p>')),
      'feats':feats,
      'slides':slides,
      'plans':plans,
      'others':[dict(href=a,img=b,alt=c,name=d,sub=H.unescape(e)) for a,b,c,d,e in others],
      'cta_note':g(r'<p class="cta-note">(.*?)</p>'),
      'foot_note':g(r'<p class="foot-note">(.*?)</p>'),
    }
    print(u,len(slides),len(feats),specs,out[u]['price'],out[u]['price_note'],len(plans),len(out[u]['others']))
json.dump(out,open('tools/unita.json','w'),ensure_ascii=False,indent=1)
