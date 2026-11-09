/* Verdi 8 — comportamenti condivisi: testata a pillola, menu, indicatore */
(function(){
  var top=document.getElementById('top-bar');if(!top)return;
  var nav=top.querySelector('.tnav'),ind=nav&&nav.querySelector('.ind'),links=nav?[].slice.call(nav.querySelectorAll('a')):[];
  /* indicatore che scivola sotto la voce: segue il mouse, torna sulla sezione attiva */
  function moveTo(a){if(!ind)return;if(!a){ind.style.opacity=0;return;}
    ind.style.opacity=1;ind.style.width=a.offsetWidth+'px';ind.style.transform='translateX('+a.offsetLeft+'px)';}
  var active=null;
  links.forEach(function(a){a.addEventListener('mouseenter',function(){moveTo(a);});});
  if(nav)nav.addEventListener('mouseleave',function(){moveTo(active);});
  var secs=links.map(function(a){var h=a.getAttribute('href');return h&&h.charAt(0)==='#'?document.querySelector(h):null;});
  if('IntersectionObserver' in window&&secs.some(Boolean)){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting)return;var i=secs.indexOf(e.target);
      if(i>=0){active=links[i];links.forEach(function(l){l.classList.toggle('on',l===active);});moveTo(active);}});},{rootMargin:'-45% 0px -50% 0px'});
    secs.forEach(function(s){if(s)io.observe(s);});
  }
  /* sfondo più pieno dopo l'apertura; si nasconde scendendo, torna risalendo */
  var last=0;
  addEventListener('scroll',function(){var y=scrollY;top.classList.toggle('scrolled',y>40);
    if(!document.body.classList.contains('menu-open'))top.classList.toggle('hide',y>last&&y>500);last=y;},{passive:true});
  /* menu del telefono: si apre a cerchio dal pulsante */
  var b=top.querySelector('.burger'),m=document.getElementById('mnav');
  if(b&&m){
    b.addEventListener('click',function(){var r=b.getBoundingClientRect();
      m.style.setProperty('--mx',(r.left+r.width/2)+'px');m.style.setProperty('--my',(r.top+r.height/2)+'px');
      var open=document.body.classList.toggle('menu-open');b.setAttribute('aria-expanded',open);m.setAttribute('aria-hidden',!open);});
    m.addEventListener('click',function(e){if(e.target.closest('a')){document.body.classList.remove('menu-open');b.setAttribute('aria-expanded',false);}});
    addEventListener('keydown',function(e){if(e.key==='Escape')document.body.classList.remove('menu-open');});
  }
})();
