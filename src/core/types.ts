import type * as THREE from 'three';
export type PlaceId = 'park' | 'home';
export type CameraMode = 'follow' | 'isometric';
export type Obstacle = { x:number; z:number; r:number };
export type Bounds = { minX:number;maxX:number;minZ:number;maxZ:number };
export type Effect = { message:string; mood?:number; coins?:number; gesture?:'wave'|'sip'|'sit'; travel?:PlaceId };
export interface Interaction {
  id:string; label:string; root:THREE.Object3D; approach:THREE.Vector3;
  use:()=>Effect;
}
export interface Location {
  id:PlaceId; name:string; note:string; root:THREE.Group;
  floor:THREE.Object3D; bounds:Bounds; obstacles:Obstacle[];
  spawn:THREE.Vector3; camera:CameraMode;
  interactions:Interaction[];
  tick:(elapsed:number,dt:number)=>void;
}
