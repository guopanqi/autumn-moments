import * as THREE from 'three';
import {art} from '../art/style';
import {add,ball,box,cylinder,cone} from './geo';

export class Character {
  readonly group=new THREE.Group();
  readonly shadow=new THREE.Group();
  private leftArm=new THREE.Group();private rightArm=new THREE.Group();
  private leftLeg=new THREE.Group();private rightLeg=new THREE.Group();
  private face=new THREE.Group();
  private path:THREE.Vector3[]=[];
  private arrival:(()=>void)|null=null;
  private gesture:'wave'|'sip'|'sit'|null=null;
  private gestureTime=0;
  private phase=0;
  private moving=false;
  constructor(){
    this.group.name='Player · procedural chibi';
    const body=new THREE.Group();this.group.add(body);
    const shoes='#5b6d73',pants='#7b9f97',sweater='#e4a27e',skin='#f8d6b0',hair='#655048';
    add(body,ball(0.35,sweater,0,0.86,0,16,12),cylinder(.25,.28,.40,pants,0,.55,0),ball(.41,skin,0,1.61,0,24,16));
    // Big hair cap and little tufts make the silhouette legible even at the isometric scale.
    const cap=ball(.416,hair,0,1.83,-.04,24,12);cap.scale.set(1.02,.59,1.02);body.add(cap);
    add(body,ball(.115,hair,-.3,1.85,-.16),ball(.10,hair,.30,1.83,-.16));
    const fringe=cone(.15,.25,hair,-.2,1.95,.30,7);fringe.rotation.x=.42;body.add(fringe);
    for(const x of [-.17,.17]){
      body.add(ball(.065,'#3e464f',x,1.63,.362,12,10));
      body.add(ball(.025,'#ffffff',x-.015,1.656,.413,8,8));
      const cheek=ball(.10,'#e8a9a3',x<0?-.29:.29,1.49,.31,12,8);cheek.scale.y=.48;body.add(cheek);
    }
    const mouth=ball(.038,'#9f726d',0,1.46,.395,8,8);mouth.scale.y=.25;body.add(mouth);
    for(const side of [-1,1]){
      const arm=new THREE.Group();arm.position.set(side*.32,1.07,0);body.add(arm);
      add(arm,ball(.125,sweater,0,-.11,0),cylinder(.10,.082,.33,skin,0,-.32,0),ball(.09,skin,0,-.49,0));
      if(side<0)this.leftArm=arm;else this.rightArm=arm;
      const leg=new THREE.Group();leg.position.set(side*.16,.47,0);body.add(leg);
      add(leg,cylinder(.12,.11,.34,pants,0,-.17,0),ball(.14,shoes,0,-.36,.12));
      if(side<0)this.leftLeg=leg;else this.rightLeg=leg;
    }
    this.face=body;
  }
  get position(){return this.group.position;}
  get isMoving(){return this.moving;}
  teleport(p:THREE.Vector3){this.group.position.copy(p);this.cancel();this.group.rotation.y=0;}
  cancel(){this.path=[];this.arrival=null;this.moving=false;}
  follow(path:THREE.Vector3[],done?:()=>void){this.path=path.slice();this.arrival=done??null;this.moving=path.length>0; if(path.length===0&&done)done();}
  act(kind:'wave'|'sip'|'sit'){this.gesture=kind;this.gestureTime=1.7;}
  update(dt:number,elapsed:number){
    this.phase+=dt;
    if(this.path.length){
      const dest=this.path[0];const dx=dest.x-this.position.x,dz=dest.z-this.position.z;
      const length=Math.hypot(dx,dz),step=art.animation.walkSpeed*dt;
      if(length<Math.max(step,.05)){
        this.position.set(dest.x,0,dest.z);this.path.shift();
        if(!this.path.length){this.moving=false;const cb=this.arrival;this.arrival=null;cb?.();}
      } else {
        this.position.x+=dx/length*step;this.position.z+=dz/length*step;
        const facing=Math.atan2(dx,dz);
        const diff=Math.atan2(Math.sin(facing-this.group.rotation.y),Math.cos(facing-this.group.rotation.y));
        this.group.rotation.y+=diff*Math.min(1,dt*12);
      }
    }
    const walk=this.path.length>0?1:0;
    const swing=Math.sin(elapsed*11)*.52*walk;
    this.leftLeg.rotation.x=swing;this.rightLeg.rotation.x=-swing;
    this.leftArm.rotation.x=-swing*.75;this.rightArm.rotation.x=swing*.75;
    this.face.position.y=walk?Math.abs(Math.sin(elapsed*11))*.038:Math.sin(elapsed*2.4)*.012;
    if(this.gesture){
      this.gestureTime-=dt;
      if(this.gesture==='sip')this.rightArm.rotation.x=-1.65;
      if(this.gesture==='wave'){this.rightArm.rotation.z=-1.5;this.rightArm.rotation.x=-.3;}
      if(this.gesture==='sit')this.face.position.y-=.22;
      if(this.gestureTime<=0){this.gesture=null;this.rightArm.rotation.z=0;}
    }
  }
}
