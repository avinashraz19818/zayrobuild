import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
import React,{act} from 'react';
const dom=new JSDOM('<div id="root"></div>',{url:'https://panel.example.test/admin'});
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.HTMLElement=dom.window.HTMLElement;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const {createRoot}=await import('react-dom/client');
const server=await createServer({root:new URL('..',import.meta.url).pathname,server:{middlewareMode:true},appType:'custom'});
const calls=[];let files=[];
const kindOf=n=>/^[1-9]\d*$/.test(n)?'amount':'sound';
globalThis.fetch=async(url,options={})=>{
 const method=options.method||'GET';calls.push({url,method});
 let result={files};
 if(method==='POST'&&url.endsWith('/api/admin/mp3')){
  const form=options.body;const name=String(form.get('name')||'').toLowerCase();
  files=[...files.filter(f=>f.name!==name),{name,file:name+'.mp3',kind:kindOf(name),amount:kindOf(name)==='amount'?Number(name):null,bytes:2048,updatedAt:new Date().toISOString()}];
  result={files};
 }
 if(method==='DELETE'){const n=decodeURIComponent(url.split('/').pop());files=files.filter(f=>f.name!==n);result={files};}
 return {ok:true,status:200,text:async()=>JSON.stringify(result)};
};
const root=createRoot(document.getElementById('root'));
const tick=async()=>act(async()=>{await new Promise(r=>setTimeout(r,0));});
const button=text=>{const el=[...document.querySelectorAll('button')].find(b=>b.textContent.includes(text));assert.ok(el,text);return el;};
const click=async el=>{await act(async()=>el.click());await tick();};
const input=async(el,value)=>{await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new window.Event('input',{bubbles:true}));});await tick();};
const pickFile=async(name)=>{const file=new window.File([new Uint8Array([0x49,0x44,0x33])],name,{type:'audio/mpeg'});await act(async()=>{const el=document.querySelector('input[type=file]');Object.defineProperty(el,'files',{value:[file],configurable:true});el.dispatchEvent(new window.Event('change',{bubbles:true}));});await tick();};
try{
 const {default:Component}=await server.ssrLoadModule('/src/views/admin/Mp3LibraryTab.jsx');
 const {ToastProvider}=await server.ssrLoadModule('/src/components/Toast.jsx');
 await act(async()=>root.render(React.createElement(ToastProvider,null,React.createElement(Component))));await tick();
 assert.match(document.body.textContent,/Abhi koi MP3 nahi hai/);
 assert.equal(button('Upload').disabled,true,'upload needs name and file');

 // Any name works: file name auto-fills the naam box.
 await pickFile('Bypass.mp3');
 assert.equal(document.querySelector('input[type=text]').value,'bypass','name auto-filled from file');
 assert.equal(button('Upload').disabled,false);
 await click(button('Upload'));
 assert.ok(calls.some(c=>c.method==='POST'&&c.url==='/api/admin/mp3'));
 assert.match(document.body.textContent,/bypass\.mp3/);
 assert.match(document.body.textContent,/App sounds/);

 // Deposit amount file, typed name.
 await input(document.querySelector('input[type=text]'),'200');
 await pickFile('200.mp3');
 await click(button('Upload'));
 assert.match(document.body.textContent,/Deposit ₹200/);
 const audio=document.querySelector('audio[aria-label="200.mp3 preview"]');assert.equal(audio.getAttribute('src'),'/api/admin/mp3/200');
 assert.equal(document.querySelector('a[download="200.mp3"]').getAttribute('href'),'/api/admin/mp3/200');

 // Invalid name is blocked before upload.
 await input(document.querySelector('input[type=text]'),'Bad Name!');
 assert.match(document.body.textContent,/Naam sirf chhote letters/);
 assert.equal(button('Upload').disabled,true);

 // Delete a sound: first Delete button belongs to the App sounds row (bypass.mp3).
 const origConfirm=window.confirm;window.confirm=()=>true;
 await click([...document.querySelectorAll('button')].find(b=>b.textContent.includes('Delete')));
 window.confirm=origConfirm;
 assert.ok(calls.some(c=>c.method==='DELETE'&&c.url.endsWith('/api/admin/mp3/bypass')),'DELETE sent for bypass');
 assert.doesNotMatch(document.body.textContent,/bypass\.mp3 \(\d+ KB\)/);
 assert.match(document.body.textContent,/Deposit ₹200/);
 console.log('PASS: any-name upload with auto-filled naam, amount MP3 listed with preview/download, invalid naam blocked, delete.');
}finally{await act(async()=>root.unmount());await server.close();dom.window.close();}
