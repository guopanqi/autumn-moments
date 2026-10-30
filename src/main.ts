import './style.css';
import {World} from './core/World';

const canvas=document.getElementById('viewport');
if(!canvas)throw new Error('Missing world viewport');
try{
  const world=new World(canvas);
  // Explicit opt-in diagnostics for GitHub Actions browser smoke tests.
  if(new URLSearchParams(window.location.search).has('e2e'))(window as Window & {__autumnDev?:World}).__autumnDev=world;
  window.setTimeout(()=>document.getElementById('loading')?.classList.add('hidden'),650);
}catch(error){
  const loader=document.getElementById('loading');
  if(loader){loader.innerHTML='<p>场景无法启动。请检查浏览器是否支持 WebGL，并尝试刷新页面。</p>';}
  console.error('[Autumn Moments] Startup failed',error);
}
