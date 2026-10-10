'use strict';
// Prints deployment state only; never emits bot tokens, env values or response bodies.
require('dotenv').config();
(async()=>{
  const base=`http://127.0.0.1:${Number(process.env.PORT)||3000}`;
  const response=await fetch(base+'/api/deploy-bot/plans',{signal:AbortSignal.timeout(12000)});
  let data;try{data=await response.json();}catch{throw Error('Panel API is not returning JSON. Check the running server/reverse proxy.');}
  if(!response.ok||data.api_version!==2)throw Error('Old/incompatible backend is running. Restart zayro-panel from this checkout.');
  const html=await (await fetch(base+'/admin',{signal:AbortSignal.timeout(12000)})).text();
  const assets=[...html.matchAll(/(?:src|href)="(\/assets\/[^"\s]+)"/g)].map(m=>m[1]);
  if(!assets.length)throw Error('Admin HTML does not reference the built frontend.');
  for(const asset of assets){
    const r=await fetch(base+asset,{signal:AbortSignal.timeout(12000)});
    if(!r.ok||r.headers.get('content-type')?.includes('text/html'))throw Error('A frontend asset is missing. Deploy the committed public/ files.');
    if(asset.endsWith('.js')) {
      const code=await r.text();
      for(const m of code.matchAll(/["'`]assets\/([A-Za-z0-9_-]+\.(?:js|css))["'`]/g)){
        const dependency='/assets/'+m[1];if(!assets.includes(dependency)&&assets.length<32)assets.push(dependency);
      }
    }
  }
  console.log('Panel API: current (v2)\nAdmin entry assets: available');
  console.log(`Welcome engine: ${data.ready?'connected':'not connected — check zayro-welcome setup/process'}`);
  console.log(`Purchases: ${data.enabled?'enabled':'disabled — enable in Admin > Deploy Bot'}`);
  console.log(`Published plans: ${Array.isArray(data.plans)?data.plans.length:0}`);
})().catch(e=>{console.error('Check failed:',e.message);process.exitCode=1;});
