import * as THREE from 'three';
import {art} from '../art/style';
import {add,ball,box,cone,cylinder,ground,matte,oval,rand,sign} from '../core/geo';
import type {Location,Interaction,Obstacle} from '../core/types';
import {ParkDog} from '../actors/dog';
import {extendPark} from './parkExpansion';

function tree(x:number,z:number,scale=1,autumn=false){
  const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(scale);
  const trunk=cylinder(.22,.34,2.3,'#95745b',0,1.12,0,10);g.add(trunk);
  for(const [dx,dy,dz,r,i] of [[0,3,0,1.15,0],[-.67,2.62,.2,.9,1],[.66,2.75,0,.92,2],[0,2.85,-.64,.8,3]]){
    const palette=autumn?['#ddae73','#e6bb79','#c89067','#dfc482']:art.leaf;
    const crown=ball(r,palette[i],dx,dy,dz,12,9);crown.scale.y=.83;g.add(crown);
  }
  return g;
}
function flower(x:number,z:number,color:string){
  const g=new THREE.Group();g.position.set(x,0,z);
  g.add(cylinder(.018,.018,.23,'#68885d',0,.14,0,6));
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;g.add(ball(.07,color,Math.cos(a)*.07,.30,Math.sin(a)*.07,8,6));}
  g.add(ball(.055,'#edc56c',0,.30,0,8,6));return g;
}
function bench(x:number,z:number,r=0){
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=r;
  for(const dx of [-.83,.83]){
    g.add(box(.13,.73,.17,'#78908b',dx,.36,-.1));
    g.add(box(.13,.68,.17,'#78908b',dx,.35,.35));
  }
  for(let i=0;i<3;i++)g.add(box(2,.095,.21,'#bc865e',0,.79,-.30+i*.22));
  for(let i=0;i<3;i++)g.add(box(2,.22,.095,'#bc865e',0,1.02+i*.24,.53));
  return g;
}
function swingSet(x:number,z:number){
  const g=new THREE.Group();g.position.set(x,0,z);
  const beam=box(4.4,.14,.18,'#c98f6a',0,2.65,0);g.add(beam);
  for(const cx of [-2,2]) for(const zz of [-.69,.69]){
    const leg=cylinder(.09,.1,2.9,'#c98f6a',cx/1.25,1.37,zz,9);
    leg.rotation.z=(cx<0?-.19:.19);g.add(leg);
  }
  for(const cx of [-.95,.95]){
    for(const dx of [-.36,.36])g.add(cylinder(.018,.018,1.42,'#6f8382',cx+dx,1.88,0,7));
    g.add(box(.88,.085,.37,'#e5b97d',cx,1.15,0));
  }
  return g;
}
function homeExterior(x:number,z:number){
  const g=new THREE.Group();g.position.set(x,0,z);
  g.add(box(3.8,2.9,3.1,'#eee1c8',0,1.5,0));
  const roofL=box(2.7,.22,3.8,'#c78c78',-1,3.55,0);roofL.rotation.z=-.47;
  const roofR=box(2.7,.22,3.8,'#c78c78',1,3.55,0);roofR.rotation.z=.47;g.add(roofL,roofR);
  g.add(box(1.05,1.9,.12,'#b78864',0,1.0,1.62));
  g.add(ball(.068,'#eacb75',.38,1,1.71));
  for(const xx of [-1.24,1.24]){
    g.add(box(.88,1.02,.10,'#f6f0df',xx,1.84,1.62));
    g.add(box(.70,.84,.11,'#91c7c4',xx,1.84,1.69));
    g.add(box(.09,.84,.12,'#f1e5d1',xx,1.84,1.77));
    g.add(box(.70,.08,.12,'#f1e5d1',xx,1.84,1.77));
  }
  g.add(box(4.2,.17,.72,'#c3a17c',0,.12,1.97));
  return g;
}
export function createPark(initialDogBond=0,saveDogBond:(bond:number)=>void=()=>{}):Location{
  const root=new THREE.Group();root.name='Park';const interactions:Interaction[]=[];
  const obstacles:Obstacle[]=[];const rng=rand(48817);
  const floor=ground(90,90,art.meadow);root.add(floor);
  // Large patches, path and soft plaza; layered geometry instead of a detailed texture.
  root.add(oval(11.2,7.9,'#b4cb9c',0,.012,0));
  root.add(oval(9.7,5.1,art.warmPath,0,.022,1.75));
  root.add(oval(8.0,3.88,'#d1d6ac',0,.032,1.75));
  root.add(oval(5.8,3.2,'#e5cfaa',0,.041,-2.7));
  root.add(oval(4.6,2.45,'#bcceac',0,.05,-2.7));
  for(const [x,z,s,a] of [[-9,-6,1.4,false],[-9,4,1.08,true],[9,4,1.3,true],[4,-8,1.26,false],[-4,-8,1.08,false],[11,-2,1.0,false]] as [number,number,number,boolean][]) {
    root.add(tree(x,z,s,a));obstacles.push({x,z,r:0.7*s});
  }
  for(let i=0;i<120;i++){
    const x=(rng()-.5)*28,z=(rng()-.5)*21;
    if((x*x/150+z*z/80)<.54)continue;
    const p=ball(.12,rng()>.5?'#96bd84':'#b6c68e',x,.07,z,7,5);p.scale.y=.38;root.add(p);
    if(rng()>.70)root.add(flower(x+.22,z+.14,['#e7aaa1','#eee2b4','#c5badb'][Math.floor(rng()*3)]));
  }
  root.add(bench(-7.25,2.3,-.37),bench(7.0,1.4,.3));
  obstacles.push({x:-7.25,z:2.3,r:.9},{x:7,z:1.4,r:.9});
  root.add(swingSet(-4.7,-3.6));obstacles.push({x:-4.7,z:-3.6,r:1.2});
  const pond=oval(1.75,1.18,'#76b8c0',4.65,.07,-3.45);root.add(pond);
  for(let i=0;i<11;i++){
    const a=i*Math.PI*2/11;root.add(ball(.17,'#c7bea5',4.65+Math.cos(a)*1.7,.15,-3.45+Math.sin(a)*1.1,9,7));
  }
  root.add(cone(.85,1.75,'#93ac8d',3.1,.88,-5.6,8));
  for(let i=0;i<14;i++){
    const xx=-11.5+i*1.8;root.add(box(.14,.75,.12,'#dac8a8',xx,.4,-9.2));
  }
  root.add(box(25,.10,.10,'#dbc8a7',.25,.74,-9.2));
  for(const [x,z] of [[-7,-7],[7,-6]] as [number,number][]) {
    root.add(cylinder(.07,.08,3.6,'#758e86',x,1.85,z));
    root.add(ball(.32,'#ffeed0',x,3.6,z));
    root.add(cone(.31,.23,'#8b9e90',x,3.93,z,10));
  }
  root.add(homeExterior(8.6,-5.5)); obstacles.push({x:8.6,z:-5.5,r:2.1});
  const gate=sign('回家 · HOME',2.5);gate.position.set(5.8,1.65,-5.6);gate.rotation.y=-.15;
  root.add(gate);root.add(cylinder(.08,.1,2.3,'#9a816d',5.8,1.12,-5.61));
  interactions.push({id:'home-door',label:'回到小屋',root:gate,approach:new THREE.Vector3(5.45,0,-4.6),use:()=>({message:'沿着熟悉的小路回家。',travel:'home'})});
  // V0.5: a paid bit of neighborhood work reuses the existing timed action / Effect.coins.
  const work=new THREE.Group();work.position.set(-2.75,0,2.55);
  work.add(box(.82,.46,.62,'#bf9674',0,.23,0));
  work.add(box(.68,.08,.50,'#d7b994',0,.51,0));
  work.add(cylinder(.085,.085,1.55,'#9b785e',.48,.83,0,8));
  work.add(box(.5,.09,.19,'#91a787',.48,.10,0));
  const notice=sign('整理花坛 · +12',2.15);notice.position.set(0,1.63,0);work.add(notice);
  root.add(work);obstacles.push({x:-2.75,z:2.55,r:.56});
  interactions.push({id:'park-work',label:'帮忙整理花坛 · 报酬 12',root:work,
    approach:new THREE.Vector3(-2.75,0,3.55),
    use:()=>({message:'花坛整理好了，收到 12 枚工资。',coins:12,mood:-2,gesture:'pet'})});
  const dog=new ParkDog(2.1,2.2,initialDogBond);root.add(dog.root);
  const dogInteraction:Interaction={
    id:'park-dog',label:'摸摸小狗',root:dog.root,approach:new THREE.Vector3(1.6,0,2.6),
    onTargeted:()=>dog.holdForInteraction(),
    use:()=>({message:dog.bond>=2?'小狗认出你了，主动靠过来摇尾巴。':'小狗开心地摇起尾巴，靠着你的手。',mood:6,gesture:'pet'}),
    onMoment:()=>saveDogBond(dog.pet()),
    onActionEnd:()=>dog.release()
  };
  interactions.push(dogInteraction);
  // One toy, one local fetch episode. The dog chases it autonomously and brings
  // it back; this deliberately does not create another currency or task loop.
  const toyRack=new THREE.Group();toyRack.name='Puppy ball rack';toyRack.position.set(4.1,0,4.7);
  toyRack.add(box(.72,.3,.66,'#ba966f',0,.18,0));
  const toyBall=ball(.2,'#e6a174',0,.55,0,12,9);toyRack.add(toyBall);
  const toySign=sign('一起玩球',1.65);toySign.position.set(0,1.42,0);toyRack.add(toySign);
  root.add(toyRack);obstacles.push({x:4.1,z:4.7,r:.42});
  interactions.push({
    id:'park-fetch',label:'把球抛给小狗',root:toyRack,
    approach:new THREE.Vector3(3.23,0,4.62),
    use:()=>({message:'球飞向草地，小狗兴奋地追过去。',gesture:'wave'}),
    onMoment:()=>{
      if(dog.startFetch(new THREE.Vector3(4.1,0,4.7),new THREE.Vector3(4.2,0,1.5),
        new THREE.Vector3(3.06,0,4.10),()=>{toyBall.visible=true;})){
        toyBall.visible=false;
      }
    }
  });
  const rest=bench(-1.5,-6.4,.26);root.add(rest);
  interactions.push({id:'park-bench',label:'坐一会儿',root:rest,approach:new THREE.Vector3(-1.4,0,-5.48),use:()=>({message:'风吹过树叶。什么也不做，也很好。',mood:3,gesture:'sit'})});
  const cloudMat=new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.32,depthWrite:false});
  for(let i=0;i<7;i++){
    const puff=new THREE.Mesh(new THREE.SphereGeometry(1,10,7),cloudMat);
    puff.position.set(-22+i*7,11+(i%3)*2,-22);puff.scale.set(3.2,.7,1.2);root.add(puff);
  }
  const leafs=Array.from({length:18},(_,i)=>{
    const leaf=ball(.06,i%2?'#d6b079':'#e4c88a',(rng()-.5)*21,1.2+rng()*5,(rng()-.5)*14,6,5);
    leaf.castShadow=false;root.add(leaf);return leaf;
  });
  const tickOutskirts=extendPark(root,obstacles,interactions);
  return {id:'park',name:'街角的小公园',note:'微风、树影，还有一些值得停留的瞬间。',root,floor,
    bounds:{minX:-35,maxX:35,minZ:-32,maxZ:32},obstacles,
    spawn:new THREE.Vector3(-.4,0,4.6),camera:'follow',interactions,
    tick:(time,dt,player)=>{
      dog.tick(time,dt,player);
      dogInteraction.approach.set(dog.root.position.x-.70,0,dog.root.position.z+.75);
      dogInteraction.label=dog.bond>=2?'熟悉的小狗 · 摸摸它':'摸摸小狗';
      tickOutskirts(time);
      leafs.forEach((leaf,i)=>{leaf.position.x+=Math.sin(time*.6+i)*.0015;leaf.position.y=2+Math.sin(time*.8+i*1.7)*.35;});
    }};
}
