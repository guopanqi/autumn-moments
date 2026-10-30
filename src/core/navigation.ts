import * as THREE from 'three';
import type { Bounds, Obstacle } from './types';

/** Segments are checked against inflated circular obstacles. All movement shares this clearance. */
export function clearSegment(from:THREE.Vector3,to:THREE.Vector3,bounds:Bounds,obstacles:Obstacle[],clearance=.28):boolean{
  if([from.x,to.x].some(x=>x<bounds.minX||x>bounds.maxX)||[from.z,to.z].some(z=>z<bounds.minZ||z>bounds.maxZ))return false;
  const dx=to.x-from.x,dz=to.z-from.z,len2=dx*dx+dz*dz;
  return obstacles.every(o=>{
    const t=len2<1e-8?0:Math.max(0,Math.min(1,((o.x-from.x)*dx+(o.z-from.z)*dz)/len2));
    const cx=from.x+t*dx-o.x,cz=from.z+t*dz-o.z;
    return cx*cx+cz*cz>=(o.r+clearance)*(o.r+clearance);
  });
}
/** String-pull the grid route to eliminate cell-by-cell zig-zag and rapid heading changes. */
export function smoothPath(start:THREE.Vector3,points:THREE.Vector3[],bounds:Bounds,obstacles:Obstacle[]){
  const route:THREE.Vector3[]=[];let from=start;let i=0;
  while(i<points.length){
    let far=i;
    for(let j=points.length-1;j>i;j--)if(clearSegment(from,points[j],bounds,obstacles)){far=j;break;}
    route.push(points[far]);from=points[far];i=far+1;
  }
  return route;
}
/** Grid A* is retained for small scenes. Clear straight trips bypass the grid entirely. */
export function findPath(start:THREE.Vector3,goal:THREE.Vector3,bounds:Bounds,obstacles:Obstacle[],cell=.45):THREE.Vector3[]{
  const target=new THREE.Vector3(
    Math.max(bounds.minX,Math.min(bounds.maxX,goal.x)),0,
    Math.max(bounds.minZ,Math.min(bounds.maxZ,goal.z)));
  if(clearSegment(start,target,bounds,obstacles))return [target];
  const nx=Math.floor((bounds.maxX-bounds.minX)/cell)+1,nz=Math.floor((bounds.maxZ-bounds.minZ)/cell)+1;
  const world=(x:number,z:number)=>new THREE.Vector3(bounds.minX+x*cell,0,bounds.minZ+z*cell);
  const toCell=(v:THREE.Vector3)=>({x:Math.max(0,Math.min(nx-1,Math.round((v.x-bounds.minX)/cell))),
    z:Math.max(0,Math.min(nz-1,Math.round((v.z-bounds.minZ)/cell)))});
  const blocked=(x:number,z:number)=>{
    if(x<0||z<0||x>=nx||z>=nz)return true;
    const v=world(x,z);
    return obstacles.some(o=>(v.x-o.x)**2+(v.z-o.z)**2<(o.r+.29)**2);
  };
  const s=toCell(start),g=toCell(target),key=(x:number,z:number)=>z*nx+x;
  let gx=g.x,gz=g.z;
  if(blocked(gx,gz)){
    let best=Infinity;
    for(let z=0;z<nz;z++)for(let x=0;x<nx;x++)if(!blocked(x,z)){
      const dist=(x-g.x)**2+(z-g.z)**2;if(dist<best){best=dist;gx=x;gz=z;}
    }
  }
  const startKey=key(s.x,s.z),endKey=key(gx,gz),open=[startKey];
  const came=new Map<number,number>(),costs=new Map<number,number>([[startKey,0]]);
  const scores=new Map<number,number>([[startKey,Math.hypot(gx-s.x,gz-s.z)]]),closed=new Set<number>();
  let count=0;
  while(open.length&&count++<nx*nz){
    open.sort((a,b)=>(scores.get(a)??Infinity)-(scores.get(b)??Infinity));
    const current=open.shift()!;
    if(current===endKey){
      const raw:THREE.Vector3[]=[];let at=current;
      while(at!==startKey){
        raw.push(world(at%nx,Math.floor(at/nx)));const previous=came.get(at);
        if(previous===undefined)return [];at=previous;
      }
      raw.reverse();
      const end=world(gx,gz);
      if(end.distanceTo(target)<cell*.8&&clearSegment(end,target,bounds,obstacles))raw.push(target);
      return smoothPath(start,raw,bounds,obstacles);
    }
    closed.add(current);
    const cx=current%nx,cz=Math.floor(current/nx);
    for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]){
      const x=cx+dx,z=cz+dz,k=key(x,z);
      if(blocked(x,z)||closed.has(k))continue;
      if(dx&&dz&&(blocked(cx+dx,cz)||blocked(cx,cz+dz)))continue;
      const next=(costs.get(current)??0)+(dx&&dz?1.414:1);
      if(next<(costs.get(k)??Infinity)){
        came.set(k,current);costs.set(k,next);scores.set(k,next+Math.hypot(gx-x,gz-z));
        if(!open.includes(k))open.push(k);
      }
    }
  }
  return [];
}
