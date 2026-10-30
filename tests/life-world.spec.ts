import {test,expect} from '@playwright/test';

test('outdoor and home remain playable; furniture persists',async({page},testInfo)=>{
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('./?e2e=1');
  await expect(page.locator('#loading')).toHaveClass(/hidden/,{timeout:15_000});
  // The overlay has a CSS fade: a hidden class alone is not a scene screenshot.
  await expect(page.locator('#loading')).toBeHidden();
  await expect(page.locator('#viewport canvas')).toBeVisible();
  await expect(page.locator('#place-name')).toHaveText('街角的小公园');
  await page.screenshot({path:testInfo.outputPath('park.png')});

  await page.locator('#go-home').click();
  await expect(page.locator('#place-name')).toHaveText('午后的小屋',{timeout:10_000});
  await expect(page.locator('#decor-toggle')).toBeVisible();
  await expect(page.locator('#decor-panel')).toBeHidden();
  await page.screenshot({path:testInfo.outputPath('home.png')});
  await page.locator('#decor-toggle').click();
  await expect(page.locator('#decor-panel')).toBeVisible();

  await page.locator('[data-buy="plant"]').click();
  await expect(page.locator('[data-furniture="plant"]')).toBeEnabled();
  await page.locator('[data-furniture="plant"]').click();
  await page.keyboard.press('r');
  const point=await page.evaluate(()=>{
    const w=(window as Window & {__autumnDev?:any}).__autumnDev;
    if(!w)throw new Error('Test world introspection is unavailable');
    const canvas=document.querySelector<HTMLCanvasElement>('#viewport canvas')!;
    const v=w.actor.position.clone().set(-2.5,0,2.8);
    w.camera.active.updateMatrixWorld();v.project(w.camera.active);
    const rect=canvas.getBoundingClientRect();
    return {x:rect.left+(v.x+1)*rect.width/2,y:rect.top+(1-v.y)*rect.height/2};
  });
  await page.mouse.move(point.x,point.y);
  await page.mouse.click(point.x,point.y);
  await expect.poll(async()=>page.evaluate(()=>JSON.parse(localStorage.getItem('autumn-moments:v3')??'{}').furniture?.length)).toBe(1);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('autumn-moments:v3')!));
  expect(saved.furniture[0].kind).toBe('plant');
  expect(saved.furniture[0].rotation).toBeCloseTo(Math.PI/2);
  await page.screenshot({path:testInfo.outputPath('decorated-home.png')});

  await page.reload();
  await expect(page.locator('#place-name')).toHaveText('午后的小屋');
  await expect.poll(async()=>page.evaluate(()=>JSON.parse(localStorage.getItem('autumn-moments:v3')??'{}').furniture?.length)).toBe(1);
  await page.locator('#decor-toggle').click();
  // Undo/redo history is deliberately session-scoped. Refresh must keep the committed room.
  await page.locator('#decor-undo').click();
  await expect.poll(async()=>page.evaluate(()=>JSON.parse(localStorage.getItem('autumn-moments:v3')??'{}').furniture?.length)).toBe(1);
  await page.locator('#go-park').click();
  await expect(page.locator('#place-name')).toHaveText('街角的小公园');
  expect(errors).toEqual([]);
});

test('placed furniture can be selected, moved, rotated, removed, undone and redone',async({page},testInfo)=>{
  const errors:string[]=[];
  page.on('pageerror',err=>errors.push(err.message));
  await page.goto('./?e2e=1');
  await expect(page.locator('#loading')).toHaveClass(/hidden/,{timeout:15_000});
  await page.locator('#go-home').click();
  await expect(page.locator('#place-name')).toHaveText('午后的小屋');
  await page.locator('#decor-toggle').click();
  await page.locator('[data-buy="plant"]').click();
  await page.locator('[data-furniture="plant"]').click();
  const screenPoint=async(x:number,y:number,z:number)=>page.evaluate(({x,y,z})=>{
    const w=(window as Window & {__autumnDev?:any}).__autumnDev;
    const canvas=document.querySelector<HTMLCanvasElement>('#viewport canvas')!;
    const v=w.actor.position.clone().set(x,y,z);
    w.camera.active.updateMatrixWorld();v.project(w.camera.active);
    const rect=canvas.getBoundingClientRect();
    return {x:rect.left+(v.x+1)*rect.width/2,y:rect.top+(1-v.y)*rect.height/2};
  },{x,y,z});
  const first=await screenPoint(-2.5,0,2.8);
  await page.mouse.move(first.x,first.y);
  await page.mouse.click(first.x,first.y);
  const furniture=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('autumn-moments:v3')??'{}').furniture);
  await expect.poll(async()=>(await furniture())?.length).toBe(1);
  const item=(await furniture())[0];
  const center=await screenPoint(item.x,.85,item.z);
  await page.mouse.click(center.x,center.y);
  await expect(page.locator('#decor-status')).toContainText('已选中家具');
  await page.locator('#decor-move').click();
  await page.keyboard.press('r');
  const second=await screenPoint(-3.5,0,3.65);
  await page.mouse.move(second.x,second.y);
  await page.mouse.click(second.x,second.y);
  await expect.poll(async()=>Math.abs((await furniture())[0]?.x-(-3.5))).toBeLessThan(.17);
  const moved=(await furniture())[0];
  expect(moved.id).toBe(item.id);
  expect(moved.rotation).toBeCloseTo(Math.PI/2);
  await page.screenshot({path:testInfo.outputPath('edited-home.png')});
  await page.locator('#decor-undo').click();
  await expect.poll(async()=>Math.abs((await furniture())[0]?.x-item.x)).toBeLessThan(.17);
  await page.locator('#decor-redo').click();
  await expect.poll(async()=>Math.abs((await furniture())[0]?.x-(-3.5))).toBeLessThan(.17);
  await page.reload();
  await expect(page.locator('#place-name')).toHaveText('午后的小屋');
  expect((await furniture())[0].id).toBe(item.id);
  await page.locator('#decor-toggle').click();
  const target=await screenPoint(-3.5,.86,3.65);
  await page.mouse.click(target.x,target.y);
  await expect(page.locator('#decor-status')).toContainText('已选中家具');
  await page.locator('#decor-remove').click();
  await expect.poll(async()=>(await furniture()).length).toBe(0);
  await page.locator('#decor-undo').click();
  await expect.poll(async()=>(await furniture()).length).toBe(1);
  await page.locator('#decor-redo').click();
  await expect.poll(async()=>(await furniture()).length).toBe(0);
  expect(errors).toEqual([]);
});


// V0.5 complete earn > buy > place loop, using actual scene click and persisted save.
test('paid park action funds a lamp, which remains owned through placement, removal and reload',async({page},testInfo)=>{
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./?e2e=1');
  await expect(page.locator('#loading')).toHaveClass(/hidden/,{timeout:15_000});
  // CSS fade delays visibility:hidden: pointer events must reach the canvas, not the loader.
  await expect(page.locator('#loading')).toBeHidden();
  const save=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('autumn-moments:v3')??'{}'));
  const point=async(x:number,y:number,z:number)=>page.evaluate(({x,y,z})=>{
    const w=(window as Window & {__autumnDev?:any}).__autumnDev;
    const v=w.actor.position.clone().set(x,y,z);
    w.camera.active.updateMatrixWorld();v.project(w.camera.active);
    const box=document.querySelector<HTMLCanvasElement>('#viewport canvas')!.getBoundingClientRect();
    return {x:box.left+(v.x+1)*box.width/2,y:box.top+(1-v.y)*box.height/2};
  },{x,y,z});
  const work=await point(-2.75,1.63,2.55);
  await page.mouse.move(work.x,work.y);
  await expect(page.locator('#hint')).toContainText('整理花坛');
  // Interrupt the trip to the job: an uncompleted action must never pay wages.
  await page.mouse.click(work.x,work.y);
  await page.keyboard.down('KeyA');
  await page.waitForTimeout(150);
  await page.keyboard.up('KeyA');
  expect((await save()).coins).toBe(20);
  const retry=await point(-2.75,1.63,2.55);
  await page.mouse.move(retry.x,retry.y);
  await page.mouse.click(retry.x,retry.y);
  await expect.poll(async()=>(await save()).coins,{timeout:20000}).toBe(32);
  expect((await save()).mood).toBe(68);
  await page.locator('#go-home').click();
  await expect(page.locator('#place-name')).toHaveText('午后的小屋');
  await page.locator('#decor-toggle').click();
  await expect(page.locator('[data-buy="lamp"]')).toBeEnabled();
  await page.locator('[data-buy="lamp"]').click();
  expect((await save()).coins).toBe(0);
  expect((await save()).owned.lamp).toBe(1);
  await expect(page.locator('[data-buy="lamp"]')).toBeDisabled();
  await page.locator('[data-furniture="lamp"]').click();
  const spot=await point(-2.5,0,2.8);
  await page.mouse.move(spot.x,spot.y);await page.mouse.click(spot.x,spot.y);
  await expect.poll(async()=>(await save()).furniture.length).toBe(1);
  expect((await save()).owned.lamp).toBe(1);
  await expect(page.locator('[data-furniture="lamp"]')).toBeDisabled();
  await page.screenshot({path:testInfo.outputPath('paid-lamp-in-home.png')});
  await page.reload();
  await expect(page.locator('#place-name')).toHaveText('午后的小屋');
  const loaded=await save();
  expect(loaded.coins).toBe(0);
  expect(loaded.owned.lamp).toBe(1);
  expect(loaded.furniture).toHaveLength(1);
  await page.locator('#decor-toggle').click();
  const lamp=loaded.furniture[0];
  const target=await point(lamp.x,1.5,lamp.z);
  await page.mouse.click(target.x,target.y);
  await expect(page.locator('#decor-status')).toContainText('已选中家具');
  await page.locator('#decor-remove').click();
  await expect.poll(async()=>(await save()).furniture.length).toBe(0);
  await expect(page.locator('[data-furniture="lamp"]')).toBeEnabled();
  await page.locator('#decor-undo').click();
  await expect.poll(async()=>(await save()).furniture.length).toBe(1);
  await expect(page.locator('[data-furniture="lamp"]')).toBeDisabled();
  await page.locator('#decor-redo').click();
  await expect.poll(async()=>(await save()).furniture.length).toBe(0);
  await page.reload();
  await page.locator('#decor-toggle').click();
  expect((await save()).owned.lamp).toBe(1);
  expect((await save()).coins).toBe(0);
  await expect(page.locator('[data-furniture="lamp"]')).toBeEnabled();
  expect(errors).toEqual([]);
});

test('v2 furniture migration retains owned copies, prevents free duplicates and preserves money',async({page})=>{
  await page.goto('./?e2e=1');
  await page.evaluate(()=>{
    localStorage.removeItem('autumn-moments:v3');
    localStorage.setItem('autumn-moments:v2',JSON.stringify({
      mood:74,coins:5,place:'home',
      furniture:[{id:'legacy-plant',kind:'plant',x:-2.5,z:2.8,rotation:0}]
    }));
  });
  await page.reload();
  await expect(page.locator('#place-name')).toHaveText('午后的小屋');
  const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('autumn-moments:v3')??'{}'));
  const restored=await read();
  expect(restored.coins).toBe(5);expect(restored.mood).toBe(74);
  expect(restored.owned.plant).toBe(1);
  expect(restored.furniture).toHaveLength(1);
  await page.locator('#decor-toggle').click();
  await expect(page.locator('[data-furniture="plant"]')).toBeDisabled();
  await expect(page.locator('[data-buy="plant"]')).toBeDisabled();
  // An unaffordable purchase must not mutate the wallet or inventory.
  expect((await read()).coins).toBe(5);
  expect((await read()).owned.plant).toBe(1);
});


test('path-facing is simplified and running travels faster for the same simulated time',async({page})=>{
 await page.goto('./?e2e=1');await expect(page.locator('#loading')).toBeHidden({timeout:15000});
 const metrics=await page.evaluate(()=>{
   const w=(window as Window&{__autumnDev?:any}).__autumnDev;
   const start=w.active.spawn.clone();
   const destination=start.clone().add({x:30,y:0,z:0});
   const traverse=(run:boolean)=>{
     w.actor.teleport(start);
     w.actor.follow([destination],undefined,run);
     for(let i=0;i<18;i++)w.actor.update(1/60,i/60);
     return w.actor.position.x-start.x;
   };
   const walked=traverse(false),ran=traverse(true);
   w.actor.teleport(start);
   w.moveTo(start.clone().set(3.5,0,6.5));
   return {walked,ran,waypoints:w.actor.path.length};
 });
 expect(metrics.ran).toBeGreaterThan(metrics.walked*1.5);
 expect(metrics.waypoints).toBe(1);
 await page.keyboard.down('ShiftLeft');
 const pressed=await page.evaluate(()=>{const w=(window as Window&{__autumnDev?:any}).__autumnDev;return w.keys.has('ShiftLeft');});
 expect(pressed).toBe(true);
 await page.keyboard.up('ShiftLeft');
});

test('neighborhood extends beyond the first park and retains navigable outdoor paths',async({page},testInfo)=>{
  await page.goto('./?e2e=1');await expect(page.locator('#loading')).toBeHidden({timeout:15000});
  const info=await page.evaluate(()=>{
    const w=(window as Window&{__autumnDev?:any}).__autumnDev;
    const park=w.places.get('park');
    const bounds=park.bounds;
    const instanced=park.root.getObjectByName('Neighborhood · winding walks, meadow, water and houses');
    return {bounds,hasOutskirts:!!instanced,landmarks:park.interactions.map((i:any)=>i.id)};
  });
  expect(info.bounds.maxX-info.bounds.minX).toBeGreaterThan(65);
  expect(info.bounds.maxZ-info.bounds.minZ).toBeGreaterThan(60);
  expect(info.hasOutskirts).toBe(true);
  expect(info.landmarks).toContain('park-view');expect(info.landmarks).toContain('park-garden');
  const result=await page.evaluate(()=>{
    const w=(window as Window&{__autumnDev?:any}).__autumnDev;
    w.moveTo(w.actor.position.clone().set(20,0,16));
    return {waypoints:w.actor.path.length,moving:w.actor.isMoving};
  });
  expect(result.moving).toBe(true);
  expect(result.waypoints).toBeLessThan(30);
  await page.waitForTimeout(2200);
  const moved=await page.evaluate(()=>{const w=(window as Window&{__autumnDev?:any}).__autumnDev;
    return {x:w.actor.position.x,z:w.actor.position.z};});
  await page.screenshot({path:testInfo.outputPath('expanded-neighborhood.png')});
  expect(Math.hypot(moved.x+.4,moved.z-4.6)).toBeGreaterThan(1.0);
});


test('park puppy has autonomous bounded movement and recognizes a returning player',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./?e2e=1');
  await expect(page.locator('#loading')).toBeHidden({timeout:15_000});
  const ambient=await page.evaluate(()=>{
    const w=(window as Window&{__autumnDev?:any}).__autumnDev;
    const park=w.places.get('park'),dog=park.root.getObjectByName('Park puppy');
    if(!dog)throw new Error('Missing puppy');
    const initial=dog.position.clone(),far=w.actor.position.clone().set(15,0,15);
    let maxDistance=0;
    for(let i=0;i<440;i++){
      park.tick(4+i/20,1/20,far);
      maxDistance=Math.max(maxDistance,dog.position.distanceTo(initial));
    }
    return {maxDistance,homeDistance:dog.position.distanceTo(initial),approach:park.interactions.find((i:any)=>i.id==='park-dog').approach.clone(),pos:dog.position.clone()};
  });
  expect(ambient.maxDistance).toBeGreaterThan(.3);
  expect(ambient.homeDistance).toBeLessThan(3.3);
  expect(Math.abs(ambient.approach.x-(ambient.pos.x-.7))).toBeLessThan(.01);
  await page.evaluate(()=>{
    const saved=JSON.parse(localStorage.getItem('autumn-moments:v3')!);
    saved.dogBond=4;localStorage.setItem('autumn-moments:v3',JSON.stringify(saved));
  });
  await page.reload();
  await expect(page.locator('#loading')).toBeHidden({timeout:15_000});
  const greeting=await page.evaluate(()=>{
    const w=(window as Window&{__autumnDev?:any}).__autumnDev;
    const park=w.places.get('park'),dog=park.root.getObjectByName('Park puppy');
    // On page reload an already-friendly dog may have greeted the player before
    // this test begins. Reset its start pose to exercise the approach itself.
    dog.position.set(2.1,0,2.2);
    const person=w.actor.position.clone().set(.1,0,4.1);
    const before=dog.position.distanceTo(person);
    for(let i=0;i<95;i++)park.tick(4+i/20,1/20,person);
    return {before,after:dog.position.distanceTo(person),label:park.interactions.find((i:any)=>i.id==='park-dog').label};
  });
  expect(greeting.after).toBeLessThan(greeting.before-.4);
  expect(greeting.label).toContain('熟悉的小狗');
  expect(errors).toEqual([]);
});

test('puppy click gives affection only at gesture cue and survives reload',async({page},testInfo)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./?e2e=1');
  await expect(page.locator('#loading')).toBeHidden({timeout:15_000});
  const bond=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('autumn-moments:v3')??'{}').dogBond??0);
  const clickDog=async()=>{
    const point=await page.evaluate(()=>{
      const w=(window as Window&{__autumnDev?:any}).__autumnDev;
      const dog=w.places.get('park').root.getObjectByName('Park puppy');
      dog.updateWorldMatrix(true,true);
      const target=dog.localToWorld(w.actor.position.clone().set(0,.66,.34));
      w.camera.active.updateMatrixWorld();target.project(w.camera.active);
      const rect=document.querySelector<HTMLCanvasElement>('#viewport canvas')!.getBoundingClientRect();
      return {x:rect.left+(target.x+1)*rect.width/2,y:rect.top+(1-target.y)*rect.height/2};
    });
    await page.mouse.move(point.x,point.y);
    await expect(page.locator('#hint')).toContainText('摸摸小狗',{timeout:6000});
    await page.mouse.click(point.x,point.y);
  };
  await clickDog();
  await page.keyboard.down('KeyA');await page.waitForTimeout(130);await page.keyboard.up('KeyA');
  expect(await bond()).toBe(0);
  await clickDog();
  try{
    await expect.poll(bond,{timeout:30000}).toBe(1);
  }catch(error){
    const sceneState=await page.evaluate(()=>{
      const w=(window as Window&{__autumnDev?:any}).__autumnDev;
      const dog=w.places.get('park').root.getObjectByName('Park puppy');
      return {actor:{x:w.actor.position.x,z:w.actor.position.z,moving:w.actor.isMoving,acting:w.actor.isActing,
        path:w.actor.path.length},dog:{x:dog.position.x,z:dog.position.z},
        hovered:w.hovered?.id,toast:document.querySelector('#toast')?.textContent};
    });
    console.log('Puppy pet timeout state:',JSON.stringify(sceneState));
    throw error;
  }
  await page.screenshot({path:testInfo.outputPath('puppy-after-pet.png')});
  await page.reload();
  await expect(page.locator('#place-name')).toHaveText('街角的小公园',{timeout:15000});
  expect(await bond()).toBe(1);
  expect(errors).toEqual([]);
});


test('fetch the ball only after the throw cue; dog returns it and retains normal play',async({page},testInfo)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./?e2e=1');await expect(page.locator('#loading')).toBeHidden({timeout:15000});
  const project=async()=>page.evaluate(()=>{
    const w=(window as Window&{__autumnDev?:any}).__autumnDev;
    const rack=w.places.get('park').root.getObjectByName('Puppy ball rack');
    const point=rack.localToWorld(w.actor.position.clone().set(0,1.42,0));
    w.camera.active.updateMatrixWorld();point.project(w.camera.active);
    const rect=document.querySelector<HTMLCanvasElement>('#viewport canvas')!.getBoundingClientRect();
    return {x:rect.left+(point.x+1)*rect.width/2,y:rect.top+(1-point.y)*rect.height/2};
  });
  const state=()=>page.evaluate(()=>{
    const w=(window as Window&{__autumnDev?:any}).__autumnDev;
    const dog=w.places.get('park').root.getObjectByName('Park puppy').userData.controller;
    const rack=w.places.get('park').root.getObjectByName('Puppy ball rack');
    return {fetching:dog.isFetching,phase:dog.fetchPhase,completed:dog.completedFetches,
      visible:rack.children.find((c:any)=>c.geometry?.type==='SphereGeometry')?.visible,
      money:JSON.parse(localStorage.getItem('autumn-moments:v3')??'{}').coins};
  });
  const original=await state();expect(original.fetching).toBe(false);expect(original.visible).toBe(true);
  let p=await project();await page.mouse.move(p.x,p.y);
  await expect(page.locator('#hint')).toContainText('抛给小狗');
  await page.mouse.click(p.x,p.y);
  // Interrupt approach: no ball may enter the fetch state before the animation cue.
  await page.keyboard.down('KeyA');await page.waitForTimeout(130);await page.keyboard.up('KeyA');
  expect((await state()).fetching).toBe(false);
  p=await project();await page.mouse.move(p.x,p.y);await page.mouse.click(p.x,p.y);
  await expect.poll(async()=>(await state()).fetching,{timeout:20000}).toBe(true);
  expect((await state()).visible).toBe(false);
  const finished=await page.evaluate(()=>{
    const w=(window as Window&{__autumnDev?:any}).__autumnDev;
    const park=w.places.get('park'),dog=park.root.getObjectByName('Park puppy').userData.controller;
    const player=w.actor.position.clone();
    for(let i=0;i<320&&dog.isFetching;i++)park.tick(w.elapsed+(i+1)*.05,.05,player);
    const rack=park.root.getObjectByName('Puppy ball rack');
    return {fetching:dog.isFetching,completed:dog.completedFetches,
      toyVisible:rack.children.find((c:any)=>c.geometry?.type==='SphereGeometry')?.visible,
      phase:dog.fetchPhase};
  });
  expect(finished.fetching).toBe(false);
  expect(finished.completed).toBe(1);
  expect(finished.toyVisible).toBe(true);
  await page.screenshot({path:testInfo.outputPath('puppy-fetch-returned.png')});
  expect((await state()).money).toBe(original.money);
  expect(errors).toEqual([]);
});

test('cancelling a targeted moving-dog approach immediately releases its hold',async({page})=>{
  await page.goto('./?e2e=1');await expect(page.locator('#loading')).toBeHidden({timeout:15000});
  const result=await page.evaluate(()=>{
    const w=(window as Window&{__autumnDev?:any}).__autumnDev;
    const dog=w.places.get('park').root.getObjectByName('Park puppy').userData.controller;
    const interaction=w.places.get('park').interactions.find((i:any)=>i.id==='park-dog');
    interaction.onTargeted();
    const during=dog.heldUntil;
    w.moveTo(interaction.approach.clone(),undefined,'小狗',false,()=>interaction.onActionEnd?.());
    w.actor.cancel();
    return {during,after:dog.heldUntil,time:w.elapsed};
  });
  expect(result.during).toBeGreaterThan(result.time);
  expect(result.after).toBe(-1);
});
