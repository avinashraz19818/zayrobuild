'use strict';
const crypto=require('crypto');
const {ReaderError,classify}=require('./crypto-reader-errors');
const TRANSFER='ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const TRON_TOKEN='TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const BSC_TOKEN='0x55d398326f99059ff775485246999027b3197955';
function tronHex(a){const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';let n=0n;for(const c of a){const v=alphabet.indexOf(c);if(v<0)throw Error('Invalid TRON address');n=n*58n+BigInt(v);}const raw=Buffer.from(n.toString(16).padStart(50,'0'),'hex');if(raw.length!==25||raw[0]!==65)throw Error('Invalid TRON address');const check=crypto.createHash('sha256').update(crypto.createHash('sha256').update(raw.subarray(0,21)).digest()).digest().subarray(0,4);if(!check.equals(raw.subarray(21)))throw Error('Invalid TRON checksum');return raw.subarray(1,21).toString('hex');}
const clean=s=>String(s||'').replace(/^0x/,'').toLowerCase();
function decodeLogs(logs,token,to){return (logs||[]).filter(l=>!l.removed&&clean(l.address).replace(/^41(?=.{40}$)/,'')===clean(token)&&l.topics?.length===3&&clean(l.topics[0])===TRANSFER&&clean(l.topics[2])===to.padStart(64,'0')).map(l=>{if(!/^[a-f0-9]{64}$/.test(clean(l.data)))throw Error('Malformed transfer amount');return BigInt('0x'+clean(l.data));});}
function createReaders({env=process.env,fetcher=fetch,known=()=>null}={}){
 async function json(url,body,headers={},operation=body?.method||'TRON API'){
  let u;try{u=new URL(url);if(u.protocol!=='https:')throw Error();}catch{throw new ReaderError('CONFIG',operation);}
  let r;try{r=await fetcher(u,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...headers},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(12000),redirect:'error'});}catch(e){throw new ReaderError(['TimeoutError','AbortError'].includes(e.name)?'TIMEOUT':'NETWORK',operation);}
  if(!r.ok)throw classify(null,r.status,operation);
  let data;try{data=await r.json();}catch{throw new ReaderError('RESPONSE',operation);}
  if(!data||typeof data!=='object')throw new ReaderError('RESPONSE',operation);
  if(data.error)throw classify(data.error,0,operation);return data;
 }
 async function rpc(method,params){const d=await json(env.BSC_RPC_URL,{jsonrpc:'2.0',id:1,method,params});if(d.result===undefined||d.result===null)throw new ReaderError(method==='eth_getBlockByNumber'?'HISTORY':'RESPONSE',method);return d.result;}
 const block=async n=>rpc('eth_getBlockByNumber',['0x'+n.toString(16),false]);
 const tron=async(path,body)=>json('https://api.trongrid.io'+path,body,{'TRON-PRO-API-KEY':env.TRONGRID_API_KEY||''});
 async function trc20(w,c,observe){
  const to=tronHex(w.address),token=tronHex(TRON_TOKEN);
  const start=c.start??Math.max(w.since-60000,0);
  const query=new URLSearchParams({only_confirmed:'true',only_to:'true',contract_address:TRON_TOKEN,limit:'50',order_by:'block_timestamp,asc',min_timestamp:String(start)});
  if(c.fingerprint)query.set('fingerprint',c.fingerprint);
  const page=await tron(`/v1/accounts/${encodeURIComponent(w.address)}/transactions/trc20?${query}`);
  if(page.success!==true||!Array.isArray(page.data))throw Error('Invalid confirmed transfer page');
  let max=c.max||start;
  for(const row of page.data){
   const txid=clean(row.transaction_id);if(!/^[a-f0-9]{64}$/.test(txid))throw Error('Malformed transaction');
   if(row.to!==w.address||row.token_info?.address!==TRON_TOKEN||String(row.token_info?.decimals)!=='6'||row.type!=='Transfer')continue;
   const previous=known('trc20',txid);if(previous){max=Math.max(max,previous.time);continue;}
   const r=await tron('/walletsolidity/gettransactioninfobyid',{value:txid});
   if(clean(r.id)!==txid||!Number.isSafeInteger(r.blockNumber)||!Number.isSafeInteger(r.blockTimeStamp))throw Error('Receipt not solid yet');
   if(r.receipt?.result!=='SUCCESS'||(r.result&&r.result!=='SUCCESS'))continue;
   const amounts=decodeLogs(r.log,token,to);
   // A multi-transfer transaction needs human review, never guess its owner.
   if(amounts.length===1)observe({network:'trc20',txid,address:w.address,micro:String(amounts[0]),time:r.blockTimeStamp});
   max=Math.max(max,r.blockTimeStamp);
  }
  if(page.meta?.links?.next&&!page.meta?.fingerprint)throw Error('Missing pagination cursor');
  return page.meta?.links?.next&&page.meta?.fingerprint?{start,max,fingerprint:page.meta.fingerprint}:{start:Math.max(w.since-60000,max-300000),max};
 }
 async function bep20(w,c,observe){
  if(BigInt(await rpc('eth_chainId',[]))!==56n)throw Error('RPC must be BNB Smart Chain mainnet');
  const latest=Number(BigInt(await rpc('eth_blockNumber',[]))),safe=latest-64;if(!Number.isSafeInteger(latest)||safe<0)throw Error('Invalid chain height');
  let from=c.next;
  if(from===undefined){
   // Find a recent bracket first; do not probe ancient/genesis-era blocks for
   // a new invoice. Expand backwards only when actual catch-up requires it.
   const target=w.since-60000;let hi=safe,lo=safe,step=2048;
   const timestamp=async n=>{const b=await block(n);const t=Number(BigInt(b.timestamp))*1000;if(!Number.isSafeInteger(t))throw new ReaderError('RESPONSE','eth_getBlockByNumber');return t;};
   if(await timestamp(safe)<target)from=safe;
   else{
    while(lo>0){lo=Math.max(0,hi-step);if(await timestamp(lo)<target)break;hi=lo;step*=2;}
    while(lo<hi){const mid=Math.floor((lo+hi)/2);if(await timestamp(mid)<target)lo=mid+1;else hi=mid;}from=lo;
   }
  }
  if(from>safe)return {...c,lag_blocks:0};
  const to=clean(w.address),topic='0x'+to.padStart(64,'0');
  let size=Math.min(500,Math.max(1,Number(c.range)||500)),end,logs;
  for(;;){
   end=Math.min(safe,from+size-1);
   try{logs=await rpc('eth_getLogs',[{fromBlock:'0x'+from.toString(16),toBlock:'0x'+end.toString(16),address:BSC_TOKEN,topics:['0x'+TRANSFER,null,topic]}]);break;}
   catch(e){if(e.code!=='RANGE_LIMIT'||end===from)throw e;size=Math.max(1,Math.floor((end-from+1)/2));}
  }
  if(!Array.isArray(logs)||logs.length>10000)throw Error('Incomplete log range');
  for(const txid of new Set(logs.filter(l=>!l.removed).map(l=>clean(l.transactionHash)))){
   if(!/^[a-f0-9]{64}$/.test(txid))throw Error('Malformed transaction');
   if(known('bep20',txid))continue;
   const r=await rpc('eth_getTransactionReceipt',['0x'+txid]),height=Number(BigInt(r.blockNumber));
   if(clean(r.transactionHash)!==txid||height<from||height>end)throw Error('Receipt range mismatch');
   if(BigInt(r.status)!==1n)continue;
   const b=await block(height);if(clean(b.hash)!==clean(r.blockHash))throw Error('Chain reorganization');
   const amounts=decodeLogs(r.logs,BSC_TOKEN,to);
   if(amounts.length===1&&amounts[0]%1000000000000n===0n)observe({network:'bep20',txid,address:w.address,micro:String(amounts[0]/1000000000000n),time:Number(BigInt(b.timestamp))*1000});
  }
  return {next:end+1,lag_blocks:safe-end,range:size};
 }
 async function ready(network){if(network==='bep20'){
  if(BigInt(await rpc('eth_chainId',[]))!==56n)throw Error('Wrong chain');
  const head=Number(BigInt(await rpc('eth_blockNumber',[]))),height=head-64;if(!Number.isSafeInteger(head)||height<0)throw Error('Invalid chain height');
  const b=await block(height);if(!b.hash||!b.timestamp)throw new ReaderError('RESPONSE','eth_getBlockByNumber');
  const n='0x'+height.toString(16);
  const logs=await rpc('eth_getLogs',[{fromBlock:n,toBlock:n,address:BSC_TOKEN,topics:['0x'+TRANSFER,null,'0x'+'0'.repeat(64)]}]);
  if(!Array.isArray(logs))throw new ReaderError('RESPONSE','eth_getLogs');
  const receipt=await json(env.BSC_RPC_URL,{jsonrpc:'2.0',id:1,method:'eth_getTransactionReceipt',params:['0x'+'0'.repeat(64)]});
  if(!Object.hasOwn(receipt,'result')||(receipt.result!==null&&typeof receipt.result!=='object'))throw new ReaderError('RESPONSE','eth_getTransactionReceipt');
 }else{const b=await tron('/walletsolidity/getnowblock',{});if(!Number.isSafeInteger(b.block_header?.raw_data?.number))throw Error('No solid block');}}

 return {trc20,bep20,ready};
}
module.exports={createReaders,decodeLogs,tronHex,TRANSFER,TRON_TOKEN,BSC_TOKEN};
