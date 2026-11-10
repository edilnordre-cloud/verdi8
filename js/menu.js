/* Menu Verdi8: indicatore che scorre sotto le voci, menu a tutto schermo su telefono (come sul nuovo sito Edilnord RE) */
(function(){
  var H=document.querySelector('.eh');if(!H)return;
  var nav=H.querySelector('.eh-nav'),ind=nav&&nav.querySelector('.eh-ind');
  if(nav&&ind){
    [].forEach.call(nav.querySelectorAll('a'),function(a){['mouseenter','focus'].forEach(function(ev){a.addEventListener(ev,function(){
      ind.style.width=a.offsetWidth+'px';ind.style.transform='translateX('+a.offsetLeft+'px)';ind.style.opacity=1;});});});
    nav.addEventListener('mouseleave',function(){ind.style.opacity=0;});
  }
  var b=document.getElementById('ehBurger'),mn=document.getElementById('ehMnav'),R=document.documentElement;if(!b||!mn)return;
  function set(o){
    var r=b.getBoundingClientRect();mn.style.setProperty('--mx',(r.left+r.width/2)+'px');mn.style.setProperty('--my',(r.top+r.height/2)+'px');
    R.classList.toggle('eh-menu',o);b.setAttribute('aria-expanded',o);b.setAttribute('aria-label',o?'Chiudi il menu':'Apri il menu');
    if(window.__lenis)try{o?window.__lenis.stop():window.__lenis.start();}catch(e){}
  }
  b.addEventListener('click',function(){set(!R.classList.contains('eh-menu'));});
  addEventListener('keydown',function(e){if(e.key==='Escape'&&R.classList.contains('eh-menu')){set(false);b.focus();}});
  [].forEach.call(mn.querySelectorAll('a'),function(a){a.addEventListener('click',function(){set(false);});});
})();
