import './telegram-access.css';
import { timedFetch } from './lib/timed-fetch';
import { loadAccessPolicy } from './lib/access-policy';
import { authFailure } from './lib/auth-failure.js';
import { setBootStage } from './lib/boot-loader.js';
// The customer app is not imported/rendered until a signed Telegram launch is accepted.
const path=location.pathname.replace(/\/+$/,'').toLowerCase();
const admin=path==='/admin'||location.hash.replace(/^#\/?/,'').toLowerCase()==='admin';
const bootTitle=document.title,bootShell=document.getElementById('root').innerHTML;
function restoreBootShell(){document.title=bootTitle;document.getElementById('root').innerHTML=bootShell;}
let retryAfterSdkLoad=false;
window.addEventListener('telegram-sdk-ready',()=>{
 if(retryAfterSdkLoad&&window.Telegram?.WebApp?.initData){
  retryAfterSdkLoad=false;
  void boot().catch(loadFailed);
 }
},{once:true});
function loadFailed(){
 const status=document.getElementById('boot-status');
 if(status)status.textContent='Panel files could not finish loading. Check your connection and reload.';
 const retry=document.getElementById('boot-reload');if(retry)retry.hidden=false;
 document.querySelector('.boot-screen')?.setAttribute('aria-busy','false');
}
function showTelegramShell(){
 // The public loading/error shell is ready to display. This is not login approval.
 // Waiting for React/auth before ready() can leave Telegram's native splash up.
 try{window.Telegram?.WebApp?.ready?.();}catch{}
}
function telegramReady(){
 if(window.Telegram?.WebApp){showTelegramShell();return Promise.resolve();}
 return new Promise(resolve=>{
  const script=document.createElement('script');const timer=setTimeout(resolve,5000);
  const finish=()=>{clearTimeout(timer);resolve();};
  script.src='https://telegram.org/js/telegram-web-app.js';script.async=true;
  script.onload=()=>{showTelegramShell();finish();window.dispatchEvent(new Event('telegram-sdk-ready'));};script.onerror=finish;document.head.appendChild(script);
 });
}
function restricted(botLink,reason='',signInFailed=false){
 document.title='Telegram access only · ZAYRO BUILD';
 const root=document.getElementById('root');
 root.innerHTML='<main class="tg-access-page"><section class="tg-access-card"><div class="tg-access-symbol" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m12 3 8 4v5c0 5-8 9-8 9s-8-4-8-9V7l8-4Z"/><path d="m8 12 3 3 5-6"/></svg></div><span class="tg-access-eyebrow">PRIVATE TELEGRAM MINI APP</span><h1>Open inside Telegram.</h1><p>This panel is available only through our official bot. Direct browser access is restricted.</p><div class="tg-access-note">Secure launch verification is required.<br>Your wallet and orders stay protected.</div><p class="tg-access-reason" role="status"></p><a class="tg-access-open" hidden>Open Telegram bot <span aria-hidden="true">↗</span></a><button class="tg-access-retry" type="button">Check access again</button><small>Open the bot, then tap its Mini App / Open Panel button.</small></section></main>';
 root.querySelector('.tg-access-reason').textContent=reason;
 if(signInFailed){
  document.title='Panel sign-in failed · ZAYRO BUILD';
  root.querySelector('h1').textContent='Panel sign-in failed.';
  root.querySelector('.tg-access-card > p').textContent='Telegram opened the panel, but the server did not complete sign-in.';
 }
 const link=root.querySelector('a');
 if(/^https:\/\/t\.me\/[A-Za-z0-9_]{5,32}$/.test(botLink||'')){link.href=botLink;link.hidden=false;link.rel='noopener noreferrer';}
 else root.querySelector('.tg-access-note').textContent='Open the official Telegram bot to continue. If you cannot find it, contact the panel owner.';
 root.querySelector('button').onclick=()=>{const u=new URL(location.href);u.searchParams.delete('telegram_access');location.replace(u.href);};
}
async function boot(){
 if(admin){await import('./main.jsx');return;}
 // SDK loading and display-ready must not depend on a successful API response.
 const sdkReady=telegramReady();
 let policy;
 try{policy=await loadAccessPolicy();}
 catch{restricted('','Access could not be checked. Please reopen from the Telegram bot.');return;}
 // Only isolated preview servers return false. Production always requires a signed launch.
 if(policy.telegram_only===false){await import('./main.jsx');return;}
 if(new URLSearchParams(location.search).get('telegram_access')==='expired'){restricted(policy.bot_link,'Your session ended. Close this Mini App and open it again from the bot.');return;}
 setBootStage('Preparing your secure session…',42);
 await sdkReady;
 setBootStage('Checking your session…',62);
 const webApp=window.Telegram?.WebApp;
 if(!webApp?.initData){retryAfterSdkLoad=!webApp;restricted(policy.bot_link,!webApp?'Telegram is taking longer to connect. The panel will retry when it is ready.':'');return;}
 try{
  const {response:res,data:result}=await timedFetch('/api/auth/telegram-webapp',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({initData:webApp.initData,start_param:webApp.initDataUnsafe?.start_param||null})},30000,r=>r.json());
  if(!res.ok||!result.success){restricted(policy.bot_link,authFailure(res.status,result),true);return;}
 }catch{restricted(policy.bot_link,'Connection interrupted. Please reopen from the bot or try again.');return;}
 // Authentication succeeded. Bundle failures are not access denials.
 // A late SDK may have replaced the initial shell with the restriction card.
 if(!document.getElementById('boot-status'))restoreBootShell();
 setBootStage('Opening your panel…',78);
 window.__verifiedMiniAppLaunch=true;
 await import('./main.jsx');
}
boot().catch(loadFailed);
