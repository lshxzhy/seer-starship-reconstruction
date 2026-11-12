  // Both the deck chart and the signs use the installed lift stop lists.
  function shipLiftRides(from,to){
    if(from===to)return [];
    const queue=[{floor:from,rides:[]}],seen=new Set([from]);
    for(const {floor,rides} of queue){
      for(const line of habitat.plan.lifts){
        if(!line.stops.some(stop=>stop.level===floor))continue;
        for(const stop of line.stops){
          if(seen.has(stop.level))continue;
          const next=[...rides,{line,from:floor,to:stop.level}];
          if(stop.level===to)return next;
          queue.push({floor:stop.level,rides:next});seen.add(stop.level);
        }
      }
    }
    return null;
  }

  function createDeliveryGuide(){
    // The guide is attached to the ship's metric installation. Floor paint,
    // hangers and enamel faces share the depth buffer with the real bulkheads.
    const assembly=new T.Group(),panels=new T.Group();
    assembly.name='物资运输 · 舱门与升降站导引';assembly.visible=false;
    assembly.add(panels);habitat.root.add(assembly);
    const decks=new Map(habitat.plan.levels.map(deck=>[deck.id,deck]));
    const labels=new Map();
    const box=new T.BoxGeometry(),face=new T.PlaneGeometry(1,1);
    const trim=new T.MeshBasicMaterial({color:0x34515c,toneMapped:false});
    const metal=applyManufacturedFinish(new T.MeshStandardMaterial({color:0x52646a,metalness:.56,roughness:.42}),'metal');
    const amber=new T.MeshBasicMaterial({color:0xffcf67,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
    const shape=new T.Shape();
    shape.moveTo(0,.47);shape.lineTo(.34,.08);shape.lineTo(.34,-.13);
    shape.lineTo(.075,.11);shape.lineTo(.075,-.38);shape.lineTo(-.075,-.38);
    shape.lineTo(-.075,.11);shape.lineTo(-.34,-.13);shape.lineTo(-.34,.08);shape.closePath();
    const arrowGeometry=new T.ShapeGeometry(shape).rotateX(-Math.PI/2);
    const arrows=new T.InstancedMesh(arrowGeometry,amber,280);
    arrows.count=0;arrows.frustumCulled=false;assembly.add(arrows);
    const marker=new T.Object3D();
    const ring=new T.RingGeometry(.48,.53,40).rotateX(-Math.PI/2);
    const arrival=new T.Mesh(ring,amber);assembly.add(arrival);
    let goalKey='',levelKey='',route=[],hint='',refPoint=null,finalLift=null;
    const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
    const local=(room,x,z)=>{
      const side=room.side===1?-1:1;
      return {x:room.center[0]+x*side,z:room.center[2]+z*side};
    };
    function labelMaterial(name,action,glyph){
      const key=[name,action,glyph].join('|');
      if(labels.has(key))return labels.get(key);
      const canvas=document.createElement('canvas');canvas.width=512;canvas.height=144;
      const c=canvas.getContext('2d');
      c.fillStyle='#132c34';c.fillRect(0,0,512,144);c.fillStyle='#ffcd66';
      c.fillRect(0,0,7,144);c.fillRect(15,12,105,120);
      c.fillStyle='#142c34';c.strokeStyle='#142c34';c.lineWidth=13;c.lineJoin='miter';c.lineCap='square';
      c.save();c.translate(67,72);
      const angle={left:-Math.PI/2,right:Math.PI/2,down:Math.PI,up:0,straight:0,stop:0}[glyph];
      c.rotate(angle);
      if(glyph==='stop'){c.strokeRect(-19,-19,38,38);}
      else{
        c.beginPath();c.moveTo(0,26);c.lineTo(0,-23);c.moveTo(-23,-3);c.lineTo(0,-26);c.lineTo(23,-3);c.stroke();
        if(glyph==='up'||glyph==='down'){c.fillRect(-24,-39,48,5);}
      }
      c.restore();
      c.fillStyle='#ffda89';c.font='600 25px "Microsoft YaHei",sans-serif';c.fillText(action,138,44,356);
      c.fillStyle='#f1f8f3';c.font='700 49px "Microsoft YaHei",sans-serif';c.fillText(name,136,107,360);
      const map=new T.CanvasTexture(canvas);map.encoding=T.sRGBEncoding;
      const mat=new T.MeshBasicMaterial({map,toneMapped:false});labels.set(key,mat);return mat;
    }
    function plaque(x,y,z,yaw,name,action,glyph,roof){
      const mount=new T.Group();mount.name='货运导向牌 · '+name;
      mount.position.set(x,y,z);mount.rotation.y=yaw;panels.add(mount);
      function fitting(geo,mat,sx,sy,sz,px,py,pz){
        const mesh=new T.Mesh(geo,mat);mesh.scale.set(sx,sy,sz);mesh.position.set(px,py,pz);mount.add(mesh);
      }
      const w=2.13,h=.60;
      fitting(box,trim,w+.08,h+.07,.072,0,0,0);
      fitting(face,labelMaterial(name,action,glyph),w,h,1,0,0,.038);
      if(roof>y+h/2){
        const len=roof-y-h/2;
        for(const sx of [-.81,.81])fitting(box,metal,.045,len,.045,sx,h/2+len/2,0);
      }
    }
    function project(p,a,b){
      const dx=b.x-a.x,dz=b.z-a.z,sq=dx*dx+dz*dz;
      const t=sq?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/sq)):0;
      return {x:a.x+t*dx,z:a.z+t*dz,t};
    }
    function roomPath(start,end,room,y){
      // Sweep the same footprint as a walking pilot. A free forward aisle
      // avoids the mechanical cart and the power control desk in the two bays.
      const clear=(a,b)=>{
        const count=Math.max(1,Math.ceil(distance(a,b)/.42));
        for(let i=1;i<=count;i++)if(!habitat.canStand({level:room.level,y,x:a.x+(b.x-a.x)*i/count,z:a.z+(b.z-a.z)*i/count},.46))return false;
        return true;
      };
      const nearDoor=room.door.z+Math.sign(room.door.z)*(room.id==='power'?5.7:3.7);
      const candidates=[[end],[{x:start.x,z:nearDoor},{x:end.x,z:nearDoor},end],
        [{x:start.x,z:end.z},end],[{x:end.x,z:start.z},end]];
      if(room.id==='power'){
        // The exchange hatch is behind the separate game console. Both of
        // its side aisles are real openings; check their clearance before use.
        for(const side of [-1,1]){
          const aisle=local(habitat.byId.get('power'),side*3.35,0).x;
          candidates.push([{x:aisle,z:start.z},{x:aisle,z:end.z},end],
            [{x:start.x,z:nearDoor},{x:aisle,z:nearDoor},{x:aisle,z:end.z},end],
            [{x:aisle,z:start.z},{x:aisle,z:nearDoor},{x:end.x,z:nearDoor},end]);
        }
      }
      for(const nodes of candidates){
        if(nodes.every((p,i)=>clear(i?nodes[i-1]:start,p)))return nodes;
      }
      // A detour may start behind a workstation. Search only the current room,
      // then remove unnecessary grid corners using the original swept footprint.
      const x0=room.center.x-room.width/2,z0=room.center.z-room.depth/2,step=1.1;
      const cols=Math.ceil(room.width/step),rows=Math.ceil(room.depth/step);
      const index=p=>Math.min(rows-1,Math.max(0,Math.floor((p.z-z0)/step)))*cols+
        Math.min(cols-1,Math.max(0,Math.floor((p.x-x0)/step)));
      const centre=n=>({x:x0+(n%cols+.5)*step,z:z0+(Math.floor(n/cols)+.5)*step});
      const first=index(start),queue=[first],parents=new Map([[first,-1]]);
      let last=-1;
      for(let i=0;i<queue.length;i++){
        const n=queue[i],p=n===first?start:centre(n);
        if(distance(p,end)<2.1&&clear(p,end)){last=n;break;}
        const col=n%cols,row=Math.floor(n/cols);
        for(const [dx,dz] of [[0,1],[0,-1],[1,0],[-1,0]]){
          const ix=col+dx,iz=row+dz,m=iz*cols+ix;
          if(ix<0||ix>=cols||iz<0||iz>=rows||parents.has(m)||!clear(p,centre(m)))continue;
          parents.set(m,n);queue.push(m);
        }
      }
      if(last<0)return [];
      const path=[end];
      while(last!==first){path.push(centre(last));last=parents.get(last);}
      path.reverse();
      const compact=[];let anchor=start;
      for(let i=0;i<path.length;i++){
        while(i+1<path.length&&clear(anchor,path[i+1]))i++;
        anchor=path[i];compact.push(anchor);
      }
      return compact;
    }
    function rebuild(p,goal){
      while(panels.children.length)panels.remove(panels.children[panels.children.length-1]);
      route=[];arrows.count=0;arrival.visible=false;finalLift=null;
      goalKey=goal;levelKey=p.level;refPoint={x:p.x,z:p.z};
      const deck=decks.get(p.level),destId=goal==='mine'?'machine':'power';
      const dest=habitat.byId.get(destId);
      if(!deck||!dest)return;
      const places=habitat.plan.rooms,place=habitat.location(p);
      const cabin=places.find(r=>r.id===place.roomId);
      const zone=habitat.plan.crew.zones.find(r=>r.id===place.wardId);
      const source=cabin||(zone&&{...zone,center:{x:zone.cx,z:(zone.z0+zone.z1)/2}});
      const rides=shipLiftRides(p.level,dest.level);if(!rides)return;
      finalLift=rides[0]||null;
      const liftId=finalLift?.line.id;
      const target=deck.corridors.find(c=>c.leadsTo===(liftId||destId));
      if(!target)return;
      const terminal=goal==='mine'?'采样工位':'能源兑换台';
      const liftName=finalLift?.line.stationName;
      const following=finalLift?liftName:dest.name;
      const targetPoint=goal==='mine'?local(dest,-14.1,6.7):local(dest,powerExchangePoint.x,powerExchangePoint.z);
      function add(point,name,mark=null){
        const last=route[route.length-1];
        if(last&&distance(last,point)<.10){
          if(mark)Object.assign(last,{name,mark});
          return;
        }
        route.push({x:point.x,z:point.z,name,mark});
      }
      function indoor(from,to,room,label){
        const path=roomPath(from,to,room,deck.floorY);
        if(!path.length){
          route=[];hint='请沿可步行的舱内通道绕开设备，重新接入货运路线。';return false;
        }
        for(const node of path)add(node,label);
        return path.length>0;
      }
      add(p,following);
      const insideDestination=source?.id===destId;
      if(!insideDestination){
        const nearest=source?deck.corridors.find(c=>c.leadsTo===source.id):deck.corridors.reduce((best,c)=>{
          const gap=distance(p,project(p,c.from,c.to));return !best||gap<best.gap?{c,gap}:best;
        },null)?.c;
        if(!nearest)return;
        // Branches sharing a station with a compartment can lie on opposite
        // sides of the spine. Use the actual side and doorway of each branch.
        if(source){
          if(!indoor(p,source.door,source,'舱门'))return;
          add(source.door,'舱门',{kind:'door',name:following,out:true,side:Math.sign(source.door.z)});
        }
        if(nearest!==target && nearest.kind!=='spine'){
          if(!source)add(project(p,nearest.from,nearest.to),'主廊');
          add(nearest.from,'主廊',{kind:'junction',name:following});
        }
        if(nearest.kind==='spine')add(project(p,nearest.from,nearest.to),'主廊');
        if(nearest!==target)add(target.from,following,{kind:'junction',name:following});
        if(finalLift){
          // End the walking route in the landing, outside both door sills.
          add({x:target.to.x,z:target.to.z-3.50},liftName,{kind:'lift',name:decks.get(finalLift.to).name});
        }else{
          add(target.to,dest.name,{kind:'door',name:terminal,side:Math.sign(target.to.z)});
        }
      }
      if(!finalLift){
        const last=route[route.length-1],r=places.find(room=>room.id===destId);
        if(!indoor(last,targetPoint,r,terminal))return;
        add(targetPoint,terminal);
      }
      if(route.length<2){
        // Standing in the destination already still needs its arrival cue.
        route.push({...route[0],name:finalLift?liftName:terminal});
      }
      const atFloor=q=>deck.floorY+contactFloor({...q,level:p.level,y:deck.floorY});
      for(let i=1;i<route.length;i++){
        const a=route[i-1],b=route[i],c=route[i+1];
        const len=distance(a,b),dx=b.x-a.x,dz=b.z-a.z;
        const heading=Math.atan2(dx,dz);
        const count=Math.max(1,Math.ceil(len/3.25));
        for(let j=0;j<count&&arrows.count<arrows.instanceMatrix.count;j++){
          if(len<.65)continue;
          const t=(j+.5)/count,q={x:a.x+dx*t,z:a.z+dz*t};
          marker.position.set(q.x,atFloor(q)+.075,q.z);
          marker.rotation.set(0,heading+Math.PI,0);marker.updateMatrix();
          arrows.setMatrixAt(arrows.count++,marker.matrix);
        }
        if(!b.mark)continue;
        const {kind,name,side,out}=b.mark;
        // A third-person follower may occlude a sign on the back of the
        // cabin. Lettering always faces the expected direction of approach.
        let x=b.x,z=b.z,yaw=Math.atan2(-dx,-dz),glyph='straight',action='物资通路';
        let y=deck.floorY+2.84,roof=deck.floorY+4.36;
        if(kind==='door'){
          z+=side*(out ? .58 : -.68);yaw=out?(side>0?0:Math.PI):(side>0?Math.PI:0);
          y=deck.floorY+2.77;roof=deck.floorY+3.15;action=out?'由此出舱':'由此进舱';
        }else if(kind==='lift'){
          z+=.72;y=deck.floorY+2.94;roof=deck.floorY+3.4;yaw=Math.PI;
          glyph=decks.get(finalLift.to).floorY>deck.floorY?'up':'down';action='乘此线换层';
        }else if(c&&len>.1){
          const turn=(-dz*(c.x-b.x)+dx*(c.z-b.z))/(len*Math.max(.001,distance(b,c)));
          glyph=turn>.55?'right':turn<-.55?'left':'straight';
          action=glyph==='left'?'前方左转':glyph==='right'?'前方右转':'沿主廊直行';
        }
        plaque(x,y,z,yaw,name,action,glyph,roof);
      }
      arrows.instanceMatrix.needsUpdate=true;
      const end=route[route.length-1];arrival.position.set(end.x,atFloor(end)+.082,end.z);arrival.visible=true;
    }
    function update(p,goal,active){
      if(!active||!p||!['mine','deliver'].includes(goal)){hide();return;}
      assembly.visible=true;
      if(goal!==goalKey||p.level!==levelKey||(!route.length&&refPoint&&distance(p,refPoint)>1.1))rebuild(p,goal);
      if(!route.length)return;
      let best=Infinity,segment=0,projection=route[0];
      for(let i=1;i<route.length;i++){
        const q=project(p,route[i-1],route[i]),gap=distance(p,q);
        if(gap<=best){best=gap;segment=i;projection=q;}
      }
      if(best>2.6 && (!refPoint||distance(p,refPoint)>1.1)){
        rebuild(p,goal);return;
      }
      const end=route[route.length-1],terminal=goal==='mine'?'机械室采样工位':'动力室能源兑换台';
      const landing=finalLift&&habitat.liftPlant.station(p);
      if(landing&&landing.lineId===finalLift.line.id){
        const car=habitat.liftPlant.getCar(landing.lineId);
        hint=landing.inside?'在轿厢内选择「'+decks.get(finalLift.to).name+'」':
          car.dockedLevel===p.level&&car.door>=.97?'沿门槛走入轿厢':'在此候梯 · 车到开门后进入';
        return;
      }
      if(!finalLift&&distance(p,end)<1.55){hint='已到'+terminal;return;}
      let i=segment||1;
      if(distance(projection,route[i]||end)<1.25&&i+1<route.length)i++;
      let metres=distance(p,route[i]||end);
      // Report distance along the marked aisle to the named sign, including
      // clearance turns around equipment rather than naming an intermediate bend a door.
      while(i+1<route.length&&!route[i].mark){metres+=distance(route[i],route[i+1]);i++;}
      hint='沿金色箭头前往'+(route[i]||end).name+' · '+Math.max(1,Math.round(metres))+' 米';
    }
    function hide(){assembly.visible=false;goalKey='';hint='';}
    function dispose(){
      assembly.removeFromParent?assembly.removeFromParent():habitat.root.remove(assembly);
      for(const g of [box,face,arrowGeometry,ring])g.dispose();
      for(const mat of labels.values()){mat.map.dispose();mat.dispose();}
      trim.dispose();metal.dispose();amber.dispose();
    }
    return {update,hide,dispose,get hint(){return hint;}};
  }
