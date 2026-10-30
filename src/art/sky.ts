import * as THREE from 'three';
import {art} from './style';

/** Lightweight first-party sky gradient. No copied shaders, HDRI or external textures. */
export function makeSky(){
  const material=new THREE.ShaderMaterial({
    uniforms:{
      zenith:{value:new THREE.Color(art.skyZenith)},
      horizon:{value:new THREE.Color(art.skyHorizon)},
    },
    vertexShader:`
      varying vec3 vSphereDirection;
      void main(){
        vSphereDirection=normalize(position);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }
    `,
    fragmentShader:`
      varying vec3 vSphereDirection;
      uniform vec3 zenith;
      uniform vec3 horizon;
      void main(){
        float elevation=smoothstep(-0.12,0.78,vSphereDirection.y);
        vec3 skyColor=mix(horizon,zenith,elevation);
        gl_FragColor=vec4(skyColor,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    side:THREE.BackSide,depthWrite:false,depthTest:false,fog:false,
  });
  const sky=new THREE.Mesh(new THREE.SphereGeometry(155,32,16),material);
  sky.name='Soft blue-to-warm sky';
  sky.renderOrder=-1000;
  sky.frustumCulled=false;return sky;
}
