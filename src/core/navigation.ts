import * as THREE from 'three';
import type { Bounds, Obstacle } from './types';

/** Deterministic 2D grid A* for the two small prototype rooms. World-coordinate independent. */
export function findPath(start:THREE.Vector3, goal:THREE.Vector3, bounds:Bounds, obstacles:Obstacle[], cell=0.45):THREE.Vector3[] {
  const nx=Math.floor((bounds.maxX-bounds.minX)/cell)+1;
  const nz=Math.floor((bounds.maxZ-bounds.minZ)/cell)+1;
  const toCell=(p:THREE.Vector3)=>({x:Math.max(0,Math.min(nx-1,Math.round((p.x-bounds.minX)/cell))),z:Math.max(0,Math.min(nz-1,Math.round((p.z-bounds.minZ)/cell)))});
  const world=(x:number,z:number)=>new THREE.Vector3(bounds.minX+x*cell,0,bounds.minZ+z*cell);
  const blocked=(x:number,z:number)=>{
    if(x<0||z<0||x>=nx||z>=nz)return true;
    const p=world(x,z);
    return obstacles.some(o=>(p.x-o.x)**2+(p.z-o.z)**2<(o.r+0.24)**2);
  };
  const s=toCell(start), g=toCell(goal), key=(x:number,z:number)=>z*nx+x;
  // Choose the nearest free cell if a target is against furniture or a wall.
  let gx=g.x,gz=g.z;
  if(blocked(gx,gz)){
    let best=Infinity;
    for(let z=0;z<nz;z++)for(let x=0;x<nx;x++)if(!blocked(x,z)){
      const dist=(x-g.x)**2+(z-g.z)**2;
      if(dist<best){best=dist;gx=x;gz=z;}
    }
  }
  const startKey=key(s.x,s.z),endKey=key(gx,gz);
  const open:number[]=[startKey],came=new Map<number,number>();
  const costs=new Map<number,number>([[startKey,0]]);
  const scores=new Map<number,number>([[startKey,Math.hypot(gx-s.x,gz-s.z)]]);
  const closed=new Set<number>();
  let iterations=0;
  while(open.length && iterations++<nx*nz){
    open.sort((a,b)=>(scores.get(a)??Infinity)-(scores.get(b)??Infinity));
    const current=open.shift()!;
    if(current===endKey){
      const path:THREE.Vector3[]=[];let at=current;
      while(at!==startKey){path.push(world(at%nx,Math.floor(at/nx)));at=came.get(at)!;}
      path.reverse();
      const destination=world(gx,gz);
      if(destination.distanceTo(goal)<cell*0.8&&!blocked(gx,gz)) path.push(new THREE.Vector3(goal.x,0,goal.z));
      return path;
    }
    closed.add(current);
    const cx=current%nx, cz=Math.floor(current/nx);
    for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]){
      const x=cx+dx,z=cz+dz,k=key(x,z);
      if(blocked(x,z)||closed.has(k))continue;
      if(dx&&dz&&(blocked(cx+dx,cz)||blocked(cx,cz+dz)))continue;
      const cost=(costs.get(current)??0)+(dx&&dz?1.414:1);
      if(cost<(costs.get(k)??Infinity)){
        came.set(k,current);costs.set(k,cost);scores.set(k,cost+Math.hypot(gx-x,gz-z));
        if(!open.includes(k))open.push(k);
      }
    }
  }
  return []; // Explicit no-route condition; never walk through walls as fallback.
}
