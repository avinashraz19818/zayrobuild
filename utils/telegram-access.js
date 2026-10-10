'use strict';
const crypto=require('crypto');
const MAX_AGE_SECONDS=6*60*60;
const digest=value=>crypto.createHash('sha256').update(String(value)).digest('hex');
function verifyTelegramWebAppData(initData,token,now=Date.now()){
 if(typeof initData!=='string'||!initData||initData.length>16000||!token)return null;
 try{
  const p=new URLSearchParams(initData),keys=[...p.keys()];
  if(new Set(keys).size!==keys.length)return null;
  const hash=p.get('hash')||'',date=Number(p.get('auth_date')),seconds=Math.floor(now/1000);
  if(!/^[a-f0-9]{64}$/i.test(hash)||!Number.isSafeInteger(date)||date<=0||date>seconds+30||seconds-date>MAX_AGE_SECONDS)return null;
  p.delete('hash');
  const check=[...p.keys()].sort().map(k=>`${k}=${p.get(k)}`).join('\n');
  const secret=crypto.createHmac('sha256','WebAppData').update(String(token)).digest();
  const expected=crypto.createHmac('sha256',secret).update(check).digest();
  if(!crypto.timingSafeEqual(expected,Buffer.from(hash,'hex')))return null;
  const user=JSON.parse(p.get('user')||'null');
  if(!user||!Number.isSafeInteger(user.id)||user.id<=0)return null;
  return user;
 }catch{return null;}
}
function launchSession(initData){const p=new URLSearchParams(initData);return {miniAppHash:digest(initData),miniAppExpiresAt:(Number(p.get('auth_date'))+MAX_AGE_SECONDS)*1000};}
function validSession(req,now=Date.now()){return Number(req.session?.userId)>0&&/^[a-f0-9]{64}$/.test(req.session?.miniAppHash||'')&&Number(req.session.miniAppExpiresAt)>now;}
function deny(res){return res.status(403).set('Cache-Control','no-store').json({code:'MINI_APP_REQUIRED',error:'Open this panel from the Telegram bot Mini App. Close and reopen the Mini App if your session expired.'});}
function gate(req,res,next){
 const p=req.path.toLowerCase().replace(/\/+$/,'')||'/';
 // Admin endpoints retain their own admin authentication; this is NOT an admin auth bypass.
 if(p==='/api/access-policy'||p==='/api/auth/telegram-webapp'||p==='/api/logout'||p.startsWith('/api/admin/'))return next();
 // Existing APK runtime protocols must work outside Telegram. Their own path/access validation remains unchanged.
 if(p.startsWith('/api/app-content/')||p.startsWith('/api/rtdb/'))return next();
 if(p==='/api/login'||p==='/api/register'||p.startsWith('/auth/'))return deny(res); // no legacy browser sign-in link / Google OAuth bypass
 if(!p.startsWith('/api/'))return next(); // HTML is an inert bootstrap until a signed launch is verified
 if(req.session?.isAdmin===true)return next();
 if(!validSession(req))return deny(res);
 // Navigation downloads and img/video requests cannot attach custom headers.
 // Still require a recently verified Mini App session plus the route's ownership checks.
 if((req.method==='GET'||req.method==='HEAD')&&(p.startsWith('/api/files/')||/^\/api\/orders\/\d+\/(?:download|download-fake|fake-sites\/\d+\/download)$/.test(p)))return next();
 const proof=req.get('X-Telegram-Init-Data');
 if(typeof proof!=='string'||proof.length>16000||!crypto.timingSafeEqual(Buffer.from(digest(proof),'hex'),Buffer.from(req.session.miniAppHash,'hex')))return deny(res);
 return next();
}
module.exports={gate,verifyTelegramWebAppData,launchSession,validSession,MAX_AGE_SECONDS};
