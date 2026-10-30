import * as THREE from 'three';
import type {CameraMode} from './types';
import {art} from '../art/style';

/** One camera policy per location, no camera logic inside the location geometry. */
export class CameraRig {
  readonly perspective=new THREE.PerspectiveCamera(43,1,.1,150);
  readonly orthographic=new THREE.OrthographicCamera(-10,10,10,-10,.1,150);
  private mode:CameraMode='follow';
  private size=16;
  private target=new THREE.Vector3();
  get active():THREE.Camera{return this.mode==='follow'?this.perspective:this.orthographic;}
  switch(mode:CameraMode,focus:THREE.Vector3){
    this.mode=mode;this.target.copy(focus);
    this.perspective.position.copy(this.desired(focus,'follow'));
    this.orthographic.position.copy(this.desired(focus,'isometric'));
    this.active.lookAt(this.target.x,this.target.y+.65,this.target.z);
    this.resize(window.innerWidth,window.innerHeight);
  }
  zoom(d:number){if(this.mode==='isometric'){this.size=THREE.MathUtils.clamp(this.size+d,12,22);this.resize(window.innerWidth,window.innerHeight);}}
  resize(width:number,height:number){
    const aspect=Math.max(.5,width/Math.max(1,height));
    this.perspective.aspect=aspect;this.perspective.updateProjectionMatrix();
    // Preserve a legible small room in portrait rather than cropping the whole space.
    const horizontal=this.size*Math.max(1,aspect);
    const vertical=this.size*Math.max(1,1/aspect);
    this.orthographic.left=-horizontal/2;this.orthographic.right=horizontal/2;
    this.orthographic.top=vertical/2;this.orthographic.bottom=-vertical/2;
    this.orthographic.updateProjectionMatrix();
  }
  private desired(focus:THREE.Vector3,mode:CameraMode){
    return mode==='follow'
      ?new THREE.Vector3(focus.x+9.5,focus.y+11.9,focus.z+16.7)
      :new THREE.Vector3(11.7,15.6,17.3);
  }
  update(focus:THREE.Vector3,dt:number){
    const desiredTarget=this.mode==='follow'?focus:new THREE.Vector3(focus.x*.12,0,focus.z*.12);
    const factor=1-Math.exp(-art.animation.cameraDamping*dt);
    this.target.lerp(desiredTarget,factor);
    const cam=this.active;
    cam.position.lerp(this.desired(this.target,this.mode),factor);
    cam.lookAt(this.target.x,this.target.y+.68,this.target.z);
  }
}
