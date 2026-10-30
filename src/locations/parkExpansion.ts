import * as THREE from 'three';
import {art} from '../art/style';
import {ball,box,cone,cylinder,matte,oval,rand,sign} from '../core/geo';
import type {Interaction,Obstacle} from '../core/types';

/** Expanded park outskirts: three continuous walks, shared coordinates, no extra Location. */
function pathRibbon(coords:[number,number][],width:number,color:string,y=.045){
  const curve=new THREE.CatmullRomCurve3(coords.map(([x,z])=>new THREE.Vector3(x,y,z)),false,'catmullrom',.45);
  const positions:number[]=[];const indices:number[]=[];const count=Math.max(16,coords.length*14);
  for(let i=0;i<=count;i++){
    const t=i/count,p=curve.getPoint(t),v=curve.getTangent(t);
    const len=Math.hypot(v.x,v.z)||1,nx=-v.z/len,nz=v.x/len;
    for(const side of [-1,1])positions.push(p.x+nx*width*side*.5,p.y,p.z+nz*width*side*.5);
    if(i<count){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:1,side:THREE.DoubleSide}));
  mesh.receiveShadow=true;return mesh;
}
function canopyTree(x:number,z:number,scale:number,variant:number){
  const group=new THREE.Group();group.position.set(x,0,z);group.scale.setScalar(scale);
  group.add(cylinder(.19,.26,2.25,'#937b61',0,1.14,0,8));
  const colors=art.leaf;
  const shapes:[[number,number,number,number],[number,number,number,number],[number,number,number,number]]=[
    [0,2.78,0,1.02],[-.68,2.45,.1,.82],[.64,2.59,-.28,.84]
  ];
  shapes.forEach(([dx,dy,dz,r],i)=>{
    const crown=ball(r,colors[(i+variant)%colors.length],dx,dy,dz,10,7);
    crown.scale.set(1.07,.80,.96);group.add(crown);
  });
  return group;
}
function house(x:number,z:number,primary:string,roof:string){
  const root=new THREE.Group();root.position.set(x,0,z);
  root.add(box(4.2,3.05,3.35,primary,0,1.57,0));
  const left=box(2.85,.21,4.02,roof,-1.00,3.62,0);left.rotation.z=-.46;
  const right=box(2.85,.21,4.02,roof,1.00,3.62,0);right.rotation.z=.46;root.add(left,right);
  root.add(box(1.1,1.92,.10,'#a98670',-.05,1.01,1.74));
  root.add(ball(.07,'#f1d292',.32,1.13,1.82));
  for(const px of [-1.32,1.28]){
    root.add(box(.84,1.13,.09,'#faf0d8',px,1.88,1.75));
    root.add(box(.69,.91,.11,'#a8c4c1',px,1.88,1.84));
    root.add(box(.07,.94,.12,'#f8e8d4',px,1.88,1.9));
  }
  root.add(box(5,.11,1.0,'#cdb18d',0,.16,2.10));
  return root;
}
function smallBench(x:number,z:number,rotation=0){
  const group=new THREE.Group();group.position.set(x,0,z);group.rotation.y=rotation;
  for(const sx of [-.76,.76])group.add(box(.11,.69,.45,'#799388',sx,.34,0));
  group.add(box(1.9,.15,.56,'#c29572',0,.72,0));
  group.add(box(1.9,.53,.15,'#c29572',0,1.08,-.27));
  return group;
}
function instancedMeadow(root:THREE.Group){
  const rng=rand(4271),count=570;
  const mesh=new THREE.InstancedMesh(new THREE.ConeGeometry(.10,.32,5),matte('#ffffff'),count);
  const dummy=new THREE.Object3D();let n=0;
  const colors=['#b5c991','#96b883','#d1d39e','#8eaf82','#d7d5a0'];
  for(let attempt=0;attempt<count*6&&n<count;attempt++){
    const x=(rng()-.5)*76,z=(rng()-.5)*69;
    // Preserve the existing playable park and the main pedestrian corridors.
    if(Math.abs(x)<11&&Math.abs(z)<10)continue;
    if(Math.hypot(x+24,z-17)<5||Math.hypot(x-27,z-16)<4)continue;
    dummy.position.set(x,.15,z);dummy.scale.set(.55+rng()*.8,.65+rng()*.75,.55+rng()*.8);
    dummy.rotation.y=rng()*Math.PI*2;dummy.updateMatrix();
    mesh.setMatrixAt(n,dummy.matrix);mesh.setColorAt(n,new THREE.Color(colors[Math.floor(rng()*colors.length)]));n++;
  }
  mesh.count=n;mesh.instanceMatrix.needsUpdate=true;
  mesh.castShadow=false;mesh.receiveShadow=false;root.add(mesh);
  const flowers=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.10,0),matte('#ffffff'),155);
  const hues=['#e7aeaa','#f0d59b','#d9b8d9','#f6e4c7'];
  for(let i=0;i<155;i++){
    const x=(rng()-.5)*73,z=(rng()-.5)*62;
    dummy.position.set(x,.16,z);dummy.scale.set(.7+rng()*.5,.65+rng()*.6,.7+rng()*.5);
    dummy.updateMatrix();flowers.setMatrixAt(i,dummy.matrix);
    flowers.setColorAt(i,new THREE.Color(hues[Math.floor(rng()*hues.length)]));
  }
  flowers.instanceMatrix.needsUpdate=true;flowers.castShadow=false;root.add(flowers);
}
export function extendPark(root:THREE.Group,obstacles:Obstacle[],interactions:Interaction[]){
  const decor=new THREE.Group();decor.name='Neighborhood · winding walks, meadow, water and houses';root.add(decor);
  // Pale shoulders underneath the walkable paths make the route legible from both camera heights.
  const paths:[number,number][][]=[
    [[-6,4],[-12,7],[-19,9],[-26,17],[-30,25]],
    [[6,5],[13,7],[20,10],[27,16],[30,26]],
    [[-1,-7],[-3,-13],[-10,-20],[-17,-27]],
    [[0,6],[4,13],[8,21],[12,28]],
  ];
  paths.forEach(p=>{decor.add(pathRibbon(p,3.6,'#d8d4b3',.030));decor.add(pathRibbon(p,2.75,art.warmPath,.040));});
  // A stronger route to the horizon: local architecture frames the long view.
  decor.add(pathRibbon([[-11,-28],[-5,-24],[3,-22],[11,-23],[20,-28]],4.9,'#c9d1bf',.035));
  decor.add(pathRibbon([[-11,-28],[-5,-24],[3,-22],[11,-23],[20,-28]],3.8,'#e7d5b4',.042));
  for(const [x,z,color,roof] of [
    [-24,-18,'#eddbc4','#c88d78'],[-31,-10,'#e6d9ca','#8fa9a1'],
    [16,-27,'#f2e0c7','#c98e7b'],[27,-24,'#eedbbf','#a8b29c']
  ] as [number,number,string,string][]){
    decor.add(house(x,z,color,roof));obstacles.push({x,z,r:2.8});
  }
  // Village edges have varied tree silhouettes; near paths stay reasonably open.
  const rng=rand(7092);
  for(let i=0;i<55;i++){
    let x=0,z=0;
    if(i<24){x=-35+rng()*70;z=-31+rng()*5;}
    else if(i<38){x=-35+rng()*7;z=-26+rng()*54;}
    else if(i<50){x=30+rng()*5;z=-27+rng()*56;}
    else{x=-14+rng()*38;z=25+rng()*7;}
    if(Math.hypot(x-27,z+10)<6)continue;
    const size=.75+rng()*.55;decor.add(canopyTree(x,z,size,Math.floor(rng()*4)));
    obstacles.push({x,z,r:.65*size});
  }
  // Three places with distinct visual identities and readable distant silhouettes.
  const water=oval(6.6,4.5,'#7eb8bd',26,.052,-10);
  decor.add(oval(7.15,5.0,'#d8c9a1',26,.048,-10),water);
  obstacles.push({x:26,z:-10,r:5.4});
  for(let i=0;i<21;i++){
    const a=i*Math.PI*2/21;
    decor.add(ball(.14+(i%3)*.04,'#cfc8ae',26+Math.cos(a)*6.85,.15,-10+Math.sin(a)*4.7,7,6));
  }
  // A quiet bench by the overlook; different from a permanent new gameplay scene.
  const viewpoint=smallBench(-26,18,-.36);decor.add(viewpoint);obstacles.push({x:-26,z:18,r:1});
  const viewSign=sign('小镇的尽头',2);viewSign.position.set(-25,1.6,20.1);decor.add(viewSign);
  interactions.push({id:'park-view',label:'在小镇尽头看看风景',root:viewSign,
    approach:new THREE.Vector3(-24.8,0,21.7),
    use:()=>({message:'远处的屋顶沐浴着阳光。今天的路还很长。',mood:3,gesture:'sit'})});
  // Flower garden and pergola. No new Location or generic quest.
  const garden=new THREE.Group();garden.position.set(26,0,18);
  garden.add(oval(4.4,3.2,'#a8c59a',0,.034,0));
  for(const dx of [-1.75,1.75])garden.add(cylinder(.12,.13,2.55,'#a17e60',dx,1.28,0,8));
  garden.add(box(4.0,.22,.55,'#b18c67',0,2.65,0));
  for(let i=0;i<8;i++){const a=i*Math.PI*2/8;
    garden.add(ball(.28,i%2?'#e6b6aa':'#e7d8a9',Math.cos(a)*3.3,.28,Math.sin(a)*2.3,8,7));}
  decor.add(garden);
  const gardenSign=sign('花影小径',2.1);gardenSign.position.set(23.2,1.42,17.2);decor.add(gardenSign);
  interactions.push({id:'park-garden',label:'看看花园',root:gardenSign,
    approach:new THREE.Vector3(22.1,0,17.7),
    use:()=>({message:'花坛里有微微的香气，风从远处吹过来。',mood:2,gesture:'wave'})});
  decor.add(smallBench(12,27,.5));obstacles.push({x:12,z:27,r:.95});
  decor.add(sign('草地与小路',2.4));
  const direction=sign('沿着小路走走',2.25);direction.position.set(5.2,1.65,10.8);decor.add(direction);
  instancedMeadow(decor);
  // A distant ridge adds layered depth beyond the playable bounds; do not use opaque fog to hide a hard edge.
  for(let i=0;i<12;i++){
    const x=-46+i*8.3;
    const hill=ball(7.8,i%3===0?'#b4c7b5':i%2===0?'#a5beb0':'#c2d0b7',x,1.2+(i%3)*.7,-46,10,7);
    hill.scale.set(1.3,.55,.8);hill.castShadow=false;decor.add(hill);
  }
  const haze=new THREE.Group();decor.add(haze);
  for(let i=0;i<5;i++){
    const cloud=new THREE.Mesh(new THREE.SphereGeometry(1,10,6),
      new THREE.MeshBasicMaterial({color:'#fff8e9',transparent:true,opacity:.62,depthWrite:false}));
    cloud.scale.set(3.1+i%2,.7,1.3);cloud.position.set(-26+i*14,16+(i%3)*2,-46);
    haze.add(cloud);
  }
  return (time:number)=>{
    haze.position.x=Math.sin(time*.055)*.85;
  };
}
