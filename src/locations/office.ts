import * as THREE from 'three';
import {art} from '../art/style';
import {ball,box,cylinder,ground,oval,sign} from '../core/geo';
import {clearSegment} from '../core/navigation';
import type {Bounds,Interaction,Location,Obstacle} from '../core/types';

const BOUNDS:Bounds={minX:-9,maxX:9,minZ:-7.5,maxZ:7.5};
const PAY=18;
const VIEW_DISTANCE=5.5,VIEW_ANGLE=.48;

/** Deterministic spatial visibility: front cone, range and desk occlusion. */
export function officeCanSee(manager:THREE.Vector3,player:THREE.Vector3,obstacles:Obstacle[]):boolean{
  const dx=player.x-manager.x,dz=player.z-manager.z;
  if(dz<=.20||dx*dx+dz*dz>VIEW_DISTANCE*VIEW_DISTANCE)return false;
  if(Math.abs(dx)>dz*Math.tan(VIEW_ANGLE))return false;
  return clearSegment(manager,player,BOUNDS,obstacles,.015);
}

function desk(x:number,z:number,coat='#b2a18b'){
  const g=new THREE.Group();g.position.set(x,0,z);
  g.add(box(2.1,.12,.89,'#bd997b',0,1.0,0));
  for(const xx of [-.88,.88])g.add(box(.10,1.0,.72,'#a18c75',xx,.53,0));
  g.add(box(.92,.59,.10,'#718e8b',0,1.38,-.20));
  g.add(box(.86,.49,.08,'#a7bfc0',0,1.4,-.12));
  g.add(box(.25,.09,.25,'#cfc8b2',0,1.08,.24));
  g.add(box(.98,.55,.58,coat,0,.34,1.22));
  return g;
}

function viewCone(){
  const vertices:number[]=[0,.045,0];
  const indices:number[]=[];
  const steps=20;
  for(let i=0;i<=steps;i++){
    const angle=-VIEW_ANGLE+2*VIEW_ANGLE*i/steps;
    vertices.push(Math.sin(angle)*VIEW_DISTANCE,.045,Math.cos(angle)*VIEW_DISTANCE);
    if(i>0)indices.push(0,i,i+1);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geo.setIndex(indices);geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({
    color:'#df947e',transparent:true,opacity:.23,side:THREE.DoubleSide,depthWrite:false,
  }));
  mesh.name='Manager vision cone';mesh.renderOrder=2;
  return mesh;
}
function managerModel(){
  const root=new THREE.Group();root.name='Office manager';
  root.add(viewCone());
  root.add(cylinder(.28,.30,.77,'#879b8c',0,.82,0));
  root.add(ball(.30,'#e9c3a5',0,1.43,0,12,10));
  root.add(ball(.31,'#645a52',0,1.63,-.07,12,8));
  root.add(ball(.045,'#55504b',-.12,1.44,.30,8,6),ball(.045,'#55504b',.12,1.44,.30,8,6));
  const arm=box(.13,.60,.16,'#879b8c',.34,.89,0);root.add(arm);
  const legs=[-.14,.14].map(x=>box(.18,.44,.20,'#646b67',x,.30,0));root.add(...legs);
  return {root,legs};
}
export interface OfficeCallbacks {
  onCaught:()=>void;
  onDepart:()=>void;
  onStatus:(value:string)=>void;
}

/** A self-contained spatial stealth microgame: one work station, one moving supervisor, one exit. */
export function createOffice(callbacks:OfficeCallbacks):Location{
  const root=new THREE.Group();root.name='Office after-hours';
  const floor=ground(20,17,'#d6c4a7');root.add(floor);
  const obstacles:Obstacle[]=[];
  const interactions:Interaction[]=[];
  root.add(oval(8,5.4,'#c8d2c8',.1,.035,.4));
  // Two-sided low partitions: readable from the fixed isometric camera.
  for(const x of [-9.6,9.6])root.add(box(.18,2.9,16.8,'#e9dcca',x,1.45,0));
  root.add(box(19,.18,.20,'#e4d5be',0,.12,-8.2));
  for(const [x,z] of [[-5.3,-4.8],[-5.4,.2],[-5.4,3.1],[5.2,-4.9],[5.2,-1.7]]){
    root.add(desk(x,z));obstacles.push({x,z,r:1.17});
  }
  const notice=sign('把报告整理好',2.1);
  notice.position.set(-5.3,2.13,-4.8);root.add(notice);
  // Waiting space on the right is safe when the manager is watching the central aisle.
  for(const x of [-7.8,7.7]){
    root.add(cylinder(.23,.23,1.2,'#a4b395',x,.65,5.55,8));
    root.add(ball(.70,'#93b296',x,1.62,5.55,9,7));obstacles.push({x,z:5.55,r:.42});
  }
  const exit=new THREE.Group();exit.position.set(7.45,0,6.95);
  exit.add(box(1.3,2.32,.17,'#9cb4b0',0,1.2,0));
  const exitSign=sign('下班出口',1.55);exitSign.position.set(0,2.65,0);exit.add(exitSign);
  root.add(exit);obstacles.push({x:7.45,z:6.95,r:.45});
  const supervisor=managerModel();root.add(supervisor.root);
  let shiftReady=false,departing=false,grace=1.2,clock=0,caught=0;
  const status=()=>callbacks.onStatus(shiftReady?'报告完成 · 绕过主管视线，去右下角出口领取 18 金币。':
    caught?'被主管发现，报告要重新整理。沿左侧走到工位。':'沿左侧走到工位整理报告，避开红色视野。');
  status();
  interactions.push({id:'office-work',label:'整理工作报告',root:notice,
    approach:new THREE.Vector3(-6.72,0,-3.8),
    use:()=>({message:shiftReady?'报告已经整理好，准备安全下班吧。':'报告整理完成，现在要避开主管离开。',
      gesture:'sit'}),
    onMoment:()=>{shiftReady=true;status();}
  });
  let eligible=false;
  interactions.push({id:'office-exit',label:'从出口下班',root:exit,
    approach:new THREE.Vector3(6.85,0,5.38),
    use:()=>{
      eligible=shiftReady;departing=false;
      return {message:eligible?'成功避开主管，领到 18 金币工资。':'先完成左上方工位的报告，再从这里下班。',
        coins:eligible?PAY:0,gesture:'wave'};
    },
    onMoment:()=>{
      if(eligible&&shiftReady){shiftReady=false;departing=true;status();}
    },
    onActionEnd:()=>{
      const shouldDepart=departing;departing=false;eligible=false;
      if(shouldDepart)callbacks.onDepart();
    }
  });
  const manager=supervisor.root;
  return {id:'office',name:'午后办公室',note:'整理报告，观察主管巡逻，躲过视线后安全下班。',root,floor,
    spawn:new THREE.Vector3(-7.3,0,6.3),camera:'isometric',bounds:BOUNDS,obstacles,interactions,
    tick:(_elapsed,dt,player)=>{
      clock+=dt;
      manager.position.set(Math.sin(clock*.60)*3.05,0,-.5);
      supervisor.legs[0].rotation.x=Math.sin(clock*8)*.13;
      supervisor.legs[1].rotation.x=-Math.sin(clock*8)*.13;
      grace=Math.max(0,grace-dt);
      if(grace===0&&!departing&&officeCanSee(manager.position,player,obstacles)){
        grace=1.4;shiftReady=false;departing=false;caught++;status();
        callbacks.onCaught();
      }
    }};
}
