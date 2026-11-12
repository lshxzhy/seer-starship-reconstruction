// Original companion sculpts. Forward is +Z, feet are on y=0.
// These relief fields follow the mesh in its own coordinates. The geometry
// determines the species silhouette; each tissue keeps its own highlights.
const SPIRIT_SURFACES={
  iris:[.17,'float r=length(p.xy),a=atan(p.y,p.x+.00001);detail=(.5+.5*cos(32.*a+3.*sin(a*7.)+r*6.))*smoothstep(.16,.5,r)*(1.-smoothstep(.82,1.,r));'],
  velvet:[.83,'float f=34.*p.x+6.*sin(4.*p.y)+7.*p.z;detail=.57*cos(f)*cos(21.*p.y-8.*p.z)+.28*sin(53.*p.z+3.*p.y);'],
  feather:[.66,'float spine=exp(-abs(p.x+p.z*.21)*19.);detail=spine+.38*cos(31.*p.y-19.*abs(p.x)-6.*p.z);'],
  fin:[.36,'float ray=atan(p.y+.09,p.z-.14+.00001);detail=pow(.5+.5*cos(33.*ray+6.*p.x),6.)-.25;'],
  petal:[.54,'float v=abs(p.x)+.25*abs(p.z);detail=exp(-v*18.)+.48*pow(.5+.5*cos(27.*p.y-28.*v),7.)-.18;'],
  scute:[.43,'vec2 q=vec2(p.x*8.+p.z*13.,p.y*12.+.24*sin(14.*p.z));detail=.55*cos(q.y*2.)+.36*cos(q.x*2.6+.8*sin(q.y*1.8));'],
  cap:[.69,'detail=.42*sin(48.*p.x+13.*p.y)*cos(38.*p.z-9.*p.y)+.38*sin(14.*p.x+9.*p.z);'],
  gem:[.22,'detail=.47*sin(18.*p.y+7.*p.z+.8*sin(5.*p.x));']
};
function spiritCoating(material,kind,palette){
  const key=material.uuid+kind;
  if(palette.has(key))return palette.get(key);
  const coat=material.clone(),[roughness,relief]=SPIRIT_SURFACES[kind];
  coat.roughness=roughness;
  coat.customProgramCacheKey=()=>'spirit-tissue-'+kind;
  coat.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 tissuePoint;\n'+shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\ntissuePoint=position;');
    shader.fragmentShader='varying vec3 tissuePoint;\n'+shader.fragmentShader.replace('#include <color_fragment>',
      `#include <color_fragment>
       vec3 p=tissuePoint;float detail=0.;${relief}
       float tissueLod=1.-smoothstep(.012,.085,length(fwidth(p)));
       diffuseColor.rgb*=1.+.11*tissueLod*detail;`)
      .replace('#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor-.11*tissueLod*detail,.08,.98);');
  };
  palette.set(key,coat);return coat;
}
function finishSpiritPart(mesh,kind,palette){
  mesh.material=spiritCoating(mesh.material,kind,palette);return mesh;
}
function createCompanionFigure(T,id){
  return createOceanShark(T,id)||createKloseSpiritModel(T,id)||createTwinSpiritFigure(T,id)||createPartnerFigure(T,id)||createWetlandEvolution(T,id);
}
// World presentation uses catalogue height once, regardless of the sculpt's native units.
// A scaled scene receives local dimensions; records convert them back to metres.
// Keep the attachment at unit scale so its local focus point matches its geometry.
const FIELD_SPIRIT_SCALE=1.65, FIELD_BOSS_SCALE=1.65, KLOSE_ITEM_SCALE=1.40;
function createFieldSpirit(T,id,{boss=false,sceneScale=1}={}){
  const model=createCompanionFigure(T,id);if(!model)return null;
  const bounds=new T.Box3().setFromObject(model.root),extent=bounds.getSize(new T.Vector3());
  const centimetres=SEER_SPIRIT_DATA.index.find(row=>row[0]===id)?.[3];
  const size=FIELD_SPIRIT_SCALE*(boss?FIELD_BOSS_SCALE:1)*(centimetres>0?centimetres/100:extent.y)/sceneScale;
  const factor=size/Math.max(.01,extent.y),root=new T.Group();
  root.name=model.root.name;root.rotation.order='YXZ';
  model.root.scale.multiplyScalar(factor);model.root.position.y-=factor*bounds.min.y;
  root.add(model.root);
  const radius=factor*Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x),Math.abs(bounds.min.z),Math.abs(bounds.max.z));
  return {...model,root,animal:root,size,radius};
}
function createPartnerFigure(T,id){
  const root=new T.Group(),body=new T.Group();
  root.add(body);
  const sphere=new T.SphereGeometry(1,32,22),mats=new Map(),geometries=new Set([sphere]);
  const eye=0x2c2036;
  function material(color){
    if(!mats.has(color))mats.set(color,new T.MeshStandardMaterial({color:new T.Color(color).convertSRGBToLinear(),roughness:.53}));
    return mats.get(color);
  }
  function oval(x,y,z,w,h,d,color,tilt=0,parent=body){
    const m=new T.Mesh(sphere,material(color));m.position.set(x,y,z);m.scale.set(w,h,d);m.rotation.z=tilt;parent.add(m);return m;
  }
  // A tapered, curved leaf/fin with a gently ridged midrib.
  function leaf(x,y,z,w,h,d,color,tilt=0,bend=.25){
    const rows=18,sides=18,pts=[],idx=[];
    for(let j=0;j<=rows;j++){
      const t=j/rows,rad=.012+.988*Math.pow(Math.sin(t*Math.PI),.69);
      for(let i=0;i<sides;i++){
        const a=i*2*Math.PI/sides;
        const lateral=Math.cos(a),fold=1+.16*Math.abs(lateral)**2+.14*Math.cos(4*a)*Math.sin(Math.PI*t);
        pts.push(w*rad*lateral,t*h+.031*h*rad*lateral*lateral,d*rad*Math.sin(a)*fold+bend*h*t*t);
        if(j<rows){const v=j*sides+i,n=j*sides+(i+1)%sides;idx.push(v,v+sides,n,n+sides,n,v+sides);}
      }
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pts,3));g.setIndex(idx);g.computeVertexNormals();geometries.add(g);
    const m=new T.Mesh(g,material(color));m.position.set(x,y,z);m.rotation.z=tilt;body.add(m);
    const tissue=id>=4&&id<=6?'fin':[11,12,165,166].includes(id)?'feather':id<=3||id>=17&&id<=29||id>=301&&id<=303?'petal':null;
    return tissue?finishSpiritPart(m,tissue,mats):m;
  }
  function limb(a,b,r,color){
    const v=new T.Vector3(...a),w=new T.Vector3(...b),mid=v.clone().lerp(w,.5),dir=w.sub(v);
    const m=oval(mid.x,mid.y,mid.z,r,dir.length()*.5+r*.55,r,color);
    m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());return m;
  }
  function face(y,z,spread,sz,iris=eye){
    for(const sign of [-1,1]){
      finishSpiritPart(oval(sign*spread,y,z,sz*.63,sz,sz*.35,iris,-sign*.10),'iris',mats);
      oval(sign*spread-.15*sz,y+.34*sz,z+.31*sz,sz*.20,sz*.24,sz*.11,0xfffaf3);
    }
  }
  function petals(x,y,z,size,color,core){
    for(let i=0;i<5;i++){
      const a=i*Math.PI*.4;finishSpiritPart(oval(x+Math.sin(a)*size*.48,y+Math.cos(a)*size*.48,z,size*.33,size*.52,size*.23,color,-a),'petal',mats);
    }
    oval(x,y,z+size*.2,size*.28,size*.28,size*.17,core);
  }
  function bloom(stage){
    const tall=stage===3,bulb=stage===1,green=0x548544,pale=0xc1d578,pink=0xf48bae;
    oval(0,.55,0,tall?.27:.34,tall?.52:.35,.29,green);
    oval(0,.73,.22,.24,tall?.29:.25,.16,0xffe3a1);face(.76,.368,.108,bulb?.078:.059);
    for(const s of [-1,1]){
      if(bulb)leaf(s*.17,.015,.02,.063,.35,.054,pale,-s*.17,.09);
      else oval(s*.17,.18,.02,.105,.215,.12,pale,-s*.16);
      if(bulb){
        const start=[s*.25,.54,.04],end=[s*.54,.67,.08];
        limb(start,end,.081,0xe68aaf);
        const axis=new T.Vector3(...end).sub(new T.Vector3(...start)).normalize();
        const tangent=new T.Vector3(0,0,1).cross(axis).normalize(),binormal=axis.clone().cross(tangent);
        const thread=[];
        for(let i=0;i<=42;i++){
          const t=i/42,phase=t*Math.PI*5,rad=.065*Math.sin(Math.PI*(.08+.84*t))**.68;
          thread.push(new T.Vector3(...start).lerp(new T.Vector3(...end),t)
            .addScaledVector(tangent,rad*Math.cos(phase)).addScaledVector(binormal,rad*Math.sin(phase)));
        }
        const g=new T.TubeGeometry(new T.CatmullRomCurve3(thread),44,.009,7,false);
        geometries.add(g);body.add(new T.Mesh(g,material(0xae557b)));
        // The original pink cuffs finish in a folded spiral instead of a round fist.
        const curl=[];
        for(let i=0;i<=48;i++){
          const t=i/48,a=t*Math.PI*4,rad=.060*(1-.89*t);
          curl.push(new T.Vector3(...end).addScaledVector(axis,.018)
            .addScaledVector(tangent,rad*Math.cos(a)).addScaledVector(binormal,rad*Math.sin(a)));
        }
        const cuff=new T.TubeGeometry(new T.CatmullRomCurve3(curl),48,.0065,7,false);
        geometries.add(cuff);body.add(new T.Mesh(cuff,material(0x9e4c76)));
      }
      else if(!tall)petals(s*.36,.56,.01,.20,pink,0xffdd7c);
      else leaf(s*.18,.25,-.04,.13,.53,.09,green,-s*.45);
    }
    if(bulb){
      const bud=oval(0,1.08,-.02,.43,.34,.36,0xffffff,-.16);
      const g=sphere.clone(),pos=g.getAttribute('position'),colour=[];
      const base=new T.Color(0xafc854).convertSRGBToLinear(),rose=new T.Color(0xf0a4bf).convertSRGBToLinear();
      const c=new T.Color();
      for(let i=0;i<pos.count;i++){
        const y=pos.getY(i),angle=Math.atan2(pos.getX(i),pos.getZ(i));
        const lobe=(1-y*y)*(.028*Math.cos(5*angle)+.012*Math.cos(3*angle+.7));
        pos.setXYZ(i,pos.getX(i)*(1+lobe),y,pos.getZ(i)*(1+lobe));
        c.copy(base).lerp(rose,T.MathUtils.smoothstep(y+.18*pos.getX(i),.04,.96));
        colour.push(c.r,c.g,c.b);
      }
      g.setAttribute('color',new T.Float32BufferAttribute(colour,3));g.computeVertexNormals();
      const m=material(0xffffff).clone();m.vertexColors=true;geometries.add(g);mats.set('seed-cap',m);bud.geometry=g;bud.material=m;
      // A continuous slanted leaf brim replaces the two intersecting oval lobes.
      // Its upturned left edge and hanging right corner follow the classic #001 art.
      const vertices=[],indices=[],segments=64,rows=10;
      for(let side=0;side<2;side++)for(let j=0;j<=rows;j++)for(let k=0;k<segments;k++){
        const a=k*Math.PI*2/segments,t=j/rows,r=.52+.48*t;
        const x=.48*r*Math.sin(a),z=.34*r*Math.cos(a)+.022;
        const y=1.035-.135*Math.sin(a)+.095*Math.cos(a)+.065*Math.sin(t*Math.PI)-.095*t*t*t;
        vertices.push(x,y-side*.022,z);
        if(j<rows){const p=side*(rows+1)*segments+j*segments+k,q=side*(rows+1)*segments+j*segments+(k+1)%segments;
          if(side)indices.push(p,q,p+segments,q,q+segments,p+segments);
          else indices.push(p,p+segments,q,q,p+segments,q+segments);
        }
      }
      const layer=(rows+1)*segments;
      for(let k=0;k<segments;k++){const a=rows*segments+k,b=rows*segments+(k+1)%segments;indices.push(a,b,a+layer,b,b+layer,a+layer);}
      const brim=new T.BufferGeometry();brim.setAttribute('position',new T.Float32BufferAttribute(vertices,3));brim.setIndex(indices);brim.computeVertexNormals();
      geometries.add(brim);
      const leafHat=new T.Mesh(brim,material(0xb2ce78));finishSpiritPart(leafHat,'petal',mats);body.add(leafHat);
      for(const a of [-2.1,-.70,.74,2.25]){
        const seam=[];
        for(let i=0;i<=22;i++){const t=.20+i/22*1.19;seam.push(new T.Vector3(Math.sin(t)*Math.sin(a)*1.004,Math.cos(t)*1.004,Math.sin(t)*Math.cos(a)*1.004));}
        const vein=new T.TubeGeometry(new T.CatmullRomCurve3(seam),24,.008,6,false);geometries.add(vein);bud.add(new T.Mesh(vein,material(0x94ac54)));
      }
      petals(.24,1.35,0,.095,pink,0xf4bdd0);
    }else{
      const top=tall?1.24:1.19;
      for(let i=0;i<5;i++){
        const a=i*2*Math.PI/5;
        const m=oval(Math.sin(a)*.25,top,Math.cos(a)*.23,.22,tall?.38:.26,.21,pink,-Math.sin(a)*.56);
        finishSpiritPart(m,'petal',mats);m.rotation.x=Math.cos(a)*.56;
      }
      for(const s of [-1,1]){
        oval(s*.19,top-.17,.17,.22,.16,.18,pale,s*.34);
        const a=[s*.03,top+.08,0],b=[s*.15,top+.43,.01];
        limb(a,b,.023,0xb68f36);oval(...b,.056,.059,.056,0xffdb60);
      }
    }
  }
  function water(stage){
    const blue=0x348ed6,light=0xa6e2e9,white=0xf3f8f4,adult=stage===3;
    oval(0,.52,-.06,adult?.37:.265,adult?.51:.34,adult?.6:.28,blue);
    oval(0,.69,.15,.205,.32,.145,white);
    if(adult){
      oval(0,1.03,.24,.21,.40,.29,blue);oval(0,1.27,.41,.30,.25,.38,blue);
      oval(0,1.20,.57,.31,.15,.36,white);face(1.31,.68,.181,.055,0x7e1948);
    }else{
      oval(0,.93,.12,stage===1?.405:.33,.37,.33,blue);
      oval(0,.88,.30,.327,.27,.208,white);
      for(const s of [-1,1])oval(s*.18,.99,.415,.080,.133,.050,blue,-s*.36);
      face(.925,.478,.167,.071,0x78224f);
    }
    for(const s of [-1,1]){
      const base=adult?.22:.145;oval(s*base,.14,.13,adult?.17:.12,.125,.22,blue);
      const fin=leaf(s*.2,.59,-.03,.088,stage===1?.23:.39,.082,light,-s*1.12,-.26);
      fin.rotation.y=s*.28;
    }
    if(stage===1){
      leaf(-.10,1.21,.04,.113,.23,.08,blue,.40,-.46);
      const tail=oval(0,.43,-.33,.14,.30,.14,light);tail.rotation.x=-.73;
    }else{
      for(const s of [-1,1])leaf(s*.15,adult?1.42:1.17,.14,.067,.28,.10,light,-s*.51,-.28);
      limb([0,.47,-.22],[0,.22,-.88],.105,blue);leaf(0,.19,-.80,.17,.32,.12,light,.1,-.65);
    }
  }
  function fire(stage){
    const orange=stage===3?0xb74717:0xf37923,cream=0xffda9c,gold=0xffc13f;
    const large=stage===3;
    oval(0,.50,0,large?.38:.252,large?.50:.32,.26,orange);
    oval(0,.48,.17,.18,.245,.12,cream);
    oval(0,large?1.06:.85,0,large?.34:.395,large?.29:.35,.31,orange);
    oval(0,large?1.02:.79,.226,large?.26:.329,.219,.155,cream);
    face(large?1.065:.824,.356,large?.145:.175,large?.066:.08,0x572d22);
    for(const s of [-1,1]){
      oval(s*.15,.15,.07,.125,.145,.166,orange);
      const hand=[s*(large?.45:.34),large?.28:.52,large?.20:.08];
      limb([s*.19,.69,0],hand,large?.149:.083,orange);
      oval(...hand,large?.169:.125,large?.17:.111,.13,large?gold:orange);
    }
    for(let j=-1;j<=1;j++)leaf(.14*j,large?1.24:1.04,0,.12,.30+.15*(j===0),.12,
      stage===1?orange:gold,-j*.24,-.27);
    if(stage>1)leaf(.04,large?1.34:1.12,.08,.063,.23,.07,0xffeb68,-.18,-.12);
    limb([.015,.35,-.12],[.11,.45,-.37],.055,orange);
    leaf(.11,.43,-.38,.07,.26,.055,stage===1?orange:gold);
  }
  function bird(final,shiny){
    const pink=shiny?0xf6f1f8:final?0xffeded:0xed9ebb,blue=shiny?0xc9608c:0x2378ac,brown=shiny?0xecc759:0x764456;
    oval(0,.68,0,.31,.44,.28,pink);oval(0,1.02,.12,.29,.30,.255,pink);
    oval(0,1.02,.37,.107,.095,final?.24:.30,blue);face(1.09,.34,.143,.068);
    for(const s of [-1,1]){
      oval(s*.27,.67,0,.15,.32,.16,pink,-s*.28);
      leaf(s*.12,1.2,0,.095,.26,.06,final?pink:brown,-s*.39,-.31);
      limb([s*.12,.40,.03],[s*.12,.10,.09],.05,final?blue:pink);
      oval(s*.12,.07,.14,.10,.052,.115,final?blue:pink);
      if(shiny)oval(s*.24,.85,-.06,.13,.16,.11,0xffdb83,-s*.30);
    }
    for(let i=-1;i<=1;i++){const a=leaf(i*.08,.49,-.14,.085,.4,.10,pink,-i*.30,-.4);a.rotation.x=-.83;}
  }
  function cactus(final){
    const green=0x77972f;
    oval(0,.71,0,.39,final?.59:.47,.32,green);
    oval(0,.77,.238,.26,.25,.114,0xdbbc77);face(.82,.336,.127,.048);
    for(const s of [-1,1]){
      limb([s*.29,.67,.01],[s*.45,.74,.04],.11,green);
      limb([s*.45,.72,.04],[s*.47,.99,.03],.13,green);
      oval(s*.17,.16,.02,.17,.17,.21,green);
      for(let i=0;i<3;i++)leaf(s*(.09+i*.07),1.02,.015,.042,.13+i*.036,.04,0xc4ba58,-s*.23);
    }
    if(final)for(let i=-1;i<=1;i++)leaf(i*.15,1.04,0,.105,.38,.08,green,-i*.26);
  }
  function sprout(final){
    oval(0,.56,0,.15,.34,.16,0xf0ce42);oval(0,.92,.01,.286,.25,.24,0xf4d943);
    for(const s of [-1,1]){
      oval(s*.125,.92,.182,.116,.135,.067,0xf1f5ee);oval(s*.115,.925,.235,.049,.079,.034,eye);
      leaf(s*.12,.30,0,.069,.40,.06,0x9caa44,-s*.45);
      oval(s*.10,.13,0,.08,.16,.09,0xf1d13d);
    }
    for(let i=0;i<(final?6:4);i++){
      const a=i*Math.PI*2/(final?6:4),p=leaf(Math.sin(a)*.13,1.03,Math.cos(a)*.12,.17,.35,.09,0xc6efed,-.72*Math.sin(a),-.3);
      p.rotation.x=Math.cos(a)*.85;
    }
    limb([0,1.17,0],[.08,1.54,-.06],.02,0x8d9a44);leaf(.08,1.51,-.06,.052,.15,.032,0xafc753,-.8);
  }
  function yiyi(final,shiny){
    const jade=shiny?0xc0cf47:0xa7a540,cream=shiny?0xe7e892:0xe3cb69;
    oval(0,.59,0,.29,.40,.26,jade);oval(0,.83,.11,.32,.27,.27,jade);
    for(const s of [-1,1]){
      oval(s*.15,.87,.29,.13,.145,.085,cream);oval(s*.15,.89,.36,.073,.095,.047,eye);
      oval(s*.147,.915,.40,.023,.03,.022,0xffffff);
      limb([s*.18,.46,.03],[s*.31,.13,.17],.056,jade);oval(s*.30,.09,.18,.10,.056,.105,cream);
      leaf(s*.16,.76,-.085,.115,.32,.08,cream,-s*.6);
      if(final)limb([s*.11,1.04,-.01],[s*.15,1.44,0],.024,jade);
    }
    const tail=leaf(.03,.31,-.12,.089,.75,.088,cream,-.32,-.60);tail.rotation.x=-.38;
  }
  function fireCrab(){
    oval(0,.63,0,.39,.37,.30,0xb82d36);oval(0,.91,.025,.38,.27,.29,0xc53b36);
    oval(0,1.04,.28,.09,.14,.055,0xf14d57);face(.95,.285,.177,.074,0xffc344);
    for(const s of [-1,1]){
      for(let i=0;i<3;i++)limb([s*.23,.49,-.14+i*.1],[s*(.39+i*.035),.075,-.13+i*.15],.053,0x8b343a);
      limb([s*.23,.61,.02],[s*.42,.56,.20],.095,0xcc3732);
      oval(s*.44,.40,.24,.133,.24,.147,0xee5435,-s*.23);
      leaf(s*.44,.38,.31,.069,.22,.065,0xffb62d,-s*2.7);
      leaf(s*.18,1.05,-.05,.10,.36,.09,0xff8126,-s*.29,-.34);
    }
    leaf(0,1.08,0,.13,.43,.12,0xffb033,-.12,-.33);
  }
  function goldenBloom(form){
    const jade=0xb5c95e,navy=0x25364c,gold=0xffda70,wine=0x63394d,pink=0xef93b2;
    const grown=form>1;
    oval(0,.55,.01,grown?.28:.24,.37,.24,navy);
    oval(0,.74,.16,.23,.275,.16,gold);face(.80,.305,.11,.065);
    for(const s of [-1,1]){
      oval(s*.14,.17,.02,.115,.18,.145,grown?navy:jade,-s*.2);
      limb([s*.17,.64,.015],[s*.41,.47,.10],.064,jade);
      if(grown)petals(s*.41,.44,.13,.13,pink,gold);
      else leaf(s*.34,.46,.13,.075,.19,.058,pink,-s*.94);
    }
    const cap=oval(0,1.05,-.03,.43,.27,.36,wine);cap.rotation.z=form===1?-.30:-.09;
    for(const s of [-1,1]){
      const edge=leaf(s*.15,.94,.07,.15,form===2?.39:.32,.14,jade,-s*(form===2?.76:1.10),-.23);
      edge.rotation.x=.10;
    }
    oval(0,1.0,.20,.34,.062,.17,grown?jade:navy,.06);
    if(form===3)for(const s of [-1,0,1]){
      const a=[s*.04,1.23,-.02],b=[s*.14,1.51+.06*(s===0),.02];
      limb(a,b,.021,gold);oval(...b,.047,.055,.047,gold);
    }
  }
  if(id>=1&&id<=3)bloom(id);
  else if(id>=4&&id<=6)water(id-3);
  else if(id>=7&&id<=9)fire(id-6);
  else if([11,12,165,166].includes(id))bird(id===12||id===166,id>=165);
  else if(id===17||id===18)cactus(id===18);
  else if(id===28||id===29)sprout(id===29);
  else if([84,85,443,444].includes(id))yiyi(id===85||id===444,id>=443);
  else if(id===702)fireCrab();
  else if(id>=301&&id<=303)goldenBloom(id-300);
  else {sphere.dispose();return null;}
  let t=0;
  return {root,update(dt){t+=dt;body.position.y=.017*(1+Math.sin(3*t));body.rotation.z=.018*Math.sin(2.2*t);},
    dispose(){geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());}};
}
