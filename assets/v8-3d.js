/* =====================================================================
   Verdi 8 — motore 3D (three.js r128)
   I modelli nascono dalle tavole: la pianta a colori è il pavimento,
   la maschera dei muri viene alzata a fette, la sagoma fa il solaio.
   V8_3D.building(canvas, opzioni)  → l'edificio intero (homepage)
   V8_3D.floor(canvas, id)          → il piano di una sola unità
   ===================================================================== */
(function(){
  var T=window.THREE;
  /* dimensioni delle tavole e riquadro del parquet, che allinea e mette in scala i piani */
  var META={"app-a":{"w":1209,"h":1400,"wood":[356,250,968,992]},"app-b":{"w":836,"h":1400,"wood":[173,364,637,1268]},
            "attico":{"w":1284,"h":1400,"wood":[287,256,986,1217]},"villa-c":{"w":607,"h":1400,"wood":[42,260,353,880]}};
  var ROOM=12, WALL=2.7, SLICES=18, BASE='images/3d/';
  var NIGHT=0x080808, SAGE=new (T?T.Color:Object)('#9dc0aa');

  function ok(){
    if(!T)return false;
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return false;
    try{var c=document.createElement('canvas');return !!(c.getContext('webgl')||c.getContext('experimental-webgl'));}catch(e){return false;}
  }
  function ease(t){t=Math.max(0,Math.min(1,t));return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;}
  function clamp(t){return Math.max(0,Math.min(1,t));}

  function stage(canvas){
    var r=new T.WebGLRenderer({canvas:canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
    r.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    r.outputEncoding=T.sRGBEncoding;r.setClearColor(NIGHT,0);
    var scene=new T.Scene();scene.fog=new T.Fog(NIGHT,60,170);
    var cam=new T.PerspectiveCamera(32,1,0.1,500);
    var loader=new T.TextureLoader(),dirty={v:true};
    function tex(u,color){var t=loader.load(BASE+u,function(){dirty.v=true;});if(color)t.encoding=T.sRGBEncoding;t.anisotropy=Math.min(8,r.capabilities.getMaxAnisotropy());return t;}
    /* pavimento: griglia da tavola tecnica che sfuma nel buio */
    var g=document.createElement('canvas');g.width=g.height=512;var x=g.getContext('2d');
    var grd=x.createRadialGradient(256,256,10,256,256,256);grd.addColorStop(0,'rgba(157,192,170,.16)');grd.addColorStop(1,'rgba(157,192,170,0)');
    x.fillStyle=grd;x.fillRect(0,0,512,512);x.strokeStyle='rgba(157,192,170,.13)';x.lineWidth=1;
    for(var i=0;i<=512;i+=32){x.beginPath();x.moveTo(i+.5,0);x.lineTo(i+.5,512);x.stroke();x.beginPath();x.moveTo(0,i+.5);x.lineTo(512,i+.5);x.stroke();}
    var mask=x.createRadialGradient(256,256,60,256,256,256);mask.addColorStop(0,'rgba(0,0,0,0)');mask.addColorStop(1,'rgba(8,8,8,1)');
    x.globalCompositeOperation='destination-out';var m2=x.createRadialGradient(256,256,120,256,256,256);m2.addColorStop(0,'rgba(0,0,0,0)');m2.addColorStop(1,'rgba(0,0,0,1)');x.fillStyle=m2;x.fillRect(0,0,512,512);
    var floorTex=new T.CanvasTexture(g);
    var ground=new T.Mesh(new T.PlaneGeometry(120,120),new T.MeshBasicMaterial({map:floorTex,transparent:true,depthWrite:false}));
    ground.rotation.x=-Math.PI/2;ground.position.y=-0.75;scene.add(ground);
    /* ombra morbida */
    var s=document.createElement('canvas');s.width=s.height=128;var sx=s.getContext('2d');
    var sg=sx.createRadialGradient(64,64,4,64,64,64);sg.addColorStop(0,'rgba(0,0,0,.6)');sg.addColorStop(1,'rgba(0,0,0,0)');sx.fillStyle=sg;sx.fillRect(0,0,128,128);
    var shadowTex=new T.CanvasTexture(s);
    return {r:r,scene:scene,cam:cam,tex:tex,dirty:dirty,ground:ground,shadowTex:shadowTex};
  }

  /* un piano: pavimento a colori, solaio, muri a fette, volume invisibile per il clic */
  function makeFloor(S,id){
    var m=META[id],wd=m.wood,k=ROOM/(wd[3]-wd[1]);
    var W=m.w*k,H=m.h*k,cx=(wd[0]+wd[2])/2,cy=(wd[1]+wd[3])/2,ox=(m.w/2-cx)*k,oz=(m.h/2-cy)*k;
    var geo=new T.PlaneGeometry(W,H),g=new T.Group(),mats=[];
    var cut=S.tex(id+'-cut.webp',true),sag=S.tex(id+'-sagoma.png'),wal=S.tex(id+'-muri.png');
    var plan=new T.Mesh(geo,new T.MeshBasicMaterial({map:cut,transparent:true,alphaTest:.35}));
    plan.rotation.x=-Math.PI/2;plan.position.set(ox,0.02,oz);g.add(plan);mats.push(plan.material);
    for(var i=1;i<=6;i++){var sm=new T.MeshBasicMaterial({color:new T.Color().setRGB(.07+.012*i,.085+.012*i,.075+.01*i),alphaMap:sag,transparent:true,alphaTest:.35});
      var sl=new T.Mesh(geo,sm);sl.rotation.x=-Math.PI/2;sl.position.set(ox,-i*0.08,oz);g.add(sl);mats.push(sm);}
    var walls=new T.Group(),base=[];
    for(var j=0;j<SLICES;j++){var f=j/(SLICES-1);
      var c=j===SLICES-1?new T.Color('#f0ece4'):new T.Color().setRGB(.42+.4*f,.45+.38*f,.42+.38*f);
      var wm=new T.MeshBasicMaterial({color:c,alphaMap:wal,transparent:true,alphaTest:.5});
      var wl=new T.Mesh(geo,wm);wl.rotation.x=-Math.PI/2;wl.position.set(ox,f*WALL+0.03,oz);walls.add(wl);mats.push(wm);base.push(c.clone());}
    walls.scale.y=0.001;g.add(walls);
    var hit=new T.Mesh(new T.BoxGeometry((wd[2]-wd[0])*k*1.04,WALL+0.8,ROOM*1.04),new T.MeshBasicMaterial({visible:false}));hit.position.y=WALL/2;g.add(hit);
    var sh=new T.Mesh(new T.PlaneGeometry(W*1.3,H*1.1),new T.MeshBasicMaterial({map:S.shadowTex,transparent:true,depthWrite:false,opacity:.0}));
    sh.rotation.x=-Math.PI/2;sh.position.set(ox,-0.7,oz);g.add(sh);
    g.userData={walls:walls,plan:plan,mats:mats,base:base,hit:hit,shadow:sh,W:W,H:H,ox:ox,oz:oz,ww:(wd[2]-wd[0])*k};
    return g;
  }
  function paint(g,vis,dim,rise){
    var u=g.userData;g.visible=vis>0.01;
    u.mats.forEach(function(m){m.opacity=vis;});
    u.plan.material.color.setScalar(dim);
    u.walls.children.forEach(function(w,k){w.material.color.copy(u.base[k]).multiplyScalar(dim);});
    u.walls.scale.y=Math.max(0.001,rise);u.shadow.material.opacity=.55*vis;
  }
  function sizeTo(S,canvas){
    var w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
    S.r.setSize(w,h,false);S.cam.aspect=w/h;S.cam.updateProjectionMatrix();S.dirty.v=true;
  }
  function orbit(cam,look,dist,polar,az){
    cam.position.set(Math.sin(polar)*Math.sin(az),Math.cos(polar),Math.sin(polar)*Math.cos(az)).multiplyScalar(dist).add(look);
    cam.lookAt(look);
  }
  function drag(canvas,st,onMove){
    var down=false,lx=0,ly=0;canvas.classList.add('grab');
    canvas.addEventListener('pointerdown',function(e){if(e.pointerType==='touch'&&!st.touchOk)return;down=true;lx=e.clientX;ly=e.clientY;canvas.classList.add('grabbing');st.user=true;});
    addEventListener('pointerup',function(){down=false;canvas.classList.remove('grabbing');});
    addEventListener('pointermove',function(e){if(!down)return;st.az-=(e.clientX-lx)*0.006;st.polar=Math.max(.35,Math.min(1.25,st.polar-(e.clientY-ly)*0.004));lx=e.clientX;ly=e.clientY;onMove();});
    /* sul telefono: un dito ruota in orizzontale senza bloccare lo scorrimento verticale */
    var tx=0,ty=0,lock=null;
    canvas.addEventListener('touchstart',function(e){tx=e.touches[0].clientX;ty=e.touches[0].clientY;lock=null;},{passive:true});
    canvas.addEventListener('touchmove',function(e){var dx=e.touches[0].clientX-tx,dy=e.touches[0].clientY-ty;
      if(lock===null&&Math.abs(dx)+Math.abs(dy)>8)lock=Math.abs(dx)>Math.abs(dy)?'x':'y';
      if(lock==='x'){e.preventDefault();st.az-=dx*0.008;tx=e.touches[0].clientX;st.user=true;onMove();}},{passive:false});
  }

  /* ================== EDIFICIO INTERO (homepage) ================== */
  function building(canvas,opt){
    var S=stage(canvas),scene=S.scene,cam=S.cam;
    var ids=['app-a','app-b','attico'],floors=ids.map(function(id){var f=makeFloor(S,id);scene.add(f);return f;});
    var villa=makeFloor(S,'villa-c');scene.add(villa);
    var VX=22,VZ=5;villa.position.set(VX,0,VZ);
    var all=floors.concat([villa]);
    var st={p:0,pick:-1,pickT:0,focus:0,az:-0.7,polar:.95,user:false,t0:performance.now(),touchOk:false,hover:-1};
    var LIFT=[0,0,0,0],DIM=[0,0,0,0];
    var look=new T.Vector3(),ray=new T.Raycaster(),mouse=new T.Vector2(),v=new T.Vector3();
    var labels=opt&&opt.labels||[];
    function frame(now){
      var p=st.p,mob=canvas.clientWidth<760;
      /* regia: muri del piano terra → piani che scendono → villa → apertura */
      var rise0=ease(p/.22), stack=ease((p-.18)/.3), vil=ease((p-.42)/.2), open=ease((p-.62)/.22);
      var gap=3.4+3.6*open;
      floors.forEach(function(g,i){
        var vis=i===0?1:clamp((stack-(i-1)*.35)/.4);
        var drop=i===0?0:(1-ease((stack-(i-1)*.35)/.65))*26;
        g.position.y=i*gap+drop+LIFT[i]*1.8+(st.pick>=0&&st.pick<3&&i>st.pick?3.4*st.pickT:0);
        paint(g,vis,1-.6*DIM[i],i===0?rise0:Math.max(rise0,vis));
      });
      villa.position.y=(1-vil)*-6+LIFT[3]*1.8;paint(villa,vil,1-.6*DIM[3],vil);
      /* telecamera: giro lento finché nessuno la tocca */
      var idle=st.user?0:(now-st.t0)*0.00004;
      var az=st.az+idle+p*0.9;
      var stackH=2*gap*stack;
      /* sul telefono la telecamera inquadra un edificio alla volta: si sposta sulla villa quando la scegli */
      if(mob)look.set(VX*st.focus,stackH*.36*(1-st.focus),VZ*st.focus);else look.set(VX*.45*vil,stackH*.36,VZ*.5*vil);
      var dist=mob?(80+stackH*1.3)*(1-.22*st.focus):48+stackH*.9+vil*22;
      orbit(cam,look,dist,st.polar-.2*open,az);
      if(!mob)cam.setViewOffset(canvas.clientWidth,canvas.clientHeight,-canvas.clientWidth*.14,0,canvas.clientWidth,canvas.clientHeight);
      else cam.setViewOffset(canvas.clientWidth,canvas.clientHeight,0,-canvas.clientHeight*.06,canvas.clientWidth,canvas.clientHeight);
      S.r.render(scene,cam);
      /* etichette agganciate ai piani */
      labels.forEach(function(el,i){
        var g=all[i];if(!el)return;var u=g.userData;
        v.set(u.ox+u.ww*.52,WALL+.4,u.oz-ROOM*.5).applyMatrix4(g.matrixWorld).project(cam);
        var on=g.visible&&u.walls.scale.y>.5&&v.z<1;
        el.style.opacity=on?(st.pick<0||st.pick===i?1:.45):0;
        el.style.transform='translate('+((v.x*.5+.5)*canvas.clientWidth).toFixed(1)+'px,'+((-v.y*.5+.5)*canvas.clientHeight).toFixed(1)+'px)';
      });
    }
    var running=false;
    function loop(now){if(!running)return;frame(now);requestAnimationFrame(loop);}
    var io=new IntersectionObserver(function(es){running=es[0].isIntersecting;if(running)requestAnimationFrame(loop);},{rootMargin:'100px'});io.observe(canvas);
    addEventListener('resize',function(){sizeTo(S,canvas);});sizeTo(S,canvas);
    drag(canvas,st,function(){});
    function hitTest(e){var b=canvas.getBoundingClientRect();mouse.set(((e.clientX-b.left)/b.width)*2-1,-((e.clientY-b.top)/b.height)*2+1);
      ray.setFromCamera(mouse,cam);var hs=ray.intersectObjects(all.filter(function(g){return g.visible;}).map(function(g){return g.userData.hit;}));
      return hs.length?all.findIndex(function(g){return g.userData.hit===hs[0].object;}):-1;}
    var downAt=null;
    canvas.addEventListener('pointerdown',function(e){downAt=[e.clientX,e.clientY];});
    canvas.addEventListener('pointerup',function(e){if(!downAt)return;var moved=Math.abs(e.clientX-downAt[0])+Math.abs(e.clientY-downAt[1]);downAt=null;
      if(moved<6&&st.p>.55){var i=hitTest(e);if(i>=0&&opt&&opt.onPick)opt.onPick(i);}});
    canvas.addEventListener('pointermove',function(e){if(st.p<.55)return;var i=hitTest(e);canvas.style.cursor=i>=0?'pointer':'';});
    function pick(i){
      st.pick=i;
      [0,1,2,3].forEach(function(j){gsap.to(LIFT,{[j]:j===i?1:0,duration:.8,ease:'power3.out'});gsap.to(DIM,{[j]:j===i?0:1,duration:.5});});
      gsap.to(st,{pickT:1,duration:.8,ease:'power3.out'});gsap.to(st,{focus:i===3?1:0,duration:1,ease:'power2.inOut'});
    }
    return {set:function(p){st.p=p;},pick:pick,resize:function(){sizeTo(S,canvas);}};
  }

  /* ================== UN SOLO PIANO (pagine unità) ================== */
  function floor(canvas,id){
    var S=stage(canvas),scene=S.scene,cam=S.cam;
    var f=makeFloor(S,id);scene.add(f);var u=f.userData;
    var st={az:-0.75,polar:.9,user:false,rise:0,t0:performance.now(),touchOk:false};
    var look=new T.Vector3(u.ox*.0,WALL*.3,0);
    var running=false;
    function frame(now){
      var mob=canvas.clientWidth<760;
      paint(f,1,1,ease(st.rise));
      var idle=st.user?0:(now-st.t0)*0.00006;
      var dist=Math.max(u.W,u.H)*(mob?2.25:1.85);
      orbit(cam,look,dist,st.polar,st.az+idle);
      S.r.render(scene,cam);
    }
    function loop(now){if(!running)return;frame(now);requestAnimationFrame(loop);}
    addEventListener('resize',function(){sizeTo(S,canvas);});
    drag(canvas,st,function(){});
    return {
      show:function(){sizeTo(S,canvas);if(!running){running=true;requestAnimationFrame(loop);}st.rise=0;gsap.to(st,{rise:1,duration:1.8,ease:'power2.out',delay:.15});},
      hide:function(){running=false;}
    };
  }

  window.V8_3D={ok:ok,building:building,floor:floor};
})();
