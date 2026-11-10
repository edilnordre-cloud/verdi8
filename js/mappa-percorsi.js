/* Residenza Verdi8 — piantina con i percorsi reali da Via Verdi 8.
   Stessa logica della home Edilnord RE: strade vere (OpenStreetMap), il percorso si illumina allo scroll
   e la camera segue l'auto. Dati in js/mappa-dati.js (caricato solo quando la sezione si avvicina). */
(function(){
  var sec=document.getElementById('posizione');if(!sec||!sec.classList.contains('pm'))return;
  var REDUCE=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DEST=[
    {k:'increa',name:'Parco Increa',label:'Parco Increa',txt:'Il grande parco di Brugherio, con il lago e i percorsi nel verde.'},
    {k:'tang',name:'Tangenziale Est',label:'Tangenziale Est A51',txt:'Svincolo Cernusco sul Naviglio / Brugherio: da qui A51 e A4 in pochi minuti.'},
    {k:'mm2',name:'Metro MM2 Cologno Nord',label:'MM2 Cologno Nord',txt:'La linea verde della metropolitana: il centro di Milano anche senza auto.'},
    {k:'milano',name:'Milano centro',label:'Piazza del Duomo',txt:'Dalla porta di casa a Piazza del Duomo, in auto senza traffico.'}
  ];
  var NS='http://www.w3.org/2000/svg';
  var svg=document.getElementById('pmMap'),layer=document.getElementById('pmLayer'),stb=document.getElementById('pmStb');
  var lit=document.getElementById('pmLit'),base=document.getElementById('pmBase'),car=document.getElementById('pmCar'),home=document.getElementById('pmHome'),bar=document.getElementById('pmBar');
  var built=false;

  function load(){
    if(built)return;built=true;
    if(window.V8MAP){build();return;}
    var s=document.createElement('script');s.src='js/mappa-dati.js';s.onload=build;document.head.appendChild(s);
  }
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(e){if(e[0].isIntersecting){io.disconnect();load();}},{rootMargin:'1600px 0px'});io.observe(sec);
  } else load();

  function fmtKm(v){return String(v).replace('.',',');}

  function build(){
    var D=window.V8MAP;if(!D)return;
    /* --- strade per classe, parchi, acqua --- */
    var cls=[[],[],[],[],[]];
    D.ways.forEach(function(w){var o='';for(var i=1;i<w.length;i+=2)o+=(i===1?'M':'L')+w[i]+' '+w[i+1];cls[w[0]].push(o);});
    var st='';for(var c=4;c>=0;c--)st+='<path class="w'+c+'" d="'+cls[c].join('')+'"/>';
    svg.querySelector('.pm-streets').innerHTML=st;
    var poly=function(a){var o='';for(var i=0;i<a.length;i+=2)o+=(i?'L':'M')+a[i]+' '+a[i+1];return o+'Z';};
    svg.querySelector('.pm-parks').innerHTML='<path class="pk" d="'+D.parks.map(poly).join('')+'"/><path class="wt" d="'+D.water.map(poly).join('')+'"/>';
    var g3=svg.querySelector('.pm-streets .w3'),g4=svg.querySelector('.pm-streets .w4'),g2=svg.querySelector('.pm-streets .w2');

    /* --- percorsi: punti, lunghezze cumulative, ingombro progressivo --- */
    var R=DEST.map(function(d){
      var p=D.routes[d.k].p,P=[],C=[0],bb=[];
      for(var i=0;i<p.length;i+=2)P.push([p[i],p[i+1]]);
      var x0=0,y0=0,x1=0,y1=0;
      P.forEach(function(q,i){if(i)C.push(C[i-1]+Math.hypot(q[0]-P[i-1][0],q[1]-P[i-1][1]));x0=Math.min(x0,q[0]);y0=Math.min(y0,q[1]);x1=Math.max(x1,q[0]);y1=Math.max(y1,q[1]);bb.push([x0,y0,x1,y1]);});
      var done=document.createElementNS(NS,'path');done.setAttribute('class','rdone');done.setAttribute('d','M'+P.map(function(q){return q[0]+' '+q[1]}).join('L'));
      svg.querySelector('.pm-routes').appendChild(done);
      var pin=document.createElement('div');pin.className='pm-dest'+(d.k==='milano'?' last':'');
      pin.innerHTML='<span class="n">'+D.routes[d.k].min+'′</span><span class="l">'+d.label+'</span>';layer.appendChild(pin);
      return {d:d,P:P,C:C,T:C[C.length-1],bb:bb,done:done,pin:pin,km:D.routes[d.k].km,min:D.routes[d.k].min,full:done.getAttribute('d')};
    });
    function at(r,f){var d=f*r.T,k=1;while(k<r.C.length-1&&r.C[k]<d)k++;var a=r.P[k-1],b=r.P[k],t=(d-r.C[k-1])/((r.C[k]-r.C[k-1])||1);return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,k];}
    function upto(r,f){var q=at(r,f),o='M0 0';for(var k=1;k<q[2];k++)o+='L'+r.P[k][0]+' '+r.P[k][1];return o+'L'+q[0].toFixed(1)+' '+q[1].toFixed(1);}

    /* --- schede --- */
    var arr='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M7 17 17 7M9 7h8v8"/></svg>';
    var html='';
    R.forEach(function(r,i){
      var tb='';for(var j=0;j<R.length;j++)tb+='<i'+(j<=i?' class="on"':'')+'></i>';
      html+='<article class="pm-st"><div class="tb" aria-hidden="true">'+tb+'</div><p class="k">Tappa '+(i+1)+' di '+R.length+'</p><h3>'+r.d.name+'</h3>'+
        '<div class="m"><div><b>'+r.min+' min</b><small>in auto</small></div><div><b>'+fmtKm(r.km)+' km</b><small>di strada</small></div></div><p>'+r.d.txt+'</p></article>';
    });
    html+='<article class="pm-st"><p class="k">Residenza Verdi8</p><h3>Tutto a portata di mano.</h3><ul>'+
      R.map(function(r){return '<li><span>'+r.d.name+'</span><b>'+r.min+' min</b></li>'}).join('')+'</ul>'+
      '<a class="pm-gm" href="https://maps.google.com/?q=Via+Giuseppe+Verdi+8,+Brugherio+MB" target="_blank" rel="noopener">Apri in Google Maps<span>'+arr+'</span></a></article>';
    stb.insertAdjacentHTML('beforeend',html);
    var cards=[].slice.call(stb.querySelectorAll('.pm-st')),curCard=0;
    function card(n){if(n===curCard)return;curCard=n;cards.forEach(function(c,i){c.classList.toggle('on',i===n);});}

    /* --- camera --- */
    var VB={x:0,y:0,w:1,h:1,W:1,H:1},MIN=2300;
    function frame(b){ /* b = [x0,y0,x1,y1] da inquadrare nella parte libera dello schermo */
      var W=svg.clientWidth,H=svg.clientHeight,mob=W<=820;
      var fw=mob?.86:.52,fh=mob?.42:.7,cxF=mob?.5:.70,cyF=mob?.71:.52;
      var bw=Math.max(b[2]-b[0],1),bh=Math.max(b[3]-b[1],1);
      var vw=Math.max(MIN*(mob?.7:1),bw/fw,bh/fh*W/H)*1.08,vh=vw*H/W;
      return {x:(b[0]+b[2])/2-vw*cxF,y:(b[1]+b[3])/2-vh*cyF,w:vw,h:vh,W:W,H:H};
    }
    function mix(a,b,t){return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,w:a.w*Math.pow(b.w/a.w,t),h:a.h*Math.pow(b.h/a.h,t),W:b.W,H:b.H};}
    function apply(v){VB=v;svg.setAttribute('viewBox',v.x+' '+v.y+' '+v.w+' '+v.h);
      var z=v.w; g4.style.opacity=z>5200?0:z>3600?1-(z-3600)/1600:1;g3.style.opacity=z>9000?0:z>5000?1-(z-5000)/4000:1;g2.style.opacity=z>16000?.5:1;layer.classList.toggle('far',z>8000);}
    function scr(x,y){return [(x-VB.x)/VB.w*VB.W,(y-VB.y)/VB.h*VB.H];}
    function place(el,x,y){var s=scr(x,y);el.style.left=s[0]+'px';el.style.top=s[1]+'px';}
    var HOME=[-350,-350,350,350];
    function bbTo(r,f){var q=at(r,f),b=r.bb[Math.max(0,q[2]-1)];return [Math.min(b[0],q[0])-250,Math.min(b[1],q[1])-250,Math.max(b[2],q[0])+250,Math.max(b[3],q[1])+250];}
    var ALL=R.reduce(function(a,r){var b=r.bb[r.bb.length-1];return [Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[2],b[2]),Math.max(a[3],b[3])];},[0,0,0,0]);
    ALL=[ALL[0]-400,ALL[1]-400,ALL[2]+400,ALL[3]+400];

    /* --- linea del tempo: intro, poi per ogni tappa ritorno a casa + disegno, poi vista d'insieme --- */
    var PH=[{t:'intro',w:.5}];
    R.forEach(function(r,i){if(i)PH.push({t:'back',i:i,w:.3});PH.push({t:'draw',i:i,w:i===R.length-1?1.5:1});});
    PH.push({t:'out',w:.8});PH.push({t:'hold',w:.35});
    var TW=PH.reduce(function(a,p){return a+p.w},0);
    var ease=function(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;};

    function render(p){
      p=Math.max(0,Math.min(1,p));bar.style.transform='scaleX('+p+')';
      var pp=p*TW,j=0;while(j<PH.length-1&&pp>PH[j].w){pp-=PH[j].w;j++;}
      var ph=PH[j],t=Math.min(1,pp/ph.w),e=ease(t),v,showCar=false,cur=-1,cardN=0;
      R.forEach(function(r){r.done.classList.remove('on');r.pin.classList.remove('on','cur');});
      lit.setAttribute('d','M0 0');base.style.opacity=0;
      if(ph.t==='intro'){v=frame(HOME);}
      else if(ph.t==='back'){
        var pr=R[ph.i-1];v=mix(frame(bbTo(pr,1)),frame(HOME),e);
        for(var k=0;k<ph.i;k++){R[k].done.classList.add('on');R[k].pin.classList.add('on');}
        cardN=ph.i;
      } else if(ph.t==='draw'){
        var r=R[ph.i],f=Math.min(1,t/.88),fe=ease(f);cur=ph.i;
        for(var k2=0;k2<ph.i;k2++){R[k2].done.classList.add('on');R[k2].pin.classList.add('on');}
        base.setAttribute('d',r.full);base.style.opacity=1;
        lit.setAttribute('d',upto(r,fe));
        var q=at(r,fe);place(car,q[0],q[1]);showCar=fe<.995;
        v=frame(bbTo(r,fe));
        if(fe>.97){r.pin.classList.add('on','cur');}
        cardN=ph.i+1;
      } else {
        R.forEach(function(r){r.done.classList.add('on');r.pin.classList.add('on');});
        v=ph.t==='out'?mix(frame(bbTo(R[R.length-1],1)),frame(ALL),e):frame(ALL);
        cardN=ph.t==='out'&&e<.5?R.length:R.length+1;
      }
      apply(v);car.style.opacity=showCar?1:0;
      place(home,0,0);
      R.forEach(function(r){var z=r.P[r.P.length-1];place(r.pin,z[0],z[1]);});
      card(cardN);
    }

    if(REDUCE||!window.gsap||!window.ScrollTrigger){
      sec.classList.add('static');
      var rs=function(){render(1);};addEventListener('resize',rs);rs();return;
    }
    gsap.registerPlugin(ScrollTrigger);
    var stt=ScrollTrigger.create({trigger:sec,start:'top top',end:'bottom bottom',onUpdate:function(s){render(s.progress);},onRefresh:function(s){render(s.progress);}});
    addEventListener('resize',function(){render(stt.progress);});
    render(stt.progress);
    ScrollTrigger.refresh();
  }
})();
