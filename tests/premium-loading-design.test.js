'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {injectParams}=require('../utils/htmlprocessor');
const html=fs.readFileSync(path.join(__dirname,'../design-previews/apk-loading/index.html'),'utf8');
test('premium loading design uses existing per-APK name and icon injection',()=>{
 const result=injectParams(html,{registerUrl:'https://example.com/register',depositUrl:'https://example.com/deposit',wingoUrl:'https://example.com/wingo',domain:'example.com',firebasePath:'demo',minDeposit:200,brandTitle:'ROMAN VIP PANEL',appIconBase64:'dGVzdA==',isDhani:false});
 assert.match(result,/<div class="brand-name"[^>]*>ROMAN VIP PANEL<\/div>/);
 assert.match(result,/src="data:image\/png;base64,dGVzdA=="/);
});
test('preview does not change audio ownership, navigation or runtime readiness',()=>{
 assert.doesNotMatch(html,/<audio\b|new Audio\s*\(|ZAYRO\.playSound|location\.(?:href|replace|assign)|<script\b/i);
 assert.doesNotMatch(html,/(?:src|href)=["']https?:/i);
 assert.match(html,/src="my_icon.png"/);
 assert.match(html,/prefers-reduced-motion/);
});
