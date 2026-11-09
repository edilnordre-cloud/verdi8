/* =====================================================================
   Verdi 8 — esplorazione dell'edificio, sul modello delle demo immobiliari 3D:
   edificio intero → piano che si illumina → piano tagliato e arredato →
   dentro l'appartamento, a 1,60 m, ti guardi intorno e passi da una stanza all'altra.
   V8_EXPLORE(canvas, {onState}) → {hover(i), select(i), enter(), go(r), exit(), back()}
   ===================================================================== */
(function(){
  var T=window.THREE;
  window.V8_EXPLORE=function(canvas,opt){
    var I=V8_3D._,S=I.stage(canvas),scene=S.scene,cam=S.cam,WALL=I.WALL,ease=I.ease,clamp=I.clamp;
    var IDS=['app-a','app-b','attico','villa-c'];
    var floors=IDS.map(function(id){var f=I.makeFloor(S,id);scene.add(f);return f;});
    var VX=23,VZ=5;floors[3].position.set(VX,0,VZ);
    var Q=I.quartiere(S);
    var rooms=[[],[],[],[]];
    IDS.forEach(function(id,i){fetch(I.BASE+id+'-stanze.json').then(function(r){return r.json();}).then(function(R){rooms[i]=R;});});
    /* luce in casa: senza, il soffitto spegne tutto */
    var lamp=new T.PointLight(0xfff1dc,0,18,1.2);scene.add(lamp);
    var NIGHT=new T.Color(0x080808),DAY=new T.Color(0xcfd9df),SKY=new T.Color();
    var amb=new T.AmbientLight(0xfff6ea,0);scene.add(amb);

    var st={mode:'ext',open:0,hover:-1,sel:-1,az:-.7,vaz:0,polar:1.0,user:false,t0:performance.now(),
            inT:0,yaw:0,pitch:-.05,room:0,prev:0,mv:1};
    var LIFT=[0,0,0,0],DIM=[0,0,0,0],HL=[0,0,0,0];
    var look=new T.Vector3(),v=new T.Vector3(),eye=new T.Vector3(),ray=new T.Raycaster(),mouse=new T.Vector2();
    /* contorno luminoso del piano evidenziato */
    var halo=[];floors.forEach(function(g){var u=g.userData;
      var m=new T.Mesh(new T.BoxGeometry(u.ww*1.06,WALL+.4,12.7),new T.MeshBasicMaterial({color:0x9dc0aa,transparent:true,opacity:0,depthWrite:false}));
      m.position.y=WALL/2;g.add(m);halo.push(m);});
    /* punti sul pavimento per cambiare stanza */
    var spots=new T.Group();scene.add(spots);
    function buildSpots(){spots.clear();var i=st.sel,g=floors[i],u=g.userData;
      rooms[i].forEach(function(r,k){var ring=new T.Mesh(new T.RingGeometry(.28,.4,40),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.85,depthWrite:false,side:T.DoubleSide}));
        ring.rotation.x=-Math.PI/2;ring.position.set(u.X(r.p[0])+g.position.x,g.position.y+.05,u.Z(r.p[1])+g.position.z);ring.userData.k=k;spots.add(ring);});}

    function camExt(now){
      I.inertia(st);
      var gap=WALL+I.SLAB+.35+3.4*st.open,az=st.az+(st.user?0:(now-st.t0)*.00005);
      floors.forEach(function(g,i){
        if(i<3)g.position.y=i*gap+LIFT[i]*1.6+(st.sel>=0&&st.sel<3&&i>st.sel?3.4*st.open:0);
        else g.position.y=LIFT[3]*1.6;
        var dim=1-.6*DIM[i];
        I.paint(g,1,dim,1,st.open,(1-st.open)*(i===2||i===3?1:0));
        halo[i].material.opacity=.16*HL[i]*(1-st.inT);
      });
      var mob=canvas.clientWidth<760,stackH=2*gap;
      var sel=st.sel>=0?floors[st.sel]:null;
      var base=new T.Vector3(VX*.45,stackH*.38,VZ*.5);
      if(sel)base.lerp(v.set(sel.position.x+sel.userData.ox*.3,sel.position.y+WALL*.5,sel.position.z),.45*st.open);
      look.copy(base);
      var dist=(mob?74:52)+stackH*.8;dist*=1-.2*st.open*(sel?1:0);
      I.orbit(cam,look,dist,st.polar-.18*st.open,az);
      return dist;
    }
    function frame(now){
      cam.fov=30+46*ease(st.inT);cam.updateProjectionMatrix();
      if(st.mode==='ext'||st.inT<1){camExt(now);}
      if(st.inT>0&&st.sel>=0){
        var g=floors[st.sel],u=g.userData,r=rooms[st.sel][st.room],r0=rooms[st.sel][st.prev]||r;
        if(r){var mv=ease(st.mv);eye.set(u.X(r0.p[0]+(r.p[0]-r0.p[0])*mv)+g.position.x,g.position.y+1.6,u.Z(r0.p[1]+(r.p[1]-r0.p[1])*mv)+g.position.z);
          v.set(Math.sin(st.yaw)*Math.cos(st.pitch),Math.sin(st.pitch),-Math.cos(st.yaw)*Math.cos(st.pitch));
          var t=ease(st.inT),from=cam.position.clone();
          cam.position.lerpVectors(from,eye,t);
          var tgt=eye.clone().add(v);var lk=look.clone().lerp(tgt,t);cam.lookAt(lk);
          lamp.position.copy(eye).setY(g.position.y+2.3);}
        /* in casa: solo il piano scelto, col soffitto */
        floors.forEach(function(f,i){if(i!==st.sel)f.visible=st.inT<.6;});
        I.paint(g,1,1,1,1,st.inT>.5?1:0);if(g.userData.roof){g.userData.roof.position.y=WALL;g.userData.roofMat.side=T.DoubleSide;}
        lamp.intensity=2.2*st.inT;amb.intensity=.85*st.inT;
        spots.visible=st.inT>.95;spots.children.forEach(function(s){s.visible=s.userData.k!==st.room;});
      }else{spots.visible=false;lamp.intensity=0;amb.intensity=0;}
      /* in casa il cielo è chiaro: dalle finestre si vede giorno */
      SKY.copy(NIGHT).lerp(DAY,ease(st.inT));S.r.setClearColor(SKY,1);scene.fog.color.copy(SKY);
      scene.fog.near=st.inT>.5?40:70;scene.fog.far=st.inT>.5?260:190;
      if(Q.ready){Q.roadMat.uniforms.r.value=2000;Q.roadMat.uniforms.dive.value=1;Q.ring.visible=false;}
      cam.clearViewOffset();
      S.r.render(scene,cam);
    }
    var running=true;(function loop(now){if(running)frame(now||0);requestAnimationFrame(loop);})();
    addEventListener('resize',function(){I.sizeTo(S,canvas);});I.sizeTo(S,canvas);

    /* ---------- comandi ---------- */
    function hits(e,list){var b=canvas.getBoundingClientRect();mouse.set(((e.clientX-b.left)/b.width)*2-1,-((e.clientY-b.top)/b.height)*2+1);
      ray.setFromCamera(mouse,cam);return ray.intersectObjects(list);}
    var down=null,lx=0,ly=0;
    canvas.addEventListener('pointerdown',function(e){down=[e.clientX,e.clientY];lx=e.clientX;ly=e.clientY;st.vaz=0;canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',function(e){
      if(down){var dx=e.clientX-lx,dy=e.clientY-ly;lx=e.clientX;ly=e.clientY;
        if(st.mode==='int'){st.yaw+=dx*.005;st.pitch=clamp((st.pitch-dy*.004+.9)/1.8)*1.8-.9;}
        else{st.az-=dx*.006;st.vaz=-dx*.004;st.polar=Math.max(.35,Math.min(1.25,st.polar-dy*.004));st.user=true;}
        return;}
      if(st.mode==='ext'){var h=hits(e,floors.map(function(g){return g.userData.hit;}));
        var i=h.length?floors.findIndex(function(g){return g.userData.hit===h[0].object;}):-1;
        if(i!==st.hover){api.hover(i);if(opt.onHover)opt.onHover(i);}canvas.style.cursor=i>=0?'pointer':'grab';}
      else canvas.style.cursor='grab';
    });
    canvas.addEventListener('pointerup',function(e){if(!down)return;var mv=Math.abs(e.clientX-down[0])+Math.abs(e.clientY-down[1]);down=null;if(mv>6)return;
      if(st.mode==='ext'){var h=hits(e,floors.map(function(g){return g.userData.hit;}));
        if(h.length){var i=floors.findIndex(function(g){return g.userData.hit===h[0].object;});api.select(i);if(opt.onSelect)opt.onSelect(i);}}
      else{var s=hits(e,spots.children.filter(function(x){return x.visible;}));if(s.length)api.go(s[0].object.userData.k);}
    });
    var api={
      hover:function(i){st.hover=i;[0,1,2,3].forEach(function(j){gsap.to(HL,{[j]:j===i?1:0,duration:.3});
        if(st.sel<0)gsap.to(LIFT,{[j]:j===i?.35:0,duration:.5,ease:'power3.out'});});},
      select:function(i){st.sel=i;gsap.to(st,{open:1,duration:1.2,ease:'power3.inOut'});
        [0,1,2,3].forEach(function(j){gsap.to(LIFT,{[j]:j===i?1:0,duration:.9,ease:'power3.out'});gsap.to(DIM,{[j]:j===i?0:1,duration:.6});});
        if(opt.onState)opt.onState('floor',i);},
      back:function(){st.sel=-1;gsap.to(st,{open:0,duration:1.1,ease:'power3.inOut'});
        [0,1,2,3].forEach(function(j){gsap.to(LIFT,{[j]:0,duration:.8});gsap.to(DIM,{[j]:0,duration:.6});});if(opt.onState)opt.onState('building');},
      enter:function(){if(st.sel<0||!rooms[st.sel].length)return;st.mode='int';st.room=0;st.prev=0;st.mv=1;st.yaw=rooms[st.sel][0].y||0;st.pitch=-.2;buildSpots();
        gsap.to(st,{inT:1,duration:2.2,ease:'power2.inOut'});if(opt.onState)opt.onState('inside',st.sel,rooms[st.sel],0);},
      go:function(k){if(k===st.room)return;st.prev=st.room;st.room=k;st.mv=0;
        /* cammino verso il punto nuovo girandomi verso la sua parte più aperta */
        var y0=st.yaw,y1=rooms[st.sel][k].y||y0,dy=Math.atan2(Math.sin(y1-y0),Math.cos(y1-y0));
        gsap.to(st,{mv:1,duration:1.3,ease:'power2.inOut'});gsap.to(st,{yaw:y0+dy,duration:1.3,ease:'power2.inOut'});
        if(opt.onState)opt.onState('room',st.sel,rooms[st.sel],k);},
      exit:function(){gsap.to(st,{inT:0,duration:1.6,ease:'power2.inOut',onComplete:function(){st.mode='ext';}});
        if(opt.onState)opt.onState('floor',st.sel);},
      rooms:function(i){return rooms[i];}
    };
    return api;
  };
})();
