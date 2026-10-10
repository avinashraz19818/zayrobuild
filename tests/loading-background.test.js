'use strict';
// Loading/splash HTML ka background, 3D art aur design build me waisa hi rehna chahiye.
// Game-panel injection (fullscreen target-game-frame iframe, background:#000) loading ka background dhak deta tha.
const {test}=require('node:test'),assert=require('node:assert/strict');
const {injectLoadingParams,injectParams}=require('../utils/htmlprocessor');
const {stripIntroSnippet,stripFirebaseLiveScript}=require('../utils/apkbuilder');

const params={registerUrl:'https://panel.example.test/register',depositUrl:'https://panel.example.test/deposit',wingoUrl:'https://panel.example.test/wingo',domain:'panel.example.test',firebasePath:'demo',minDeposit:300,brandTitle:'NEW APP',appIconBase64:'aWNvbg==',isDhani:false};
const LOADING=`<!doctype html><html><head><title>VIP PANEL</title><style>
  html,body{margin:0;background:#050310 url("data:image/png;base64,iVBORw0KGgo=") center/cover no-repeat}
  .art{position:absolute;inset:0;background:url(bg-3d.webp) center/cover;z-index:0}
  .brand-name{color:#fff}
</style></head>
<body><div class="art"></div><div class="wrap" style="position:relative;z-index:2">
  <img src="my_icon.png" alt="">
  <div class="brand-name">VIP PANEL</div>
  <div class="status">SYSTEM // VIP_CORE</div>
</div>
<script>var REGISTER_URL="https://old.example/register";var c=0;setInterval(function(){c++},1000);</script>
</body></html>`;

test('loading HTML keeps its background, 3D art and layout; only brand name, title and icon change',()=>{
  const out=stripFirebaseLiveScript(stripIntroSnippet(injectLoadingParams(LOADING,params)));
  assert.match(out,/background:#050310 url\("data:image\/png;base64,iVBORw0KGgo="\) center\/cover no-repeat/);
  assert.match(out,/\.art\{position:absolute;inset:0;background:url\(bg-3d\.webp\) center\/cover;z-index:0\}/);
  assert.match(out,/<div class="art"><\/div>/);
  assert.match(out,/<div class="status">SYSTEM \/\/ VIP_CORE<\/div>/);
  assert.match(out,/<title>NEW APP<\/title>/);
  assert.match(out,/<div class="brand-name">NEW APP<\/div>/);
  assert.match(out,/src="data:image\/png;base64,aWNvbg=="/);
  assert.doesNotMatch(out,/target-game-frame|zayro-auto-frame-style|UNIVERSAL IN-APP URL HANDLER/);
  assert.doesNotMatch(out,/<iframe/i);
});

test('game-panel injection (used for panels, not loading) still adds the game frame',()=>{
  const out=injectParams(LOADING,params);
  assert.match(out,/id="target-game-frame"/);
});
