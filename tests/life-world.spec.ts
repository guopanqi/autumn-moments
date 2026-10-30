import {test,expect} from '@playwright/test';

test('outdoor and home remain playable; furniture persists',async({page},testInfo)=>{
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('./?e2e=1');
  await expect(page.locator('#loading')).toHaveClass(/hidden/,{timeout:15_000});
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
test('paid park action funds a lamp, which remains owned through placement, removal and reload',async({page})=>{
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./?e2e=1');
  await expect(page.locator('#loading')).toHaveClass(/hidden/,{timeout:15_000});
  const save=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('autumn-moments:v3')??'{}'));
  const point=async(x:number,y:number,z:number)=>page.evaluate(({x,y,z})=>{
    const w=(window as Window & {__autumnDev?:any}).__autumnDev;
    const v=w.actor.position.clone().set(x,y,z);
    w.camera.active.updateMatrixWorld();v.project(w.camera.active);
    const box=document.querySelector<HTMLCanvasElement>('#viewport canvas')!.getBoundingClientRect();
    return {x:box.left+(v.x+1)*box.width/2,y:box.top+(1-v.y)*box.height/2};
  },{x,y,z});
  const work=await point(-2.75,1.63,2.55);
  await page.mouse.click(work.x,work.y);
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
