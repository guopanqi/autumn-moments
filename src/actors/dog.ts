import * as THREE from 'three';
import {ball,box,cone} from '../core/geo';

/** Independent, bounded ambient dog animation. It never modifies navigation state. */
export class ParkDog {
  readonly root=new THREE.Group();
  private body=new THREE.Group();
  private head=new THREE.Group();
  private tail=new THREE.Group();
  private ears:THREE.Object3D[]=[];
  private hearts:THREE.Mesh[]=[];
  private joy=0;
  private time=0;
  private lastCelebration=0;
  constructor(x:number,z:number){
    this.root.position.set(x,0,z);this.root.add(this.body);
    this.body.add(ball(.35,'#d8a671',0,.47,0));
    this.head.position.set(0,.62,.30);this.body.add(this.head);
    this.head.add(ball(.285,'#e8c294',0,.04,.02));
    for(const xx of [-.2,.2]){
      const ear=cone(.14,.30,'#b77a57',xx,.25,0,8);ear.rotation.z=xx<0?.25:-.25;
      this.ears.push(ear);this.head.add(ear);
      this.head.add(ball(.046,'#4d4845',xx*.74,.055,.30,8,6));
      for(const zz of [-.16,.23])this.body.add(box(.12,.32,.12,'#cc9b6a',xx,.19,zz));
    }
    this.head.add(ball(.08,'#4d4845',0,-.08,.33));
    this.tail.position.set(0,.60,-.30);this.body.add(this.tail);
    const shape=cone(.105,.47,'#e0b081',0,.23,0,8);shape.rotation.x=-.6;this.tail.add(shape);
    for(let i=0;i<4;i++){
      const h=ball(.055,i%2?'#edb2a4':'#ffe2cf',0,1.1,0,8,7);
      h.castShadow=false;h.material=new THREE.MeshBasicMaterial({color:i%2?'#e6a1a1':'#ffebc9',transparent:true,opacity:0,depthWrite:false});
      h.visible=false;this.root.add(h);this.hearts.push(h);
    }
  }
  celebrate(){this.joy=2.4;this.lastCelebration=this.time;}
  tick(elapsed:number,dt:number,player:THREE.Vector3){
    this.time=elapsed;this.joy=Math.max(0,this.joy-dt);
    const dx=player.x-this.root.position.x,dz=player.z-this.root.position.z;
    const near=Math.hypot(dx,dz)<4.3;
    const target=near?Math.atan2(dx,dz):Math.sin(elapsed*.25)*.45;
    const yaw=THREE.MathUtils.clamp(target,-.75,.75);
    this.head.rotation.y=THREE.MathUtils.damp(this.head.rotation.y,yaw,3.5,dt);
    this.head.rotation.z=Math.sin(elapsed*.9)*.055+(this.joy>0?.09:0);
    const lively=this.joy>0;
    this.tail.rotation.z=Math.sin(elapsed*(lively?23:near?12:5))*(lively?.74:near?.40:.15);
    this.ears.forEach((ear,i)=>ear.rotation.z=(i?-.25:.25)+Math.sin(elapsed*3+i*1.5)*.06);
    const hop=lively?Math.max(0,Math.sin((2.4-this.joy)*12))*.17:0;
    this.body.position.y=hop+Math.sin(elapsed*2.3)*.019;
    this.body.rotation.x=lively?Math.sin(elapsed*9)*.11:Math.sin(elapsed*.72)*.018;
    this.hearts.forEach((h,i)=>{
      const age=elapsed-this.lastCelebration-i*.13;
      const alive=age>=0&&age<1.25&&lively;
      h.visible=alive;if(!alive)return;
      h.position.set(Math.sin(i*2.4+age*1.9)*(.23+age*.24),.9+age*.82,Math.cos(i*1.8)*.22);
      const opacity=Math.min(1,age*5)*(1-age/1.25)*.88;
      (h.material as THREE.MeshBasicMaterial).opacity=opacity;
      h.scale.setScalar(.8+age*.4);
    });
  }
}
