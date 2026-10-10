'use strict';
const SECTIONS=new Set(['home','templates','fakesite','fakesite/accounts','deploy','orders','wallet','refer','account']);
function httpsUrl(value){try{const u=new URL(String(value));if(u.protocol==='https:'&&!u.username&&!u.password)return u.href;}catch{}return null;}
function panelLink(base,section='home'){const url=httpsUrl(base);if(!url||!SECTIONS.has(section))return null;const u=new URL(url);const [tab,sub]=section.split('/');u.searchParams.set('tab',tab);if(sub)u.searchParams.set('section',sub);else u.searchParams.delete('section');u.hash=section;return u.href;}
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function siteNotice(lease,phase,admin,base){
 const status={purchase:'Account ready',renewal:'Renewal confirmed',reminder:'Expires within 24 hours',expired:'Expired'}[phase]||'Account update';
 const date=new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Kolkata'}).format(new Date(lease.expires_at));
 const website=httpsUrl(lease.url),panel=panelLink(base,'fakesite/accounts');
 const text=`<tg-emoji emoji-id="5427168083074628963">💎</tg-emoji> <b>${esc(lease.product_name)} — ${status}</b>\n<blockquote>PREMIUM WEBSITE ACCESS</blockquote>\n👤 <b>Account #${lease.id}</b>\n<code>${esc(lease.username)}</code>\n\n🗓 <b>Valid until</b>\n${esc(date)} IST${website?'\n\n🌐 <b>Your website</b>\n'+esc(website):''}\n\n${admin?(phase==='expired'?'Disable this account on the website. Change its password before restocking.':'Customer #'+lease.user_id+(phase==='renewal'?' renewed. Keep this account active until the expiry shown.':' may renew before expiry.')):(phase==='expired'?'Renew to receive a new account, subject to stock.':'Your login details are securely available in My accounts.')}\n\n<i>Keep your login details private.</i>`;
 const rows=[];
 if(website)rows.push([{text:'Open purchased website',emoji:'🌐',icon:'5427168083074628963',style:'success',url:website}]);
 if(panel)rows.push([{text:admin?'Manage website stock':phase==='expired'?'Renew account':'My accounts · Renew',emoji:'🔑',icon:'5296369303661067030',style:'primary',...(admin?{url:new URL('/admin',base).href}:{web_app:{url:panel}})}]);
 return {text,replyMarkup:{inline_keyboard:rows,templateKey:'site-'+phase}};
}
module.exports={panelLink,httpsUrl,esc,siteNotice};
