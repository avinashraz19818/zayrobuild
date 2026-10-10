import React,{useEffect,useId,useRef} from 'react';
import {createPortal} from 'react-dom';
import {X} from 'lucide-react';
import {ShieldCheck} from './AnimatedIcon';
export default function ResellerDialog({open,title,subtitle,onClose,children,footer,busy=false,tone=''}){
 const titleId=useId(),ref=useRef(null),closeRef=useRef(onClose),busyRef=useRef(busy);
 closeRef.current=onClose;busyRef.current=busy;
 useEffect(()=>{
  if(!open)return;
  const previous=document.activeElement,overflow=document.body.style.overflow;document.body.style.overflow='hidden';
  const focusables=()=>[...(ref.current?.querySelectorAll('button,input,select,textarea,a[href],[tabindex="0"]')||[])].filter(e=>!e.disabled&&e.getClientRects().length);
  const timer=setTimeout(()=>ref.current?.focus(),0);
  const key=e=>{if(e.key==='Escape'){e.preventDefault();if(!busyRef.current)closeRef.current?.();}if(e.key==='Tab'){const items=focusables(),first=items[0],last=items.at(-1);if(!first){e.preventDefault();return;}if(e.shiftKey&&(document.activeElement===first||document.activeElement===ref.current||!ref.current?.contains(document.activeElement))){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===ref.current||!ref.current?.contains(document.activeElement))){e.preventDefault();first.focus();}}};
  document.addEventListener('keydown',key);
  return()=>{clearTimeout(timer);document.removeEventListener('keydown',key);document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();};
 },[open]);
 useEffect(()=>{if(open)ref.current?.focus();},[open,title]);
 if(!open)return null;
 return createPortal(<div className="rs-modal-overlay" onClick={e=>{if(e.target===e.currentTarget&&!busy)onClose?.();}}><section ref={ref} tabIndex={-1} className={`rs-dialog ${tone}`} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-busy={busy}><header><span className="rs-dialog-icon"><ShieldCheck size={24}/></span><div><h2 id={titleId}>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button className="icon-btn" aria-label="Close popup" disabled={busy} onClick={onClose}><X size={18}/></button></header><div className="rs-dialog-body">{children}</div>{footer&&<footer>{footer}</footer>}</section></div>,document.body);
}
