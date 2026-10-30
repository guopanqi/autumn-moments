import * as THREE from 'three';
import {art} from '../art/style';
import {add,ball,box,cylinder,cone} from './geo';

export type Gesture='wave'|'sip'|'sit'|'pet'|'rest';
type Action={
  kind:Gesture; elapsed:number; duration:number; moment:number; fired:boolean;
  onMoment:()=>void; onFinish?:()=>void; onCancel?:()=>void;
};
const DURATIONS:Record<Gesture,number>={wave:1.3,sip:2.65,sit:2.55,pet:2.2,rest:3.25};
const clamp01=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(x:number)=>{const n=clamp01(x);return n*n*(3-2*n);};

/** Replaceable, procedural animation adapter. All gameplay effects are released by an action cue. */
export class Character {
  readonly group=new THREE.Group();
  private body=new THREE.Group();
  private leftArm=new THREE.Group(); private rightArm=new THREE.Group();
  private leftLeg=new THREE.Group(); private rightLeg=new THREE.Group();
  private eyes:THREE.Mesh[]=[];
  private handheldCup=new THREE.Group();
  private path:THREE.Vector3[]=[];
  private arrival:(()=>void)|null=null;
  private action:Action|null=null;
  private phase=0;
  private walkWeight=0;
  private runWeight=0;
  private gaitPhase=0;
  private pathRunning=false;
  private moving=false;
  constructor(){
    this.group.name='Player · procedural chibi';
    this.group.add(this.body);
    const shoes='#5b6d73',pants='#7b9f97',sweater='#e4a27e',skin='#f8d6b0',hair='#655048';
    add(this.body,ball(.35,sweater,0,.86,0,16,12),cylinder(.25,.28,.40,pants,0,.55,0),ball(.41,skin,0,1.61,0,24,16));
    const cap=ball(.416,hair,0,1.83,-.04,24,12);cap.scale.set(1.02,.59,1.02);this.body.add(cap);
    add(this.body,ball(.115,hair,-.3,1.85,-.16),ball(.10,hair,.30,1.83,-.16));
    const fringe=cone(.15,.25,hair,-.2,1.95,.30,7);fringe.rotation.x=.42;this.body.add(fringe);
    for(const x of [-.17,.17]){
      const eye=ball(.065,'#3e464f',x,1.63,.362,12,10);this.eyes.push(eye);this.body.add(eye);
      this.body.add(ball(.025,'#ffffff',x-.015,1.656,.413,8,8));
      const cheek=ball(.10,'#e8a9a3',x<0?-.29:.29,1.49,.31,12,8);cheek.scale.y=.48;this.body.add(cheek);
    }
    const mouth=ball(.038,'#9f726d',0,1.46,.395,8,8);mouth.scale.y=.25;this.body.add(mouth);
    for(const side of [-1,1]){
      const arm=new THREE.Group();arm.position.set(side*.32,1.07,0);this.body.add(arm);
      add(arm,ball(.125,sweater,0,-.11,0),cylinder(.10,.082,.33,skin,0,-.32,0),ball(.09,skin,0,-.49,0));
      if(side<0)this.leftArm=arm;else this.rightArm=arm;
      const leg=new THREE.Group();leg.position.set(side*.16,.47,0);this.body.add(leg);
      add(leg,cylinder(.12,.11,.34,pants,0,-.17,0),ball(.14,shoes,0,-.36,.12));
      if(side<0)this.leftLeg=leg;else this.rightLeg=leg;
    }
    // The prop attaches to the avatar. A glTF avatar can keep the same hand anchor.
    this.handheldCup.position.set(0,-.55,.02);
    this.handheldCup.add(cylinder(.13,.115,.21,'#fff7e7',0,.11,0,12));
    this.handheldCup.add(cylinder(.107,.107,.01,'#b78160',0,.222,0,14));
    this.handheldCup.add(box(.075,.10,.055,'#fff7e7',.15,.12,0));
    this.handheldCup.visible=false;
    this.rightArm.add(this.handheldCup);
  }
  get position(){return this.group.position;}
  get isMoving(){return this.moving;}
  get isActing(){return !!this.action;}
  teleport(p:THREE.Vector3){this.cancel();this.group.position.copy(p);this.group.rotation.y=0;}
  cancel(){this.path=[];this.arrival=null;this.moving=false;this.pathRunning=false;this.cancelAction();}
  private cancelAction(){
    const previous=this.action;this.action=null;this.handheldCup.visible=false;
    previous?.onCancel?.();
  }
  follow(path:THREE.Vector3[],done?:()=>void,run=false){
    this.cancel();this.path=path.slice();this.pathRunning=run;this.arrival=done??null;this.moving=path.length>0;
    if(path.length===0){this.arrival=null;done?.();}
  }
  faceTowards(point:THREE.Vector3){
    const dx=point.x-this.position.x,dz=point.z-this.position.z;
    if(Math.hypot(dx,dz)>.02)this.group.rotation.y=Math.atan2(dx,dz);
  }
  act(kind:Gesture,onMoment:()=>void,onFinish?:()=>void,onCancel?:()=>void){
    this.cancelAction();this.path=[];this.arrival=null;this.moving=false;
    this.action={kind,elapsed:0,duration:DURATIONS[kind],moment:kind==='sip'?.57:kind==='rest'?.53:.48,fired:false,onMoment,onFinish,onCancel};
  }
  update(dt:number,elapsed:number,manual=false,manualRunning=false){
    this.phase+=dt;
    if(this.path.length){
      const dest=this.path[0],dx=dest.x-this.position.x,dz=dest.z-this.position.z;
      const length=Math.hypot(dx,dz),step=(this.pathRunning?art.animation.runSpeed:art.animation.walkSpeed)*dt;
      if(length<=Math.max(step,.055)){
        this.position.set(dest.x,0,dest.z);this.path.shift();
        if(!this.path.length){this.moving=false;const cb=this.arrival;this.arrival=null;cb?.();}
      }else{
        this.position.x+=dx/length*step;this.position.z+=dz/length*step;
        const facing=Math.atan2(dx,dz);
        const diff=Math.atan2(Math.sin(facing-this.group.rotation.y),Math.cos(facing-this.group.rotation.y));
        this.group.rotation.y+=diff*(1-Math.exp(-art.animation.turnDamping*dt));
      }
    }
    const moving=this.path.length>0||manual, running=moving&&(this.pathRunning||manualRunning);
    this.walkWeight=THREE.MathUtils.damp(this.walkWeight,moving?1:0,9,dt);
    this.runWeight=THREE.MathUtils.damp(this.runWeight,running?1:0,7,dt);
    this.gaitPhase+=dt*(10+this.runWeight*4);
    const stride=Math.sin(this.gaitPhase)*(.48+this.runWeight*.15)*this.walkWeight;
    this.leftLeg.rotation.x=stride;this.rightLeg.rotation.x=-stride;
    this.leftArm.rotation.x=-stride*.75;this.rightArm.rotation.x=stride*.75;
    this.rightArm.rotation.z=0;this.leftArm.rotation.z=0;
    this.body.position.y=this.walkWeight*Math.abs(Math.sin(this.gaitPhase))*(.042+this.runWeight*.035)+(1-this.walkWeight)*Math.sin(elapsed*2.4)*.012;
    this.body.rotation.x=-.11*this.runWeight;this.body.rotation.z=Math.sin(elapsed*.95)*.012;
    // Brief blinks, not a permanently half-closed face.
    const blink=(elapsed%4.8>4.61||elapsed%7.9>7.79)? .13:1;
    this.eyes.forEach(eye=>eye.scale.y=blink);
    const a=this.action;
    if(a){
      a.elapsed=Math.min(a.duration,a.elapsed+dt);
      const t=a.elapsed/a.duration;
      const inPose=smooth(t/.27),outPose=smooth((1-t)/.23),weight=inPose*outPose;
      if(a.kind==='sip'){
        this.rightArm.rotation.x=-1.55*weight;
        this.rightArm.rotation.z=-.16*weight;
        this.body.rotation.x=-.055*weight;
        this.handheldCup.visible=t>.13&&t<.88;
        this.handheldCup.rotation.x=1.15*weight;
      }
      if(a.kind==='wave'){
        this.rightArm.rotation.x=-.45*weight;
        this.rightArm.rotation.z=-1.48*weight+Math.sin(a.elapsed*15)*.13*weight;
      }
      if(a.kind==='pet'){
        this.body.rotation.x=-.22*weight;
        this.rightArm.rotation.x=-1.18*weight;
        this.rightArm.rotation.z=-.30*weight;
        this.body.position.y-=.12*weight;
      }
      if(a.kind==='sit'||a.kind==='rest'){
        this.body.position.y-= (a.kind==='rest'?.33:.24)*weight;
        this.leftLeg.rotation.x=-.65*weight;
        this.rightLeg.rotation.x=-.65*weight;
        this.body.rotation.x=(a.kind==='rest'?.21:.08)*weight;
        if(a.kind==='rest')this.eyes.forEach(eye=>eye.scale.y=t>.32&&t<.78?.12:blink);
      }
      // Gameplay reward occurs at a visible action cue, never at the initial click.
      if(!a.fired&&t>=a.moment){a.fired=true;a.onMoment();}
      if(t>=1){this.action=null;this.handheldCup.visible=false;a.onFinish?.();}
    }else this.handheldCup.visible=false;
  }
}
