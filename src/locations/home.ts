import * as THREE from 'three';
import {art} from '../art/style';
import {add,ball,box,cone,cylinder,ground,matte,oval,rand,sign} from '../core/geo';
import type {Location,Interaction,Obstacle} from '../core/types';

function shelf(x:number,z:number){
  const g=new THREE.Group();g.position.set(x,0,z);
  for(const yy of [.18,1.18,2.2])g.add(box(1.8,.13,.44,'#ac8060',0,yy,0));
  for(const xx of [-.8,.8])g.add(box(.13,2.3,.43,'#aa7c5d',xx,1.13,0));
  const colors=['#cc9988','#a3b8a3','#b1bfc9','#dbb981','#a78c81'];
  for(let i=0;i<18;i++)g.add(box(.09+(i%3)*.013,.45+(i%4)*.065,.26,colors[i%5],-.7+i*.077,1.47+((i%4)*.065)/2,0));
  g.add(ball(.25,'#c4b89d',.5,2.47,0));return g;
}
function pot(x:number,z:number,scale=1){
  const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(scale);
  g.add(cylinder(.23,.17,.44,'#d29f87',0,.25,0,11));
  for(const [dx,dz,ang] of [[-.24,0,-.6],[.25,0,.55],[0,-.2,.35],[0,.2,-.28]] as [number,number,number][]){
    const stem=cylinder(.025,.025,.7,'#65866b',dx*.3,.75,dz*.2,7);stem.rotation.z=ang*.42;g.add(stem);
    const leaf=ball(.27,'#749f78',dx,.98,dz,10,7);leaf.scale.set(.55,1.3,.7);leaf.rotation.z=ang;g.add(leaf);
  }
  return g;
}
export function createHome():Location{
  const root=new THREE.Group();root.name='Home';const interactions:Interaction[]=[];
  const obstacles:Obstacle[]=[];
  const floor=ground(12,11,'#cda476');root.add(floor);
  // Directional planks: coherent geometry with no runtime asset fetch.
  for(let i=0;i<17;i++){
    const w=12/17;
    root.add(box(w-.016,.032,10.94,i%4===0?'#d9b084':i%4===1?'#cca073':'#d4aa7c',-5.65+i*w,.025,0));
  }
  root.add(box(12,3.7,.17,art.wall,0,1.85,-5.48));
  root.add(box(.18,3.7,11,art.wall,-5.98,1.85,0));
  root.add(box(12,.23,.28,'#ad8268',0,.18,-5.33));
  root.add(box(.26,.23,11,'#ad8268',-5.81,.18,0));
  // Sunlit window on rear wall.
  root.add(box(3.2,2.15,.09,'#fff5de',-.7,2.36,-5.33));
  root.add(box(2.8,1.77,.10,'#a4c8c4',-.7,2.36,-5.26));
  root.add(box(.12,1.9,.12,'#fff7e8',-.7,2.35,-5.16));
  root.add(box(2.93,.11,.12,'#fff7e8',-.7,2.37,-5.16));
  root.add(box(3.5,.13,.35,'#b9997b',-.7,1.25,-5.08));
  const sunlight=oval(1.8,.76,'#e9c79c',-.5,.07,-2.6);root.add(sunlight);
  sunlight.material=new THREE.MeshBasicMaterial({color:'#f5d9a6',transparent:true,opacity:.3,depthWrite:false});
  root.add(oval(2.5,1.88,'#ead7bf',.3,.061,.7));
  root.add(oval(2.20,1.60,'#e9b6a1',.3,.063,.7));
  // Sofa
  const sofa=new THREE.Group();sofa.position.set(2.65,0,-2.95);
  sofa.add(box(2.75,.53,.96,'#b6c3ad',0,.57,0));
  sofa.add(box(2.80,.84,.27,'#9baea2',0,1.03,-.43));
  for(const xx of [-1.25,1.25])sofa.add(box(.25,.69,1.15,'#9baea2',xx,.83,0));
  for(const xx of [-.55,.55])sofa.add(box(.96,.18,.87,'#ced4bc',xx,.94,.10));
  sofa.add(ball(.32,'#d9aa94',-.88,1.12,-.08));root.add(sofa);
  obstacles.push({x:2.65,z:-2.95,r:1.35});
  // Tea table / teacup; character approaches the front edge.
  const table=new THREE.Group();table.position.set(.3,0,.4);
  table.add(cylinder(.95,.95,.09,'#bc8c67',0,.84,0,24));
  for(const [x,z] of [[-.64,-.64],[.64,-.64],[-.64,.64],[.64,.64]])table.add(cylinder(.065,.075,.78,'#a87857',x,.40,z,9));
  const mug=new THREE.Group();mug.position.set(.30,.9,-.13);
  mug.add(cylinder(.14,.12,.22,'#f6eee0',0,.12,0,16));
  const tea=cylinder(.113,.113,.008,'#bc8466',0,.227,0,20);mug.add(tea);
  const handle=new THREE.Mesh(new THREE.TorusGeometry(.095,.028,7,14,Math.PI*1.8),matte('#f6eee0'));
  handle.position.set(.17,.12,0);handle.rotation.y=Math.PI/2;mug.add(handle);
  table.add(mug);root.add(table);
  obstacles.push({x:.3,z:.4,r:.90});
  interactions.push({id:'home-tea',label:'喝一杯热茶',root:mug,approach:new THREE.Vector3(.6,0,1.80),use:()=>({message:'热气轻轻升起，今天似乎也没那么匆忙了。',mood:8,gesture:'sip'})});
  // Bed with layered pillows and a check-pattern blanket.
  const bed=new THREE.Group();bed.position.set(-3.60,0,-2.75);
  bed.add(box(2.72,.34,3.42,'#b88867',0,.30,0));
  bed.add(box(2.48,.24,3.08,'#fff1dc',0,.51,0));
  bed.add(box(2.51,.12,2.2,'#aebfb3',0,.70,.45));
  bed.add(box(2.74,1.17,.17,'#b98a69',0,.70,-1.7));
  for(const xx of [-.65,.65])bed.add(box(.92,.18,.66,'#f4e9d7',xx,.74,-1.03));
  root.add(bed);obstacles.push({x:-3.6,z:-2.75,r:1.35});
  interactions.push({id:'home-bed',label:'躺下休息',root:bed,approach:new THREE.Vector3(-3.5,0,-.52),use:()=>({message:'阳光透过窗帘，房间静了下来。',mood:12,gesture:'sit'})});
  root.add(shelf(-5.2,2.5));obstacles.push({x:-5.2,z:2.5,r:.7});
  root.add(pot(4.7,-4.25,1.15));root.add(pot(-5.05,4.20,.8));
  const lamp=new THREE.Group();lamp.position.set(4.55,0,1.9);
  lamp.add(cylinder(.3,.33,.09,'#ab8e73',0,.1,0),cylinder(.045,.06,2.0,'#b7a88e',0,1.05,0),cone(.5,.72,'#f7d8a9',0,2.13,0,14));root.add(lamp);
  const exit=sign('去公园',1.7);exit.position.set(3.85,1.55,4.86);exit.rotation.y=Math.PI;
  root.add(exit);root.add(box(.09,2.25,.1,'#a78567',3.85,1.12,4.88));
  interactions.push({id:'home-exit',label:'出门去公园',root:exit,approach:new THREE.Vector3(3.86,0,3.92),use:()=>({message:'推开门，空气里有新鲜的草木味。',travel:'park'})});
  // Warm particles and miniature flourishes.
  const rng=rand(318);const glows:THREE.Mesh[]=[];
  for(let i=0;i<15;i++){
    const m=ball(.028,'#fff8df',-4+rng()*7,.3+rng()*3,-4+rng()*7,6,5);
    m.material=new THREE.MeshBasicMaterial({color:'#fff5d2',transparent:true,opacity:.52,depthWrite:false});
    m.castShadow=false;glows.push(m);root.add(m);
  }
  const steam=new THREE.Group();steam.position.set(.60,1.22,.27);root.add(steam);
  const curls:THREE.Mesh[]=[];
  for(let i=0;i<5;i++){
    const curl=ball(.06,'#ffffff',0,.12*i,0,8,7);
    curl.material=new THREE.MeshBasicMaterial({color:'#fff9ef',transparent:true,opacity:.38,depthWrite:false});
    curls.push(curl);steam.add(curl);
  }
  return {id:'home',name:'午后的小屋',note:'家具、热茶和阳光。这是完全属于你的空间。',root,floor,
    spawn:new THREE.Vector3(3.5,0,3.5),camera:'isometric',
    bounds:{minX:-5.35,maxX:5.35,minZ:-4.85,maxZ:4.85},obstacles,interactions,
    tick:(time)=>{
      glows.forEach((g,i)=>{g.position.y=1+Math.sin(time*.7+i*1.3)*.28;});
      curls.forEach((c,i)=>{c.position.set(Math.sin(time*1.6+i)*.05,.08+(time*.25+i*.16)%1,0);
        (c.material as THREE.MeshBasicMaterial).opacity=.25*(1-c.position.y/1.35);});
    }};
}
