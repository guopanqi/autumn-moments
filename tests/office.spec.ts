import {test,expect} from '@playwright/test';

test('office location opens with visible supervisor cone and returns to park',async({page},testInfo)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./?e2e=1');await expect(page.locator('#loading')).toBeHidden({timeout:15000});
  await page.locator('#go-office').click();await expect(page.locator('#place-name')).toHaveText('午后办公室');
  await expect(page.locator('#office-status')).toBeVisible();
  const scene=await page.evaluate(()=>{
    const w=(window as Window&{__autumnDev?:any}).__autumnDev;
    return {place:w.active.id,camera:w.active.camera,
      manager:!!w.active.root.getObjectByName('Office manager'),
      cone:!!w.active.root.getObjectByName('Manager vision cone'),
      ids:w.active.interactions.map((i:any)=>i.id)};
  });
  expect(scene).toMatchObject({place:'office',camera:'isometric',manager:true,cone:true});
  expect(scene.ids).toEqual(expect.arrayContaining(['office-work','office-exit']));
  await page.screenshot({path:testInfo.outputPath('office-initial.png')});
  await page.locator('#go-park').click();await expect(page.locator('#place-name')).toHaveText('街角的小公园');
  expect(errors).toEqual([]);
});

test('office salary only on exit cue, cancellation and detection do not pay',async({page})=>{
  await page.goto('./?e2e=1');await expect(page.locator('#loading')).toBeHidden({timeout:15000});
  await page.locator('#go-office').click();await expect(page.locator('#place-name')).toHaveText('午后办公室');
  const run=async(id:string,cancel=false)=>page.evaluate(({id,cancel})=>{
    const w=(window as Window&{__autumnDev?:any}).__autumnDev;
    const hit=w.active.interactions.find((i:any)=>i.id===id);
    const effect=hit.use();w.actor.cancel();
    w.actor.act(effect.gesture??'wave',()=>{hit.onMoment?.();w.apply(effect);},()=>hit.onActionEnd?.(),()=>hit.onActionEnd?.());
    if(cancel)w.actor.cancel();else for(let i=0;i<130;i++)w.actor.update(.025,w.elapsed+i*.025);
    return effect.coins??0;
  },{id,cancel});
  const wallet=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('autumn-moments:v3')??'{}').coins);
  const before=await wallet();
  expect(await run('office-exit')).toBe(0);expect(await wallet()).toBe(before);
  await run('office-work',true);expect(await page.locator('#office-status').textContent()).toContain('工位');
  await run('office-work');expect(await wallet()).toBe(before);
  await run('office-exit',true);expect(await wallet()).toBe(before);
  expect(await run('office-exit')).toBe(18);
  await expect(page.locator('#place-name')).toHaveText('街角的小公园',{timeout:10000});
  expect(await wallet()).toBe(before+18);
  await page.locator('#go-office').click();await expect(page.locator('#place-name')).toHaveText('午后办公室');
  expect(await run('office-exit')).toBe(0);
  expect(await wallet()).toBe(before+18);
});

test('being seen cancels office report, hides behind desks and preserves save',async({page})=>{
  await page.goto('./?e2e=1');await expect(page.locator('#loading')).toBeHidden({timeout:15000});
  await page.locator('#go-office').click();await expect(page.locator('#place-name')).toHaveText('午后办公室');
  const outcome=await page.evaluate(()=>{
    const w=(window as Window&{__autumnDev?:any}).__autumnDev;
    const office=w.active,desk=office.interactions.find((i:any)=>i.id==='office-work');
    desk.use();desk.onMoment?.();
    const coinsBefore=JSON.parse(localStorage.getItem('autumn-moments:v3')??'{}').coins;
    // Clear opening grace period, then move into the visible open central corridor.
    office.tick(1,1.4,office.spawn);
    const manager=office.root.getObjectByName('Office manager');
    const target=manager.position.clone().add({x:0,y:0,z:2.0});
    w.actor.teleport(target);office.tick(1.1,.05,w.actor.position);
    const caught=office.root.userData;
    const after=document.getElementById('office-status')!.textContent;
    const reset=w.actor.position.distanceTo(office.spawn)<.01;
    const cash=JSON.parse(localStorage.getItem('autumn-moments:v3')??'{}').coins;
    return {reset,after,cash,coinsBefore};
  });
  expect(outcome.reset).toBe(true);
  expect(outcome.after).toContain('重新整理');
  expect(outcome.cash).toBe(outcome.coinsBefore);
});


test('displayed supervisor cone stops at a desk that actually blocks detection',async({page})=>{
  await page.goto('./?e2e=1');
  await expect(page.locator('#loading')).toBeHidden({timeout:15_000});
  await page.locator('#go-office').click();
  await expect(page.locator('#place-name')).toHaveText('午后办公室');
  const evidence=await page.evaluate(()=>{
    const w=(window as Window&{__autumnDev?:any}).__autumnDev;
    const office=w.active;
    const manager=office.root.getObjectByName('Office manager')!;
    const cone=office.root.getObjectByName('Manager vision cone') as any;
    const report=office.interactions.find((i:any)=>i.id==='office-work');
    // Leftmost patrol position is where the left-hand desk occludes the cone edge.
    office.tick(0,Math.PI*1.5/.60,office.spawn);
    const geometry=cone.geometry.getAttribute('position');
    const clipped=Math.hypot(geometry.getX(4),geometry.getZ(4)); // angle -0.336
    const clear=Math.hypot(geometry.getX(11),geometry.getZ(11)); // center ray
    report.onMoment?.();
    const safeBehindDesk=new manager.position.constructor(-4.75,0,4.25);
    office.tick(0,.01,safeBehindDesk);
    return {
      managerX:manager.position.x,
      clipped,clear,
      status:document.getElementById('office-status')?.textContent,
      savedCoins:JSON.parse(localStorage.getItem('autumn-moments:v3')??'{}').coins
    };
  });
  expect(evidence.managerX).toBeCloseTo(-3.05,1);
  expect(evidence.clipped).toBeLessThan(3.9);
  expect(evidence.clear).toBeCloseTo(5.5,1);
  // The player is inside the angular cone, but the desk blocks the actual ray.
  expect(evidence.status).toContain('报告完成');
  expect(evidence.savedCoins).toBe(20);
});
