  // Charging wards occupy four otherwise free elevations between engineering
  // and science. One index addresses one physical docking position in metres.
  const crewBerths=(() => {
    const floors=[-76,-65,-54,-43];
    const rows=25,columns=30,perZone=rows*columns;
    const width=66,depth=86,ceiling=5.4,front=18;
    const pitchX=1.85,pitchZ=3.25,firstLane=3.70,firstRow=5;
    const zones=[],deckSpecs=[];
    const levelId=i=>'crew'+String(i+1).padStart(2,'0');
    const accents=[0x6ee2cc,0x76b8fc,0xe9ad69,0x9fc581];
    for(let i=0;i<floors.length;i++){
      const level=levelId(i);
      deckSpecs.push({id:level,name:'驻舱 '+String(i+1).padStart(2,'0')+' 层',floorY:floors[i],accent:accents[i]});
      for(const cx of [-44,44])for(const side of [-1,1]){
        const sector=String.fromCharCode(65+(cx>0?2:0)+(side>0?1:0));
        zones.push({id:level+sector,level,floorY:floors[i],sector,
          name:(i+1)+'层 '+sector+' 区充能驻舱',cx,side,front,depth,width,height:ceiling,
          x0:cx-width/2,x1:cx+width/2,z0:Math.min(side*front,side*(front+depth)),
          z1:Math.max(side*front,side*(front+depth)),start:zones.length*perZone,count:perZone,accent:accents[i]});
      }
    }
    const capacity=zones.length*perZone;
    const byLevel=new Map(deckSpecs.map(d=>[d.id,zones.filter(z=>z.level===d.id)]));
    const localX=c=>c<columns/2?-(firstLane+(14-c)*pitchX):firstLane+(c-15)*pitchX;
    function slot(index){
      if(!Number.isInteger(index)||index<0||index>=capacity)return null;
      const zone=zones[Math.floor(index/perZone)],n=index%perZone;
      const row=Math.floor(n/columns),col=n%columns;
      const x=zone.cx+zone.side*localX(col),z=zone.side*(front+firstRow+row*pitchZ);
      return {index,level:zone.level,zone:zone.id,row,col,x,y:zone.floorY,z,
        yaw:zone.side>0?0:Math.PI,aisleZ:z-zone.side*1.24,galleryX:zone.cx};
    }
    function nearby(p,radius=32){
      const list=byLevel.get(p?.level)||[],ids=[];
      for(const zone of list){
        if(p.x+radius<zone.x0||p.x-radius>zone.x1||p.z+radius<zone.z0||p.z-radius>zone.z1)continue;
        const localZ=p.z*zone.side-front;
        const startRow=Math.max(0,Math.ceil((localZ-radius-firstRow)/pitchZ));
        const endRow=Math.min(rows-1,Math.floor((localZ+radius-firstRow)/pitchZ));
        for(let r=startRow;r<=endRow;r++){
          const dz=(firstRow+r*pitchZ)-localZ,dxMax=Math.sqrt(Math.max(0,radius*radius-dz*dz));
          for(let c=0;c<columns;c++)if(Math.abs(zone.cx+zone.side*localX(c)-p.x)<=dxMax)
            ids.push(zone.start+r*columns+c);
        }
      }
      return ids;
    }
    function zoneAt(p){
      return (byLevel.get(p.level)||[]).find(q=>p.x>=q.x0&&p.x<=q.x1&&p.z>=q.z0&&p.z<=q.z1)||null;
    }
    // The back of each pedestal contains live connectors; the flush standing
    // plate and the aisle in front remain accessible to the robot.
    function clearsPedestal(p,zone,bodyRadius){
      const lx=(p.x-zone.cx)*zone.side,lz=p.z*zone.side-front;
      if(Math.abs(lx)<firstLane-.75-bodyRadius)return true;
      const r=Math.round((lz-firstRow-.77)/pitchZ),c=Math.round((Math.abs(lx)-firstLane)/pitchX);
      if(r<0||r>=rows||c<0||c>=columns/2)return true;
      const dx=Math.max(0,Math.abs(Math.abs(lx)-firstLane-c*pitchX)-.75);
      const dz=Math.max(0,Math.abs(lz-firstRow-r*pitchZ-.77)-.22);
      return dx*dx+dz*dz>=bodyRadius*bodyRadius;
    }
    const roomRadius=(p,q)=>Math.hypot(Math.max(q.x0-p.x,p.x-q.x1,0),Math.max(q.z0-p.z,p.z-q.z1,0));
    return {deckSpecs,zones,byLevel,rows,columns,capacity,perZone,width,depth,height:ceiling,front,
      slot,seat:slot,nearby,zoneAt,clearsPedestal,localX,roomRadius,pitchZ,firstRow};
  })();

  // Install each ward in the host deck group. All bays use a common local
  // module with +Z running from the entry down the central gallery.
  function installCrewWard(deck,zone,tools){
    const {plate,metal,paint,floorRect,wayfinding}=tools;
    const w=zone.width,d=zone.depth,h=zone.height,entry=5.4;
    const shell=new T.Group();
    shell.name=zone.name;shell.position.set(zone.cx,0,zone.side*zone.front);
    if(zone.side<0)shell.rotation.y=Math.PI;
    deck.group.add(shell);
    const trim=metal(0x263b4b),alloy=metal(0xa8b7b1),amber=metal(0xe5ac54);
    const skin=metal(0x5d727c),dark=metal(0x303d4d),accent=metal(zone.accent,.12),lamp=metal(0xd7f2e8,.55);
    const deckFinish=metal(0x485b67),shoe=metal(0x82969b);
    // The foyer is an extension of the main pedestrian spine. The aperture
    // crosses the front bulkhead and has the same width on both floor pieces.
    floorRect(deck,zone.cx-entry/2,zone.cx+entry/2,zone.side*3.2,zone.side*zone.front);
    floorRect(deck,zone.x0,zone.x1,zone.z0,zone.z1);
    const foyerLength=zone.front-3.2;
    plate(shell,deckFinish,0,-.09,-foyerLength/2,entry,.18,foyerLength);
    plate(shell,skin,0,3.83,-foyerLength/2,entry+.3,.22,foyerLength);
    for(const s of [-1,1]){
      plate(shell,skin,s*(entry/2+.10),1.86,-foyerLength/2,.20,3.72,foyerLength);
      plate(shell,accent,s*(entry/2-.018),1.30,-foyerLength/2,.055,.115,foyerLength);
      plate(shell,paint.light,s*1.72,3.67,-foyerLength/2,.105,.05,foyerLength-.3);
      const wing=(w-entry)/2;
      plate(shell,skin,s*(entry/2+wing/2),h/2,-.095,wing,h,.19);
      plate(shell,trim,s*(entry/2+.09),1.73,-.11,.18,3.46,.52);
      plate(shell,accent,s*(entry/2+.13),1.78,-.40,.073,3,.041);
      // Recessed distribution panels flank the gallery mouth on its ward side.
      const panelX=s*(entry/2+1.18);
      plate(shell,trim,panelX,1.40,.061,1.49,1.11,.12);
      plate(shell,alloy,panelX,1.40,.135,1.35,.95,.05);
      for(let i=-1;i<=1;i++){
        const x=panelX+i*.40;
        plate(shell,dark,x,1.43,.175,.25,.64,.055);
        plate(shell,amber,x,1.33,.225,.19,.25,.075);
        plate(shell,lamp,x,1.66,.210,.14,.058,.030);
      }
    }
    plate(shell,trim,0,(3.55+h)/2,-.095,entry,h-3.55,.19);
    wayfinding(shell,zone.name+'　750 位',0,3.98,-.208,5.6,.60,Math.PI,'#83d2c4');
    plate(shell,deckFinish,0,-.105,d/2,w,.21,d);
    plate(shell,metal(0x435768),0,h+.105,d/2,w+.40,.21,d+.40);
    plate(shell,skin,0,h/2,d+.10,w+.45,h,.20);
    // Raised textured gallery, transverse access aisles and maintenance line.
    plate(shell,dark,0,.008,d/2,5.42,.015,d-.1);
    for(const s of [-1,1]){
      plate(shell,skin,s*(w/2+.11),h/2,d/2,.22,h,d);
      plate(shell,accent,s*(w/2-.012),1.63,d/2,.035,.11,d-.2);
      plate(shell,paint.light,s*2.33,.023,d/2,.053,.012,d-.35);
      plate(shell,trim,s*2.56,h-.18,d/2,.28,.23,d);
      plate(shell,lamp,s*2.56,h-.312,d/2,.11,.036,d-.1);
      for(let q=0;q<4;q++){
        const x=s*(6.15+q*6.15);
        plate(shell,trim,x,h-.12,d/2,.32,.24,d-.18);
      }
      for(let z=3;z<d-.8;z+=9.75){
        plate(shell,trim,s*(w/2-.10),h/2,z,.20,h,.24);
        plate(shell,alloy,s*(w/2-.24),2.35,z,.12,1.65,.32);
      }
    }
    for(let r=0;r<crewBerths.rows;r++){
      const z=crewBerths.firstRow+r*crewBerths.pitchZ;
      for(const s of [-1,1]){
        // Shared supply trunk behind all fifteen independently numbered docks.
        const cx=s*16.67;
        plate(shell,trim,cx,.11,z+.78,27.62,.21,.36);
        plate(shell,dark,cx,.011,z,27.82,.020,1.54);
        plate(shell,alloy,cx,.025,z-.84,28,.02,.073);
        plate(shell,accent,s*2.62,.028,z-1.24,.46,.021,.32);
        if(r%3===0){
          plate(shell,alloy,cx,h-.18,z,28,.36,.25);
          plate(shell,lamp,cx,h-.39,z,22,.045,.11);
        }
      }
      for(let c=0;c<crewBerths.columns;c++){
        const x=crewBerths.localX(c);
        plate(shell,shoe,x,.034,z,1.48,.06,1.16);
        plate(shell,trim,x,1.00,z+.77,1.43,1.98,.37);
        plate(shell,alloy,x,1.06,z+.563,1.24,1.37,.08);
        plate(shell,dark,x,1.11,z+.510,.80,.71,.047);
        plate(shell,accent,x,.91,z+.477,.65,.078,.030);
        plate(shell,amber,x-.44,.47,z+.51,.27,.205,.14);
        plate(shell,amber,x+.44,.47,z+.51,.27,.205,.14);
        plate(shell,lamp,x,1.87,z+.567,.91,.052,.06);
      }
      if(r%5===0){
        const range=(r+1)+'–'+Math.min(r+5,crewBerths.rows)+' 排';
        plate(shell,trim,0,h-.52,z-.9,.16,.69,3.5,Math.PI/2);
        wayfinding(shell,zone.sector+'　'+range,0,h-.53,z-1.00,3.3,.51,Math.PI,'#e7bc75');
      }
    }
    wayfinding(shell,zone.name+'　返回主廊',0,4.36,.027,5.0,.60,0,'#82d6d2');
    wayfinding(shell,'驻舱 '+zone.sector+'　充能母线 / 尾端',0,2.18,d-.023,6.1,.60,Math.PI,'#82d6d2');
    return shell;
  }
