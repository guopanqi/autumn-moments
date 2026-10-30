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
  await expect.poll(async()=>page.evaluate(()=>JSON.parse(localStorage.getItem('autumn-moments:v2')??'{}').furniture?.length)).toBe(1);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('autumn-moments:v2')!));
  expect(saved.furniture[0].kind).toBe('plant');
  expect(saved.furniture[0].rotation).toBeCloseTo(Math.PI/2);
  await page.screenshot({path:testInfo.outputPath('decorated-home.png')});

  await page.reload();
  await expect(page.locator('#place-name')).toHaveText('午后的小屋');
  await expect.poll(async()=>page.evaluate(()=>JSON.parse(localStorage.getItem('autumn-moments:v2')??'{}').furniture?.length)).toBe(1);
  await page.locator('#decor-toggle').click();
  await page.locator('#decor-undo').click();
  await expect.poll(async()=>page.evaluate(()=>JSON.parse(localStorage.getItem('autumn-moments:v2')??'{}').furniture?.length)).toBe(0);
  await page.locator('#go-park').click();
  await expect(page.locator('#place-name')).toHaveText('街角的小公园');
  expect(errors).toEqual([]);
});
