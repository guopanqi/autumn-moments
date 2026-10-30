import * as THREE from 'three';
import {art} from '../art/style';
import {Character} from './character';
import {CameraRig} from './CameraRig';
import {findPath} from './navigation';
import {createPark} from '../locations/park';
import {createHome} from '../locations/home';
import type {Interaction,Location,PlaceId,Effect} from './types';

type SavedState={mood:number;coins:number;place:PlaceId};
const SAVE_KEY='autumn-moments:v1';
function load():SavedState{
  try{const raw=localStorage.getItem(SAVE_KEY);if(raw){const saved=JSON.parse(raw) as SavedState;
    if(typeof saved.mood==='number'&&typeof saved.coins==='number'&&(saved.place==='park'||saved.place==='home'))return saved;}}
  catch{/* Save data may be absent or incompatible. */}
  return {mood:70,coins:20,place:'park'};
}
function clamp(v:number,a:number,b:number){return Math.min(b,Math.max(a,v));}

export class World {
  readonly renderer:THREE.WebGLRenderer;
  readonly scene=new THREE.Scene();
  readonly actor=new Character();
  readonly camera=new CameraRig();
  private readonly raycaster=new THREE.Raycaster();
  private readonly pointer=new THREE.Vector2();
  private readonly places=new Map<PlaceId,Location>();
  private active!:Location;
  private hovered:Interaction|null=null;
  private readonly halo:THREE.Mesh;
  private readonly clock=new THREE.Clock();
  private elapsed=0;
  private saved=load();
  private keys=new Set<string>();
  private mobileKeys=new Set<string>();
  private toastTimer=0;
  private transitioning=false;
  private startTime=9*60+20;
  constructor(container:HTMLElement){
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    this.renderer.setSize(container.clientWidth,container.clientHeight);
    this.renderer.shadowMap.enabled=true;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=art.exposure;
    this.renderer.domElement.style.touchAction='none';container.appendChild(this.renderer.domElement);
    this.scene.background=new THREE.Color(art.sky);
    this.scene.fog=new THREE.Fog(art.fog,30,90);
    this.scene.add(new THREE.HemisphereLight('#f6fff5','#d3b891',2.15));
    const sun=new THREE.DirectionalLight('#fff1d2',3.1);
    sun.position.set(-8,18,12);sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048);
    sun.shadow.camera.left=-24;sun.shadow.camera.right=24;
    sun.shadow.camera.top=24;sun.shadow.camera.bottom=-24;
    sun.shadow.camera.near=.5;sun.shadow.camera.far=60;
    sun.shadow.bias=-.00012;sun.shadow.normalBias=.018;
    this.scene.add(sun);
    this.scene.add(this.actor.group);
    const ring=new THREE.Mesh(new THREE.RingGeometry(.57,.66,40),new THREE.MeshBasicMaterial({color:'#f2dfae',side:THREE.DoubleSide,transparent:true,opacity:.72,depthWrite:false}));
    ring.rotation.x=-Math.PI/2;ring.position.y=.065;ring.visible=false;this.scene.add(ring);this.halo=ring;
    this.places.set('park',createPark());this.places.set('home',createHome());
    this.switchPlace(this.saved.place);
    this.bindControls(container);
    window.addEventListener('resize',()=>this.resize(container));
    this.resize(container);
    this.renderHUD();
    requestAnimationFrame(this.frame);
  }
  private resize(container:HTMLElement){
    this.renderer.setSize(container.clientWidth,container.clientHeight);
    this.camera.resize(container.clientWidth,container.clientHeight);
  }
  switchPlace(id:PlaceId){
    if(this.active)this.scene.remove(this.active.root);
    this.active=this.places.get(id)!;
    this.scene.add(this.active.root);
    this.actor.teleport(this.active.spawn);
    this.camera.switch(this.active.camera,this.actor.position);
    this.saved.place=id;this.save();
    document.getElementById('place-name')!.textContent=this.active.name;
    document.getElementById('place-note')!.textContent=this.active.note;
    document.querySelectorAll<HTMLButtonElement>('.place-button').forEach(btn=>btn.classList.toggle('active',btn.id==='go-'+id));
    this.setHover(null);this.renderHUD();
  }
  private transitionTo(id:PlaceId){
    if(this.transitioning||id===this.active.id)return;
    this.transitioning=true;
    this.actor.cancel();
    this.setHover(null);
    const veil=document.getElementById('scene-wipe');
    veil?.classList.add('visible');
    window.setTimeout(()=>{
      this.switchPlace(id);
      window.setTimeout(()=>{
        veil?.classList.remove('visible');
        this.transitioning=false;
      },100);
    },270);
  }
  private bindControls(container:HTMLElement){
    window.addEventListener('keydown',(e)=>{
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
      this.keys.add(e.code);
    });
    window.addEventListener('keyup',(e)=>this.keys.delete(e.code));
    window.addEventListener('blur',()=>{this.keys.clear();this.mobileKeys.clear();});
    container.addEventListener('pointermove',(e)=>this.pick(e,false));
    container.addEventListener('pointerdown',(e)=>{if(e.button===0)this.pick(e,true);});
    container.addEventListener('pointerleave',()=>this.setHover(null));
    container.addEventListener('wheel',(e)=>{if(this.active.camera==='isometric'){e.preventDefault();this.camera.zoom(e.deltaY*.013);}}, {passive:false});
    document.getElementById('go-park')?.addEventListener('click',()=>this.transitionTo('park'));
    document.getElementById('go-home')?.addEventListener('click',()=>this.transitionTo('home'));
    document.querySelectorAll<HTMLButtonElement>('[data-move]').forEach(button=>{
      const dir=button.dataset.move!;
      const start=(e:PointerEvent)=>{e.preventDefault();button.setPointerCapture(e.pointerId);this.mobileKeys.add(dir);};
      const end=(e:PointerEvent)=>{e.preventDefault();this.mobileKeys.delete(dir);};
      button.addEventListener('pointerdown',start);
      button.addEventListener('pointerup',end);
      button.addEventListener('pointercancel',end);
      button.addEventListener('lostpointercapture',()=>this.mobileKeys.delete(dir));
    });
  }
  private setHover(hit:Interaction|null){
    this.hovered=hit;this.halo.visible=!!hit;
    if(hit){this.halo.position.x=hit.approach.x;this.halo.position.z=hit.approach.z;}
    const hint=document.getElementById('hint')!;
    hint.textContent=hit?'✦ '+hit.label:'';
    hint.classList.toggle('visible',!!hit);
    this.renderer.domElement.style.cursor=hit?'pointer':'crosshair';
  }
  private pick(e:PointerEvent,activate:boolean){
    if(this.transitioning)return;
    const bounds=this.renderer.domElement.getBoundingClientRect();
    this.pointer.set((e.clientX-bounds.left)/bounds.width*2-1,-(e.clientY-bounds.top)/bounds.height*2+1);
    this.raycaster.setFromCamera(this.pointer,this.camera.active);
    const roots=this.active.interactions.map(x=>x.root);
    const hits=this.raycaster.intersectObjects(roots,true);
    let hit:Interaction|null=null;
    if(hits.length){
      let current:THREE.Object3D|null=hits[0].object;
      while(current){hit=this.active.interactions.find(i=>i.root===current)??null;if(hit)break;current=current.parent;}
    }
    this.setHover(hit);
    if(!activate)return;
    if(hit){this.moveTo(hit.approach,()=>this.performInteraction(hit),hit.label);return;}
    const floorHits=this.raycaster.intersectObject(this.active.floor,false);
    if(floorHits.length)this.moveTo(floorHits[0].point,undefined,'那个位置');
  }
  private moveTo(point:THREE.Vector3,done?:()=>void,targetLabel='这里'){
    const b=this.active.bounds;
    const goal=new THREE.Vector3(clamp(point.x,b.minX,b.maxX),0,clamp(point.z,b.minZ,b.maxZ));
    const path=findPath(this.actor.position,goal,b,this.active.obstacles);
    if(path.length===0){
      if(this.actor.position.distanceTo(goal)<.6)done?.();
      else this.notify('暂时走不到'+targetLabel+'，试试从另一侧靠近。');
      return;
    }
    this.actor.follow(path,done);
  }
  private performInteraction(hit:Interaction){
    if(!this.active.interactions.includes(hit))return;
    const effect=hit.use();
    if(effect.travel){this.apply(effect);return;}
    // Walking, animation and gameplay effect have distinct lifecycles.
    this.actor.cancel();
    this.actor.faceTowards(hit.root.getWorldPosition(new THREE.Vector3()));
    const gesture=effect.gesture??'wave';
    hit.onActionStart?.();
    this.actor.act(gesture,()=>{
      hit.onMoment?.();
      this.apply(effect);
    },()=>hit.onActionEnd?.(),()=>hit.onActionEnd?.());
  }
  private apply(effect:Effect){
    if(effect.travel){this.transitionTo(effect.travel);return;}
    this.saved.mood=clamp(this.saved.mood+(effect.mood??0),0,100);
    this.saved.coins=Math.max(0,this.saved.coins+(effect.coins??0));
    this.notify(effect.message);this.save();this.renderHUD();this.chime();
  }
  private chime(){
    try{const Ctx=window.AudioContext;if(!Ctx)return;const ctx=new Ctx();
      const osc=ctx.createOscillator(),gain=ctx.createGain();
      osc.type='sine';osc.frequency.setValueAtTime(659,ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880,ctx.currentTime+.14);
      gain.gain.setValueAtTime(.035,ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.32);
      osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.33);
      void osc.onended;osc.addEventListener('ended',()=>void ctx.close());
    }catch{/* Audio must not break gameplay. */}
  }
  private notify(message:string){
    const el=document.getElementById('toast')!;el.textContent=message;el.classList.add('visible');this.toastTimer=4.4;
  }
  private save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(this.saved));}catch{/* Private browsing may block persistence. */}}
  private renderHUD(){
    document.getElementById('mood')!.textContent=String(this.saved.mood);
    document.getElementById('coins')!.textContent=String(this.saved.coins);
    const mins=Math.floor(this.startTime+this.elapsed*1.7);
    document.getElementById('time')!.textContent=`${String(Math.floor(mins/60)%24).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`;
  }
  private frame=()=>{
    const dt=Math.min(.05,this.clock.getDelta());this.elapsed+=dt;
    let x=0,z=0;
    if(this.keys.has('KeyA')||this.keys.has('ArrowLeft')||this.mobileKeys.has('left'))x-=1;
    if(this.keys.has('KeyD')||this.keys.has('ArrowRight')||this.mobileKeys.has('right'))x+=1;
    if(this.keys.has('KeyW')||this.keys.has('ArrowUp')||this.mobileKeys.has('up'))z-=1;
    if(this.keys.has('KeyS')||this.keys.has('ArrowDown')||this.mobileKeys.has('down'))z+=1;
    let moved=false;
    if(!this.transitioning&&(x!==0||z!==0)){
      this.actor.cancel();
      const l=Math.hypot(x,z),dir=new THREE.Vector3(x/l,0,z/l);
      const next=this.actor.position.clone().addScaledVector(dir,art.animation.walkSpeed*dt);
      const b=this.active.bounds;
      next.x=clamp(next.x,b.minX,b.maxX);next.z=clamp(next.z,b.minZ,b.maxZ);
      const blocked=this.active.obstacles.some(o=>(next.x-o.x)**2+(next.z-o.z)**2<(o.r+.25)**2);
      if(!blocked){this.actor.position.copy(next);moved=true;}
      const facing=Math.atan2(dir.x,dir.z);
      const diff=Math.atan2(Math.sin(facing-this.actor.group.rotation.y),Math.cos(facing-this.actor.group.rotation.y));
      this.actor.group.rotation.y+=diff*Math.min(1,dt*12);
    }
    this.actor.update(dt,this.elapsed,moved);
    this.active.tick(this.elapsed,dt,this.actor.position);
    this.camera.update(this.actor.position,dt);
    this.renderer.render(this.scene,this.camera.active);
    if(this.toastTimer>0){this.toastTimer-=dt;if(this.toastTimer<=0)document.getElementById('toast')?.classList.remove('visible');}
    if(Math.floor(this.elapsed*3)%3===0)this.renderHUD();
    requestAnimationFrame(this.frame);
  };
}
