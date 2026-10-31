import * as THREE from 'three';
import {art} from '../art/style';
import {ball,box,cone,cylinder,ground,oval,rand,sign} from '../core/geo';
import type {Location,Interaction,Obstacle} from '../core/types';

/** Only the state this one small farm needs; no inventory, task framework or background simulation. */
export type FarmCare={hay:boolean;hunger:number;milkReady:boolean;milkDelay:number;milkCollected:number};
export const defaultFarmCare=():FarmCare=>({hay:false,hunger:.8,milkReady:false,milkDelay:0,milkCollected:0});
export function normalizeFarmCare(raw:unknown):FarmCare{
  const original=defaultFarmCare();
  if(!raw||typeof raw!=='object')return original;
  const x=raw as Record<string,unknown>;
  const bounded=(key:string,max:number,fallback:number)=>typeof x[key]==='number'&&Number.isFinite(x[key])
    ?Math.max(0,Math.min(max,x[key] as number)):fallback;
  const milkDelay=bounded('milkDelay',30,0);
  return {hay:x.hay===true,hunger:bounded('hunger',1,original.hunger),
    milkReady:x.milkReady===true&&milkDelay===0,milkDelay,
    milkCollected:Math.floor(bounded('milkCollected',10000,0))};
}

/** The cow's local motion is a visual response to hunger and feed, not a generic NPC system. */
function createCow(){
  const root=new THREE.Group();root.name='Pasture cow';root.position.set(-1.75,0,-3.1);
  const body=new THREE.Group();root.add(body);
  const torso=ball(.97,'#f5e7ce',0,1.1,0,16,12);torso.scale.set(1.08,.76,1.25);body.add(torso);
  for(const [x,z] of [[-.64,-.67],[.64,-.67],[-.64,.68],[.64,.68]]){
    body.add(cylinder(.17,.22,.83,'#e5d2b5',x,.48,z,9));
    body.add(box(.38,.18,.42,'#8b8779',x,.12,z));
  }
  const patch=ball(.48,'#b88c72',.36,1.38,-.29,12,8);
  patch.scale.set(.85,.45,.88);body.add(patch);
  const neck=new THREE.Group();neck.position.set(0,1.39,.75);body.add(neck);
  const face=ball(.57,'#f5e5c6',0,.14,.48,14,10);face.scale.set(1,.94,1);neck.add(face);
  const snout=ball(.45,'#d8a5a0',0,-.04,.91,12,9);snout.scale.y=.55;neck.add(snout);
  for(const s of [-1,1]){
    neck.add(ball(.075,'#4e4d4a',s*.24,.24,.87,8,7));
    neck.add(ball(.12,'#e9c7a4',s*.47,.50,.36,10,8));
    const horn=cone(.13,.29,'#e3d6b9',s*.33,.76,.39,8);horn.rotation.z=s*.18;neck.add(horn);
  }
  const tail=new THREE.Group();tail.position.set(0,1.55,-1.14);tail.add(cylinder(.045,.045,.75,'#d9c4a6',0,-.36,0,7));tail.add(ball(.105,'#a68066',0,-.76,0,8,6));body.add(tail);
  return {root,body,neck,tail};
}

export function createFarm(initial:FarmCare=defaultFarmCare(),onChange:(care:FarmCare)=>void=()=>{}):Location{
  const care=normalizeFarmCare(initial);
  const publish=()=>onChange({...care});
  const root=new THREE.Group();root.name='Sunny pasture';
  const interactions:Interaction[]=[];const obstacles:Obstacle[]=[];
  const floor=ground(28,24,'#b5ca94');root.add(floor);
  root.add(oval(10,8,'#cad5a1',-2,.018,-1));
  root.add(oval(10,2.25,art.warmPath,0,.028,5));
  root.add(oval(3.9,2,'#e0c6a0',-2,.03,-.2));
  // A small barn anchors the view but is not another interior/location.
  const barn=new THREE.Group();barn.position.set(-8,0,-6);
  barn.add(box(4.3,3.15,3.4,'#d89c83',0,1.65,0));
  for(const s of [-1,1]){const roof=box(2.85,.22,4.05,'#a56f66',s*1.02,3.67,0);roof.rotation.z=-s*.46;barn.add(roof);}
  barn.add(box(1.75,2.42,.15,'#aa7462',0,1.28,1.79));barn.add(box(.1,2.43,.16,'#ead0ad',0,1.28,1.88));
  barn.add(box(1,.73,.11,'#d5e2cf',-1.45,2.5,1.78));root.add(barn);
  obstacles.push({x:-8,z:-6,r:2.7});
  // Fence and trees define the farm silhouette. Opening faces the road at +Z.
  for(let x=-12;x<=12;x+=1.8){
    if(Math.abs(x)<2.6)continue;
    root.add(box(.14,1.05,.17,'#e8d6b4',x,.56,9.3));
  }
  for(let z=-9;z<=9;z+=1.8){for(const x of [-12,12])root.add(box(.14,.95,.17,'#e8d6b4',x,.50,z));}
  for(let x=-10;x<11;x+=2)root.add(box(1.88,.13,.18,'#d3bd96',x,1.0,-9.5));
  const rng=rand(1026);
  for(let i=0;i<125;i++){
    const x=-11+rng()*22,z=-8+rng()*16;
    if(Math.abs(x)<4.2&&Math.abs(z)<5.3)continue;
    const g=cone(.12+rng()*.09,.36+rng()*.23,i%3?'#91b17d':'#a2bf8c',x,.2,z,5);
    g.castShadow=false;root.add(g);
  }
  for(const [x,z] of [[9,-6],[9,6],[-10,5]]){
    root.add(cylinder(.19,.27,2.0,'#987d64',x,1.04,z,8));
    root.add(ball(1.22,'#94b390',x,2.5,z,11,8));obstacles.push({x,z,r:.7});
  }
  const cow=createCow();root.add(cow.root);obstacles.push({x:-1.75,z:-3.1,r:1.25});
  const trough=new THREE.Group();trough.name='Cow feeding trough';trough.position.set(-1.65,0,-.55);
  trough.add(box(1.9,.58,.64,'#b99169',0,.32,0));trough.add(box(1.67,.12,.49,'#8c7657',0,.63,0));
  const forage=ball(.35,'#97b582',0,.75,0,9,7);forage.scale.set(1.55,.36,.65);trough.add(forage);
  root.add(trough);obstacles.push({x:-1.65,z:-.55,r:.80});
  // One patch that the player can gather from, limited to one bundle carried.
  const grass=new THREE.Group();grass.name='Forage patch';grass.position.set(6,0,2.8);
  grass.add(oval(1.05,.88,'#8eaf72',0,.045,0));
  for(let i=0;i<14;i++){
    const angle=i*Math.PI*2/14;
    const blade=cone(.13,.48,i%2?'#8baa70':'#b3c88a',Math.cos(angle)*.65,.27,Math.sin(angle)*.52,5);
    blade.rotation.z=Math.sin(angle)*.28;grass.add(blade);
  }
  const grassHit=ball(.92,'#ffffff',0,.75,0,9,8);
  grassHit.material=new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0,depthWrite:false});
  grassHit.castShadow=false;grass.add(grassHit);root.add(grass);
  const pail=new THREE.Group();pail.name='Milk pail';pail.position.set(4.1,0,-3.25);
  pail.add(cylinder(.45,.32,.65,'#a7c1c0',0,.34,0,14));
  const milk=oval(.34,.34,'#fff3d7',0,.69,0);pail.add(milk);
  const pailHit=ball(.65,'#ffffff',0,.7,0,9,8);
  pailHit.material=new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0,depthWrite:false});
  pailHit.castShadow=false;pail.add(pailHit);root.add(pail);
  const gate=sign('回到街区',1.65);gate.position.set(0,1.58,8.4);root.add(gate);
  interactions.push({id:'farm-exit',label:'回到公园',root:gate,
    approach:new THREE.Vector3(-1,0,7.6),use:()=>({message:'从牧场的小路返回街区。',travel:'park'})});
  interactions.push({id:'farm-forage',label:'采集一束青草',root:grass,
    approach:new THREE.Vector3(4.7,0,3.5),
    use:()=>({message:care.hay?'手里已经有青草了，先去喂奶牛吧。':'采好一束青草。去食槽看看奶牛。',gesture:'pet'}),
    onMoment:()=>{if(!care.hay){care.hay=true;publish();}}
  });
  interactions.push({id:'farm-feed',label:'把青草放进食槽',root:trough,
    approach:new THREE.Vector3(.05,0,-.12),
    use:()=>({message:!care.hay?'先到草地采一些青草。':care.milkReady?'先把已经准备好的牛奶收起来。':care.milkDelay>0?'奶牛正在休息，稍后再来。':care.hunger<.25?'奶牛现在吃得很饱，等它饿一点再来。':'奶牛低头吃起青草，一会儿会有牛奶。',gesture:'pet'}),
    onMoment:()=>{
      if(care.hay&&care.hunger>=.25&&!care.milkReady&&care.milkDelay===0){
        care.hay=false;care.hunger=0;care.milkDelay=6;publish();
      }
    }
  });
  // Capture entitlement when the action starts. If milk becomes ready mid-gesture,
  // the current (previously empty) pail check must not consume it without pay.
  let collectibleAtStart=false;
  interactions.push({id:'farm-milk',label:'看看牛奶桶',root:pail,
    approach:new THREE.Vector3(4.1,0,-1.84),
    use:()=>{
      collectibleAtStart=care.milkReady;
      return {message:collectibleAtStart?'收好一桶牛奶，换得 8 枚金币。':'还没有牛奶。让奶牛吃饱，再等它休息一会儿。',
        coins:collectibleAtStart?8:0,gesture:'pet'};
    },
    onMoment:()=>{if(collectibleAtStart&&care.milkReady){care.milkReady=false;care.milkCollected++;publish();}}
  });
  let lastHungerPersist=care.hunger;
  return {id:'farm',name:'山坡上的小牧场',note:'有一头奶牛、一块青草地，以及等待与照料。',root,floor,
    spawn:new THREE.Vector3(0,0,6.9),camera:'follow',
    bounds:{minX:-11.5,maxX:11.5,minZ:-9,maxZ:9},obstacles,interactions,
    tick:(elapsed,dt,player)=>{
      const before=care.milkDelay;
      if(care.milkDelay>0){care.milkDelay=Math.max(0,care.milkDelay-dt);
        if(before>0&&care.milkDelay===0){care.milkReady=true;publish();}
      }
      care.hunger=Math.min(1,care.hunger+dt*.008);
      if(Math.abs(care.hunger-lastHungerPersist)>.08){lastHungerPersist=care.hunger;publish();}
      // Cow's body is present without being clicked. Feeding creates an observable pause.
      cow.body.position.y=care.milkDelay>0?-.10+Math.sin(elapsed*3)*.025:Math.sin(elapsed*1.4)*.026;
      cow.neck.rotation.x=care.milkDelay>0?.28:care.hunger>.65?Math.sin(elapsed*.95)*.11:Math.sin(elapsed*.4)*.05;
      cow.tail.rotation.z=Math.sin(elapsed*(care.milkDelay>0?4.4:2.7))*.22;
      forage.visible=care.milkDelay>0;
      milk.visible=care.milkReady;
      const watch=Math.atan2(player.x-cow.root.position.x,player.z-cow.root.position.z);
      cow.root.rotation.y=THREE.MathUtils.damp(cow.root.rotation.y,Math.max(-.35,Math.min(.35,watch)),1.1,dt);
    }};
}
