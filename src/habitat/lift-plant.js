  // Geometric lift plant. Positions are ship installation metres at the finished
  // car floor; the motion controller supplies a continuous position and door gap.
  function createLiftPlant({installation,lines,halfAisle,floorRect,plate,metal,paint,wayfinding}){
    const cabinBounds=Object.freeze({halfWidth:2.08,halfDepth:2.38,height:3.18});
    const opening=2.66,front=-2.45,landingZ=-2.63,outerWidth=2.26;
    const beamGeometry=new T.BoxGeometry(1,1,1);
    const pinGeometry=new T.CylinderGeometry(1,1,1,24);
    const meshBins=new Map(),stamp=new T.Object3D();
    const axisY=new T.Vector3(0,1,0);
    const cyan=metal(0x64e9e4,.8),amber=metal(0xffc16b,.8);
    const enamel=metal(0xd7d8c7),rubber=metal(0x24303b);
    const rack=metal(0x798899),rail=metal(0xc0c8ca);
    const blue=metal(0x365772),night=metal(0x344451),ivory=metal(0xcdd6cd);
    const safety=metal(0xf0a94e),brass=metal(0xae8753);
    const glass=new T.MeshStandardMaterial({color:0x72bccb,metalness:.07,roughness:.18,
      transparent:true,opacity:.11,depthWrite:false});
    const linePlants=new Map();
    const hallKeys=new Map();
    const root=new T.Group();root.name='升降设备 · 井道与轿厢';installation.add(root);

    function group(parent,name,x=0,y=0,z=0){
      const g=new T.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;
    }
    function batch(g,geo,material,matrix){
      let geometries=meshBins.get(g);
      if(!geometries){geometries=new Map();meshBins.set(g,geometries);}
      let materials=geometries.get(geo);
      if(!materials){materials=new Map();geometries.set(geo,materials);}
      let list=materials.get(material);
      if(!list){list=[];materials.set(material,list);}
      if(!matrix){stamp.updateMatrix();matrix=stamp.matrix.clone();}
      list.push(matrix);
    }
    function beam(g,material,a,b,width,depth=width){
      const d=new T.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
      const len=d.length();if(len<.0001)return;
      stamp.position.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);
      stamp.scale.set(width,len,depth);stamp.quaternion.setFromUnitVectors(axisY,d.divideScalar(len));
      batch(g,beamGeometry,material);
    }
    function roller(g,material,x,y,z,r,length,axis){
      stamp.position.set(x,y,z);stamp.scale.set(r,length,r);
      stamp.rotation.set(axis==='z'?Math.PI/2:0,0,axis==='x'?Math.PI/2:0);
      batch(g,pinGeometry,material);
    }
    function flushParts(){
      for(const [g,geos] of meshBins)for(const [geometry,materials] of geos)for(const [material,list] of materials){
        const mesh=new T.InstancedMesh(geometry,material,list.length);
        list.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
        mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;
        mesh.receiveShadow=true;g.add(mesh);
      }
      meshBins.clear();
    }
    function doors(parent,lineId,level,x,z,isCar){
      const panels=[];
      for(const side of [-1,1]){
        const door=group(parent,(isCar?'轿门':'层门')+' · '+lineId+' · '+(level||'')+' '+side,x,0,z);
        Object.assign(door.userData,{liftLine:lineId,liftPart:isCar?'car-door':'landing-door',side,level});
        const width=opening/4;
        // Two telescoping leaves retract into each shallow jamb. Their
        // parked tips stay inside the car envelope at every opening.
        const trailing=group(door,'随动门扇',side*width,0,isCar ? .088 : -.088);
        for(const leaf of [door,trailing]){
          plate(leaf,rubber,0,.51,0,width-.013,.98,.068);
          plate(leaf,isCar?enamel:blue,0,.52,0,width-.04,.83,.076);
          plate(leaf,isCar?blue:night,0,2.58,0,width-.013,.62,.077);
          plate(leaf,glass,0,1.64,0,width-.10,1.28,.045);
          for(const edge of [-1,1])plate(leaf,rail,edge*(width/2-.032),1.66,0,.052,1.35,.071);
          for(const h of [1.04,2.26])plate(leaf,rail,0,h,0,width-.016,.065,.078);
        }
        plate(door,side>0?cyan:amber,-side*(width/2-.08),2.57,0,.040,.49,.085);
        door.position.x=x+side*opening/8;
        panels.push({door,trailing,side});
      }
      return {panels,x};
    }
    function spread(set,fraction){
      for(const {door,trailing,side} of set.panels){
        door.position.x=set.x+side*(opening/8+(opening/2+.035)*fraction);
        trailing.position.x=side*opening/4*(1-fraction);
      }
    }
    function landing(stop){
      const {deck,x,z,line}=stop,g=deck.group,lip=z+landingZ;
      // Fixed walkable floor ends at the sill. The rest of the former lift
      // room is an open shaft; only the moving cabin supplies its floor.
      floorRect(deck,x-1.52,x+1.52,halfAisle-.07,lip+.13);
      floorRect(deck,x-cabinBounds.halfWidth,x+cabinBounds.halfWidth,lip+.08,z+cabinBounds.halfDepth);
      plate(g,paint.floor,x,-.09,(halfAisle+lip)/2,3.08,.18,lip-halfAisle+.13);
      plate(g,rail,x,-.024,lip+.025,opening+.15,.05,.13);
      plate(g,safety,x,.007,lip-.19,opening,.012,.11);
      // The door leaves slide side-to-side. Twin channels and the central
      // bridge plate show where the car sill meets the fixed landing sill.
      for(const off of [-.035,.035])
        plate(g,rubber,x,.003,lip+.026+off,opening+.10,.008,.018);
      for(let i=0;i<6;i++)plate(g,rubber,x-1.10+i*.43,.017,lip-.19,.16,.012,.11,-.20);
      for(const side of [-1,1]){
        plate(g,paint.base,x+side*2.14,1.51,lip+.02,1.58,3.05,.29);
        plate(g,rail,x+side*1.39,1.43,lip-.14,.105,2.90,.14);
        plate(g,blue,x+side*1.58,1.10,lip-.19,.30,.51,.13);
        const key=wayfinding(g,'呼梯',x+side*1.58,1.10,lip-.27,.24,.20,Math.PI,'#7ae8d5');
        key.userData.liftAction='call';key.userData.liftLine=line.id;key.userData.liftLevel=deck.id;
        const id=line.id+'/'+deck.id;
        if(!hallKeys.has(id))hallKeys.set(id,[]);
        hallKeys.get(id).push(key);
      }
      plate(g,paint.base,x,3.17,lip,5.62,.46,.32);
      wayfinding(g,line.name,x,3.18,lip-.18,2.62,.31,Math.PI,'#93dccc');
      return doors(g,line.id,deck.id,x,lip,false);
    }
    function buildCabin(parent,line,slope,stops){
      const lineId=line.id;
      const car=group(parent,'升降轿厢 · '+lineId);
      Object.assign(car.userData,{liftPart:'car',liftLine:lineId});
      const C=(mat,x,y,z,w,h,d)=>plate(car,mat,x,y,z,w,h,d);
      C(night,0,-.18,0,4.52,.32,5.03);
      C(paint.floor,0,-.025,0,4.36,.05,4.90);
      // Three removable pans carry real metre-scaled diagonal tread. Sills,
      // aisle markings and the control target above them stay unobstructed.
      const tread=cabinAsset(cabinAssets.materials,'lift/car-tread',()=>{
        const mat=paint.floor.clone();Object.assign(mat,cabinFinish('tread'));return mat;
      });
      const pan=cabinAsset(cabinAssets.geometries,'lift/car-pan',()=>
        cabinMetricUV(new T.PlaneGeometry(1.34,4.58),1,1,1));
      for(const x of [-1.36,0,1.36]){
        const panel=new T.Mesh(pan,tread);panel.receiveShadow=true;
        panel.rotation.x=-Math.PI/2;panel.position.set(x,.001,0);car.add(panel);
      }
      for(const x of [-1.43,1.43])C(safety,x,.008,0,.055,.014,4.42);
      for(let k=-3;k<=3;k++)C(rail,0,.002,k*.59,3.92,.004,.014);
      C(rail,0,-.023,front,opening+.14,.049,.14);
      C(night,0,3.33,0,4.49,.20,5.01);
      C(enamel,0,3.22,0,4.32,.07,4.84);
      for(const side of [-1,1]){
        const sx=side*2.16;
        C(blue,sx,.39,0,.14,.77,4.87);
        C(rail,sx,.79,0,.15,.09,4.86);
        C(glass,sx,1.85,0,.05,2.04,4.66);
        C(blue,sx,3.01,0,.16,.35,4.88);
        C(cyan,sx-side*.08,2.91,0,.03,.042,4.60);
        for(const z of [-2.33,.30,2.33])C(enamel,sx,1.85,z,.16,2.10,.13);
        // Keep the lower window at a one-metre pilot's eye line. Guard
        // rails sit below, not directly across a first-person sightline.
        C(rail,side*2.03,.66,0,.07,.06,4.31);
        for(const z of [-1.8,1.8])C(rubber,side*2.09,.65,z,.16,.12,.09);
        C(enamel,side*1.76,1.48,front,.83,2.98,.10);
        C(safety,side*1.37,1.48,front,.045,2.96,.12);
        C(paint.light,side*1.32,3.169,0,.20,.024,3.78);
        for(const z of [-1.76,1.76])C(blue,side*1.34,3.152,z,.25,.034,.045);
      }
      C(blue,0,.37,2.44,4.36,.73,.14);
      C(glass,0,1.81,2.44,4.17,2.05,.045);
      C(enamel,0,3.0,2.44,4.41,.34,.15);
      for(const x of [-2.09,0,2.09])C(enamel,x,1.83,2.43,.1,2.20,.14);
      C(rail,0,.69,2.33,4.15,.066,.072);
      // Between the rear mullions, mount the two cable inspection covers
      // below the windows. Maintenance and passenger cars use their own trim.
      for(const side of [-1,1]){
        const x=side*1.15;
        C(rubber,x,.37,2.355,1.48,.48,.07);
        C(lineId==='service'?brass:enamel,x,.37,2.304,1.39,.40,.041);
        for(const dx of [-.59,.59])roller(car,rail,x+dx,.37,2.278,.044,.032,'z');
        for(let i=0;i<5;i++)C(night,x-.30+i*.15,.36,2.274,.075,.14,.032);
      }
      C(blue,0,3.03,front,4.38,.25,.22);
      wayfinding(car,line.carName,0,3.04,front+.12,2.42,.18,0,'#efc770');
      // A cabinet on the front return carries the floor controls. Large
      // windows either side reveal the shaft lamps and the fixed brackets.
      const keys=[],rows=Math.ceil(stops.length/2),top=1.83;
      C(rubber,-1.75,top-.105*rows,front+.085,.72,rows*.21+.27,.11);
      wayfinding(car,'目的甲板',-1.75,top+.025,front+.147,.59,.13,0,'#90dada');
      // Individual raised keys share their destinations with the onboard selector.
      for(const [i,stop] of [...stops].reverse().entries()){
        const x=-1.75+(i%2-.5)*.33,y=top-.20-Math.floor(i/2)*.21;
        C(brass,x,y,front+.15,.30,.18,.035);
        const label=stop.deck.id.startsWith('crew')?'驻 '+stop.deck.id.slice(4):
          ({lower:'底层',central:'中心',upper:'上层',crown:'塔顶',pod:'腹舱'})[stop.deck.id]||stop.deck.name;
        const key=wayfinding(car,label,x,y,front+.172,.275,.155,0,'#efd780');
        key.userData.liftAction='floor';key.userData.liftLine=lineId;key.userData.liftLevel=stop.deck.id;
        keys.push(key);
      }
      const wheelY=.56,driveX=slope*wheelY+.94,driveZ=3.04;
      // The service chassis remains level: upper and lower roller centres
      // are offset by the slope, so all guide shoes stay on their rail.
      for(const sy of [.16,2.85])for(const side of [-1,1]){
        const rx=side*2.79+slope*sy;
        C(night,(side*2.22+rx)/2,sy,.35,Math.abs(rx-side*2.22)+.17,.24,.42);
        for(const zz of [.16,.54])roller(car,rail,rx-side*.16,sy,zz,.16,.13,'z');
      }
      C(blue,driveX,.58,2.67,.95,.67,.55);
      roller(car,rubber,driveX,wheelY,driveZ,.35,.29,'z');
      const pinion=group(car,'齿条驱动轮 · '+lineId,driveX,wheelY,driveZ+.10);
      roller(pinion,brass,0,0,0,.32,.12,'z');
      for(let i=0;i<12;i++){
        const angle=i*Math.PI/6;
        beam(pinion,rail,[.28*Math.cos(angle),.28*Math.sin(angle),0],
          [.376*Math.cos(angle),.376*Math.sin(angle),0],.085,.12);
      }
      return {car,keys,carDoors:doors(car,lineId,null,0,front,true),pinion};
    }
    function buildLine(line){
      const stops=[...line.stops].sort((a,b)=>a.deck.floorY-b.deck.floorY);
      if(stops.length<2)throw new Error(line.name+'至少需要两个站台');
      const home=stops.find(stop=>stop.deck.id===line.homeLevel);
      if(!home)throw new Error(line.name+'的初始层缺少停靠站');
      const lo=stops[0],hi=stops[stops.length-1],base=lo.deck.floorY;
      if(hi.deck.floorY<=base)throw new Error(line.name+'的站台需要不同标高');
      const slope=(hi.x-lo.x)/(hi.deck.floorY-base);
      const at=y=>lo.x+(y-base)*slope;
      if(stops.some((stop,i)=>Math.abs(stop.x-at(stop.deck.floorY))>.001||Math.abs(stop.z-lo.z)>.001||
        (i>0&&stop.deck.floorY===stops[i-1].deck.floorY)))
        throw new Error(line.name+'的各站门槛须按不同标高沿同一直线导轨安装');
      const assembly=group(root,line.name+' · 井架');
      const shaft=group(assembly,'齿轨与承力井架 · '+line.id);
      const z=lo.z,low=base-2.0,high=hi.deck.floorY+5.15;
      // Gear pitch follows the actual inclined line, not a vertical texture.
      for(const side of [-1,1]){
        for(const zz of [-2.93,3.55])beam(shaft,night,[at(low)+side*3.37,low,z+zz],
          [at(high)+side*3.37,high,z+zz],.30,.30);
        beam(shaft,rail,[at(low)+side*2.79,low,z+.35],[at(high)+side*2.79,high,z+.35],.105,.31);
        beam(shaft,blue,[at(low)+side*2.9,low,z+.35],[at(high)+side*2.9,high,z+.35],.17,.56);
      }
      const pitchFactor=Math.hypot(1,slope);
      // In the XY plane the rack is offset along the normal to the guide,
      // at the pinion pitch radius. Face teeth mate alongside the car motor.
      const rackX=.94+.365*pitchFactor;
      beam(shaft,night,[at(low)+rackX+.10,low,z+3.14],
        [at(high)+rackX+.10,high,z+3.14],.20,.29);
      const toothPitch=(Math.PI*2*.34/12)/pitchFactor;
      for(let y=low;y<high;y+=toothPitch){
        beam(shaft,brass,[at(y)+rackX-.076,y+.013,z+3.14],
          [at(y)+rackX+.09,y-.013,z+3.14],.058,.15);
      }
      // Side and rear bays remain lit with location ticks even between the
      // far-separated upper decks; steel crossmembers connect both rails.
      function wall(x0,z0,x1,z1,y,h,w,d,mat){
        // Shear each fixed skin with the rail but cut its top and bottom
        // horizontally, so even the inclined shaft has a level landing sill.
        const startX=at(y)+x0,endX=at(y+h)+x1;
        const matrix=new T.Matrix4().set(
          w,endX-startX,0,(startX+endX)/2,
          0,h,0,y+h/2,
          0,z1-z0,d,z+(z0+z1)/2,
          0,0,0,1);
        batch(shaft,beamGeometry,mat,matrix);
      }
      for(let y=low;y<high;y+=6){
        const dy=Math.min(6,high-y),mid=y+dy/2;
        wall(0,3.81,0,3.81,y,dy,7.06,.20,night);
        for(const s of [-1,1]){
          wall(s*3.57,.21,s*3.57,.21,y,dy,.17,6.86,night);
          beam(shaft,rail,[at(y)+s*3.28,y,z-2.69],[at(y+dy)+s*3.28,y+dy,z+3.20],.13,.13);
          plate(shaft,blue,at(mid)+s*3.16,mid,z+.35,.53,.31,1.09);
          plate(shaft,amber,at(mid)+s*3.40,mid,z+.86,.05,.65,.12);
          plate(shaft,cyan,at(mid)+s*3.40,mid,z-.88,.05,1.4,.15);
        }
        plate(shaft,rail,at(y),y,z+3.49,6.64,.19,.26);
        plate(shaft,cyan,at(mid)-1.05,mid,z+3.64,1.36,.10,.07);
        if(Math.round((y-low)/6)%4===0)wayfinding(shaft,Math.round(mid)+' m',at(mid)-1.05,mid+.52,z+3.57,1.63,.41,Math.PI,'#6fcbc7');
      }
      // Close the front face except for each genuine stop's doorway band.
      let previous=low;
      for(const stop of stops){
        if(stop.deck.floorY>previous)wall(0,-3.01,0,-3.01,previous,stop.deck.floorY-previous,6.70,.17,night);
        previous=stop.deck.floorY+3.36;
      }
      if(high>previous)wall(0,-3.01,0,-3.01,previous,high-previous,6.70,.17,night);
      for(const y of [low,high])plate(shaft,paint.base,at(y),y,z+.20,6.94,.16,6.79);
      for(const s of [-1,1]){
        roller(shaft,brass,at(low)+s*1.35,low+.37,z,.28,.65,'y');
        roller(shaft,rubber,at(low)+s*1.35,low+.75,z,.36,.13,'y');
      }
      const dockDoors=new Map(stops.map(stop=>[stop.deck.id,landing(stop)]));
      const carBody=buildCabin(assembly,line,slope,stops);
      linePlants.set(line.id,{assembly,stops,home,dockDoors,...carBody,slope,base,
        center:{x:0,y:0,z:0},dockedLevel:null,door:0});
    }
    for(const line of lines)buildLine(line);
    flushParts();
    function setCar(id,{center,dockedLevel,door}){
      const p=linePlants.get(id);if(!p||!center)return;
      const aperture=dockedLevel?Math.max(0,Math.min(1,door)):0;
      p.car.position.set(center.x,center.y,center.z);
      p.pinion.rotation.z=-(center.y-p.base)*Math.hypot(1,p.slope)/.34;
      spread(p.carDoors,aperture);
      if(p.dockedLevel!==dockedLevel&&p.dockedLevel)spread(p.dockDoors.get(p.dockedLevel),0);
      if(dockedLevel)spread(p.dockDoors.get(dockedLevel),aperture);
      p.center={...center};p.dockedLevel=dockedLevel;p.door=aperture;
    }
    for(const [id,p] of linePlants){
      const {home}=p;
      setCar(id,{center:{x:home.x,y:home.deck.floorY,z:home.z},dockedLevel:home.deck.id,door:1});
    }
    function nearStation(p){
      if(!p||!p.level)return null;
      for(const [id,line] of linePlants){
        const stop=line.stops.find(s=>s.deck.id===p.level);
        if(stop&&Math.abs(p.x-stop.x)<=2.60&&p.z>=1.40&&p.z<=stop.z+cabinBounds.halfDepth+.02)
          return {id,line,stop};
      }
      return null;
    }
    function station(p){
      const near=nearStation(p);if(!near)return null;
      const {id,line,stop}=near,x=Math.abs(p.x-stop.x),z=p.z-stop.z;
      const inside=line.dockedLevel===stop.deck.id && line.door>=.97 && x<=cabinBounds.halfWidth-.43 &&
        z>=front+.49 && z<=cabinBounds.halfDepth-.43;
      return {lineId:id,level:stop.deck.id,inside,waiting:!inside};
    }
    function allows(p,r){
      const near=nearStation(p);if(!near)return true;
      const {line,stop}=near,x=Math.abs(p.x-stop.x),z=p.z-stop.z;
      if(z+r<landingZ-.09)return true;
      if(z-r>front+.06)return line.dockedLevel===stop.deck.id && x+r<=cabinBounds.halfWidth &&
        z+r<=cabinBounds.halfDepth;
      return line.dockedLevel===stop.deck.id && x+r<=line.door*opening/2-.035;
    }
    function view(id,pos){
      root.visible=true;
      for(const [key,p] of linePlants){
        if(id){p.assembly.visible=id===key;continue;}
        const stop=p.stops.find(s=>s.deck.id===pos.level);
        p.assembly.visible=!!stop && Math.hypot(pos.x-stop.x,pos.z-stop.z)<78;
      }
    }
    return {cabinBounds,station,allows,setCar,
      buttonsAt(p){const s=station(p);if(!s)return [];
        return s.inside?linePlants.get(s.lineId).keys:hallKeys.get(s.lineId+'/'+s.level)||[];},
      getCar(id){const p=linePlants.get(id);return p?{center:{...p.center},dockedLevel:p.dockedLevel,door:p.door}:null;},
      view,hide(){root.visible=false;}
    };
  }
