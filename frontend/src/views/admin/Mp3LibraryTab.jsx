import React,{useEffect,useState} from 'react';
import {Music,Upload,Trash2,Download,RefreshCw} from 'lucide-react';
import {api} from '../../lib/api';
import {useToast} from '../../components/Toast';

const API='/api/admin/mp3';
const kb=bytes=>`${Math.max(1,Math.round(bytes/1024))} KB`;
// Templates/app me pehle se use hone wali sound names (suggestion ke liye; koi bhi naam chalega).
const KNOWN_NAMES=['successful','deposit','lowbalance','register','bypass'];

export default function Mp3LibraryTab(){
 const {addToast}=useToast();
 const [files,setFiles]=useState(null),[name,setName]=useState(''),[file,setFile]=useState(null),[busy,setBusy]=useState(''),[error,setError]=useState('');
 const [fileKey,setFileKey]=useState(0),[filter,setFilter]=useState('');
 const [loadKey,setLoadKey]=useState(0);
 useEffect(()=>{let active=true;setError('');api.get(API).then(r=>{if(active)setFiles(r.files||[]);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[loadKey]);

 // Naam khali ho to file ke naam se suggest karo (bypass.mp3 → bypass).
 function onPickFile(f){
  setFile(f||null);
  if(f&&!name.trim()) setName(String(f.name||'').replace(/\.mp3$/i,'').toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^[^a-z0-9]+/,'').slice(0,40));
 }
 async function upload(){
  setBusy('upload');setError('');
  try{
   const fd=new FormData();fd.append('name',name.trim());fd.append('file',file);
   const r=await api.postForm(API,fd);setFiles(r.files||[]);
   const existed=(files||[]).some(f=>f.name===name.trim().toLowerCase().replace(/\.mp3$/,''));
   setName('');setFile(null);setFileKey(k=>k+1);
   addToast(existed?'MP3 replace ho gayi.':'MP3 upload ho gayi.','success');
  }catch(e){setError(e.message);}finally{setBusy('');}
 }
 async function remove(item){
  if(!window.confirm(`${item.file} delete karein?`))return;
  setBusy('del-'+item.name);setError('');
  try{const r=await api.del(`${API}/${encodeURIComponent(item.name)}`);setFiles(r.files||[]);addToast('MP3 delete ho gayi.','success');}
  catch(e){setError(e.message);}finally{setBusy('');}
 }
 const cleanName=name.trim().toLowerCase().replace(/\.mp3$/,'');
 const nameOk=/^(?:[1-9]\d{0,7}|[a-z][a-z0-9_-]{0,39})$/.test(cleanName);
 const canUpload=!busy&&nameOk&&!!file;
 const shown=(files||[]).filter(f=>!filter.trim()||f.file.includes(filter.trim().toLowerCase()));
 const sounds=shown.filter(f=>f.kind==='sound'), amounts=shown.filter(f=>f.kind==='amount');

 const row=item=>(
  <div key={item.file} className="stack gap-8" style={{borderTop:'1px solid var(--line, #2a2f3a)',paddingTop:8}}>
   <div className="flex-row gap-8 wrap" style={{justifyContent:'space-between'}}>
    <b>{item.file} <span className="hint">({kb(item.bytes)})</span> {item.kind==='amount'&&<span className="chip chip-brand">Deposit ₹{item.amount}</span>}</b>
    <div className="flex-row gap-8">
     <a className="btn btn-soft btn-sm" download={item.file} href={`${API}/${encodeURIComponent(item.name)}`}><Download size={14}/>Download</a>
     <button type="button" className="btn btn-soft btn-sm" disabled={!!busy} onClick={()=>{setName(item.name);window.scrollTo?.({top:0,behavior:'smooth'});}}><RefreshCw size={14}/>Replace</button>
     <button type="button" className="btn btn-soft btn-sm" disabled={!!busy} onClick={()=>remove(item)}><Trash2 size={14}/>{busy==='del-'+item.name?'Deleting…':'Delete'}</button>
    </div>
   </div>
   <audio controls preload="none" aria-label={`${item.file} preview`} style={{width:'100%',maxWidth:420}} src={`${API}/${encodeURIComponent(item.name)}`}/>
  </div>
 );

 return <section className="card card-pad stack gap-12" aria-label="MP3 library">
  <div className="flex-row gap-8"><Music size={18} color="var(--brand-2)"/><span className="row-title">MP3 Library</span><span className="chip chip-brand">Saari MP3 yahin</span></div>
  <p className="hint">Yahan se kisi bhi naam ki MP3 upload, replace ya delete kar sakte hain. Naam wahi rakhein jo app me use hota hai (jaise {KNOWN_NAMES.map(n=>n+'.mp3').join(', ')}). Naam ek hi ho to file replace hoti hai.</p>
  <p className="hint">Deposit ke liye amount naam dein (jaise 200 → 200.mp3). APK banate waqt order ke minimum deposit wali amount MP3 successful.mp3 ban jaati hai; uske liye us amount ki file honi chahiye.</p>
  {error&&<p role="alert" className="hint" style={{color:'var(--danger, #f87171)'}}>{error}</p>}
  <div className="flex-row gap-8 wrap" style={{alignItems:'flex-end'}}>
   <label className="field" style={{minWidth:180}}><span>Naam (bina .mp3)</span>
    <input className="input" type="text" list="mp3-known-names" maxLength={40} value={name} disabled={!!busy} onChange={e=>setName(e.target.value)} placeholder="deposit ya 200"/>
    <datalist id="mp3-known-names">{KNOWN_NAMES.map(n=><option key={n} value={n}/>)}</datalist>
   </label>
   <label className="field" style={{flex:1,minWidth:200}}><span>MP3 file</span><input key={fileKey} className="input" type="file" accept="audio/mpeg,.mp3" disabled={!!busy} onChange={e=>onPickFile(e.target.files?.[0]||null)}/></label>
   <button type="button" className="btn btn-primary" disabled={!canUpload} onClick={upload}><Upload size={15}/>{busy==='upload'?'Uploading…':'Upload'}</button>
  </div>
  {name.trim()&&!nameOk&&<p className="hint" style={{color:'var(--danger, #f87171)'}}>Naam sirf chhote letters, numbers, _ ya - me ho (letter se shuru), ya amount ho (1–10000000).</p>}
  <div className="divider"/>
  <div className="flex-row gap-8 wrap" style={{justifyContent:'space-between',alignItems:'center'}}>
   <input className="input" type="search" aria-label="MP3 search" placeholder="Search…" value={filter} onChange={e=>setFilter(e.target.value)} style={{maxWidth:240}}/>
   <button type="button" className="btn btn-soft btn-sm" disabled={!!busy} onClick={()=>setLoadKey(k=>k+1)}><RefreshCw size={14}/>Refresh</button>
  </div>
  {files===null?<p className="hint">{error?'MP3 list unavailable. Refresh karke retry karein.':'Loading…'}</p>
   :shown.length===0?<p className="hint">{files.length===0?'Abhi koi MP3 nahi hai. Upar se upload karein.':'Search se koi MP3 nahi mili.'}</p>
   :<div className="stack gap-8">
    {sounds.length>0&&<><p className="hint"><b>App sounds</b></p>{sounds.map(row)}</>}
    {amounts.length>0&&<><p className="hint"><b>Deposit amounts</b></p>{amounts.map(row)}</>}
   </div>}
  <p className="hint">Build ke baad MP3 badalne par naya APK build karna hoga. Existing APKs automatically change nahi hote.</p>
 </section>;
}
