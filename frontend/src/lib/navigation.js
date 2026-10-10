const tabs=['home','templates','fakesite','refer','orders','account','wallet','deploy','reseller'];
export function readDestination(location=window.location,telegram=window.Telegram?.WebApp){
 const query=new URLSearchParams(location.search),hash=location.hash.slice(1);
 const starts=[telegram?.initDataUnsafe?.start_param,query.get('tgWebAppStartParam')].filter(Boolean).map(s=>s==='fakesite_accounts'?'fakesite/accounts':s);
 const candidates=[query.get('tab'),hash,...starts];
 for(const candidate of candidates){const [tab,sub]=String(candidate||'').split('/');if(tabs.includes(tab))return {tab,section:tab==='fakesite'&&(query.get('section')==='accounts'||sub==='accounts')?'accounts':null};}
 return {tab:'home',section:null};
}
