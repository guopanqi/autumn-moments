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

/** A room-scoped editor: data owns placement, scene objects are replaceable views. */
export class HomeDecoration {
  readonly placed:PlacedFurniture[]=[];
  private readonly entries=new Map<string,{group:THREE.Group;obstacle:Obstacle;ring:THREE.Mesh}>();
  private preview:THREE.Group|null=null;
  private marker:THREE.Mesh|null=null;
  private chosen:FurnitureKind|null=null;
  private editingId:string|null=null;
  private selected:string|null=null;
  private rotation=0;
  private nextId=0;
  private hoverPoint:THREE.Vector3|null=null;
  private readonly history:PlacedFurniture[][]=[];
  private historyIndex=0;
  constructor(
    private readonly root:THREE.Group,
    private readonly obstacles:Obstacle[],
    private readonly bounds:Bounds,
    private readonly spawn:THREE.Vector3,
    private readonly interactions:Interaction[],
    initial:PlacedFurniture[],
    private readonly persist:(items:PlacedFurniture[])=>void,
  ){
    // A malformed save must not block an essential interaction or an exit.
    for(const item of initial.slice(0,35)){
      if(validFurniture(item)&&!this.entries.has(item.id)&&this.free(item.kind,item.x,item.z)&&
        this.routeSafe(item.kind,item.x,item.z))this.insert(item);
    }
    this.history.push(this.snapshot());
  }
  get isPlacing(){return this.chosen!==null;}
  get kind(){return this.chosen;}
  get selectedId(){return this.selected;}
  get canUndo(){return this.historyIndex>0;}
  get canRedo(){return this.historyIndex<this.history.length-1;}
  /** Select only when the furniture panel is open; normal movement stays unchanged. */
  pick(raycaster:THREE.Raycaster){
    const groups=Array.from(this.entries.values()).map(e=>e.group).filter(g=>g.visible);
    const hits=raycaster.intersectObjects(groups,true);
    if(!hits.length)return false;
    let node:THREE.Object3D|null=hits[0].object;
    while(node){
      for(const [id,entry] of this.entries)if(node===entry.group){this.select(id);return true;}
      node=node.parent;
    }
    return false;
  }
  select(id:string|null){
    if(this.isPlacing)return;
    this.selected=id&&this.entries.has(id)?id:null;
    this.refreshSelection();
  }
  private refreshSelection(){
    for(const [id,entry] of this.entries)entry.ring.visible=id===this.selected;
  }
  begin(kind:FurnitureKind){this.openPreview(kind,null);}
  beginMove():boolean{
    if(!this.selected)return false;
    const original=this.placed.find(p=>p.id===this.selected);
    if(!original)return false;
    this.openPreview(original.kind,original.id);
    this.rotation=original.rotation;
    this.preview!.rotation.y=this.rotation;
    this.hoverPoint=new THREE.Vector3(original.x,0,original.z);
    this.preview!.position.copy(this.hoverPoint);
    this.preview!.visible=true;
    const entry=this.entries.get(original.id);
    if(entry)entry.group.visible=false;
    return true;
  }
  private openPreview(kind:FurnitureKind,editingId:string|null){
    this.cancel();this.chosen=kind;this.editingId=editingId;this.rotation=0;
    this.preview=createPrefab(kind);
    this.preview.traverse(node=>{
      const mesh=node as THREE.Mesh;
      if(!mesh.isMesh)return;
      const mat=mesh.material as THREE.MeshStandardMaterial;
      mesh.material=mat.clone();(mesh.material as THREE.MeshStandardMaterial).transparent=true;
      (mesh.material as THREE.MeshStandardMaterial).opacity=.60;
      mesh.castShadow=false;
    });
    this.marker=new THREE.Mesh(new THREE.RingGeometry(RADIUS[kind]+.06,RADIUS[kind]+.16,40),
      new THREE.MeshBasicMaterial({color:'#7aab85',transparent:true,opacity:.84,depthWrite:false,side:THREE.DoubleSide}));
    this.marker.rotation.x=-Math.PI/2;this.marker.position.y=.07;
    this.preview.add(this.marker);this.preview.visible=false;
    this.root.add(this.preview);
  }
  rotate(){
    if(!this.preview)return false;
    this.rotation=(this.rotation+Math.PI/2)%(Math.PI*2);
    this.preview.rotation.y=this.rotation;
    return true;
  }
  rotateSelected():boolean{
    if(!this.selected||this.isPlacing)return false;
    const obj=this.placed.find(p=>p.id===this.selected);if(!obj)return false;
    obj.rotation=(obj.rotation+Math.PI/2)%(Math.PI*2);
    this.entries.get(obj.id)!.group.rotation.y=obj.rotation;
    this.commit();return true;
  }
  /** Marker follows the floor; confirmation repeats every validation. */
  hover(point:THREE.Vector3,player?:THREE.Vector3){
    if(!this.preview||!this.chosen)return;
    this.hoverPoint=new THREE.Vector3(point.x,0,point.z);
    this.preview.position.copy(this.hoverPoint);this.preview.visible=true;
    const okay=this.validDestination(this.chosen,point.x,point.z,player,this.editingId);
    (this.marker!.material as THREE.MeshBasicMaterial).color.set(okay?'#75ac83':'#c76f67');
  }
  place(player:THREE.Vector3):{ok:boolean;message:string}{
    if(!this.chosen||!this.hoverPoint)return{ok:false,message:'先选择家具，再点击地板上的位置。'};
    const {x,z}=this.hoverPoint,kind=this.chosen,id=this.editingId;
    if(!id&&this.placed.length>=35)return{ok:false,message:'房间暂时放不下更多家具。'};
    if(!this.validDestination(kind,x,z,player,id))return{ok:false,message:'这里会挡住家具、人物或通道，换个位置试试。'};
    if(id){
      const p=this.placed.find(p=>p.id===id);
      const entry=this.entries.get(id);
      if(!p||!entry)return{ok:false,message:'家具已不在房间里，请重新选择。'};
      p.x=x;p.z=z;p.rotation=this.rotation;
      entry.group.position.set(x,0,z);entry.group.rotation.y=this.rotation;
      entry.obstacle.x=x;entry.obstacle.z=z;
    }else{
      const newId=`object-${Date.now().toString(36)}-${this.nextId++}`;
      this.insert({id:newId,kind,x,z,rotation:this.rotation});this.selected=newId;
    }
    this.cancel();this.refreshSelection();this.commit();
    return{ok:true,message:id?'家具的位置已更新。':'家具摆好了。点击家具可以再次调整。'};
  }
  removeSelected():boolean{
    if(!this.selected)return false;
    this.cancel();const id=this.selected;this.selected=null;
    this.erase(id);this.commit();return true;
  }
  undo(){if(!this.canUndo)return false;this.cancel();this.restore(this.history[--this.historyIndex]);this.persist(this.snapshot());return true;}
  redo(){if(!this.canRedo)return false;this.cancel();this.restore(this.history[++this.historyIndex]);this.persist(this.snapshot());return true;}
  clearSelection(){this.cancel();this.selected=null;this.refreshSelection();}
  cancel(){
    if(this.preview){this.root.remove(this.preview);this.preview.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh){m.geometry?.dispose();const material=m.material;if(Array.isArray(material))material.forEach(x=>x.dispose());else material?.dispose();}});}
    this.preview=null;this.marker=null;this.chosen=null;this.hoverPoint=null;
    if(this.editingId){const entry=this.entries.get(this.editingId);if(entry)entry.group.visible=true;}
    this.editingId=null;this.refreshSelection();
  }
  private snapshot(){return this.placed.map(p=>({...p}));}
  private commit(){
    this.history.splice(this.historyIndex+1);this.history.push(this.snapshot());
    if(this.history.length>40)this.history.shift();
    this.historyIndex=this.history.length-1;
    this.persist(this.snapshot());
  }
  private restore(items:PlacedFurniture[]){
    for(const id of Array.from(this.entries.keys()))this.erase(id);
    for(const p of items)this.insert(p);
    if(this.selected&&!this.entries.has(this.selected))this.selected=null;
    this.refreshSelection();
  }
  private erase(id:string){
    const entry=this.entries.get(id);
    if(entry){
      this.root.remove(entry.group);
      const n=this.obstacles.indexOf(entry.obstacle);if(n>=0)this.obstacles.splice(n,1);
      this.entries.delete(id);
    }
    const index=this.placed.findIndex(p=>p.id===id);
    if(index>=0)this.placed.splice(index,1);
  }
  private validDestination(kind:FurnitureKind,x:number,z:number,player?:THREE.Vector3,excludeId:string|null=null){
    return this.free(kind,x,z,player,excludeId)&&this.routeSafe(kind,x,z,excludeId);
  }
  private free(kind:FurnitureKind,x:number,z:number,player?:THREE.Vector3,excludeId:string|null=null){
    const r=RADIUS[kind];
    if(x-r<this.bounds.minX||x+r>this.bounds.maxX||z-r<this.bounds.minZ||z+r>this.bounds.maxZ)return false;
    if(player&&Math.hypot(x-player.x,z-player.z)<r+.65)return false;
    const except=excludeId?this.entries.get(excludeId)?.obstacle:null;
    return this.obstacles.every(o=>o===except||Math.hypot(x-o.x,z-o.z)>=r+o.r+.15);
  }
  private routeSafe(kind:FurnitureKind,x:number,z:number,excludeId:string|null=null){
    const except=excludeId?this.entries.get(excludeId)?.obstacle:null;
    const proposed=this.obstacles.filter(o=>o!==except).concat({x,z,r:RADIUS[kind]});
    return this.interactions.every(i=>findPath(this.spawn,i.approach,this.bounds,proposed).length>0);
  }
  private insert(p:PlacedFurniture){
    const group=createPrefab(p.kind);group.position.set(p.x,0,p.z);group.rotation.y=p.rotation;
    const obstacle={x:p.x,z:p.z,r:RADIUS[p.kind]};
    const ring=new THREE.Mesh(new THREE.RingGeometry(RADIUS[p.kind]+.065,RADIUS[p.kind]+.13,40),
      new THREE.MeshBasicMaterial({color:'#f7d8a5',transparent:true,opacity:.95,side:THREE.DoubleSide,depthWrite:false}));
    ring.rotation.x=-Math.PI/2;ring.position.y=.075;ring.visible=false;group.add(ring);
    this.root.add(group);this.obstacles.push(obstacle);this.entries.set(p.id,{group,obstacle,ring});this.placed.push({...p});
  }
}
