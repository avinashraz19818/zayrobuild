#!/usr/bin/env node
'use strict';
// Read-only. Check the full entry/lazy JS+CSS graph of this exact deployment.
const fs=require('node:fs'),path=require('node:path');
async function check(){
 const root=path.resolve(__dirname,'../public');
 const base=process.argv[2]?new URL(process.argv[2]):null;
 if(base&&!['http:','https:'].includes(base.protocol))throw Error('Use an HTTP(S) panel origin.');
 const get=async(url,type)=>{
  const res=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(15000),cache:'no-store'});
  if(!res.ok||!type.test(res.headers.get('content-type')||''))throw Error(`Startup resource failed HTTP status or MIME check: ${url.pathname}`);
  return res.text();
 };
 const html=base?await get(new URL('/',base),/text\/html/):fs.readFileSync(path.join(root,'index.html'),'utf8');
 const refs=[...html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+\.(?:js|css))"/g)].map(m=>m[1].slice(1));
 if(!refs.some(r=>r.endsWith('.js')))throw Error('No production entry JavaScript was found.');
 const manifestFile=path.join(root,'build-manifest.json');
 if(!fs.existsSync(manifestFile))throw Error('Build manifest missing. Rebuild the frontend before deployment checks.');
 const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
 const files=new Set(refs),visited=new Set();
 function visit(key){
  if(visited.has(key))return;
  if(!Object.hasOwn(manifest,key))throw Error('Incomplete build manifest. Rebuild the frontend.');
  visited.add(key);const item=manifest[key];
  files.add(item.file);for(const css of item.css||[])files.add(css);
  for(const child of [...(item.imports||[]),...(item.dynamicImports||[])])visit(child);
 }
 for(const entry of refs.filter(r=>r.endsWith('.js'))){
  const key=Object.keys(manifest).find(k=>manifest[k].isEntry&&manifest[k].file===entry);
  if(!key)throw Error('Served HTML and local build manifest do not match. Deploy the complete build together.');
  visit(key);
 }
 for(const file of files){
  if(!/^assets\/[A-Za-z0-9_.-]+\.(?:js|css)$/.test(file))throw Error('Invalid startup asset path in build metadata.');
  if(base)await get(new URL('/'+file,base),file.endsWith('.js')?/(?:javascript|ecmascript)/:/text\/css/);
  else if(!fs.existsSync(path.join(root,file)))throw Error(`A referenced production asset is missing: ${file}`);
 }
 if(base){const policy=JSON.parse(await get(new URL('/api/access-policy',base),/application\/json/));if(policy.telegram_only!==true)throw Error('Expected a production Telegram-only access policy.');}
 console.log(`PASS: ${files.size} entry/lazy JS/CSS assets ${base?'respond with correct status/MIME; production policy enabled':'exist locally'}. This does not verify live Telegram authentication.`);
}
check().catch(error=>{console.error('FAIL:',error.message);process.exitCode=1;});
