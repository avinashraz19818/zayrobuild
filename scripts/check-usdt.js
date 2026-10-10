#!/usr/bin/env node
'use strict';
// Read-only diagnostics. Does not scan/credit, reset cursors or print credentials.
const path=require('path'),fs=require('fs');
const root=path.resolve(__dirname,'..');require('dotenv').config({path:path.join(root,'.env')});
const {createReaders}=require('../utils/crypto-readers');
const {safeReaderError}=require('../utils/crypto-reader-errors');
(async()=>{
 console.log('USDT read-only diagnostics — uses this shell/.env configuration. No balance changes.');
 const readers=createReaders();
 for(const network of ['trc20','bep20']){
  const configured=!!process.env[network==='trc20'?'TRONGRID_API_KEY':'BSC_RPC_URL'];
  console.log(`\n${network.toUpperCase()}: auto flag ${process.env[`USDT_${network.toUpperCase()}_AUTO`]==='true'?'ON':'OFF'}, provider ${configured?'configured':'missing'}`);
  if(configured)try{await readers.ready(network);console.log('PASS: required provider methods responded. This is not a real-payment verification.');}catch(e){console.log('FAIL: '+safeReaderError(e));process.exitCode=1;}
 }
 const file=path.join(root,'database/apkbuilder.db');
 if(!fs.existsSync(file)){console.log('\nNo live database found here.');return;}
 const db=new (require('better-sqlite3'))(file,{readonly:true,fileMustExist:true});
 try{
  console.log('\nSaved reader status:');
  for(const r of db.prepare('SELECT network,last_ok,error FROM crypto_cursors').all())console.log(`${r.network.toUpperCase()}: last success ${r.last_ok?new Date(r.last_ok).toISOString():'never'}; ${r.error||'no recorded error'}`);
  console.log('\nLatest five invoices (reported proof amounts are NOT independent chain evidence):');
  const rows=db.prepare(`SELECT i.network,q.amount,i.state,r.status,r.approved_by,rd.received_amount FROM crypto_invoices i JOIN deposit_quotes q ON q.id=i.quote_id LEFT JOIN coin_requests r ON r.id=q.request_id LEFT JOIN crypto_review_details rd ON rd.request_id=r.id ORDER BY q.created_at DESC LIMIT 5`).all();
  for(const r of rows)console.log(`${r.network}: expected ${r.amount} USDT; proof ${r.received_amount||'none'}; ${r.status||r.state}; credit source ${r.status==='approved'?(r.approved_by==='blockchain'?'automatic':'manual'):'not credited'}`);
 }catch{console.log('Payment tables not available. Update/restart panel first.');process.exitCode=1;}finally{db.close();}
 console.log('\nA successful probe does not prove exact-amount matching or exchange-account credit. Do not resend an already approved payment.');
})().catch(()=>{console.error('Diagnostic could not complete. Check Node.js/dependencies and server configuration.');process.exitCode=1;});
