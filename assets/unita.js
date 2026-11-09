/* Verdi 8 — scheda unità: galleria trascinabile, Foto/Planimetria/3D, misure, lightbox */
(function(){
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $=function(s,r){return (r||document).querySelector(s);},$$=function(s,r){return [].slice.call((r||document).querySelectorAll(s));};

  /* ---------- schede Foto / Planimetria / 3D ---------- */
  var tabs=$$('.mtabs button'),pill=$('.mtabs .pill'),views=$$('.mview'),thumbs=$('.thumbs'),gl3d=null;
  function movePill(b){pill.style.width=b.offsetWidth+'px';pill.style.transform='translateX('+(b.offsetLeft)+'px)';}
  function view(name){
    tabs.forEach(function(b){var on=b.dataset.v===name;b.setAttribute('aria-selected',on);if(on)movePill(b);});
    views.forEach(function(v){v.classList.toggle('on',v.dataset.v===name);});
    if(thumbs)thumbs.style.visibility=name==='foto'?'visible':'hidden';
    if(name==='3d')start3d();else if(gl3d)gl3d.hide();
  }
  tabs.forEach(function(b){b.addEventListener('click',function(){view(b.dataset.v);});});
  addEventListener('resize',function(){var b=$('.mtabs button[aria-selected="true"]');if(b)movePill(b);});
  requestAnimationFrame(function(){var b=$('.mtabs button[aria-selected="true"]');if(b)movePill(b);});

  /* il 3D si carica solo quando serve: three.js pesa, chi non lo apre non lo scarica */
  function load(src){return new Promise(function(ok,ko){var s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=ko;document.head.appendChild(s);});}
  function start3d(){
    var box=$('.m3d');if(gl3d){gl3d.show();return;}
    (window.THREE?Promise.resolve():load('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'))
      .then(function(){return window.V8_3D?0:load('assets/v8-3d.js');})
      .then(function(){
        if(!V8_3D.ok()){box.querySelector('.hint').textContent='Il modello 3D non è disponibile su questo dispositivo.';return;}
        gl3d=V8_3D.floor($('#unitGl'),box.dataset.u);gl3d.show();})
      .catch(function(){box.querySelector('.hint').textContent='Il modello 3D non si è caricato. Riprova più tardi.';});
  }

  /* ---------- galleria: trascina, scorri con le frecce, miniature ---------- */
  var track=$('#track'),slides=$$('.slide',track),n=slides.length,i=0,count=$('#gNow'),bar=$('.gbar i'),tb=$$('.thumbs button');
  function go(k,instant){
    i=(k+n)%n;
    track.style.transition=instant||reduce?'none':'transform .7s cubic-bezier(.22,1,.36,1)';
    track.style.transform='translate3d('+(-i*100)+'%,0,0)';
    slides.forEach(function(s,j){s.classList.toggle('on',j===i);var im=s.querySelector('img');if(Math.abs(j-i)<=1&&im.loading==='lazy')im.loading='eager';});
    count.textContent=String(i+1).padStart(2,'0');bar.style.transform='scaleX('+((i+1)/n)+')';
    tb.forEach(function(b,j){b.setAttribute('aria-current',j===i);});
    if(tb[i]&&thumbs){var t=tb[i];thumbs.scrollTo({left:t.offsetLeft-thumbs.clientWidth/2+t.clientWidth/2,behavior:reduce?'auto':'smooth'});}
  }
  $('.gprev').addEventListener('click',function(){go(i-1);});$('.gnext').addEventListener('click',function(){go(i+1);});
  tb.forEach(function(b,j){b.addEventListener('click',function(){go(j);});});
  addEventListener('keydown',function(e){if($('.lb.open'))return;if(!$('.mfoto.on'))return;
    if(e.key==='ArrowRight')go(i+1);if(e.key==='ArrowLeft')go(i-1);});
  /* trascinamento con inerzia: segue il dito 1:1, al rilascio decide la velocità */
  var down=false,x0=0,y0=0,dx=0,t0=0,w=1,axis=null;
  track.addEventListener('pointerdown',function(e){down=true;axis=null;x0=e.clientX;y0=e.clientY;dx=0;t0=performance.now();w=track.clientWidth;track.style.transition='none';});
  addEventListener('pointermove',function(e){if(!down)return;var mx=e.clientX-x0,my=e.clientY-y0;
    if(axis===null&&Math.abs(mx)+Math.abs(my)>6)axis=Math.abs(mx)>Math.abs(my)?'x':'y';
    if(axis!=='x')return;dx=mx;
    /* ai bordi resiste come un elastico */
    var edge=(i===0&&dx>0)||(i===n-1&&dx<0)?.35:1;
    track.classList.add('drag');track.style.transform='translate3d(calc('+(-i*100)+'% + '+(dx*edge)+'px),0,0)';});
  addEventListener('pointerup',function(){if(!down)return;down=false;track.classList.remove('drag');
    var v=dx/Math.max(1,performance.now()-t0);
    if(axis==='x'&&(Math.abs(dx)>w*.18||Math.abs(v)>.45))go(i+(dx<0?1:-1));else if(axis==='x')go(i);
    else if(axis===null&&Math.abs(dx)<4)openLb(i);
    axis=null;});
  go(0,true);

  /* ---------- lightbox ---------- */
  var lb=$('#lb'),lbi=$('#lb img'),lbc=$('#lb .c'),li=0;
  function show(k){li=(k+n)%n;var im=slides[li].querySelector('img');lbi.src=im.currentSrc||im.src;lbi.alt=im.alt;lbc.textContent=(li+1)+' / '+n;}
  function openLb(k){show(k);lb.classList.add('open');lb.setAttribute('aria-hidden','false');$('#lb .x').focus();}
  function closeLb(){lb.classList.remove('open');lb.setAttribute('aria-hidden','true');go(li);}
  $('.gzoom').addEventListener('click',function(){openLb(i);});
  $('#lb .x').addEventListener('click',closeLb);$('#lb .p').addEventListener('click',function(){show(li-1);});$('#lb .n').addEventListener('click',function(){show(li+1);});
  addEventListener('keydown',function(e){if(!lb.classList.contains('open'))return;if(e.key==='Escape')closeLb();if(e.key==='ArrowRight')show(li+1);if(e.key==='ArrowLeft')show(li-1);});
  var lx=0;lb.addEventListener('touchstart',function(e){lx=e.touches[0].clientX;},{passive:true});
  lb.addEventListener('touchend',function(e){var d=e.changedTouches[0].clientX-lx;if(Math.abs(d)>50)show(li+(d<0?1:-1));});

  /* ---------- misure che contano, righello e classe energetica ---------- */
  function countUp(el){var t=el.dataset.n;if(!t)return;var dec=(t.split(',')[1]||'').length,end=parseFloat(t.replace(',','.')),s=performance.now(),u=el.querySelector('small');
    var unit=u?u.outerHTML:'';
    (function f(now){var p=Math.min(1,(now-s)/1300),e=1-Math.pow(1-p,3),v=(end*e).toFixed(dec).replace('.',',');el.innerHTML=v+unit;if(p<1)requestAnimationFrame(f);})(s);}
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting)return;var el=e.target;el.classList.add('in');
      if(el.classList.contains('ruler')&&!reduce)$$('b[data-n]',el).forEach(countUp);io.unobserve(el);});},{threshold:.25});
  $$('.ruler,.energy,.rv').forEach(function(el){io.observe(el);});

  /* ---------- "Tutte le unità": se arrivi dalla homepage torni dov'eri ---------- */
  $$('a[data-back]').forEach(function(b){b.addEventListener('click',function(e){try{
    var r=document.referrer?new URL(document.referrer):null;
    if(r&&r.origin===location.origin&&/\/(index\.html)?$/.test(r.pathname)&&history.length>1){e.preventDefault();history.back();}}catch(_){}});});

  /* ---------- scorrimento morbido sul computer ---------- */
  if(window.Lenis&&!reduce&&!matchMedia('(pointer: coarse)').matches){var l=new Lenis({lerp:.09,smoothWheel:true});(function r(t){l.raf(t);requestAnimationFrame(r);})(0);}
})();
