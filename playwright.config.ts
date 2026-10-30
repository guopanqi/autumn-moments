import {defineConfig} from '@playwright/test';

/** Runs in GitHub Actions with SwiftShader; tests the shipped Three.js scene in a browser. */
export default defineConfig({
  testDir:'./tests',timeout:60_000,
  reporter:[['list']],
  use:{
    baseURL:'http://127.0.0.1:5173/autumn-moments/',
    headless:true,viewport:{width:1280,height:800},
    launchOptions:{args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox']},
  },
  webServer:{command:'npm run dev -- --host 127.0.0.1',url:'http://127.0.0.1:5173/autumn-moments/',timeout:45_000,reuseExistingServer:!process.env.CI},
});
