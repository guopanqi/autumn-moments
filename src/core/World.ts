import * as THREE from 'three';
import {art} from '../art/style';
import {makeSky} from '../art/sky';
import {Character} from './character';
import {CameraRig} from './CameraRig';
import {findPath} from './navigation';
import {createPark} from '../locations/park';
import {createHome} from '../locations/home';
import type {Interaction,Location,PlaceId,Effect} from './types';
import {validFurniture,isFurnitureKind,FURNITURE_KINDS,FURNITURE_PRICES,FURNITURE_LABELS,normalizeOwned,ownedForExisting,
  type FurnitureOwned,type FurnitureKind,type PlacedFurniture} from '../decor/furniture';

type SavedState={mood:number;coins:number;place:PlaceId;furniture:PlacedFurniture[];owned:FurnitureOwned;dogBond:number};
const SAVE_KEY='autumn-moments:v3';
function load():SavedState{
  try{
    const raw=localStorage.getItem(SAVE_KEY)??localStorage.getItem('autumn-moments:v2')??localStorage.getItem('autumn-moments:v1');
    if(raw){
      const saved=JSON.parse(raw) as Partial<SavedState>;
      if(Number.isFinite(saved.mood)&&Number.isFinite(saved.coins)&&(saved.place==='park'||saved.place==='home')){
        const furniture=Array.isArray(saved.furniture)?saved.furniture.filter(validFurniture).slice(0,35):[];
        return {mood:clamp(saved.mood!,0,100),coins:Math.max(0,Math.floor(saved.coins!)),place:saved.place,
          furniture,owned:normalizeOwned(saved.owned,furniture),dogBond:Number.isFinite(saved.dogBond)?clamp(Math.floor(saved.dogBond!),0,5):0};
      }
    }
  }catch{/* Save data may be absent or incompatible. */}
  return {mood:70,coins:20,place:'park',furniture:[],owned:ownedForExisting([]),dogBond:0};
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
  private lastPointerHover:{x:number;y:number;at:number}|null=null;
  private readonly halo:THREE.Mesh;
  private readonly clock=new THREE.Clock();
  private elapsed=0;
  private saved=load();
  private keys=new Set<string>();
  private mobileKeys=new Set<string>();
  private toastTimer=0;
  private transitioning=false;
  private startTime=9*60+20;
  private sunlight!:THREE.DirectionalLight;
  private skyDome!:THREE.Mesh;
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
    this.scene.background=new THREE.Color(art.skyHorizon);
    this.skyDome=makeSky();this.scene.add(this.skyDome);
    this.scene.fog=new THREE.Fog(art.fog,55,140);
    this.scene.add(new THREE.HemisphereLight('#f6fff5','#d3b891',art.lightAmbient));
    const sun=new THREE.DirectionalLight('#fff1d2',art.lightSun);
    sun.position.set(-8,18,12);sun.castShadow=true;
    sun.shadow.mapSize.set(1024,1024);
    sun.shadow.camera.left=-19;sun.shadow.camera.right=19;
    sun.shadow.camera.top=19;sun.shadow.camera.bottom=-19;
    sun.shadow.camera.near=.5;sun.shadow.camera.far=60;
    sun.shadow.bias=-.00012;sun.shadow.normalBias=.018;
    this.scene.add(sun,sun.target);this.sunlight=sun;
    this.scene.add(this.actor.group);
    const ring=new THREE.Mesh(new THREE.RingGeometry(.57,.66,40),new THREE.MeshBasicMaterial({color:'#f2dfae',side:THREE.DoubleSide,transparent:true,opacity:.72,depthWrite:false}));
    ring.rotation.x=-Math.PI/2;ring.position.y=.065;ring.visible=false;this.scene.add(ring);this.halo=ring;
    this.places.set('park',createPark(this.saved.dogBond,bond=>{
      this.saved.dogBond=bond;this.save();
    }));
    this.places.set('home',createHome(this.saved.furniture,items=>{
      this.saved.furniture=items;this.save();this.renderCatalog();
    },kind=>this.available(kind)>0));
    // Reject spatially invalid legacy furniture without losing ownership of valid pieces.
    const accepted=this.places.get('home')!.decoration!.placed.map(p=>({...p}));
    this.saved.furniture=accepted;
    this.saved.owned=normalizeOwned(this.saved.owned,accepted);
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
    if(this.active){this.active.decoration?.clearSelection();this.scene.remove(this.active.root);}
    this.active=this.places.get(id)!;
    this.scene.add(this.active.root);
    this.actor.teleport(this.active.spawn);
    this.camera.switch(this.active.camera,this.actor.position);
    this.saved.place=id;this.save();
    document.getElementById('place-name')!.textContent=this.active.name;
    document.getElementById('place-note')!.textContent=this.active.note;
    document.querySelectorAll<HTMLButtonElement>('.place-button').forEach(btn=>btn.classList.toggle('active',btn.id==='go-'+id));
    this.closeFurniturePanel();
    const toggle=document.getElementById('decor-toggle');if(toggle)toggle.hidden=id!=='home';
    this.setHover(null);this.renderHUD();this.renderCatalog();
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
      const decor=this.active.decoration;
      const panel=document.getElementById('decor-panel');
      if(decor&&panel&&!panel.hidden){
        if(e.code==='Escape'){e.preventDefault();if(decor.isPlacing)this.cancelFurniture();else{decor.select(null);this.updateFurnitureHint('点击已经摆放的家具来选择它。');}return;}
        if(e.code==='KeyR'){e.preventDefault();if(decor.isPlacing)decor.rotate();else if(decor.rotateSelected())this.updateFurnitureHint('已旋转选中的家具。');return;}
        if(e.code==='Delete'||e.code==='Backspace'){e.preventDefault();if(decor.removeSelected())this.updateFurnitureHint('已移除家具，可以撤销。');return;}
      }
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
    document.getElementById('decor-toggle')?.addEventListener('click',()=>{
      const panel=document.getElementById('decor-panel');
      if(panel&&this.active.id==='home'){
        panel.hidden=false;
        const toggle=document.getElementById('decor-toggle');if(toggle)toggle.hidden=true;
      }
    });
    document.getElementById('decor-close')?.addEventListener('click',()=>this.closeFurniturePanel());
    document.querySelectorAll<HTMLButtonElement>('[data-furniture]').forEach(btn=>btn.addEventListener('click',()=>{
      const kind=btn.dataset.furniture;
      if(this.active.decoration&&isFurnitureKind(kind)){
        if(!this.active.decoration.begin(kind)){this.notify('这件家具没有可用库存，请先购买。');return;}
        this.updateFurnitureHint('移动鼠标选择空地，点击摆放。按 R 旋转。');
        this.actor.cancel();this.setHover(null);
      }
    }));
    document.querySelectorAll<HTMLButtonElement>('[data-buy]').forEach(btn=>btn.addEventListener('click',()=>{
      const kind=btn.dataset.buy;if(isFurnitureKind(kind))this.buyFurniture(kind);
    }));
    document.getElementById('decor-rotate')?.addEventListener('click',()=>{
      const decor=this.active.decoration;
      if(decor?.isPlacing)decor.rotate();else if(decor?.rotateSelected())this.updateFurnitureHint('已旋转选中的家具。');
      else this.updateFurnitureHint('先点击一件已摆放的家具，再旋转。');
    });
    document.getElementById('decor-move')?.addEventListener('click',()=>{
      if(this.active.decoration?.beginMove())this.updateFurnitureHint('点击新的地面位置完成移动；按 R 旋转，Esc 取消。');
      else this.updateFurnitureHint('先点击一件已摆放的家具。');
    });
    document.getElementById('decor-remove')?.addEventListener('click',()=>{
      const result=this.active.decoration?.removeSelected();
      this.notify(result?'家具已收起，可以撤销。':'请先点击一件家具。');
      if(result)this.updateFurnitureHint('家具已移除，可以撤销或重做。');
    });
    document.getElementById('decor-cancel')?.addEventListener('click',()=>this.cancelFurniture());
    document.getElementById('decor-undo')?.addEventListener('click',()=>{
      const result=this.active.decoration?.undo();this.notify(result?'已撤销上一步布置。':'暂时没有可以撤销的操作。');
    });
    document.getElementById('decor-redo')?.addEventListener('click',()=>{
      const result=this.active.decoration?.redo();this.notify(result?'已恢复上一步布置。':'暂时没有可以重做的操作。');
    });
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
  private available(kind:FurnitureKind){
    const placed=this.places.get('home')?.decoration?.placed.filter(p=>p.kind===kind).length??0;
    return Math.max(0,this.saved.owned[kind]-placed);
  }
  private renderCatalog(){
    for(const kind of FURNITURE_KINDS){
      const stock=this.available(kind),price=FURNITURE_PRICES[kind];
      const place=document.querySelector<HTMLButtonElement>(`[data-furniture="${kind}"]`);
      if(place){place.disabled=stock===0;const count=place.querySelector<HTMLElement>('[data-stock]');
        if(count)count.textContent=`可摆 ${stock}`;}
      const buy=document.querySelector<HTMLButtonElement>(`[data-buy="${kind}"]`);
      if(buy)buy.disabled=this.saved.coins<price||Object.values(this.saved.owned).reduce((a,b)=>a+b,0)>=35;
    }
  }
  private buyFurniture(kind:FurnitureKind){
    if(this.active.id!=='home')return;
    const cost=FURNITURE_PRICES[kind];
    if(this.saved.coins<cost){this.notify('金币不够。去公园帮忙整理花坛可以赚取报酬。');return;}
    if(Object.values(this.saved.owned).reduce((a,b)=>a+b,0)>=35){this.notify('家具库存已经满了。');return;}
    this.saved.coins-=cost;this.saved.owned[kind]++;
    this.save();this.renderHUD();this.renderCatalog();
    this.notify(`买到了${FURNITURE_LABELS[kind]}，花费 ${cost} 金币。点击「摆放」布置房间。`);
  }
  private closeFurniturePanel(){
    this.active.decoration?.clearSelection();this.updateFurnitureHint('点击已放置的家具选择；也可以添加新的家具。');
    const panel=document.getElementById('decor-panel');if(panel)panel.hidden=true;
    const toggle=document.getElementById('decor-toggle');if(toggle)toggle.hidden=this.active.id!=='home';
  }
  private updateFurnitureHint(message:string){const text=document.getElementById('decor-status');if(text)text.textContent=message;}
  private cancelFurniture(){this.active.decoration?.cancel();this.updateFurnitureHint('点击已摆放的家具可继续调整，或者选择新的家具。');}
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
    const decor=this.active.decoration;
    if(decor?.isPlacing){
      const floor=this.raycaster.intersectObject(this.active.floor,false)[0];
      if(floor){
        decor.hover(floor.point,this.actor.position);
        if(activate){
          const result=decor.place(this.actor.position);
          this.notify(result.message);
          if(result.ok)this.updateFurnitureHint('摆好了！可以再选择一件家具。');
        }
      }
      return;
    }
    const panel=document.getElementById('decor-panel');
    if(activate&&decor&&panel&&!panel.hidden&&decor.pick(this.raycaster)){
      if(activate){this.actor.cancel();this.setHover(null);this.updateFurnitureHint('已选中家具：可移动、旋转或收起。');}
      return;
    }
    if(activate&&decor&&panel&&!panel.hidden){decor.select(null);this.updateFurnitureHint('点击家具来选择它，或选择新品摆放。');}
    const roots=this.active.interactions.map(x=>x.root);
    const hits=this.raycaster.intersectObjects(roots,true);
    let hit:Interaction|null=null;
    if(hits.length){
      let current:THREE.Object3D|null=hits[0].object;
      while(current){hit=this.active.interactions.find(i=>i.root===current)??null;if(hit)break;current=current.parent;}
    }
    // A moving small animal and a smoothing camera can drift under a stationary
    // cursor between hover and pointerdown. Honor the just-seen target at the
    // same screen coordinate for a brief grace period.
    if(activate&&!hit&&this.hovered&&this.lastPointerHover&&
      performance.now()-this.lastPointerHover.at<850&&
      Math.hypot(e.clientX-this.lastPointerHover.x,e.clientY-this.lastPointerHover.y)<18){
      hit=this.hovered;
    }
    this.setHover(hit);
    if(!activate){
      this.lastPointerHover=hit?{x:e.clientX,y:e.clientY,at:performance.now()}:null;
      return;
    }
    this.lastPointerHover=null;
    if(hit){hit.onTargeted?.();this.moveTo(hit.approach.clone(),()=>this.performInteraction(hit),hit.label,false,()=>hit.onActionEnd?.());return;}
    const floorHits=this.raycaster.intersectObject(this.active.floor,false);
    if(floorHits.length)this.moveTo(floorHits[0].point,undefined,'那个位置',e.detail>=2);
  }
  private moveTo(point:THREE.Vector3,done?:()=>void,targetLabel='这里',run=false,onCancel?:()=>void){
    const b=this.active.bounds;
    const goal=new THREE.Vector3(clamp(point.x,b.minX,b.maxX),0,clamp(point.z,b.minZ,b.maxZ));
    const path=findPath(this.actor.position,goal,b,this.active.obstacles);
    if(path.length===0){
      if(this.actor.position.distanceTo(goal)<.6)done?.();
      else {onCancel?.();this.notify('暂时走不到'+targetLabel+'，试试从另一侧靠近。');}
      return;
    }
    this.actor.follow(path,done,run,onCancel);
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
    this.notify(effect.message);this.save();this.renderHUD();this.renderCatalog();this.chime();
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
    // A slow WebGL renderer must not slow down the simulation; advance in safe
    // <=50ms collision substeps while drawing only once for this display frame.
    const realDt=Math.min(.25,this.clock.getDelta());
    const steps=Math.max(1,Math.ceil(realDt/.05));
    const dt=realDt/steps;
    for(let step=0;step<steps;step++){
    this.elapsed+=dt;
    let x=0,z=0;
    if(this.keys.has('KeyA')||this.keys.has('ArrowLeft')||this.mobileKeys.has('left'))x-=1;
    if(this.keys.has('KeyD')||this.keys.has('ArrowRight')||this.mobileKeys.has('right'))x+=1;
    if(this.keys.has('KeyW')||this.keys.has('ArrowUp')||this.mobileKeys.has('up'))z-=1;
    if(this.keys.has('KeyS')||this.keys.has('ArrowDown')||this.mobileKeys.has('down'))z+=1;
    let moved=false;
    const running=this.active.id==='park'&&(this.keys.has('ShiftLeft')||this.keys.has('ShiftRight')||this.mobileKeys.has('run'));
    if(!this.transitioning&&(x!==0||z!==0)){
      this.actor.cancel();
      const l=Math.hypot(x,z),dir=new THREE.Vector3(x/l,0,z/l);
      const next=this.actor.position.clone().addScaledVector(dir,(running?art.animation.runSpeed:art.animation.walkSpeed)*dt);
      const b=this.active.bounds;
      next.x=clamp(next.x,b.minX,b.maxX);next.z=clamp(next.z,b.minZ,b.maxZ);
      const blocked=this.active.obstacles.some(o=>(next.x-o.x)**2+(next.z-o.z)**2<(o.r+.25)**2);
      if(!blocked){this.actor.position.copy(next);moved=true;}
      const facing=Math.atan2(dir.x,dir.z);
      const diff=Math.atan2(Math.sin(facing-this.actor.group.rotation.y),Math.cos(facing-this.actor.group.rotation.y));
      this.actor.group.rotation.y+=diff*(1-Math.exp(-art.animation.turnDamping*dt));
    }
    this.actor.update(dt,this.elapsed,moved,running);
    this.active.tick(this.elapsed,dt,this.actor.position);
    this.camera.update(this.actor.position,dt,running||this.actor.isRunning);
    }
    // Shadow detail follows the actor over a larger neighborhood without a giant shadow map.
    const px=Math.round(this.actor.position.x*2)/2,pz=Math.round(this.actor.position.z*2)/2;
    this.sunlight.target.position.set(px,0,pz);
    this.sunlight.position.set(px-10,21,pz+12);
    this.skyDome.position.copy(this.camera.active.position);
    this.renderer.render(this.scene,this.camera.active);
    if(this.toastTimer>0){this.toastTimer-=realDt;if(this.toastTimer<=0)document.getElementById('toast')?.classList.remove('visible');}
    if(Math.floor(this.elapsed*3)%3===0)this.renderHUD();
    requestAnimationFrame(this.frame);
  };
}
