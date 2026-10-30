import * as THREE from 'three';
import {ball,box,cone,rand} from '../core/geo';

type Activity='idle'|'wander'|'sniff'|'sit'|'watch'|'greet';
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const turn=(a:number,b:number)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));

/**
 * One park animal with local agency, not an all-purpose NPC or task system.
 * Decisions are deterministic, movement stays inside the safe central meadow,
 * and the current player interaction can temporarily hold the dog in place.
 */
export class ParkDog {
  readonly root=new THREE.Group();
  private readonly home=new THREE.Vector3();
  private readonly body=new THREE.Group();
  private readonly head=new THREE.Group();
  private readonly tail=new THREE.Group();
  private readonly legs:THREE.Group[]=[];
  private readonly ears:THREE.Object3D[]=[];
  private readonly hearts:THREE.Mesh[]=[];
  private readonly random=rand(36017);
  private destination=new THREE.Vector3();
  private activity:Activity='idle';
  private activityLeft=2.5;
  private headingTime=0;
  private joy=0;
  private time=0;
  private lastCelebration=-100;
  private heldUntil=-1;
  private bondLevel:number;
  constructor(x:number,z:number,bond=0){
    this.bondLevel=clamp(Math.floor(bond),0,5);
    this.root.name='Park puppy';
    this.root.position.set(x,0,z);this.home.copy(this.root.position);
    this.destination.copy(this.home);this.root.add(this.body);
    // Generous invisible ray target: prevents missed taps on a tiny animated head.
    const hit=ball(.49,'#ffffff',0,.55,.10,10,8);
    hit.material=new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0,depthWrite:false});
    hit.castShadow=false;hit.receiveShadow=false;hit.name='Puppy interaction hit-area';
    this.root.add(hit);
    this.body.add(ball(.35,'#d8a671',0,.47,0));
    this.head.position.set(0,.62,.30);this.body.add(this.head);
    this.head.add(ball(.285,'#e8c294',0,.04,.02));
    for(const xx of [-.2,.2]){
      const ear=cone(.14,.30,'#b77a57',xx,.25,0,8);
      ear.rotation.z=xx<0?.25:-.25;this.ears.push(ear);this.head.add(ear);
      this.head.add(ball(.046,'#4d4845',xx*.74,.055,.30,8,6));
      for(const zz of [-.16,.23]){
        const leg=new THREE.Group();
        leg.position.set(xx,.30,zz);
        leg.add(box(.12,.32,.12,'#cc9b6a',0,-.12,0));
        this.body.add(leg);this.legs.push(leg);
      }
    }
    this.head.add(ball(.08,'#4d4845',0,-.08,.33));
    this.tail.position.set(0,.60,-.30);this.body.add(this.tail);
    const shape=cone(.105,.47,'#e0b081',0,.23,0,8);
    shape.rotation.x=-.6;this.tail.add(shape);
    for(let i=0;i<4;i++){
      const h=ball(.055,i%2?'#edb2a4':'#ffe2cf',0,1.1,0,8,7);
      h.castShadow=false;h.material=new THREE.MeshBasicMaterial({
        color:i%2?'#e6a1a1':'#ffebc9',transparent:true,opacity:0,depthWrite:false
      });
      h.visible=false;this.root.add(h);this.hearts.push(h);
    }
  }
  get bond(){return this.bondLevel;}
  get behavior(){return this.activity;}
  /** The click freezes a moving target before World calculates the approach route. */
  holdForInteraction(){this.heldUntil=this.time+15;this.activity='watch';}
  release(){this.heldUntil=-1;this.activity='idle';this.activityLeft=1.7;}
  pet(){
    this.bondLevel=Math.min(5,this.bondLevel+1);
    this.celebrate();
    return this.bondLevel;
  }
  celebrate(){this.joy=2.4;this.lastCelebration=this.time;}
  private enter(activity:Activity,seconds:number){
    this.activity=activity;this.activityLeft=seconds;
  }
  private pickActivity(){
    this.headingTime+=1;
    const roll=this.random();
    if(roll<.48){
      const angle=this.random()*Math.PI*2;
      const radius=.7+this.random()*2.25;
      this.destination.set(this.home.x+Math.cos(angle)*radius,0,
        this.home.z+Math.sin(angle)*radius);
      this.enter('wander',3.8);
    }else if(roll<.78)this.enter('sniff',2.5);
    else this.enter('sit',2.7);
  }
  private moveToward(point:THREE.Vector3,dt:number,speed:number){
    const dx=point.x-this.root.position.x,dz=point.z-this.root.position.z;
    const dist=Math.hypot(dx,dz);
    if(dist<.1)return false;
    const face=Math.atan2(dx,dz);
    this.root.rotation.y+=turn(this.root.rotation.y,face)*(1-Math.exp(-8*dt));
    const step=Math.min(speed*dt,dist);
    const nextX=this.root.position.x+dx/dist*step,nextZ=this.root.position.z+dz/dist*step;
    // The small local walk envelope deliberately avoids the existing pond, workbench and swing.
    if(Math.hypot(nextX-this.home.x,nextZ-this.home.z)>3.25)return false;
    this.root.position.set(nextX,0,nextZ);return true;
  }
  tick(elapsed:number,dt:number,player:THREE.Vector3){
    this.time=elapsed;
    this.joy=Math.max(0,this.joy-dt);
    const dx=player.x-this.root.position.x,dz=player.z-this.root.position.z;
    const distance=Math.hypot(dx,dz);
    const held=this.heldUntil>elapsed;
    let walking=false;
    if(held){
      this.activity='watch';
    }else if(this.bondLevel>=2&&distance>1.75&&distance<5.6&&
      Math.hypot(player.x-this.home.x,player.z-this.home.z)<5.2){
      this.activity='greet';
      // The higher the bond, the more eagerly it chooses to walk toward the player.
      walking=this.moveToward(player,dt,this.bondLevel>=4?1.38:1.04);
    }else if(distance<2.65){
      this.activity='watch';this.activityLeft=.75;
    }else{
      if(this.activity==='watch'||this.activity==='greet')this.enter('idle',.8);
      this.activityLeft-=dt;
      if(this.activityLeft<=0)this.pickActivity();
      if(this.activity==='wander'){
        walking=this.moveToward(this.destination,dt,.74);
        if(!walking)this.enter('sniff',1.8);
      }
    }
    if(!walking&&distance<4.8){
      // Look at the player without snapping the whole model back and forth.
      const bearing=Math.atan2(dx,dz);
      const delta=turn(this.root.rotation.y,bearing);
      if(Math.abs(delta)>1.1){
        this.root.rotation.y+=delta*(1-Math.exp(-2.6*dt));
      }
    }
    const lookPlayer=distance<4.8||held;
    const desiredHead=lookPlayer?clamp(turn(this.root.rotation.y,Math.atan2(dx,dz)),-.6,.6)
      :Math.sin(elapsed*.45)*.26;
    this.head.rotation.y=THREE.MathUtils.damp(this.head.rotation.y,desiredHead,4,dt);
    const sniff=this.activity==='sniff';
    const sit=this.activity==='sit';
    this.head.rotation.x=THREE.MathUtils.damp(this.head.rotation.x,sniff?.35:sit?.12:0,6,dt);
    this.head.rotation.z=Math.sin(elapsed*.85)*.035+(this.joy>0?.09:0);
    const lively=this.joy>0;
    this.tail.rotation.z=Math.sin(elapsed*(lively?23:lookPlayer?12:5))*
      (lively?.74:lookPlayer?.42:.17);
    this.ears.forEach((ear,i)=>ear.rotation.z=(i?-.25:.25)+Math.sin(elapsed*3+i*1.5)*.06);
    const phase=elapsed*11;
    this.legs.forEach((leg,i)=>{leg.rotation.x=walking?Math.sin(phase+(i===0||i===3?0:Math.PI))*.45:0;});
    const hop=lively?Math.max(0,Math.sin((2.4-this.joy)*12))*.15:0;
    const sitAmount=sit?-.12:0;
    this.body.position.y=THREE.MathUtils.damp(this.body.position.y,
      hop+sitAmount+(walking?Math.abs(Math.sin(phase))*.035:Math.sin(elapsed*2.3)*.012),6,dt);
    this.body.rotation.x=sniff?.12:walking?-.065:lively?Math.sin(elapsed*9)*.09:0;
    this.hearts.forEach((h,i)=>{
      const age=elapsed-this.lastCelebration-i*.13,alive=age>=0&&age<1.25&&lively;
      h.visible=alive;if(!alive)return;
      h.position.set(Math.sin(i*2.4+age*1.9)*(.23+age*.24),.9+age*.82,Math.cos(i*1.8)*.22);
      (h.material as THREE.MeshBasicMaterial).opacity=Math.min(1,age*5)*(1-age/1.25)*.88;
      h.scale.setScalar(.8+age*.4);
    });
  }
}
