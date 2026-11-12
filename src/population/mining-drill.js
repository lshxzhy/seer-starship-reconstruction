  // Player equipment. The 2009 equip portrait shows paired red trunnions,
  // gold motor cases, green dials and a tapered steel cutter on each flank.
  function createMiningDrill(world=scene) {
    const root=new T.Group(),heads=[],motors=[];
    root.name='挖矿钻头 · 两侧挂装';root.visible=false;root.matrixAutoUpdate=false;
    const paint=(color,roughness,metalness)=>new T.MeshStandardMaterial({
      color:new T.Color(color).convertSRGBToLinear(),roughness,metalness
    });
    const materials={
      red:paint(0xbc3330,.32,.36),dark:paint(0x354450,.36,.70),
      brass:paint(0xe5ab4a,.33,.61),steel:paint(0xb7c2ca,.22,.83),
      blade:paint(0xe5e9eb,.20,.79),gauge:paint(0xa8df88,.24,.12)
    };
    applyManufacturedFinish(materials.red,'paint');
    for(const alloy of [materials.dark,materials.brass,materials.steel,materials.blade])applyManufacturedFinish(alloy,'metal');
    materials.gauge.emissive.copy(materials.gauge.color);materials.gauge.emissiveIntensity=.22;
    const owned=new Set();
    function profile(rings,sides=32){
      const g=new T.LatheGeometry(rings.map(([y,r])=>new T.Vector2(r,y)),sides);
      owned.add(g);return g;
    }
    function mount(group,geometry,material,x=0,y=0,z=0){
      const piece=new T.Mesh(geometry,material);piece.receiveShadow=true;
      piece.position.set(x,y,z);group.add(piece);return piece;
    }
    const axle=profile([[-.18,0],[-.18,.071],[-.16,.108],[-.11,.108],[-.10,.086],
      [.08,.086],[.10,.121],[.15,.121],[.17,.096],[.17,0]]);
    const casing=profile([[-.132,0],[-.132,.203],[-.12,.229],[-.07,.242],
      [.064,.242],[.121,.226],[.157,.183],[.181,.134],[.183,0]]);
    const rearCap=profile([[-.02,0],[-.02,.144],[.008,.152],[.044,.133],[.058,.098],[.058,0]]);
    const darkCollar=profile([[-.048,0],[-.048,.207],[-.03,.23],[.007,.23],[.016,.208],[.016,0]]);
    const gaugeBezel=profile([[-.022,0],[-.022,.104],[.001,.115],[.022,.091],[.023,0]]);
    const gaugeLens=profile([[0,0],[0,.085],[.01,.084],[.018,.061],[.02,0]]);
    const indexMark=new T.BoxGeometry(.009,.005,.072);owned.add(indexMark);
    const core=profile([[-.50,0],[-.468,.042],[-.37,.089],[-.25,.136],
      [-.13,.166],[0,.197],[.012,.19],[.012,0]],48);
    // A continuous cutting flight, with a relieved back and a wider polished
    // edge, casts the alternating silver/dark bands of the equip portrait.
    function cuttingFlight(){
      const positions=[],uvs=[],indices=[],steps=172;
      for(let i=0;i<=steps;i++){
        const t=i/steps,angle=t*Math.PI*2*3.6;
        const r=.196*(1-t)+.033*t,y=-t*.445;
        for(const [rr,yy] of [[r-.01,y+.017],[r+.041*(1-.65*t),y],[r-.012,y-.026]]){
          positions.push(Math.cos(angle)*rr,yy,Math.sin(angle)*rr);
        }
        uvs.push(t*3.6,0,t*3.6,.5,t*3.6,1);
        if(i===0)continue;
        const a=(i-1)*3;
        for(let face=0;face<2;face++){
          const n=a+face;indices.push(n,n+3,n+4,n,n+4,n+1);
        }
      }
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
      g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
      g.setIndex(indices);g.computeVertexNormals();owned.add(g);return g;
    }
    const flight=cuttingFlight();materials.blade.side=T.DoubleSide;
    for(const sign of [-1,1]){
      const shaft=mount(root,axle,materials.red,sign*.70,-.068,0);
      shaft.rotation.z=-sign*Math.PI/2;
      const motor=new T.Group();motor.name='金壳钻机';motor.position.set(sign*.93,-.030,0);
      motor.rotation.x=.60;motor.scale.setScalar(1.23);root.add(motor);motors.push(motor);
      mount(motor,casing,materials.brass);
      mount(motor,rearCap,materials.steel,0,.168,0);
      const gauge=new T.Group();gauge.position.set(0,.049,-.211);gauge.rotation.x=-1.06;motor.add(gauge);
      mount(gauge,gaugeBezel,materials.dark);mount(gauge,gaugeLens,materials.gauge,0,.023,0);
      mount(gauge,indexMark,materials.dark,0,.044,-.022).rotation.y=sign*.49;
      for(let i=-2;i<=2;i++){
        const angle=i*.54;
        const tick=mount(gauge,indexMark,materials.dark,.068*Math.sin(angle),.036,-.068*Math.cos(angle));
        tick.rotation.y=-angle;tick.scale.set(.72,1,.2);
      }
      mount(motor,darkCollar,materials.dark,0,-.138,0);
      const bit=new T.Group();bit.name='螺旋切削刃';bit.position.y=-.157;motor.add(bit);heads.push(bit);
      mount(bit,core,materials.steel);mount(bit,flight,materials.blade);
    }
    world.add(root);
    let equipped=false,timeLeft=0;
    return {
      set(value){
        equipped=Boolean(value);
        if(!equipped){root.visible=false;timeLeft=0;}
      },
      work(){if(equipped)timeLeft=.88;},
      update(coreBone,dt,active){
        root.visible=equipped&&active;
        if(!root.visible)return;
        // Keep the mounts on their actual shell sockets even in first person
        // where the avatar's head mesh must be hidden from the eye camera.
        coreBone.updateWorldMatrix(true,false);
        root.matrix.copy(coreBone.matrixWorld);root.matrixWorldNeedsUpdate=true;
        timeLeft=Math.max(0,timeLeft-dt);
        const load=timeLeft>0?Math.sin(Math.PI*timeLeft/.88):0;
        for(let i=0;i<heads.length;i++){
          heads[i].rotation.y+=(i===0?1:-1)*dt*37*load;
          motors[i].rotation.x=.60+load*.53;
        }
      },
      hide(){root.visible=false;timeLeft=0;},
      dispose(){world.remove(root);for(const g of owned)g.dispose();for(const m of Object.values(materials))m.dispose();}
    };
  }
