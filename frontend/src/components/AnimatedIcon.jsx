import React, {useEffect,useRef} from 'react';
import drawings from '../assets/store-icons.json';
import '../animated-icons.css';

// Mask-free, semantic store icons. Visible outlines exist before animations start.
const nodes=new Map();
let observer,media,mutation;
function sync(){
 const overlay=Boolean(document.querySelector('.overlay'));
 for(const [node,visible] of nodes){
  const reduced=media?.matches;
  if(reduced){node.setCurrentTime?.(120);node.pauseAnimations?.();}
  else if(visible&&!document.hidden&&(!overlay||node.closest('.overlay')))node.unpauseAnimations?.();
  else node.pauseAnimations?.();
  node.dataset.motion=reduced?'reduced':visible&&!document.hidden&&(!overlay||node.closest('.overlay'))?'on':'off';
 }
}
function observe(node){
 if(!media){
  media=window.matchMedia?.('(prefers-reduced-motion: reduce)')||{matches:true};
  media.addEventListener?.('change',()=>{if(!media.matches)for(const n of nodes.keys())n.setCurrentTime?.(0);sync();});
  document.addEventListener('visibilitychange',sync);
  observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{entries.forEach(e=>{if(nodes.has(e.target))nodes.set(e.target,e.isIntersecting);});sync();});
 }
 if(!nodes.size){mutation=new window.MutationObserver(records=>{if(records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&(n.matches?.('.overlay')||n.querySelector?.('.overlay')))))sync();});mutation.observe(document.body,{childList:true,subtree:true});}
 nodes.set(node,!observer);node.pauseAnimations?.();observer?.observe(node);sync();
 return()=>{observer?.unobserve(node);nodes.delete(node);if(!nodes.size)mutation?.disconnect();};
}
function makeIcon(name){
 function Icon({size=24,className='',...props}){
  const ref=useRef(null);useEffect(()=>observe(ref.current),[]);
  return <svg ref={ref} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props} className={`animated-icon store-icon icon-3d animated-${name.toLowerCase()} ${className}`} dangerouslySetInnerHTML={{__html:drawings[name]}}/>;
 }
 Icon.displayName=`Animated${name}`;return Icon;
}
export const House=makeIcon('House');
export const Bot=makeIcon('Bot');
export const Globe=makeIcon('Globe');
export const Sparkles=makeIcon('Sparkles');
export const Wallet=makeIcon('Wallet');
export const Gift=makeIcon('Gift');
export const Package=makeIcon('Package');
export const User=makeIcon('User');
export const ShieldCheck=makeIcon('ShieldCheck');
export const Headphones=makeIcon('Headphones');
export const Smartphone=makeIcon('Smartphone');
export const Layers=makeIcon('Layers');
export const ArrowRight=makeIcon('ArrowRight');
export const ArrowLeft=makeIcon('ArrowLeft');
export const Copy=makeIcon('Copy');
export const Check=makeIcon('Check');
export const RefreshCw=makeIcon('RefreshCw');
export const Zap=makeIcon('Zap');
