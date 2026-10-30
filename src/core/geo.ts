import * as THREE from 'three';
export const matte = (color: THREE.ColorRepresentation, roughness = 0.92) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });

export function box(w: number, h: number, d: number, color: THREE.ColorRepresentation, x=0, y=0, z=0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), matte(color));
  m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; return m;
}
export function ball(r: number, color: THREE.ColorRepresentation, x=0, y=0, z=0, w=16, h=12): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r,w,h), matte(color));
  m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; return m;
}
export function cone(r: number, h: number, color: THREE.ColorRepresentation, x=0, y=0, z=0, sides=9): THREE.Mesh {
  const m=new THREE.Mesh(new THREE.ConeGeometry(r,h,sides), matte(color));
  m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; return m;
}
export function cylinder(rt:number, rb:number, h:number, color:THREE.ColorRepresentation, x=0,y=0,z=0, segments=12):THREE.Mesh {
  const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,segments),matte(color));
  m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; return m;
}
export function ground(w:number,h:number,color:THREE.ColorRepresentation): THREE.Mesh {
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),matte(color));
  mesh.rotation.x=-Math.PI/2; mesh.receiveShadow=true; return mesh;
}
export function add(parent: THREE.Object3D, ...children:THREE.Object3D[]):void { children.forEach(c=>parent.add(c)); }
export function oval(w:number,d:number,color:THREE.ColorRepresentation,x=0,y=0,z=0):THREE.Mesh {
  const mesh=new THREE.Mesh(new THREE.CircleGeometry(1,36),matte(color));
  mesh.rotation.x=-Math.PI/2; mesh.scale.set(w,d,1); mesh.position.set(x,y,z);
  mesh.receiveShadow=true; return mesh;
}
export function rand(seed:number):()=>number { let x=seed|0;return ()=>{x=(x*1664525+1013904223)|0; return (x>>>0)/4294967296;} }
export function sign(text:string, width=2.4): THREE.Group {
  const g=new THREE.Group();
  const c=document.createElement('canvas'); c.width=512;c.height=256;
  const ctx=c.getContext('2d');
  if(ctx){ctx.fillStyle='#ffefd1';ctx.fillRect(0,0,512,256);ctx.strokeStyle='#ad8157';ctx.lineWidth=20;ctx.strokeRect(10,10,492,236);ctx.fillStyle='#6d624f';ctx.font='bold 63px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,128);}
  const mat=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),side:THREE.DoubleSide});
  const face=new THREE.Mesh(new THREE.PlaneGeometry(width,width/2),mat);
  g.add(face);return g;
}
