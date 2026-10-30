import * as THREE from 'three';
import type {CameraMode} from './types';
import {art} from '../art/style';

/** Fixed world-oriented outdoor follow camera: stable movement directions; indoor isometric retains its own framing. */
export class CameraRig {
  readonly perspective=new THREE.PerspectiveCamera(44,1,.1,175);
  readonly orthographic=new THREE.OrthographicCamera(-10,10,10,-10,.1,175);
  private mode:CameraMode='follow';
  private size=16;
  private target=new THREE.Vector3();
  get active():THREE.Camera{return this.mode==='follow'?this.perspective:this.orthographic;}
  switch(mode:CameraMode,focus:THREE.Vector3){
    this.mode=mode;this.target.copy(focus);
    this.perspective.position.copy(this.desired(focus,'follow'));
    this.orthographic.position.copy(this.desired(focus,'isometric'));
    this.active.lookAt(this.target.x,this.target.y+(this.mode==='isometric'?1.35:1.2),this.target.z);
    this.resize(window.innerWidth,window.innerHeight);
  }
  zoom(d:number){if(this.mode==='isometric'){this.size=THREE.MathUtils.clamp(this.size+d,12,22);this.resize(window.innerWidth,window.innerHeight);}}
  resize(width:number,height:number){
    const aspect=Math.max(.5,width/Math.max(1,height));
    this.perspective.aspect=aspect;this.perspective.updateProjectionMatrix();
    const horizontal=this.size*Math.max(1,aspect),vertical=this.size*Math.max(1,1/aspect);
    this.orthographic.left=-horizontal/2;this.orthographic.right=horizontal/2;
    this.orthographic.top=vertical/2;this.orthographic.bottom=-vertical/2;
    this.orthographic.updateProjectionMatrix();
  }
  private desired(focus:THREE.Vector3,mode:CameraMode){
    return mode==='follow'
      ?new THREE.Vector3(focus.x+5.6,focus.y+7.3,focus.z+12.8)
      :new THREE.Vector3(11.7,15.6,17.3);
  }
  update(focus:THREE.Vector3,dt:number,running=false){
    const desiredTarget=this.mode==='follow'?focus:new THREE.Vector3(focus.x*.12,0,focus.z*.12);
    const factor=1-Math.exp(-art.animation.cameraDamping*dt);
    this.target.lerp(desiredTarget,factor);
    const cam=this.active;cam.position.lerp(this.desired(this.target,this.mode),factor);
    if(this.mode==='follow'){
      const fov=running?49:44;
      this.perspective.fov=THREE.MathUtils.damp(this.perspective.fov,fov,2.6,dt);
      this.perspective.updateProjectionMatrix();
    }
    cam.lookAt(this.target.x,this.target.y+(this.mode==='isometric'?1.35:1.2),this.target.z);
  }
}
