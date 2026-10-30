import * as THREE from 'three';
import {ball,box,cylinder,cone} from '../core/geo';
import {findPath} from '../core/navigation';
import type {Bounds,Obstacle,Interaction} from '../core/types';

export type FurnitureKind='plant'|'stool'|'lamp';
export type PlacedFurniture={id:string;kind:FurnitureKind;x:number;z:number;rotation:number};
const KINDS:FurnitureKind[]=['plant','stool','lamp'];
const RADIUS:Record<FurnitureKind,number>={plant:.48,stool:.60,lamp:.45};
export const isFurnitureKind=(v:unknown):v is FurnitureKind=>typeof v==='string'&&KINDS.includes(v as FurnitureKind);
export const validFurniture=(input:unknown):input is PlacedFurniture=>{
  if(!input||typeof input!=='object')return false;
  const p=input as Record<string,unknown>;
  return typeof p.id==='string'&&p.id.length>0&&p.id.length<70&&isFurnitureKind(p.kind)&&
    typeof p.x==='number'&&Number.isFinite(p.x)&&Math.abs(p.x)<100&&
    typeof p.z==='number'&&Number.isFinite(p.z)&&Math.abs(p.z)<100&&
    typeof p.rotation==='number'&&Number.isFinite(p.rotation);
};

function createPrefab(kind:FurnitureKind){
  const root=new THREE.Group();root.name='Furniture: '+kind;
  if(kind==='plant'){
    root.add(cylinder(.32,.24,.45,'#d59e81',0,.26,0,12));
    root.add(cylinder(.25,.25,.09,'#9d7a63',0,.48,0,12));
    for(let i=0;i<7;i++){
      const a=i*Math.PI*2/7;
      const leaf=ball(.34,i%2===0?'#759d80':'#85ac88',Math.cos(a)*.25,.92+Math.sin(a*2)*.08,Math.sin(a)*.25,11,8);
      leaf.scale.set(.65,1.13,.50);leaf.rotation.z=-Math.cos(a)*.48;root.add(leaf);
    }
    root.add(ball(.24,'#8ab68a',0,1.24,0));
  }else if(kind==='stool'){
    root.add(cylinder(.52,.52,.14,'#e9c0a0',0,.73,0,16));
    root.add(cylinder(.49,.48,.15,'#a7baa3',0,.84,0,16));
    for(const [x,z] of [[-.30,-.30],[-.30,.30],[.30,-.30],[.30,.30]])root.add(cylinder(.07,.08,.72,'#ad8468',x,.36,z,8));
    root.add(ball(.08,'#f3ded0',0,.93,0));
  }else{
    root.add(cylinder(.29,.33,.07,'#b19a80',0,.06,0,12));
    root.add(cylinder(.04,.05,1.80,'#9b9c8d',0,.95,0,10));
    root.add(cone(.48,.78,'#f2d7b0',0,1.91,0,16));
    root.add(ball(.14,'#ffe4b2',0,1.64,0,12,8));
  }
  return root;
}

/** One room-scoped editor. It owns only user-placed furniture, never hard-coded architecture. */
export class HomeDecoration {
  readonly placed:PlacedFurniture[]=[];
  private readonly entries=new Map<string,{group:THREE.Group;obstacle:Obstacle}>();
  private preview:THREE.Group|null=null;
  private marker:THREE.Mesh|null=null;
  private chosen:FurnitureKind|null=null;
  private rotation=0;
  private nextId=0;
  private hoverPoint:THREE.Vector3|null=null;
  constructor(
    private readonly root:THREE.Group,
    private readonly obstacles:Obstacle[],
    private readonly bounds:Bounds,
    private readonly spawn:THREE.Vector3,
    private readonly interactions:Interaction[],
    initial:PlacedFurniture[],
    private readonly persist:(items:PlacedFurniture[])=>void,
  ){
    // Malformed or obsolete saved placements must never destroy the room.
    for(const item of initial.slice(0,50))if(validFurniture(item)&&!this.entries.has(item.id)&&this.free(item.kind,item.x,item.z))this.insert(item);
  }
  get isPlacing(){return this.chosen!==null;}
  get kind(){return this.chosen;}
  begin(kind:FurnitureKind){
    this.cancel();this.chosen=kind;this.rotation=0;
    this.preview=createPrefab(kind);
    this.preview.traverse(node=>{
      const mesh=node as THREE.Mesh;
      if(!mesh.isMesh)return;
      const mat=mesh.material as THREE.MeshStandardMaterial;
      mesh.material=mat.clone();(mesh.material as THREE.MeshStandardMaterial).transparent=true;
      (mesh.material as THREE.MeshStandardMaterial).opacity=.60;
      mesh.castShadow=false;
    });
    this.marker=new THREE.Mesh(new THREE.RingGeometry(RADIUS[kind]+.06,RADIUS[kind]+.15,40),
      new THREE.MeshBasicMaterial({color:'#7aab85',transparent:true,opacity:.75,depthWrite:false,side:THREE.DoubleSide}));
    this.marker.rotation.x=-Math.PI/2;this.marker.position.y=.06;
    this.preview.add(this.marker);this.preview.visible=false;
    this.root.add(this.preview);
  }
  rotate(){
    if(!this.preview)return;
    this.rotation=(this.rotation+Math.PI/2)%(Math.PI*2);
    this.preview.rotation.y=this.rotation;
  }
  /** Marker follows the floor, but placement is validated again on confirm. */
  hover(point:THREE.Vector3,player?:THREE.Vector3){
    if(!this.preview||!this.chosen)return;
    this.hoverPoint=new THREE.Vector3(point.x,0,point.z);
    this.preview.position.copy(this.hoverPoint);this.preview.visible=true;
    const okay=this.free(this.chosen,point.x,point.z,player);
    (this.marker!.material as THREE.MeshBasicMaterial).color.set(okay?'#75ac83':'#c76f67');
  }
  place(player:THREE.Vector3):{ok:boolean;message:string}{
    if(!this.chosen||!this.hoverPoint)return{ok:false,message:'先选择家具，再点击地板上的位置。'};
    const {x,z}=this.hoverPoint,kind=this.chosen;
    if(this.placed.length>=35)return{ok:false,message:'房间暂时放不下更多家具。'};
    if(!this.free(kind,x,z,player))return{ok:false,message:'这里空间不够，试试旁边的空地。'};
    const obstacle={x,z,r:RADIUS[kind]};
    const proposed=this.obstacles.concat(obstacle);
    // Do not allow the player to accidentally block every approach to furniture or the exit.
    const accessible=this.interactions.every(i=>findPath(this.spawn,i.approach,this.bounds,proposed).length>0);
    if(!accessible)return{ok:false,message:'这样会挡住通道，换个地方摆放吧。'};
    this.insert({id:`object-${Date.now().toString(36)}-${this.nextId++}`,kind,x,z,rotation:this.rotation});
    this.persist(this.placed.map(p=>({...p})));
    this.cancel();
    return{ok:true,message:'家具摆好了。你可以继续调整自己的小屋。'};
  }
  undo(){
    const last=this.placed.pop();if(!last)return false;
    const entry=this.entries.get(last.id);
    if(entry){this.root.remove(entry.group);const n=this.obstacles.indexOf(entry.obstacle);if(n>=0)this.obstacles.splice(n,1);this.entries.delete(last.id);}
    this.persist(this.placed.map(p=>({...p})));
    return true;
  }
  cancel(){
    if(this.preview)this.root.remove(this.preview);
    this.preview=null;this.marker=null;this.chosen=null;this.hoverPoint=null;
  }
  private free(kind:FurnitureKind,x:number,z:number,player?:THREE.Vector3){
    const r=RADIUS[kind];
    if(x-r<this.bounds.minX||x+r>this.bounds.maxX||z-r<this.bounds.minZ||z+r>this.bounds.maxZ)return false;
    if(player&&Math.hypot(x-player.x,z-player.z)<r+.65)return false;
    return this.obstacles.every(o=>Math.hypot(x-o.x,z-o.z)>=r+o.r+.15);
  }
  private insert(p:PlacedFurniture){
    const group=createPrefab(p.kind);group.position.set(p.x,0,p.z);group.rotation.y=p.rotation;
    const obstacle={x:p.x,z:p.z,r:RADIUS[p.kind]};
    this.root.add(group);this.obstacles.push(obstacle);this.entries.set(p.id,{group,obstacle});this.placed.push({...p});
  }
}
