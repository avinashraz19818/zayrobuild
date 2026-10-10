import React, { useId } from 'react';
import { useStore } from '../context/StoreContext';
import { openTelegramLink } from '../lib/api';

export default function TelegramSupport(){
  const {config}=useStore();
  const gradientId=`support-plane-${useId().replace(/:/g,'')}`;
  // Same configured contact as the bot's Support button, not the panel bot link.
  const url=config?.support_url;
  if(!url)return null;
  return <button type="button" className="telegram-support" aria-label="Telegram support" title="Chat with support on Telegram" onClick={()=>openTelegramLink(url)}>
    <span className="telegram-support-core" aria-hidden="true">
      <svg viewBox="0 0 64 64" focusable="false">
        <defs>
          <linearGradient id={gradientId} x1="16" y1="15" x2="46" y2="49" gradientUnits="userSpaceOnUse"><stop stopColor="#fff"/><stop offset=".5" stopColor="#f2efff"/><stop offset="1" stopColor="#ac9edf"/></linearGradient>
          <linearGradient id={`${gradientId}-fold`} x1="27" y1="29" x2="33" y2="46" gradientUnits="userSpaceOnUse"><stop stopColor="#c4b7ee"/><stop offset="1" stopColor="#76629d"/></linearGradient>
        </defs>
        <path d="M51 15 44 49 33 40 26 46 25 35 12 31Z" fill="#100720" opacity=".5" transform="translate(0 3)"/>
        <path d="M50.8 12.8 11.6 28.2c-2.2.9-2.1 2.2-.3 2.8L24 35l3.1 11.1 6.5-6.2 10.3 8c1.5 1.1 2.6.5 3-1.4l6.4-30.9c.5-2.5-.5-3.6-2.5-2.8Z" fill={`url(#${gradientId})`} stroke="#ffffff" strokeOpacity=".45" strokeWidth=".7"/>
        <path d="m24 35 22-16-17 19-1.9 8.1Z" fill={`url(#${gradientId}-fold)`}/>
        <path d="m29 38 4.6 1.9-6.5 6.2Z" fill="#b8a6de"/>
        <path d="m12 29 39-15M30 37l14.5 10" fill="none" stroke="#fff" strokeOpacity=".65" strokeWidth=".8" strokeLinecap="round"/>
      </svg>
    </span>
  </button>;
}
