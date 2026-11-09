/* =====================================================================
   Verdi 8 — motore 3D (three.js r128)
   Modello architettonico ricavato dalle tavole di progetto:
   muri estrusi dai contorni veri, solaio dalla sagoma, vetri dove la tavola
   disegna le finestre, pavimento con le ombre d'angolo già calcolate.
   Luce del sole con ombre morbide, toni filmici.
   V8_3D.building(canvas, opzioni) → l'edificio intero (homepage)
   V8_3D.floor(canvas, id)         → il piano di una sola unità
   ===================================================================== */
(function(){
  var T=window.THREE;
  /* dimensioni delle tavole e riquadro del parquet: allinea e mette in scala i piani */
  var META={"app-a":{"w":1209,"h":1400,"wood":[356,250,968,992]},"app-b":{"w":836,"h":1400,"wood":[173,364,637,1268]},
            "attico":{"w":1284,"h":1400,"wood":[287,256,986,1217]},"villa-c":{"w":607,"h":1400,"wood":[42,260,353,880]}};
  var ROOM=12, WALL=2.7, SLAB=.38, BASE='images/3d/';

  function ok(){
    if(!T)return false;
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return false;
    try{var c=document.createElement('canvas');return !!(c.getContext('webgl')||c.getContext('experimental-webgl'));}catch(e){return false;}
  }
  function clamp(t){return Math.max(0,Math.min(1,t));}
  function ease(t){t=clamp(t);return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;}
  var geoCache={};
  function geo(id){return geoCache[id]||(geoCache[id]=fetch(BASE+id+'-geo.json').then(function(r){return r.json();}));}
  var furCache={};
  function arredo(id){return furCache[id]||(furCache[id]=fetch(BASE+id+'-mobili.json').then(function(r){return r.json();}));}

  /* ---------- scena: luce, ombre, pavimento ---------- */
  function stage(canvas){
    var mob=Math.min(innerWidth,innerHeight)<700;
    var r=new T.WebGLRenderer({canvas:canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
    r.setPixelRatio(Math.min(window.devicePixelRatio||1,mob?1.75:2));
    r.outputEncoding=T.sRGBEncoding;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=.78;
    r.shadowMap.enabled=true;r.shadowMap.type=T.PCFSoftShadowMap;r.setClearColor(0x080808,0);
    var scene=new T.Scene();scene.fog=new T.Fog(0x080808,70,190);
    var cam=new T.PerspectiveCamera(30,1,0.5,4000);
    /* cielo morbido dall'alto, terra scura dal basso */
    scene.add(new T.HemisphereLight(0xdfe7e2,0x121410,.42));
    /* sole caldo, alto e laterale: disegna le ombre dei muri sui pavimenti */
    var sun=new T.DirectionalLight(0xffeed6,2.6);sun.position.set(-26,44,22);sun.castShadow=true;
    sun.shadow.mapSize.set(mob?1024:2048,mob?1024:2048);
    var sc=sun.shadow.camera;sc.left=-46;sc.right=46;sc.top=46;sc.bottom=-46;sc.near=1;sc.far=140;
    sun.shadow.bias=-0.0006;sun.shadow.normalBias=.03;sun.shadow.radius=4;
    scene.add(sun);scene.add(sun.target);
    var fill=new T.DirectionalLight(0x9dc0aa,.35);fill.position.set(30,18,-24);scene.add(fill);
    /* terreno: raccoglie le ombre, con la griglia da tavola tecnica che sfuma */
    var g=document.createElement('canvas');g.width=g.height=1024;var x=g.getContext('2d');
    x.strokeStyle='rgba(157,192,170,.16)';x.lineWidth=1;
    for(var i=0;i<=1024;i+=32){x.beginPath();x.moveTo(i+.5,0);x.lineTo(i+.5,1024);x.stroke();x.beginPath();x.moveTo(0,i+.5);x.lineTo(1024,i+.5);x.stroke();}
    x.globalCompositeOperation='destination-in';var m=x.createRadialGradient(512,512,80,512,512,512);m.addColorStop(0,'rgba(0,0,0,1)');m.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=m;x.fillRect(0,0,1024,1024);
    var grid=new T.Mesh(new T.PlaneGeometry(150,150),new T.MeshBasicMaterial({map:new T.CanvasTexture(g),transparent:true,depthWrite:false}));
    grid.rotation.x=-Math.PI/2;grid.position.y=-SLAB-.02;scene.add(grid);
    var catcher=new T.Mesh(new T.PlaneGeometry(150,150),new T.ShadowMaterial({opacity:.42}));
    catcher.rotation.x=-Math.PI/2;catcher.position.y=-SLAB-.01;catcher.receiveShadow=true;scene.add(catcher);
    var loader=new T.TextureLoader(),dirty={v:true};
    function tex(u){var t=loader.load(BASE+u,function(){dirty.v=true;});t.encoding=T.sRGBEncoding;t.anisotropy=Math.min(8,r.capabilities.getMaxAnisotropy());return t;}
    return {r:r,scene:scene,cam:cam,sun:sun,tex:tex,dirty:dirty,mob:mob,grid:grid};
  }

  /* ---------- un piano: solaio, pavimento, muri, vetri ---------- */
  function makeFloor(S,id){
    var m=META[id],wd=m.wood,k=ROOM/(wd[3]-wd[1]);
    var W=m.w*k,H=m.h*k,ox=(m.w/2-(wd[0]+wd[2])/2)*k,oz=(m.h/2-(wd[1]+wd[3])/2)*k;
    function X(px){return ox+(px-m.w/2)*k;}function Z(py){return oz+(py-m.h/2)*k;}
    var g=new T.Group(),u={W:W,H:H,ox:ox,oz:oz,ww:(wd[2]-wd[0])*k,mats:[],ready:false,X:X,Z:Z};g.userData=u;
    /* pavimento con la pianta a colori */
    var floorMat=new T.MeshStandardMaterial({map:S.tex(id+'-floor.webp'),transparent:true,alphaTest:.4,roughness:.92,metalness:0});
    var floor=new T.Mesh(new T.PlaneGeometry(W,H),floorMat);floor.rotation.x=-Math.PI/2;floor.position.set(ox,.012,oz);floor.receiveShadow=true;g.add(floor);
    u.floorMat=floorMat;
    var walls=new T.Group();walls.scale.y=.001;g.add(walls);u.walls=walls;
    var capMat=new T.MeshStandardMaterial({color:0xf2eee6,roughness:.75}),sideMat=new T.MeshStandardMaterial({color:0xd9d4c9,roughness:.92});
    var slabMat=new T.MeshStandardMaterial({color:0x4b3d35,roughness:.85}),glassMat=new T.MeshStandardMaterial({color:0x8fc3d8,transparent:true,opacity:.5,roughness:.05,metalness:.35,emissive:0x1d3a44,emissiveIntensity:.35});
    u.wallMats=[capMat,sideMat];u.base=[capMat.color.clone(),sideMat.color.clone()];u.glass=glassMat;u.slabMat=slabMat;
    function shape(poly){var s=new T.Shape(poly.o.map(function(p){return new T.Vector2(X(p[0]),-Z(p[1]));}));
      poly.h.forEach(function(h){s.holes.push(new T.Path(h.map(function(p){return new T.Vector2(X(p[0]),-Z(p[1]));})));});return s;}
    geo(id).then(function(G){
      /* muri: un solido unico per piano, estruso all'altezza di interpiano */
      var wg=new T.ExtrudeGeometry(G.muri.map(shape),{depth:WALL,bevelEnabled:false,curveSegments:1});wg.rotateX(-Math.PI/2);
      var wm=new T.Mesh(wg,[capMat,sideMat]);wm.castShadow=true;wm.receiveShadow=true;walls.add(wm);
      /* solaio che segue la sagoma della tavola */
      var sg=new T.ExtrudeGeometry(G.solaio.map(shape),{depth:SLAB,bevelEnabled:false,curveSegments:1});sg.rotateX(-Math.PI/2);sg.translate(0,-SLAB,0);
      var sm=new T.Mesh(sg,slabMat);sm.receiveShadow=true;sm.castShadow=true;g.add(sm);
      /* vetri nelle finestre */
      G.finestre.forEach(function(f){var w=(f[2]-f[0])*k,d=(f[3]-f[1])*k;
        var b=new T.Mesh(new T.BoxGeometry(Math.max(w,.08),1.45,Math.max(d,.08)),glassMat);
        b.position.set(X((f[0]+f[2])/2),.85+.725,Z((f[1]+f[3])/2));walls.add(b);});
      u.ready=true;S.dirty.v=true;
    });
    /* arredo: ogni mobile disegnato nella tavola cresce dal pavimento con la sua altezza */
    var furn=new T.Group();g.add(furn);u.furn=[];u.furnMat=new T.MeshStandardMaterial({map:floorMat.map,roughness:.7});
    var paraMat=new T.MeshStandardMaterial({color:0x2c2826,roughness:.45,metalness:.35,transparent:true,opacity:.92});
    var roofMat=new T.MeshStandardMaterial({color:0xefebe4,roughness:.85});u.paraMat=paraMat;u.roofMat=roofMat;
    arredo(id).then(function(F){
      var x0=ox-W/2,z0=oz-H/2;
      function uvWorld(gm){var p=gm.attributes.position,uv=new Float32Array(p.count*2);
        for(var i=0;i<p.count;i++){uv[i*2]=(p.getX(i)-x0)/W;uv[i*2+1]=1-(p.getZ(i)-z0)/H;}gm.setAttribute('uv',new T.BufferAttribute(uv,2));}
      F.mobili.forEach(function(it){
        var sh=new T.Shape(it.o.map(function(p){return new T.Vector2(X(p[0]),-Z(p[1]));}));
        var gm=new T.ExtrudeGeometry(sh,{depth:it.h,bevelEnabled:false,curveSegments:1});gm.rotateX(-Math.PI/2);uvWorld(gm);
        var me=new T.Mesh(gm,u.furnMat);me.castShadow=true;me.receiveShadow=true;me.position.y=.015;me.scale.y=.001;furn.add(me);u.furn.push(me);
      });
      /* parapetti di balconi e terrazzi, scuri come nei render */
      F.parapetti.forEach(function(run){for(var i=0;i<run.length-1;i++){
        var ax=X(run[i][0]),az=Z(run[i][1]),bx=X(run[i+1][0]),bz=Z(run[i+1][1]),L=Math.hypot(bx-ax,bz-az);if(L<.05)continue;
        var b=new T.Mesh(new T.BoxGeometry(L+.06,1.05,.09),paraMat);b.position.set((ax+bx)/2,.525,(az+bz)/2);b.rotation.y=-Math.atan2(bz-az,bx-ax);b.castShadow=true;walls.add(b);}});
      /* copertura dell'alloggio, per chiudere l'edificio come si vede dall'esterno */
      if(F.tetto&&F.tetto.length>3){
        var rs=new T.Shape(F.tetto.map(function(p){return new T.Vector2(X(p[0]),-Z(p[1]));}));
        var rg=new T.ExtrudeGeometry(rs,{depth:.32,bevelEnabled:false,curveSegments:1});rg.rotateX(-Math.PI/2);
        var roof=new T.Mesh(rg,[roofMat,slabMat]);roof.castShadow=true;roof.receiveShadow=true;roof.position.y=WALL;roof.visible=false;g.add(roof);u.roof=roof;
      }
      S.dirty.v=true;
    });
    var hit=new T.Mesh(new T.BoxGeometry(u.ww*1.04,WALL+.8,ROOM*1.04),new T.MeshBasicMaterial({visible:false}));hit.position.y=WALL/2;g.add(hit);u.hit=hit;
    return g;
  }
  function paint(g,vis,dim,rise,fur,roofT){
    var u=g.userData;g.visible=vis>.01;
    if(u.furn){var n=u.furn.length||1;u.furn.forEach(function(me,i){me.scale.y=Math.max(.001,ease((fur||0)*1.5-i/n*.5));});u.furnMat.color.setScalar(.55+.45*dim);}
    if(u.roof){var rt=roofT||0;u.roof.visible=rt>.01&&vis>.5;u.roof.position.y=WALL+(1-rt)*9;u.roofMat.transparent=rt<1;u.roofMat.opacity=rt;}
    if(u.paraMat)u.paraMat.opacity=.92*vis;
    u.floorMat.opacity=vis;u.floorMat.color.setScalar(dim);
    /* i solidi non diventano trasparenti (darebbero macchie): appaiono crescendo */
    u.wallMats.forEach(function(m,i){m.color.copy(u.base[i]).multiplyScalar(.35+.65*dim);});
    u.walls.visible=vis>.35;u.glass.opacity=.5*vis;
    u.walls.scale.y=Math.max(.001,rise);
  }
  function sizeTo(S,c){var w=c.clientWidth,h=c.clientHeight;if(!w||!h)return;S.r.setSize(w,h,false);S.cam.aspect=w/h;S.cam.updateProjectionMatrix();}
  function orbit(cam,look,dist,polar,az){
    cam.position.set(Math.sin(polar)*Math.sin(az),Math.cos(polar),Math.sin(polar)*Math.cos(az)).multiplyScalar(dist).add(look);cam.lookAt(look);
  }
  /* rotazione con inerzia: trascini, lasci, continua a girare e rallenta */
  function control(canvas,st){
    var down=false,lx=0,ly=0,lt=0;canvas.classList.add('grab');
    canvas.addEventListener('pointerdown',function(e){if(e.pointerType==='touch')return;down=true;lx=e.clientX;ly=e.clientY;lt=performance.now();st.vaz=0;canvas.classList.add('grabbing');st.user=true;});
    addEventListener('pointerup',function(){down=false;canvas.classList.remove('grabbing');});
    addEventListener('pointermove',function(e){if(!down)return;var dx=e.clientX-lx,dy=e.clientY-ly,now=performance.now(),dt=Math.max(8,now-lt);
      st.az-=dx*.006;st.vaz=-dx*.006/dt*16;st.polar=Math.max(.32,Math.min(1.22,st.polar-dy*.004));lx=e.clientX;ly=e.clientY;lt=now;});
    /* sul telefono un dito in orizzontale ruota, in verticale scorre la pagina */
    var tx=0,ty=0,lock=null,tt=0;
    canvas.addEventListener('touchstart',function(e){tx=e.touches[0].clientX;ty=e.touches[0].clientY;lock=null;tt=performance.now();st.vaz=0;},{passive:true});
    canvas.addEventListener('touchmove',function(e){var dx=e.touches[0].clientX-tx,dy=e.touches[0].clientY-ty;
      if(lock===null&&Math.abs(dx)+Math.abs(dy)>8)lock=Math.abs(dx)>Math.abs(dy)?'x':'y';
      if(lock==='x'){e.preventDefault();var now=performance.now();st.az-=dx*.008;st.vaz=-dx*.008/Math.max(8,now-tt)*16;tx=e.touches[0].clientX;tt=now;st.user=true;}},{passive:false});
  }
  function inertia(st){st.az+=st.vaz;st.vaz*=.94;if(Math.abs(st.vaz)<1e-4)st.vaz=0;}


  /* ---------- il quartiere vero: strade di Brugherio dai dati Edilnord RE ---------- */
  function quartiere(S){
    var g=new T.Group();g.visible=false;S.scene.add(g);
    var st={reveal:0,ready:false,g:g,ring:null};
    fetch(BASE+'quartiere.json').then(function(r){return r.json();}).then(function(Q){
      /* le strade ruotano per correre parallele alla facciata, Via Verdi passa a sud del lotto */
      var a=-Q.road.ang,ca=Math.cos(a),sa=Math.sin(a),SOUTH=15;
      var rp=Q.road.p,ry=rp[0]*sa+rp[1]*ca;
      function tf(x,y){return [x*ca-y*sa,x*sa+y*ca-ry+SOUTH];}
      var WID=[11,9,7.5,6,3],pos=[],dst=[],lp=[],ld=[],lt=[];
      Q.roads.forEach(function(w){var t=w[0],h=WID[t]/2,pts=[];
        for(var i=1;i<w.length;i+=2)pts.push(tf(w[i],w[i+1]));
        for(var j=0;j<pts.length-1;j++){var A=pts[j],B=pts[j+1],dx=B[0]-A[0],dz=B[1]-A[1],L=Math.hypot(dx,dz)||1,nx=-dz/L*h,nz=dx/L*h;
          var q=[[A[0]+nx,A[1]+nz],[A[0]-nx,A[1]-nz],[B[0]+nx,B[1]+nz],[B[0]-nx,B[1]-nz]];
          [0,1,2,2,1,3].forEach(function(k){pos.push(q[k][0],0,q[k][1]);dst.push(Math.hypot(q[k][0],q[k][1]));});
          lp.push(A[0],0,A[1],B[0],0,B[1]);ld.push(Math.hypot(A[0],A[1]),Math.hypot(B[0],B[1]));lt.push(t,t);}
      });
      /* strade con la loro larghezza: da lontano una rete verde che si accende dal lotto,
         da vicino diventano asfalto */
      var rg=new T.BufferGeometry();rg.setAttribute('position',new T.Float32BufferAttribute(pos,3));rg.setAttribute('d',new T.Float32BufferAttribute(dst,1));
      var rm=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{r:{value:0},dive:{value:0},glow:{value:new T.Color(0x9dc0aa)},asph:{value:new T.Color(0x2b2f29)}},
        vertexShader:'attribute float d;varying float vd;void main(){vd=d;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:'uniform float r;uniform float dive;uniform vec3 glow;uniform vec3 asph;varying float vd;void main(){float on=1.-smoothstep(r-80.,r,vd);float front=smoothstep(r-80.,r,vd)*on;float fade=1.-smoothstep(620.,900.,vd);vec3 c=mix(glow*.85,asph,dive)+vec3(.55,.7,.6)*front*(1.-dive);gl_FragColor=vec4(c,on*fade*mix(.85,1.,dive));}'});
      var road=new T.Mesh(rg,rm);road.position.y=-SLAB-.04;road.renderOrder=-1;g.add(road);st.roadMat=rm;
      /* segnale sul lotto: anello che pulsa */
      var ring=new T.Mesh(new T.RingGeometry(1,1.5,64),new T.MeshBasicMaterial({color:0x9dc0aa,transparent:true,depthWrite:false,side:T.DoubleSide}));
      ring.rotation.x=-Math.PI/2;ring.position.y=-SLAB+.05;g.add(ring);st.ring=ring;
      st.ready=true;g.visible=true;
    });
    return st;
  }

  /* ================== EDIFICIO INTERO (homepage) ================== */
  function building(canvas,opt){
    var S=stage(canvas),scene=S.scene,cam=S.cam;
    var floors=['app-a','app-b','attico'].map(function(id){var f=makeFloor(S,id);scene.add(f);return f;});
    var villa=makeFloor(S,'villa-c');scene.add(villa);var VX=23,VZ=5;villa.position.set(VX,0,VZ);
    var all=floors.concat([villa]);
    var Q=quartiere(S),grid=S.grid;
    var st={p:0,pick:-1,az:-.7,vaz:0,polar:.98,user:false,t0:performance.now(),focus:0,zoom:0};
    var LIFT=[0,0,0,0],DIM=[0,0,0,0];
    var look=new T.Vector3(),v=new T.Vector3(),ray=new T.Raycaster(),mouse=new T.Vector2();
    var labels=opt&&opt.labels||[];
    function frame(now){
      var P0=st.p,mob=canvas.clientWidth<760;inertia(st);
      /* apertura: la rete delle vie si accende dal lotto, poi si scende */
      var intro=clamp(P0/.18),dive=ease((P0-.06)/.14),p=clamp((P0-.18)/.82);
      if(Q.ready){Q.roadMat.uniforms.r.value=40+900*ease(intro*1.15);Q.roadMat.uniforms.dive.value=dive;grid.visible=false;
        var pu=(now*.0006)%1;Q.ring.scale.setScalar(6+70*pu*(1-dive)+2);Q.ring.material.opacity=(1-pu)*(1-dive);Q.ring.visible=dive<.99;}
      var rise0=ease(p/.22),stack=ease((p-.18)/.3),vil=ease((p-.42)/.2),open=ease((p-.62)/.22);
      var gap=WALL+SLAB+.35+3.6*open;
      floors.forEach(function(g,i){
        var vis=i===0?1:clamp((stack-(i-1)*.35)/.4),drop=i===0?0:(1-ease((stack-(i-1)*.35)/.65))*26;
        g.position.y=i*gap+drop+LIFT[i]*1.8+(st.pick>=0&&st.pick<3&&i>st.pick?3.6*st.zoom:0);
        /* chiuso con la copertura finché non si apre; aprendosi crescono gli arredi */
        var closed=clamp((stack-.85)/.15)*(1-open);
        paint(g,vis,1-.62*DIM[i],i===0?rise0:Math.max(rise0,vis),open,i===2?closed:0);
      });
      villa.position.y=(1-vil)*-6+LIFT[3]*1.8;paint(villa,vil,1-.62*DIM[3],vil,open,vil*(1-open));
      var az=st.az+(st.user?0:(now-st.t0)*.00004)+p*.9;
      var stackH=2*gap*stack;
      /* quando scegli un piano la telecamera si avvicina a lui */
      var pk=st.pick>=0?all[st.pick]:null,py=pk?pk.position.y+WALL*.5:0,px=pk?pk.position.x+pk.userData.ox*.3:0,pz=pk?pk.position.z:0;
      var base=mob?new T.Vector3(VX*st.focus,stackH*.36*(1-st.focus),VZ*st.focus):new T.Vector3(VX*.45*vil,stackH*.36,VZ*.5*vil);
      look.copy(base).lerp(v.set(px,py,pz),st.zoom*.35);
      var dist=mob?(80+stackH*1.3)*(1-.22*st.focus):48+stackH*.9+vil*22;dist*=1-.14*st.zoom;
      /* dall'alto sul quartiere fino al lotto */
      var far=mob?1500:1100;dist=dist+(far-dist)*(1-dive);
      var pol=(st.polar-.2*open)*dive+.04*(1-dive);
      look.multiplyScalar(dive);
      orbit(cam,look,dist,pol,az*dive-.25*(1-dive));
      scene.fog.near=dist*.9;scene.fog.far=dist*2.4+200;
      if(!mob)cam.setViewOffset(canvas.clientWidth,canvas.clientHeight,-canvas.clientWidth*.14,0,canvas.clientWidth,canvas.clientHeight);
      else cam.setViewOffset(canvas.clientWidth,canvas.clientHeight,0,-canvas.clientHeight*.06,canvas.clientWidth,canvas.clientHeight);
      /* il sole segue l'inquadratura, così le ombre restano leggibili */
      S.sun.target.position.copy(look);S.sun.position.copy(look).add(v.set(-26,44,22));
      S.r.render(scene,cam);
      labels.forEach(function(el,i){var g=all[i],u=g.userData;if(!el)return;
        v.set(u.ox+u.ww*.52,WALL+.4,u.oz-ROOM*.5).applyMatrix4(g.matrixWorld).project(cam);
        var on=g.visible&&u.walls.scale.y>.5&&v.z<1;el.style.opacity=on?(st.pick<0||st.pick===i?1:.42):0;
        el.style.transform='translate('+((v.x*.5+.5)*canvas.clientWidth).toFixed(1)+'px,'+((-v.y*.5+.5)*canvas.clientHeight).toFixed(1)+'px)';});
    }
    var running=false;function loop(now){if(!running)return;frame(now);requestAnimationFrame(loop);}
    new IntersectionObserver(function(es){running=es[0].isIntersecting;if(running)requestAnimationFrame(loop);},{rootMargin:'100px'}).observe(canvas);
    addEventListener('resize',function(){sizeTo(S,canvas);});sizeTo(S,canvas);control(canvas,st);
    function hitTest(e){var b=canvas.getBoundingClientRect();mouse.set(((e.clientX-b.left)/b.width)*2-1,-((e.clientY-b.top)/b.height)*2+1);ray.setFromCamera(mouse,cam);
      var hs=ray.intersectObjects(all.filter(function(g){return g.visible;}).map(function(g){return g.userData.hit;}));
      return hs.length?all.findIndex(function(g){return g.userData.hit===hs[0].object;}):-1;}
    var downAt=null;
    canvas.addEventListener('pointerdown',function(e){downAt=[e.clientX,e.clientY];});
    canvas.addEventListener('pointerup',function(e){if(!downAt)return;var mv=Math.abs(e.clientX-downAt[0])+Math.abs(e.clientY-downAt[1]);downAt=null;
      if(mv<6&&st.p>.66){var i=hitTest(e);if(i>=0&&opt&&opt.onPick)opt.onPick(i);}});
    canvas.addEventListener('pointermove',function(e){if(st.p<.66)return;canvas.style.cursor=hitTest(e)>=0?'pointer':'';});
    function pick(i){st.pick=i;
      [0,1,2,3].forEach(function(j){gsap.to(LIFT,{[j]:j===i?1:0,duration:.9,ease:'power3.out'});gsap.to(DIM,{[j]:j===i?0:1,duration:.6});});
      gsap.to(st,{zoom:1,duration:1.4,ease:'power3.inOut'});gsap.to(st,{focus:i===3?1:0,duration:1.2,ease:'power2.inOut'});}
    return {set:function(p){st.p=p;if(p<.7&&st.zoom>0){st.zoom=Math.max(0,st.zoom-.05);}},pick:pick,resize:function(){sizeTo(S,canvas);}};
  }

  /* ================== UN SOLO PIANO (pagine unità) ================== */
  function floor(canvas,id){
    var S=stage(canvas),scene=S.scene,cam=S.cam,f=makeFloor(S,id);scene.add(f);var u=f.userData;
    var st={az:-.75,vaz:0,polar:.92,user:false,rise:0,t0:performance.now()},look=new T.Vector3(),running=false,v=new T.Vector3();
    function frame(now){var mob=canvas.clientWidth<760;inertia(st);
      paint(f,1,1,ease(st.rise),clamp((st.rise-.45)/.55),0);
      var dist=Math.max(u.W,u.H)*(mob?2.2:1.8);
      look.set(0,WALL*.25,0);orbit(cam,look,dist,st.polar,st.az+(st.user?0:(now-st.t0)*.00006));
      S.sun.target.position.copy(look);S.sun.position.copy(look).add(v.set(-26,44,22));
      S.r.render(scene,cam);}
    function loop(now){if(!running)return;frame(now);requestAnimationFrame(loop);}
    addEventListener('resize',function(){sizeTo(S,canvas);});control(canvas,st);
    return {show:function(){sizeTo(S,canvas);if(!running){running=true;requestAnimationFrame(loop);}st.rise=0;gsap.to(st,{rise:1,duration:2,ease:'power2.out',delay:.2});},
            hide:function(){running=false;}};
  }
  window.V8_3D={ok:ok,building:building,floor:floor,
    /* pezzi per esperienze dedicate (es. esplorazione dell'edificio) */
    _:{stage:stage,makeFloor:makeFloor,paint:paint,quartiere:quartiere,sizeTo:sizeTo,orbit:orbit,control:control,inertia:inertia,ease:ease,clamp:clamp,WALL:WALL,SLAB:SLAB,BASE:BASE}};
})();
