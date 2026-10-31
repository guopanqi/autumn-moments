import {test,expect} from '@playwright/test';

test('farm can be entered, navigated and restored from the existing local save',async({page},testInfo)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./?e2e=1');await expect(page.locator('#loading')).toBeHidden({timeout:15000});
  await page.locator('#go-farm').click();
  await expect(page.locator('#place-name')).toHaveText('山坡上的小牧场');
  await expect(page.locator('#farm-status')).toBeVisible();
  const state=await page.evaluate(()=>{
    const w=(window as Window&{__autumnDev?:any}).__autumnDev;
    return {place:w.active.id,interactions:w.active.interactions.map((i:any)=>i.id),
      care:JSON.parse(localStorage.getItem('autumn-moments:v3')??'{}').farmCare};
  });
  expect(state.place).toBe('farm');
  expect(state.interactions).toEqual(expect.arrayContaining(['farm-forage','farm-feed','farm-milk','farm-exit']));
  expect(state.care.hunger).toBeGreaterThan(.5);
  await page.screenshot({path:testInfo.outputPath('pasture-initial.png')});
  await page.reload();await expect(page.locator('#place-name')).toHaveText('山坡上的小牧场');
  await page.locator('#go-park').click();await expect(page.locator('#place-name')).toHaveText('街角的小公园');
  expect(errors).toEqual([]);
});

test('hay, feeding, waiting and milk are separate cues with one collectible reward',async({page},testInfo)=>{
  await page.goto('./?e2e=1');await expect(page.locator('#loading')).toBeHidden({timeout:15000});
  await page.locator('#go-farm').click();
  await expect(page.locator('#place-name')).toHaveText('山坡上的小牧场');
  const current=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('autumn-moments:v3')??'{}'));
  const invoke=(id:string,cancel=false)=>page.evaluate(({id,cancel})=>{
    const w=(window as Window&{__autumnDev?:any}).__autumnDev;
    const interaction=w.active.interactions.find((i:any)=>i.id===id);
    if(!interaction)throw new Error('Missing interaction '+id);
    const effect=interaction.use();
    // Exercise the original action moment contract, not immediate click mutation.
    w.actor.cancel();
    w.actor.act(effect.gesture??'wave',()=>{
      interaction.onMoment?.();w.apply(effect);
    },()=>interaction.onActionEnd?.(),()=>interaction.onActionEnd?.());
    if(cancel)w.actor.cancel();
    else for(let i=0;i<80;i++)w.actor.update(1/60,w.elapsed+i/60);
    return {effect};
  },{id,cancel});
  const initial=await current();
  expect(initial.farmCare.hay).toBe(false);
  await invoke('farm-feed'); // Feeding without gathering should do nothing.
  expect((await current()).farmCare.milkDelay).toBe(0);
  await invoke('farm-forage',true); // Cancelling before cue must not grant hay.
  expect((await current()).farmCare.hay).toBe(false);
  await invoke('farm-forage');
  expect((await current()).farmCare.hay).toBe(true);
  await invoke('farm-forage'); // No unlimited stacking in the one-bundle slice.
  expect((await current()).farmCare.hay).toBe(true);
  await invoke('farm-feed');
  let care=(await current()).farmCare;
  expect(care.hay).toBe(false);expect(care.hunger).toBe(0);
  expect(care.milkReady).toBe(false);expect(care.milkDelay).toBeGreaterThan(0);
  await page.evaluate(()=>{
    const w=(window as Window&{__autumnDev?:any}).__autumnDev;
    for(let i=0;i<130;i++)w.active.tick(w.elapsed+i*.05,.05,w.actor.position);
  });
  care=(await current()).farmCare;
  expect(care.milkDelay).toBe(0);expect(care.milkReady).toBe(true);
  await page.screenshot({path:testInfo.outputPath('pasture-milk-ready.png')});
  await page.reload();await expect(page.locator('#place-name')).toHaveText('山坡上的小牧场');
  const before=(await current()).coins;
  await invoke('farm-milk',true);
  expect((await current()).coins).toBe(before);expect((await current()).farmCare.milkReady).toBe(true);
  await invoke('farm-milk');
  expect((await current()).coins).toBe(before+8);
  expect((await current()).farmCare.milkReady).toBe(false);
  expect((await current()).farmCare.milkCollected).toBe(1);
  await invoke('farm-milk');
  expect((await current()).coins).toBe(before+8);
  await page.reload();
  expect((await current()).coins).toBe(before+8);
  expect((await current()).farmCare.milkCollected).toBe(1);
});

test('old saves and malformed farm fields migrate safely',async({page})=>{
  await page.goto('./?e2e=1');
  await page.evaluate(()=>{
    const old=JSON.parse(localStorage.getItem('autumn-moments:v3')??'{}');
    old.mood=63;old.coins=27;old.dogBond=3;old.place='farm';
    old.farmCare={hay:true,hunger:Infinity,milkReady:true,milkDelay:8,milkCollected:-70};
    localStorage.setItem('autumn-moments:v3',JSON.stringify(old));
  });
  await page.reload();await expect(page.locator('#place-name')).toHaveText('山坡上的小牧场');
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('autumn-moments:v3')??'{}'));
  expect(state.mood).toBe(63);expect(state.coins).toBe(27);expect(state.dogBond).toBe(3);
  // An invalid state cannot simultaneously offer ready milk and be processing a feeding delay.
  const panel=await page.locator('#farm-status').textContent();
  expect(panel).not.toContain('牛奶准备好了');
});

test('milk arriving during an empty-pail action cannot be taken without payment',async({page})=>{
  await page.goto('./?e2e=1');
  await expect(page.locator('#loading')).toBeHidden({timeout:15000});
  await page.locator('#go-farm').click();
  await expect(page.locator('#place-name')).toHaveText('山坡上的小牧场');
  const result=await page.evaluate(()=>{
    const w=(window as Window&{__autumnDev?:any}).__autumnDev;
    const actions=w.active.interactions;
    const forage=actions.find((i:any)=>i.id==='farm-forage');
    const feed=actions.find((i:any)=>i.id==='farm-feed');
    const pail=actions.find((i:any)=>i.id==='farm-milk');
    forage.use();forage.onMoment();
    feed.use();feed.onMoment();
    // Leave 0.5 seconds of milk production when the pail action begins.
    for(let i=0;i<110;i++)w.active.tick(i*.05,.05,w.actor.position);
    const before=pail.use();
    for(let i=0;i<11;i++)w.active.tick(6+i*.05,.05,w.actor.position);
    pail.onMoment();
    const afterEmpty=JSON.parse(localStorage.getItem('autumn-moments:v3')!).farmCare;
    const valid=pail.use();pail.onMoment();
    const afterPaid=JSON.parse(localStorage.getItem('autumn-moments:v3')!).farmCare;
    return {before:before.coins,stillReady:afterEmpty.milkReady,stillCount:afterEmpty.milkCollected,
      valid:valid.coins,afterReady:afterPaid.milkReady,afterCount:afterPaid.milkCollected};
  });
  expect(result).toEqual({before:0,stillReady:true,stillCount:0,valid:8,afterReady:false,afterCount:1});
});

test('farm forage is reachable from a real scene click before its reward cue',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./?e2e=1');await expect(page.locator('#loading')).toBeHidden({timeout:15000});
  await page.locator('#go-farm').click();await expect(page.locator('#place-name')).toHaveText('山坡上的小牧场');
  const point=await page.evaluate(()=>{
    const w=(window as Window&{__autumnDev?:any}).__autumnDev;
    const interaction=w.active.interactions.find((i:any)=>i.id==='farm-forage');
    w.actor.teleport(w.actor.position.clone().set(4.7,0,3.9));
    w.camera.switch('follow',w.actor.position);w.camera.active.updateMatrixWorld(true);
    const target=interaction.root.localToWorld(w.actor.position.clone().set(0,.75,0));
    target.project(w.camera.active);
    const rect=document.querySelector<HTMLCanvasElement>('#viewport canvas')!.getBoundingClientRect();
    return {x:rect.left+(target.x+1)*rect.width/2,y:rect.top+(1-target.y)*rect.height/2};
  });
  await page.mouse.move(point.x,point.y);
  await expect(page.locator('#hint')).toContainText('采集一束青草');
  await page.mouse.click(point.x,point.y);
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('autumn-moments:v3')??'{}').farmCare.hay),
    {timeout:25000}).toBe(true);
  expect(errors).toEqual([]);
});
