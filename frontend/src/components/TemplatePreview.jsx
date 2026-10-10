import {useAuth} from '../context/AuthContext';
import {resellerPrice,resellerPercent} from '../lib/reseller-pricing';
import {Layers, ArrowLeft, ArrowRight} from './AnimatedIcon';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Play, Image as ImageIcon} from 'lucide-react';
import {Sheet} from './ui';
import {getMediaUrl} from '../utils/media';
import {discountOf,priceOf} from './TemplateCard';
import '../hack-preview.css';
export default function TemplatePreview({design,isOpen,onClose,onBuild}){
 const {user}=useAuth();
 const rail=useRef(null),[index,setIndex]=useState(0),[errors,setErrors]=useState({});
 const [sizes,setSizes]=useState({}),[bounds,setBounds]=useState({width:300,height:240});
 const media=useMemo(()=>{
  if(!design)return [];
  const photos=[design.preview_image,...(Array.isArray(design.preview_images)?design.preview_images:[])].filter(Boolean);
  return [...(design.preview_video?[{type:'video',url:design.preview_video}]:[]),...Array.from(new Set(photos)).map(url=>({type:'image',url}))];
 },[design]);
 useEffect(()=>{setIndex(0);setErrors({});setSizes({});if(rail.current)rail.current.scrollLeft=0;},[design,isOpen]);
 useEffect(()=>{
  const box=rail.current;if(!box)return;
  const observer=new ResizeObserver(()=>setBounds({width:box.clientWidth,height:Math.max(1,box.clientHeight-4)}));
  observer.observe(box);return()=>observer.disconnect();
 },[isOpen,design]);
 useEffect(()=>{
  const videos=Array.from(rail.current?.querySelectorAll('video')||[]);
  const update=()=>videos.forEach(v=>{
   if(isOpen&&Number(v.dataset.index)===index&&!document.hidden){v.play()?.catch(()=>{});}else v.pause();
  });
  update();document.addEventListener('visibilitychange',update);
  return()=>{document.removeEventListener('visibilitychange',update);videos.forEach(v=>v.pause());};
 },[index,isOpen,design]);
 useEffect(()=>{const videos=Array.from(rail.current?.querySelectorAll('video')||[]);return()=>videos.forEach(v=>v.pause());},[isOpen,design]);
 if(!design||!isOpen)return null;
 const discount=discountOf(design),maintenance=Number(design.maintenance)===1;
 const go=i=>{const box=rail.current,child=box?.children[i];if(child)box.scrollTo({left:child.offsetLeft-box.children[0].offsetLeft,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});};
 const scroll=()=>{const box=rail.current;if(!box)return;const slides=Array.from(box.querySelectorAll('.hack-media-slide'));let nearest=0,distance=Infinity;slides.forEach((slide,i)=>{const d=Math.abs(slide.offsetLeft-slides[0].offsetLeft-box.scrollLeft);if(d<distance){distance=d;nearest=i;}});setIndex(nearest);};
 const remember=(i,w,h)=>{if(w>0&&h>0)setSizes(prev=>prev[i]===w/h?prev:{...prev,[i]:w/h});};
 const frame=i=>{const ratio=sizes[i]||.75;const width=Math.min(bounds.width,bounds.height*ratio);return {width,height:width/ratio};};

 return <Sheet open showClose={false} onClose={onClose} title={design.name} subtitle="Hack preview · photos & video" className="hack-preview-sheet" overlayClassName="hack-preview-overlay" footer={<div className="hack-preview-actions"><button className="btn btn-outline" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={maintenance} onClick={()=>{rail.current?.querySelectorAll('video').forEach(v=>v.pause());onClose?.();onBuild?.(design);}}>Create APK <ArrowRight size={17}/></button></div>}>
 <div className="hack-preview">
 <div className="hack-preview-summary">{design.preview_image?<img src={getMediaUrl(design.preview_image)} alt="" onError={e=>{e.currentTarget.style.display='none';}}/>:<span className="row-ico"><Layers size={26}/></span>}<div><span className="label">{resellerPercent(user,'apk')?`RESELLER PRICE · ${resellerPercent(user,'apk')}% OFF`:'BUILD PRICE'}</span><div className="hack-preview-price"><b>₹{resellerPrice(priceOf(design),user,'apk').toLocaleString('en-IN')}</b>{discount>0&&<><s>₹{Number(design.original_price_coins).toLocaleString('en-IN')}</s><span>{discount}% OFF</span></>}</div></div></div>
 <div className="flex-row between gap-10"><b className="label">PREVIEW</b><span className="hint">{media.length} items · swipe to view</span></div>
 {media.length?<><div className="hack-media-rail" style={{'--rail-tail':`${Math.max(0,bounds.width-frame(media.length-1).width-14)}px`}} ref={rail} onScroll={scroll} role="region" aria-label="Hack media previews" tabIndex={0} onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(e.key==='ArrowRight'){e.preventDefault();go(Math.min(index+1,media.length-1));}if(e.key==='ArrowLeft'){e.preventDefault();go(Math.max(index-1,0));}}}>{media.map((m,i)=><figure className="hack-media-slide" style={frame(i)} key={`${m.type}-${m.url}`}>{errors[i]?<div className="hack-media-error"><Layers size={28}/><p>Preview unavailable</p><small>Other previews and Create APK are still available.</small></div>:m.type==='video'?<video data-index={i} src={getMediaUrl(m.url)} controls muted loop playsInline autoPlay={index===i} preload="metadata" onLoadedMetadata={e=>remember(i,e.currentTarget.videoWidth,e.currentTarget.videoHeight)} onError={()=>setErrors(e=>({...e,[i]:true}))}/>:<img src={getMediaUrl(m.url)} alt={`${design.name} preview ${i+1}`} onLoad={e=>remember(i,e.currentTarget.naturalWidth,e.currentTarget.naturalHeight)} decoding="async" loading={i>1?'lazy':'eager'} onError={()=>setErrors(e=>({...e,[i]:true}))}/>}<figcaption>{m.type==='video'?<Play size={12}/>:<ImageIcon size={12}/>} {m.type==='video'?'VIDEO':'SCREENSHOT'} · {i+1}</figcaption></figure>)}</div><div className="hack-preview-nav"><button className="btn btn-soft btn-xs" aria-label="Previous preview" disabled={index===0} onClick={()=>go(index-1)}><ArrowLeft size={15}/></button><span aria-live="polite">{index+1} / {media.length}</span><button className="btn btn-soft btn-xs" aria-label="Next preview" disabled={index>=media.length-1} onClick={()=>go(index+1)}><ArrowRight size={15}/></button></div></>:<div className="hack-media-error"><Layers size={30}/><p>No preview uploaded for this hack yet.</p></div>}
 <b className="label">DESCRIPTION</b><div className="hack-preview-description">{design.description||'Choose Create APK to configure this APK.'}</div>
 {maintenance&&<p className="hint">This hack is under maintenance. New builds are unavailable.</p>}

 </div></Sheet>;
}
