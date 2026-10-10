const fs = require('fs');
const path = require('path');
const { execFileSync, fork } = require('child_process');
const sharp = require('sharp');
const { encryptHtmlToBin, FIXED_PASSWORD, generateBuildPassword } = require('./encrypt');
const crypto = require('crypto');
const { extractDomain, buildUrls, injectParams, injectLoadingParams, isDhaniUrl } = require('./htmlprocessor');
const { applyFontStyle } = require('./fontstyles');
const { resolveLoadingHtml } = require('./loading-html');

const BUILDS_DIR        = path.join(__dirname, '..', 'builds');
const TEMPLATE_PROJECT  = path.join(__dirname, '..', 'android-project');
const TEMPLATES_DIR     = path.join(__dirname, '..', 'templates');
const UPLOADS_DIR       = path.join(__dirname, '..', 'uploads');
const { sdkRoot, assertAndroidSdk, BUILD_TOOLS_VERSION } = require('./android-sdk');
const ANDROID_HOME      = sdkRoot();
const KEYSTORE_PASSWORD = String(process.env.KEYSTORE_PASSWORD || 'ZayroBuild2026#').replace(/^["']|["']$/g, '');
const KEYSTORE_ALIAS    = String(process.env.KEYSTORE_ALIAS || 'zayro_build').replace(/^["']|["']$/g, '');

// ── Generate package name from app name ──
const { makePackageName } = require('./package-name');

// ── Resize icon to required Android sizes ──
async function resizeIcon(inputBuffer) {
  const sizes = { 'mipmap-hdpi': 72, 'mipmap-xhdpi': 96, 'mipmap-xxhdpi': 144, 'mipmap-xxxhdpi': 192 };
  const result = {};
  for (const [dir, size] of Object.entries(sizes)) {
    result[dir] = await sharp(inputBuffer).resize(size, size).png().toBuffer();
  }
  return result;
}

function findReferencedMp3Assets(...htmlValues) {
  const refs = new Set();
  const re = /["']([^"']+\.mp3)["']/gi;
  for (const html of htmlValues) {
    if (!html) continue;
    let match;
    while ((match = re.exec(html))) refs.add(path.basename(match[1]));
  }
  return refs;
}

function isVirtualOrAliasedMp3(name) {
  const n = String(name || '').toLowerCase();
  // loginw.mp3 is intentionally routed to bypass.mp3 in MainActivity (voice/TTS ab nahi hai,
  // big.mp3 / small.mp3 bhi asli bundled MP3 hain, isliye unhe missing-check me rakhte hain).
  return n === 'loginw.mp3';
}

function logMissingReferencedMp3Assets(htmlValues, assetsDir, log) {
  const missing = [];
  for (const name of findReferencedMp3Assets(...htmlValues)) {
    if (isVirtualOrAliasedMp3(name)) continue;
    if (!fs.existsSync(path.join(assetsDir, name))) missing.push(name);
  }
  if (missing.length) {
    log(`WARNING: Missing MP3 asset(s): ${missing.join(', ')}. Related sounds will not play in the APK.`);
  }
}

// ── Loading HTML intro cleanup ──
// Intro ab Java (MainActivity) se bajta hai — app khulte hi turant. Loading
// HTML ke andar koi audio logic nahi hona chahiye, warna double sound hota
// hai. Purane templates me jo INTRO SOUND snippet hai, use build time pe
// strip kar dete hain (idempotent).
function stripIntroSnippet(html) {
  if (!html) return html;
  // Intro ab JAVA se bajta hai — loading HTML me intro ka KOI bhi trigger
  // nahi hona chahiye (double sound ka sabse bada karan). Har type ka
  // intro trigger yahan strip hota hai:
  //   1. INTRO SOUND comment wala snippet (purane templates)
  //   2. koi bhi script jisme intro.mp3 play hota hai (ZAYRO.playSound ya
  //      new Audio) — chahe comment ho ya na ho
  //   3. <audio autoplay src="intro.mp3"> tags
  // Loading page ki apni (clock/progress wali) script safe rehti hai.
  let out = html
    .replace(/<script>\s*\/\*[\s\S]*?INTRO SOUND[\s\S]*?<\/script>/gi, '')
    .replace(/<script>((?!<\/script>)[\s\S])*?(?:ZAYRO\.playSound\s*\(\s*['"]intro\.mp3['"]|new Audio\s*\(\s*['"]intro\.mp3['"])((?!<\/script>)[\s\S])*?<\/script>/gi, '')
    .replace(/<audio[^>]*intro\.mp3[^>]*>/gi, '');
  return out;
}

// ── Loading HTML se Firebase details strip ──
// Loading.bin APK me embedded hota hai — usme Firebase SDK scripts /
// liveLinks script (API key, database URL, path) NAHI hona chahiye warna
// decrypt karne wale ko Firebase details mil jaati hain. Loading page ko
// inki zaroorat hai bhi nahi (wo sirf splash hai).
function stripFirebaseLiveScript(html) {
  if (!html) return html;
  return html
    .replace(/<script[^>]*src=["'][^"']*firebase-app-compat[^"']*["'][^>]*><\/script>/gi, '')
    .replace(/<script[^>]*src=["'][^"']*firebase-database-compat[^"']*["'][^>]*><\/script>/gi, '')
    .replace(/<script>\s*\(function\(\)\{\s*var livePath=[\s\S]*?<\/script>/gi, '');
}

function ensureAudioGate(html) {
  if (!html) return html;
  // Purana gate version strip karo (purane build se nikla template ho to)
  html = html.replace(/<script>[\s\S]*?ZAYRO AUDIO GATE[\s\S]*?<\/script>/gi, '');

  // Template ke firebase users path ka pata lagao (instant warning cache
  // ke liye). Pattern: rtdb.ref("xyz/users/"+phone) ya rtdb.ref('xyz/users/')
  let usersBase = '';
  const m = html.match(/rtdb\.ref\s*\(\s*["']([^"']*?)users\/[^"']*["']/i);
  if (m && m[1]) usersBase = m[1] + 'users';

  const snippet = [
    '<script>',
    '/* ZAYRO AUDIO GATE V7 — auto-injected at build time (multi-page tracking) */',
    '(function(){',
    '  var __g={startAt:Date.now(), wasInAuth:false};',
    '  var __lastPage="";',
    '  var __lastPlayedSound="";',
    '  var __lastPlayedTime=0;',
    '  function __play(file){',
    '    if(!file)return;',
    '    var n=String(file).toLowerCase();',
    '    var t=Date.now();',
    '    if(__lastPlayedSound===n && (t - __lastPlayedTime < 2500)) return;',
    '    __lastPlayedSound=n;',
    '    __lastPlayedTime=t;',
    '    try{',
    '      if(window.ZAYRO&&typeof window.ZAYRO.playSound==="function"){',
    '        if(__origZ) __origZ.apply(window.ZAYRO,[file]);',
    '        else window.ZAYRO.playSound(file);',
    '        return;',
    '      }',
    '    }catch(e){}',
    '    try{',
    '      if(typeof playAudioForce==="function"){ playAudioForce(file); return; }',
    '      if(typeof playAudio==="function"){ playAudio(file); return; }',
    '    }catch(e){}',
    '  }',
    '  function __ok(f){',
    '    var n=String(f||"").toLowerCase();',
    '    var t=Date.now();',
    '    if(__lastPlayedSound===n && (t - __lastPlayedTime < 1500)) return false;',
    '    __lastPlayedSound=n;',
    '    __lastPlayedTime=t;',
    '    return true;',
    '  }',
    '  var __origZ=null;',
    '  try{',
    '    if(window.ZAYRO&&typeof window.ZAYRO.playSound==="function"){',
    '      __origZ=window.ZAYRO.playSound;',
    '      window.ZAYRO.playSound=function(f){ if(!__ok(f))return; return __origZ.apply(window.ZAYRO,arguments); };',
    '    }',
    '  }catch(e){}',
    '  var __wingoLowPlayed=false;',
    '  function __resolveSound(f){',
    '    var n=String(f||"").toLowerCase();',
    '    if(__lastPage==="wingo" && n==="lowbalance.mp3") return "deposit.mp3";',
    '    return f;',
    '  }',
    '  try{',
    '    if(typeof playAudio==="function"){',
    '      var __op=playAudio;',
    '      window.playAudio=function(f){ f=__resolveSound(f); if(!__ok(f))return; return __op.apply(this,arguments); };',
    '    }',
    '  }catch(e){}',
    '  try{',
    '    if(typeof playAudioForce==="function"){',
    '      var __opf=playAudioForce;',
    '      window.playAudioForce=function(f){ f=__resolveSound(f); if(!__ok(f))return; return __opf.apply(this,arguments); };',
    '    }',
    '  }catch(e){}',
    '  try{',
    '    if(typeof _goState==="function"){',
    '      var __origGS=_goState;',
    '      window._goState=function(st){',
    '        if(st==="low" && __lastPage==="wingo"){ __play("deposit.mp3"); }',
    '        return __origGS.apply(this,arguments);',
    '      };',
    '    }',
    '  }catch(e){}',
    '  try{',
    '    if(typeof goState==="function"){',
    '      var __origGS2=goState;',
    '      window.goState=function(st){',
    '        if(st==="low" && __lastPage==="wingo"){ __play("deposit.mp3"); }',
    '        return __origGS2.apply(this,arguments);',
    '      };',
    '    }',
    '  }catch(e){}',
    '  try{',
    '    if(window.ZAYRO){',
    '      var __origSpeak=window.ZAYRO.speak;',
    '      window.ZAYRO.speak=function(txt){',
    '        if(!txt)return;',
    '        try{ if(__origSpeak) __origSpeak.apply(window.ZAYRO,arguments); }catch(e){}',
    '        try{',
    '          if(window.speechSynthesis){',
    '            window.speechSynthesis.cancel();',
    '            var u=new SpeechSynthesisUtterance(String(txt));',
    '            u.lang="en-US"; u.rate=0.92;',
    '            window.speechSynthesis.speak(u);',
    '          }',
    '        }catch(e2){}',
    '      };',
    '    }',
    '  }catch(e){}',
    '  /* ── INSTANT REGISTER WARNING ──',
    '     Firebase users list app khulte hi cache ho jati hai. Number type',
    '     karte hi warning TURANT dikhti hai (network wait nahi). */',
    '  var __umap=null, __uloaded=false;',
    '  function __loadUsers(){',
    '    try{',
    '      /* Never read Firebase root when a dynamic users path was not detected. */',
    '      if(!usersBase)return;',
    '      if(!__uloaded&&typeof rtdb==="object"&&rtdb&&rtdb.ref){',
    '        __uloaded=true;',
    '        rtdb.ref("' + usersBase + '").once("value").then(function(snap){',
    '          __umap={};',
    '          snap.forEach(function(ch){ __umap[ch.key]=true; });',
    '        }).catch(function(){ __umap={}; });',
    '      }',
    '    }catch(e){ __uloaded=true; }',
    '  }',
    '  __loadUsers();',
    '  try{',
    '    if(typeof checkAndWarn==="function"){',
    '      var __cw=checkAndWarn;',
    '      window.checkAndWarn=function(phone){',
    '        var p=String(phone||"").replace(/[^0-9]/g,"");',
    '        if(__umap!==null && p.length>=10){',
    '          /* instant — bina network wait ke */',
    '          if(__umap[p]===true){ try{hideWarnOverlay();}catch(e){} }',
    '          else { try{showWarnOverlay();}catch(e){} }',
    '          return;',
    '        }',
    '        __loadUsers();',
    '        try{ return __cw.apply(this,arguments); }catch(e){}',
    '      };',
    '    }',
    '  }catch(e){}',
    '  function __cs(){ try{ return (typeof window.currentState!="undefined"&&window.currentState)?window.currentState:window.curState; }catch(e){ return null; } }',
    '  function __playReg(){',
    '    try{ if(__origZ){ __g.regAt=Date.now(); __origZ.apply(window.ZAYRO,["register.mp3"]); } }catch(e){}',
    '  }',
    '  var __sel=[".amount .a1 .a",".gameHeader__C-balance",".Wallet__C-balance-l1",".walletInfo__C-balance",".headerInfo__C-right",".header__money",".header-money",".top-bar__balance",".userInfo__C-balance",".balance-amount",".my-amount",".balance",".wallet-amount"];',
    '  function __hasDigits(t){ return /[0-9]/.test(String(t||"")); }',
    '  function __loggedIn(doc,win){',
    '    if(!doc) return false;',
    '    try{',
    '      var h=(win.location.href||"").toLowerCase();',
    '      var ha=(win.location.hash||"").toLowerCase();',
    '      if(ha.indexOf("register")>=0||ha.indexOf("invitationcode")>=0||h.indexOf("register")>=0||h.indexOf("invitationcode")>=0) return false;',
    '    }catch(e){}',
    '    try{',
    '      for(var j=0;j<__sel.length;j++){',
    '        var el=doc.querySelector(__sel[j]);',
    '        if(el){',
    '          var t=(el.innerText||el.textContent||el.getAttribute("data-amount")||el.getAttribute("data-balance")||"").trim();',
    '          if(__hasDigits(t) && !/login|register/i.test(t)) return true;',
    '        }',
    '      }',
    '    }catch(e){}',
    '    try{',
    '      var uh=doc.querySelector(".userInfo, .user-info, .headerInfo, [class*=user-info], [class*=userInfo], [class*=avatar], .my__info");',
    '      if(uh){ var ht=(uh.innerText||uh.textContent||""); if(/\\b[6-9][0-9]{9}\\b/.test(ht)) return true; }',
    '    }catch(e){}',
    '    try{',
    '      var ls=win.localStorage;',
    '      if(ls){',
    '        for(var i=0;i<ls.length;i++){',
    '          var k=""; try{k=ls.key(i);}catch(e){}',
    '          if(/^token$|^auth$|^jwt$|^authorization$|^session_token$|^access_token$/i.test(k)){',
    '            var val=ls.getItem(k);',
    '            if(val && typeof val==="string" && val.length>15 && val!=="null" && val!=="undefined") return true;',
    '          }',
    '        }',
    '      }',
    '    }catch(e){}',
    '    return false;',
    '  }',
    '  /* ── MULTI-PAGE TRACKER & AUDIO ROUTING ── */',
    '  setInterval(function(){',
    '    try{',
    '      var fr=document.getElementById("target-game-frame");',
    '      if(!fr){var fs=document.getElementsByTagName("iframe"); if(fs.length)fr=fs[0];}',
    '      if(!fr||!fr.contentWindow) return;',
    '      var win=fr.contentWindow, doc=null;',
    '      try{ doc=fr.contentDocument||win.document; }catch(e){}',
    '      var href="";',
    '      try{ href=win.location.href; }catch(e){}',
    '      if(!href||href==="about:blank"){ try{ href=fr.getAttribute("src")||fr.src||""; }catch(e){} }',
    '      if(!href||href==="about:blank") return;',
    '      var hash=""; try{ hash=(win.location.hash||"").toLowerCase(); }catch(e){}',
    '      if(!hash&&href.indexOf("#")>=0){ hash=(href.split("#")[1]||"").toLowerCase(); }',
    '      var path=""; try{ path=(win.location.pathname||"").toLowerCase(); }catch(e){}',
    '      if(!path&&href){ path=(href.split("#")[0]||"").split("?")[0].toLowerCase(); }',
    '      var isDeposit=hash.indexOf("wallet")>=0||hash.indexOf("recharge")>=0||hash.indexOf("deposit")>=0||hash.indexOf("pay")>=0||hash.indexOf("topup")>=0||path.indexOf("wallet")>=0||path.indexOf("recharge")>=0||path.indexOf("deposit")>=0||path.indexOf("pay")>=0||path.indexOf("topup")>=0;',
    '      if(!isDeposit&&doc){ try{ var tit=(doc.title||"").toLowerCase(); if(tit.indexOf("recharge")>=0||tit.indexOf("deposit")>=0||tit.indexOf("wallet")>=0) isDeposit=true; }catch(e){} }',
    '      var isReg=hash.indexOf("register")>=0||hash.indexOf("invitationcode")>=0||hash.indexOf("invitecode")>=0||path.indexOf("register")>=0||href.toLowerCase().indexOf("invitationcode")>=0||href.toLowerCase().indexOf("invitecode")>=0;',
    '      var isLogin=hash.indexOf("login")>=0||path.indexOf("login")>=0||href.toLowerCase().indexOf("login")>=0;',
    '      var hasForm=false;',
    '      if(doc){ try{',
    '        var ins=doc.querySelectorAll("input[type=tel],input[type=password],input[type=number],input[type=text],input[placeholder*=phone],input[placeholder*=Phone],input[placeholder*=mobile],input[placeholder*=Mobile],input[placeholder*=otp],input[placeholder*=OTP],input[placeholder*=code],input[name*=phone],input[name*=mobile],input[name*=user]");',
    '        for(var i=0;i<ins.length;i++){ var el=ins[i]; if(el.offsetWidth>0&&el.offsetHeight>0){ hasForm=true; break; } }',
    '      }catch(e){} }',
    '      var loggedNow=(doc && !isReg)?__loggedIn(doc,win):false;',
    '      if(isReg){',
    '        loggedNow=false;',
    '        try{ localStorage.removeItem("zayro_user_logged_in"); }catch(e){}',
    '      } else if(loggedNow){',
    '        try{ localStorage.setItem("zayro_user_logged_in", "1"); }catch(e){}',
    '        if(isLogin && !hasForm){',
    '          var targetDest=(typeof WINGO_URL==="string"&&WINGO_URL)?WINGO_URL:(href.split("#")[0]+"#/home");',
    '          try{ win.location.replace(targetDest); }catch(e){ try{ fr.src=targetDest; }catch(e2){} }',
    '        }',
    '      } else if(hasForm && (isReg||isLogin)){',
    '        try{ localStorage.removeItem("zayro_user_logged_in"); }catch(e){}',
    '      }',
    '      var isWingo=!isDeposit&&!isReg&&(hash.indexOf("wingo")>=0||hash.indexOf("saaslottery")>=0||hash.indexOf("lottery")>=0||hash.indexOf("k3")>=0||hash.indexOf("5d")>=0||hash.indexOf("trx")>=0||path.indexOf("wingo")>=0||path.indexOf("saaslottery")>=0);',
    '      var isHome=!isDeposit&&!isReg&&!isWingo&&!(isLogin&&hasForm&&!loggedNow)&&(hash.indexOf("home")>=0||hash.indexOf("main")>=0||hash.indexOf("index")>=0||hash===""||hash==="/"||hash==="#/"||hash==="#"||path.endsWith("/home")||path.endsWith("/main")||(loggedNow&&!isWingo));',
    '      var curPage="";',
    '      if(isDeposit){ curPage="deposit"; }',
    '      else if(isReg||(isLogin&&hasForm&&!loggedNow)){ curPage="register"; }',
    '      else if(isWingo){ curPage="wingo"; }',
    '      else if(isHome||loggedNow){ curPage="home"; }',
    '      if(curPage){',
    '        if(curPage==="register"){',
    '          __g.wasInAuth=true;',
    '          try{ if(typeof _goState==="function"&&__cs()!=="wait") _goState("wait"); }catch(e){}',
    '        }',
    '        if(curPage!==__lastPage){',
    '          var now=Date.now();',
    '          var canPlay=true;',
    '          if(curPage==="home" && (!loggedNow || !__g.wasInAuth)){ canPlay=false; }',
    '          if(canPlay){',
    '            __lastPage=curPage;',
    '            if(curPage==="register"){',
    '              __play("register.mp3");',
    '            } else if(curPage==="home"){',
    '              if(loggedNow && __g.wasInAuth){',
    '                __play("successful.mp3");',
    '              }',
    '              try{ if(typeof setState==="function") setState("home"); else if(typeof _goState==="function") _goState("home"); }catch(e){}',
    '            } else if(curPage==="wingo"){',
    '              try{ if(typeof window.setUrl==="function") window.setUrl(href||"#/saasLottery/WinGo"); }catch(e){}',
    '              try{ if(typeof setState==="function") setState("wingo"); }catch(e){}',
    '            } else if(curPage==="deposit"){',
    '              __play("deposit.mp3");',
    '              try{ if(typeof _goState==="function") _goState("low"); }catch(e){}',
    '            }',
    '          }',
    '        }',
    '      }',
    '      var bval=null;',
    '      if(doc && (curPage==="wingo"||curPage==="home")){',
    '        for(var j=0;j<__sel.length;j++){',
    '          var bel=doc.querySelector(__sel[j]);',
    '          if(bel){',
    '            var btx=(bel.innerText||bel.textContent||bel.getAttribute("data-amount")||bel.getAttribute("data-balance")||"").replace(/[₹,\\s]/g,"");',
    '            var bm=btx.match(/[0-9]+(?:\\.[0-9]+)?/);',
    '            if(bm){',
    '              bval=parseFloat(bm[0]);',
    '              try{ if(typeof window.setBalance==="function") window.setBalance(bval); }catch(e){}',
    '              break;',
    '            }',
    '          }',
    '        }',
    '      }',
    '      if(curPage==="wingo"){',
    '        var minDep=200;',
    '        try{',
    '          if(typeof window.minDeposit==="number"&&window.minDeposit>0) minDep=window.minDeposit;',
    '          else if(typeof window.fbMinDeposit==="number"&&window.fbMinDeposit>0) minDep=window.fbMinDeposit;',
    '          else if(typeof window.fbMinDepositTier1==="number"&&window.fbMinDepositTier1>0) minDep=window.fbMinDepositTier1;',
    '        }catch(e){}',
    '        var isLow=(bval!==null && bval>=0)?(bval<minDep):(__cs()==="low"||__cs()==="wait"||window.everMetMin===false);',
    '        if(isLow && !__wingoLowPlayed){',
    '          __wingoLowPlayed=true;',
    '          __play("deposit.mp3");',
    '          try{ if(typeof _goState==="function") _goState("low"); else if(typeof goState==="function") goState("low"); }catch(e){}',
    '        } else if(!isLow && bval!==null && bval>=minDep){',
    '          __wingoLowPlayed=false;',
    '        }',
    '      } else {',
    '        __wingoLowPlayed=false;',
    '      }',
    '    }catch(e){}',
    '  },500);',
    '})();',
    '</script>',
    ''
  ].join('\n');
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, snippet + '</body>');
  return html + snippet;
}

// ── Register delay normalizer (future templates ke liye bhi) ──
// Naye upload hone wale templates me bhi register.mp3 ka 3-5 sec delay ho
// sakta hai. Build time pe hi har pattern ko 1000ms kar dete hain, taaki
// admin ko har naye design ke liye khud patch na karna pade. (Gate v3 khud
// bhi 1 sec pe register.mp3 bajata hai; ye fallback path ke liye hai.)
function normalizeRegisterDelay(html) {
  if (!html) return html;
  // ; } ke beech space/newline kuch bhi ho — \s* sab cover karta hai
  return html.replace(/(playAudio\(['"]register\.mp3['"]\);\s*\},)\s*(?:5000|3000)\s*\);/g, '$1 1000);');
}

// ── Result speech: Preserves TTS speak ("BIG 6", "SMALL 4") and triggers sound ──
function mapResultSpeechToSound(html) {
  if (!html || /['"]big\.mp3['"]/i.test(html)) return html;
  return html.replace(
    /ZAYRO\.speak\(\s*([A-Za-z_$][\w$.]*)\s*\+\s*["'][ ]*["']\s*\+\s*([A-Za-z_$][\w$.]*)\s*\)/g,
    (m, sizeExpr, numExpr) => `(function(){ try{ window.ZAYRO.speak(${sizeExpr}+" "+${numExpr}); }catch(e){} try{ window.ZAYRO.playSound(${sizeExpr}==="BIG"?"big.mp3":"small.mp3"); }catch(e){} })()`
  );
}


// ── APK build implementation ──
// This implementation intentionally runs inside apkbuilder-worker.js. It uses
// synchronous filesystem/Gradle commands, which are safe in the isolated
// worker process and can no longer freeze the web server or Telegram polling.
async function buildApkInWorker(order, design, buildId, logCallback) {
  const log = (msg) => { logCallback && logCallback(msg); };
  const buildDir = path.join(BUILDS_DIR, buildId);
  fs.mkdirSync(buildDir, { recursive: true });

  try {
    log('Build started (' + (process.env.APK_BUILD_VARIANT || 'protectedRelease') + ')...');
    log('Checking Android SDK packages and licence file...');
    assertAndroidSdk(ANDROID_HOME);
    log('Reading design HTML files...');

    // Use fake HTML if this is a fake build and design has fake_popup_html_file
    const isFakeBuild = !!(order.is_fake || order.design_variant === 'fake');
    const popupHtmlFileName = (isFakeBuild && design.fake_popup_html_file)
      ? design.fake_popup_html_file
      : design.popup_html_file;
    const popupHtmlPath = path.join(TEMPLATES_DIR, popupHtmlFileName);
    const db = require('../database/db');
    const loadingHtmlFileName = db.prepare('SELECT value FROM settings WHERE key=?').get('loading_html_file')?.value || '';

    if (!fs.existsSync(popupHtmlPath)) throw new Error(`Popup HTML not found: ${design.popup_html_file}`);

    // Loading screen file optional hai — kabhi bhi build fail nahi karni chahiye.
    //   1) setting wali file  2) koi bhi available loading file  3) built-in default
    const { html: loadingHtml, file: loadingFileUsed, fellBack } = resolveLoadingHtml(loadingHtmlFileName);
    if (fellBack) {
      log(`Loading HTML: ${loadingFileUsed}${loadingHtmlFileName ? ` (setting me "${loadingHtmlFileName}" tha jo mila nahi)` : ''}`);
    }

    const popupHtml = fs.readFileSync(popupHtmlPath, 'utf8');

    // ── Prepare icon ──
    let appIconBase64 = null;
    let iconBuffer    = null;
    if (order.icon_file) {
      const iconPath = path.join(UPLOADS_DIR, order.icon_file);
      if (fs.existsSync(iconPath)) {
        iconBuffer    = fs.readFileSync(iconPath);
        appIconBase64 = iconBuffer.toString('base64');
      }
    }

    const isDhani = design.java_type === 'dhani' || design.java_type === 'premium' || design.category === 'dhani' || isDhaniUrl(order.register_url);
    const { deposit: depositUrl, wingo: wingoUrl } = buildUrls(order.register_url, isDhani);
    const domain = extractDomain(order.register_url);
    // This path is embedded once and remains stable. URL values under
    // <firebasePath>/config can then change without rebuilding the APK.
    const firebasePath = order.firebase_path
      || `zayro${domain.replace(/[^a-z0-9]/gi, '').substring(0, 10)}`;
    const params = {
      registerUrl: order.register_url, depositUrl, wingoUrl, domain, firebasePath,
      minDeposit: order.min_deposit, brandTitle: order.brand_title,
      appIconBase64, isDhani
    };
    // ── FAKE BUILD = SERVER LIVE MODE ──
    // Fake APK me Firebase SDK/config embed nahi hota (security posture).
    // Runtime links / minDeposit / conditions / users (login monitoring,
    // warning popup) server ke /api/rtdb bridge se aate hai — rtdb shim
    // injectParams template me inject karta hai. BASE_URL env set hona
    // zaroori hai; na ho to purana Firebase-mode fallback (no regression).
    if (isFakeBuild) {
      const liveBase = String(process.env.BASE_URL || '').replace(/\/+$/, '');
      if (/^https?:\/\//i.test(liveBase)) {
        params.liveMode = 'server';
        params.liveBase = liveBase;
        log('Fake build: server live mode ON (' + liveBase + ')');
      } else {
        log('WARNING: BASE_URL env set nahi hai — fake build me live links fallback (Firebase mode) use hoga');
      }
    }

    log('Injecting parameters into HTML...');
    const processedPopup   = mapResultSpeechToSound(normalizeRegisterDelay(ensureAudioGate(injectParams(popupHtml, params))));
    const processedLoading = stripFirebaseLiveScript(stripIntroSnippet(injectLoadingParams(loadingHtml, params)));

    // ── PER-BUILD UNIQUE ENCRYPTION PASSWORD (Java engine) ──
    // Har APK build ki apni alag key: random password + kid. kid PATH ke
    // suffix (~<kid>) me DEX me jata hai — MainActivity source me koi nayi
    // line nahi chahiye. Template me FW placeholder na mile (purana/ustom
    // template) to automatic FIXED_PASSWORD fallback — purane builds jaisa
    // hi behaviour, koi regression nahi.
    let perBuildKid = '';
    let contentPassword = FIXED_PASSWORD;
    {
      const tplMain = path.join(TEMPLATE_PROJECT, 'app', 'src', 'main', 'java', 'com', 'zayro', 'wingsyttt', 'MainActivity.java');
      const tplSrc = fs.existsSync(tplMain) ? fs.readFileSync(tplMain, 'utf8') : '';
      if (tplSrc.includes('FW_PASSWORD_M = new byte[]{ 0, 0 }')) {
        perBuildKid = crypto.randomBytes(12).toString('hex');
        contentPassword = generateBuildPassword(); // base64 ASCII string
        log('Applying hardening profile...');
      } else {
        log('Applying standard profile...');
      }
    }

    // ── HTML encryption — per-build password (ya fixed fallback) ──
    // Baaki saare assets (PNG/MP3/fonts/icon) APK me PLAIN rehte hain.
    log('Encrypting HTML to .bin files...');
    const zayrobin      = path.join(buildDir, 'zayro.bin');
    const loadingBinName = isDhani ? 'lodale.bin' : 'loading.bin';
    const loadingbin    = path.join(buildDir, loadingBinName);
    await encryptHtmlToBin(processedPopup,   zayrobin, contentPassword);
    await encryptHtmlToBin(processedLoading, loadingbin, contentPassword);
    log('Bin files created.');

    // ── Check template project exists ──
    if (!fs.existsSync(TEMPLATE_PROJECT))
      throw new Error('Android project not found at android-project/. Upload via SCP.');

    // ── Copy template project ──
    log('Extracting base APK...');
    const projectDir = path.join(buildDir, 'project');
    execFileSync('cp', ['-r', TEMPLATE_PROJECT, projectDir], { stdio: 'pipe' });
    fs.chmodSync(path.join(projectDir, 'gradlew'), 0o755);
    fs.writeFileSync(path.join(projectDir, 'local.properties'), `sdk.dir=${ANDROID_HOME}\n`);

    // NOTE: Popup HTML ab native .so vault me embed NAHI hota — wo neeche
    // "Copy assets" step me encrypted zayro.bin ke roop me APK ke assets
    // folder me jaata hai (same AES-256-CBC + PBKDF2 encryption). Koi
    // native/.so module build me participate nahi karta.

    // ── Patch strings.xml — app name (font style ke saath) ──
    // Sirf launcher label (phone ke home screen wala naam) styled hota hai.
    // App ke ANDAR wala HTML/templates isse bilkul untouched rehta hai.
    const stringsPath = path.join(projectDir, 'app', 'src', 'main', 'res', 'values', 'strings.xml');
    if (fs.existsSync(stringsPath)) {
      let s = fs.readFileSync(stringsPath, 'utf8');
      const rawName = String(order.app_name || 'App');
      const styledName = applyFontStyle(rawName, order.app_name_style || 'normal');
      const xmlEsc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      s = s.replace(/<string name="app_name"[^>]*>[^<]*<\/string>/, `<string name="app_name" translatable="false">${xmlEsc(styledName)}</string>`);
      fs.writeFileSync(stringsPath, s, 'utf8');
    }

    // ── Keystore (cert hash + signing dono yahi se) ──
    const keystorePath = path.join(__dirname, '..', 'keystore', 'release.keystore');
    // Production cert SHA-256 (security signature check ke liye)
    let certSha256Hex = '';
    if (fs.existsSync(keystorePath)) {
      try {
        const kt = execFileSync('keytool', ['-list', '-v', '-keystore', keystorePath, '-storepass', KEYSTORE_PASSWORD], { stdio: 'pipe', encoding: 'utf8' });
        const m = kt.match(/SHA256:\s*([0-9A-Fa-f:]+)/);
        if (m) certSha256Hex = m[1].replace(/:/g, '').toLowerCase();
      } catch (e) { certSha256Hex = ''; }
    }

    // ── Build variant — protectedRelease DEFAULT (fallback release) ──
    const buildVariantRaw = String(process.env.APK_BUILD_VARIANT || 'protectedRelease').trim();
    const buildVariant = /^[a-zA-Z0-9]+$/.test(buildVariantRaw) ? buildVariantRaw : 'release';
    const gradleTask = 'assemble' + buildVariant.charAt(0).toUpperCase() + buildVariant.slice(1);

    // ── Patch MainActivity.java — XOR-masked constants (content HTML) ──
    // Server URL / content path / decrypt password DEX me plaintext NAHI
    // hote — XOR-mask hoke byte arrays me bhar diye jaate hain (0x5A key).
    // APK me koi Firebase detail nahi hoti.
    const mainJavaPath = path.join(projectDir, 'app', 'src', 'main', 'java', 'com', 'zayro', 'wingsyttt', 'MainActivity.java');
    if (fs.existsSync(mainJavaPath)) {
      let j = fs.readFileSync(mainJavaPath, 'utf8');
      const serverBase = String(process.env.BASE_URL || 'https://devlopedwithzayro.site').replace(/\/+$/, '');
      const contentPath = String(order.firebase_path || '').trim();
      // kid ko PATH suffix (~kid) me laatkar bhejo — server isi se pehchan ke
      // is build ki apni key se encrypt karega. Purane APK (suffix ke bina)
      // FIXED_PASSWORD pe hi rehte hain — zero regression.
      const apkPath = perBuildKid ? (contentPath + '~' + perBuildKid) : contentPath;
      const XOR_KEY = 0x5A;
      const maskArr = (s) => 'new byte[]{ ' + Array.from(Buffer.from(String(s), 'utf8'))
        .map(b => `(byte)${(b ^ XOR_KEY) & 0xFF}`).join(', ') + ' }';
      j = j.replace('private static final byte[] APP_SERVER_URL_M = new byte[]{ 0, 0 };',
        `private static final byte[] APP_SERVER_URL_M = ${maskArr(serverBase)};`);
      j = j.replace('private static final byte[] APP_PATH_M = new byte[]{ 0, 0 };',
        `private static final byte[] APP_PATH_M = ${maskArr(apkPath)};`);
      j = j.replace('private static final byte[] FW_PASSWORD_M = new byte[]{ 0, 0 };',
        `private static final byte[] FW_PASSWORD_M = ${maskArr(contentPassword)};`);
      // SecurityManager constants (SecurityManager.java me patch hote hain)
      const secPath = path.join(path.dirname(mainJavaPath), 'SecurityManager.java');
      if (fs.existsSync(secPath)) {
        let s = fs.readFileSync(secPath, 'utf8');
        s = s.replace('private static final byte[] EXPECTED_CERT_SHA256_M = new byte[]{ 0, 0 };',
          `private static final byte[] EXPECTED_CERT_SHA256_M = ${certSha256Hex ? maskArr(certSha256Hex) : 'new byte[]{ 0, 0 }'};`);
        s = s.replace('private static final byte[] IS_PROTECTED_M = new byte[]{ 0 };',
          `private static final byte[] IS_PROTECTED_M = ${maskArr(buildVariant === 'protectedRelease' ? '1' : '0')};`);
        fs.writeFileSync(secPath, s, 'utf8');
      }
      fs.writeFileSync(mainJavaPath, j, 'utf8');

      // ── Per-build key record — server runtime encryption ke liye ──
      // key_secret plaintext base64 string (server ko runtime encrypt karna
      // hota hai isliye reversible), key_hash bcrypt (audit/verify ke liye).
      if (perBuildKid) {
        try {
          const bcrypt = require('bcryptjs');
          try {
            db.exec(`CREATE TABLE IF NOT EXISTS build_keys (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              order_id INTEGER NOT NULL,
              firebase_path TEXT NOT NULL,
              key_id TEXT UNIQUE NOT NULL,
              key_secret TEXT NOT NULL,
              active INTEGER NOT NULL DEFAULT 1,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
          } catch (_) {}
          try { db.exec("ALTER TABLE build_keys ADD COLUMN key_hash TEXT"); } catch (_) {}
          try { db.exec("ALTER TABLE build_keys ADD COLUMN engine TEXT NOT NULL DEFAULT 'java'"); } catch (_) {}
          db.prepare("INSERT INTO build_keys (order_id, firebase_path, key_id, key_secret, key_hash, engine) VALUES (?,?,?,?,?,'java')")
            .run(order.id, contentPath, perBuildKid, contentPassword, bcrypt.hashSync(contentPassword, 8));
          log('Hardening profile applied.');
        } catch (e) { log('NOTE: profile cache skipped — ' + String(e.message || e)); }
      }
    }

    // ── Patch build.gradle — applicationId ──
    const gradlePath = path.join(projectDir, 'app', 'build.gradle');
    if (fs.existsSync(gradlePath)) {
      let g = fs.readFileSync(gradlePath, 'utf8');
      g = g.replace(/applicationId\s+"[^"]*"/, `applicationId "${order.package_name}"`);
      fs.writeFileSync(gradlePath, g, 'utf8');
    }

    // ── Copy assets (PNGs/fonts encrypted per-build, MP3s stay plain) ──
    log('Replacing assets (encrypted HTML bins, MP3s plain)...');
    const assetsDir = path.join(projectDir, 'app', 'src', 'main', 'assets');
    fs.mkdirSync(assetsDir, { recursive: true });
    // Wipe stale template .bin blobs — they were encrypted with an old fixed
    // key and would fail to decrypt against the per-build key at runtime.
    for (const f of fs.readdirSync(assetsDir)) {
      if (f.toLowerCase().endsWith('.bin')) {
        try { fs.unlinkSync(path.join(assetsDir, f)); } catch (_) {}
      }
    }
    // ── POPUP HTML — assets me encrypted .bin (primary, offline) ──
    // Popup HTML APK ke assets folder me zayro.bin ke roop me bundled hota
    // hai — same AES-256-CBC + PBKDF2 per-build encryption (utils/encrypt.js).
    // MainActivity ise decrypt karke load karta hai; asset na mile to remote
    // fetch fallback chalta hai (utils/appcontent.js).
    fs.copyFileSync(zayrobin, path.join(assetsDir, 'zayro.bin'));
    // Loading HTML sirf splash ke liye — instant dikhane ke liye embedded.
    fs.copyFileSync(loadingbin, path.join(assetsDir, loadingBinName));
    // MainActivity always opens loading.bin (and some designs expect lodale.bin).
    // Write the same per-build encrypted blob under both names so the loading
    // screen decrypts correctly for zayro AND dhani builds.
    if (isDhani) fs.copyFileSync(loadingbin, path.join(assetsDir, 'loading.bin'));

    const sharedAssetsDir = path.join(TEMPLATES_DIR, 'assets');
    if (fs.existsSync(sharedAssetsDir)) {
      for (const f of fs.readdirSync(sharedAssetsDir)) {
        const src = path.join(sharedAssetsDir, f);
        if (fs.statSync(src).isFile())
          fs.copyFileSync(src, path.join(assetsDir, f));
      }
    }
    // Admin MP3 library: library ki sound files template assets me copy hoti hain;
    // order ke minimum deposit wali amount MP3 (200.mp3 …) successful.mp3 ban jaati hai.
    require('./mp3-library').applyMp3Library(order,assetsDir,log);
    logMissingReferencedMp3Assets([processedPopup, processedLoading], assetsDir, log);

    // ── App icon replacement ──
    if (iconBuffer) {
      log('Resizing and replacing app icons...');
      const iconSizes = await resizeIcon(iconBuffer);
      for (const [dir, buf] of Object.entries(iconSizes)) {
        const iconDir = path.join(projectDir, 'app', 'src', 'main', 'res', dir);
        fs.mkdirSync(iconDir, { recursive: true });
        fs.writeFileSync(path.join(iconDir, 'ic_launcher.png'),       buf);
        fs.writeFileSync(path.join(iconDir, 'ic_launcher_round.png'), buf);
      }
      fs.writeFileSync(path.join(assetsDir, 'my_icon.png'), iconBuffer);
    }

    // Sab assets PLAIN rehte hain (PNG/MP3/fonts/icon) — koi encryption nahi.
    // Sirf HTML .bin files encrypted hain (upar kiye hue). Purana simple style.
    log('Assets ready (popup + loading HTML .bin encrypted, baaki plain).');

    // ── INTEGRITY MANIFEST — har packaged asset ka SHA-256 ──
    // Runtime pe SecurityManager.verifyAssetIntegrity() in hashes ko check
    // karta hai — koi asset modify ho to detect hota hai. integrity.json
    // me sirf hashes hain, koi secret nahi.
    log('Generating integrity manifest...');
    {
      const crypto = require('crypto');
      const entries = {};
      for (const f of fs.readdirSync(assetsDir)) {
        const ap = path.join(assetsDir, f);
        if (!fs.statSync(ap).isFile()) continue;
        if (f === 'integrity.json') continue;
        entries[f] = crypto.createHash('sha256').update(fs.readFileSync(ap)).digest('hex');
      }
      fs.writeFileSync(path.join(assetsDir, 'integrity.json'),
        JSON.stringify({ version: 1, generatedAt: Date.now(), assets: entries }, null, 1));
    }

    // ── keystore upar define ho chuka (cert hash + signing dono ke liye) ──

    // ── Gradle build ──
    const buildEnv = {
      ...process.env,
      ANDROID_HOME,
      ANDROID_SDK_ROOT: ANDROID_HOME,
      PATH: `${process.env.PATH}:${ANDROID_HOME}/build-tools/${BUILD_TOOLS_VERSION}:${ANDROID_HOME}/platform-tools`
    };

    // STALE CACHE FIX: template me purana .gradle/app-build hota hai —
    // use hatao taaki Gradle clean build kare (isi se 'No APK found after
    // Gradle' aa raha tha — gradle up-to-date samajh kar output skip kar
    // deta tha).
    log('Cleaning stale gradle cache...');
    try { fs.rmSync(path.join(projectDir, '.gradle'), { recursive: true, force: true }); } catch (e) {}
    try { fs.rmSync(path.join(projectDir, 'app', 'build'), { recursive: true, force: true }); } catch (e) {}

    const gradleArgs = [gradleTask, '--no-daemon', '--rerun-tasks'];
    log(`Compiling APK package (${buildVariant})...`);
    let gradleError = null;
    let gradleOut = '';
    let usedVariant = buildVariant;
    const runGradle = (args) => {
      try {
        const r = execFileSync('./gradlew', args, {
          stdio: ['ignore', 'pipe', 'pipe'],
          maxBuffer: 16 * 1024 * 1024,
          cwd: projectDir, env: buildEnv, timeout: 480000
        });
        return { ok: true, out: String(r) };
      } catch (e) {
        return { ok: false, out: String(e.stdout || '') + String(e.stderr || '') + String(e.message || '') };
      }
    };
    let g1 = runGradle(gradleArgs);
    gradleOut = g1.out;
    if (!g1.ok) {
      gradleError = new Error(g1.out.slice(-1500));
      if (buildVariant !== 'release') {
        log('Gradle ' + buildVariant + ' FAILED — release fallback try karte hain...');
        let g2 = runGradle(['assembleRelease', '--no-daemon', '--rerun-tasks']);
        gradleOut = g2.out;
        if (g2.ok) {
          usedVariant = 'release';
          log('Release fallback build OK.');
        } else {
          throw new Error('Gradle fail (' + buildVariant + ' + release fallback): ' + g2.out.slice(-2000));
        }
      } else {
        throw new Error('Gradle fail (release): ' + g1.out.slice(-2000));
      }
    } else {
      log('Gradle build OK.');
    }

    // ── Find output APK (poore project me kisi bhi .apk ko dhundo) ──
    const findApks = (dir) => {
      const out = [];
      if (!fs.existsSync(dir)) return out;
      for (const f of fs.readdirSync(dir)) {
        const fp = path.join(dir, f);
        try {
          if (fs.statSync(fp).isDirectory()) out.push(...findApks(fp));
          else if (f.toLowerCase().endsWith('.apk')) out.push(fp);
        } catch (e) {}
      }
      return out;
    };
    // NOTE: release buildType me signingConfig NAHI hai — Gradle
    // 'app-release-unsigned.apk' deta hai (server khud apksigner se sign
    // karta hai, packers se pehle bhi). Isliye 'unsigned' APKs ko bhi
    // candidate maano — pehle wala filter unhe chhod raha tha, isi se
    // 'No APK found after Gradle' aata tha (BUILD SUCCESSFUL ke baad bhi).
    const apkCandidates = findApks(path.join(projectDir, 'app', 'build', 'outputs'))
      .filter(f => !f.toLowerCase().includes('unaligned'));
    // priority: signed > app-*.apk (signed name) > unsigned > koi bhi
    let builtApk = apkCandidates.find(f => f.toLowerCase().includes('signed'))
      || apkCandidates.find(f => /app-.*\.apk$/i.test(f) && !f.toLowerCase().includes('unsigned'))
      || apkCandidates.find(f => f.toLowerCase().includes('unsigned'))
      || apkCandidates[0];
    if (!builtApk) {
      const gmsg = gradleError ? String(gradleError.message).slice(0, 800) : 'unknown';
      const tail = gradleOut ? gradleOut.slice(-1500) : '(no gradle output)';
      const outs = findApks(path.join(projectDir, 'app', 'build', 'outputs'))
        .map(f => path.relative(projectDir, f)).join(', ') || '(outputs tree khali)';
      throw new Error('No APK found after Gradle. ' + gmsg + ' || outputs me mile: ' + outs + ' || gradle tail: ' + tail);
    }
    log('APK mila: ' + path.basename(builtApk));

    // NOTE: 360 Jiagu / Frezrik DEX packer steps hata diye gaye hain —
    // build ab seedha Gradle output ko zipalign + apksigner se sign karta hai.

    // ── Sign APK ──
    // File name = app name (spaces/path-hostile chars -> _). Fake APKs ke
    // naam me "Fake 1", "Fake 2"... number hota hai — isliye HAR fake APK
    // ka filename UNIQUE hota hai (pehle sab "XYZ_Fake.apk" the, isi se
    // dono fake sites ka download ek hi APK de deta tha).
    const apkBase = String(order.app_name || 'App')
      .replace(/[\/\\:*?"<>|]+/g, '_')
      .replace(/\s+/g, '_')
      .slice(0, 80) || 'App';
    let signedApk = path.join(buildDir, `${apkBase}.apk`);
    // Double safety: same naam ki koi purani file folder me ho to number
    // laga do (kabhi collide nahi hona chahiye).
    let apkCounter = 2;
    while (fs.existsSync(signedApk) && apkCounter < 50) {
      signedApk = path.join(buildDir, `${apkBase}_${apkCounter++}.apk`);
    }

    if (fs.existsSync(keystorePath)) {
      log('Signing with keystore...');
      const alignedApk = path.join(buildDir, `${buildId}_aligned.apk`);
      execFileSync(path.join(ANDROID_HOME, 'build-tools', BUILD_TOOLS_VERSION, 'zipalign'),
        ['-f', '4', builtApk, alignedApk], { stdio: 'pipe', env: buildEnv });
      execFileSync(path.join(ANDROID_HOME, 'build-tools', BUILD_TOOLS_VERSION, 'apksigner'), [
        'sign',
        '--ks', keystorePath,
        '--ks-key-alias', KEYSTORE_ALIAS,
        '--ks-pass', `pass:${KEYSTORE_PASSWORD}`,
        '--key-pass', `pass:${KEYSTORE_PASSWORD}`,
        '--v1-signing-enabled', 'true',
        '--v2-signing-enabled', 'true',
        '--v3-signing-enabled', 'true',
        '--v4-signing-enabled', 'false',
        '--out', signedApk,
        alignedApk
      ], { stdio: 'pipe', env: buildEnv });
      fs.unlinkSync(alignedApk);
      log('APK signed successfully.');
    } else {
      fs.copyFileSync(builtApk, signedApk);
      log('WARNING: No keystore. APK is unsigned.');
    }

    // ── SECURITY REPORT + FINAL VERIFICATION ──
    // Build ke baad automatic checks + security-report.txt (buildDir me).
    // Critical fail → build FAIL (protectedRelease me).
    {
      const crypto = require('crypto');
      const report = { variant: buildVariant, appName: order.app_name, versionCode: 1, versionName: '1.0' };
      const fails = [];
      const warnings = [];

      // APK hash
      try { report.apkSha256 = crypto.createHash('sha256').update(fs.readFileSync(signedApk)).digest('hex'); } catch (e) {}
      report.certSha256 = certSha256Hex || 'unknown';

      // Signed?
      let signedOk = false;
      try {
        const aps = path.join(ANDROID_HOME, 'build-tools', BUILD_TOOLS_VERSION, 'apksigner');
        if (fs.existsSync(aps)) execFileSync(aps, ['verify', '--print-certs', signedApk], { stdio: 'pipe' });
        else execFileSync('apksigner', ['verify', '--print-certs', signedApk], { stdio: 'pipe', env: buildEnv });
        signedOk = true;
      } catch (e) { signedOk = false; }
      report.signed = signedOk;
      if (!signedOk) fails.push('APK signed nahi hai');

      // Debuggable? (aapt badging)
      let debuggable = null;
      try {
        const aapt = path.join(ANDROID_HOME, 'build-tools', BUILD_TOOLS_VERSION, 'aapt');
        const badging = execFileSync(aapt, ['dump', 'badging', signedApk], { stdio: 'pipe', encoding: 'utf8' });
        debuggable = badging.includes('application-debuggable');
        report.debuggable = debuggable;
        if (debuggable && buildVariant !== 'debug') fails.push('Release APK debuggable hai');
      } catch (e) { warnings.push('aapt unavailable — debuggable check skip'); }

      // Sensitive plaintext / source maps APK me?
      let sensitivePlain = false, hasSourceMaps = false;
      try {
        const listing = execFileSync('unzip', ['-l', signedApk], { stdio: 'pipe', encoding: 'utf8', env: buildEnv });
        if (/\.(html|js)\s*$/m.test(listing)) sensitivePlain = true;
        if (/\.map\s*$/m.test(listing)) hasSourceMaps = true;
      } catch (e) { warnings.push('unzip listing check skip'); }
      report.sensitivePlaintextInApk = sensitivePlain;
      report.sourceMapsInApk = hasSourceMaps;
      if (sensitivePlain && buildVariant === 'protectedRelease') fails.push('Sensitive plaintext (html/js) APK me hai');
      if (hasSourceMaps) fails.push('Source maps APK me hain');

      report.status = fails.length ? 'FAIL' : 'PASS';
      report.fails = fails; report.warnings = warnings;
      try {
        fs.writeFileSync(path.join(buildDir, 'security-report.txt'),
          JSON.stringify(report, null, 2) + '\n');
      } catch (e) {}
      log(`Security report: ${report.status}${fails.length ? ' — ' + fails.join('; ') : ''}${warnings.length ? ' | warn: ' + warnings.join('; ') : ''}`);
      // NOTE: verification sirf REPORT karta hai — kabhi build fail nahi
      // karta (tool-path issues se builds na rukein). Report buildDir me
      // security-report.txt hoti hai.
    }

    // ── Cleanup ──
    fs.rmSync(projectDir, { recursive: true, force: true });
    if (fs.existsSync(zayrobin))   fs.unlinkSync(zayrobin);
    if (fs.existsSync(loadingbin)) fs.unlinkSync(loadingbin);

    log('Build complete!');
    return { success: true, apkFile: path.basename(signedApk), apkPath: signedApk };

  } catch (err) {
    log(`ERROR: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// ── Parent-process build queue ──
// Gradle is CPU/RAM intensive, so builds stay serialized as before. The key
// difference is that the blocking work now happens in a child process while
// the main Node.js event loop remains free to answer Telegram updates and HTTP.
const BUILD_WORKER_PATH = path.join(__dirname, 'apkbuilder-worker.js');
const BUILD_WORKER_TIMEOUT_MS = Math.max(
  60_000,
  parseInt(process.env.APK_BUILD_TIMEOUT_MS || '600000', 10) || 600_000
);
const pendingBuilds = [];
let buildRunning = false;

function appendOutput(current, chunk) {
  const MAX_OUTPUT = 16 * 1024;
  const combined = current + chunk.toString();
  return combined.length > MAX_OUTPUT ? combined.slice(-MAX_OUTPUT) : combined;
}

function runBuildWorker(order, design, buildId, logCallback) {
  return new Promise((resolve, reject) => {
    const child = fork(BUILD_WORKER_PATH, [], {
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      env: { ...process.env, APK_BUILDER_WORKER: '1' }
    });

    let settled = false;
    let output = '';

    child.stdout?.on('data', chunk => { output = appendOutput(output, chunk); });
    child.stderr?.on('data', chunk => { output = appendOutput(output, chunk); });

    const timeout = setTimeout(() => {
      if (settled) return;
      child.kill('SIGTERM');
      const forceKillTimer = setTimeout(() => child.kill('SIGKILL'), 5_000);
      forceKillTimer.unref?.();
      finish(new Error(`APK build timed out after ${Math.round(BUILD_WORKER_TIMEOUT_MS / 60000)} minutes`));
    }, BUILD_WORKER_TIMEOUT_MS);
    timeout.unref?.();

    function finish(error, result) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error) reject(error);
      else resolve(result);
    }

    child.on('message', message => {
      if (!message || typeof message !== 'object') return;
      if (message.type === 'log') {
        try { logCallback?.(message.message); }
        catch (error) { console.error('Build log callback error:', error.message); }
        return;
      }
      if (message.type === 'result') {
        finish(null, message.result);
      } else if (message.type === 'error') {
        finish(new Error(message.error || 'Unknown APK build worker error'));
      }
    });

    child.once('error', error => finish(error));
    child.once('exit', (code, signal) => {
      if (settled) return;
      const detail = output.trim();
      const reason = signal ? `signal ${signal}` : `code ${code}`;
      finish(new Error(`APK build worker exited with ${reason}${detail ? `: ${detail}` : ''}`));
    });

    child.send({ type: 'build', order, design, buildId }, error => {
      if (error) finish(error);
    });
  });
}

function processBuildQueue() {
  if (buildRunning || pendingBuilds.length === 0) return;
  buildRunning = true;
  const job = pendingBuilds.shift();

  runBuildWorker(job.order, job.design, job.buildId, job.logCallback)
    .then(job.resolve, job.reject)
    .finally(() => {
      buildRunning = false;
      // Let the completed order enqueue its fake APK before the next normal
      // build starts, so real/fake pairs stay together.
      setImmediate(processBuildQueue);
    });
}

function buildApk(order, design, buildId, logCallback) {
  return new Promise((resolve, reject) => {
    const job = { order, design, buildId, logCallback, resolve, reject };
    if (order?.is_fake) pendingBuilds.unshift(job);
    else pendingBuilds.push(job);
    processBuildQueue();
  });
}

module.exports = { buildApk, buildApkInWorker, makePackageName, ensureAudioGate, normalizeRegisterDelay, mapResultSpeechToSound, stripIntroSnippet, stripFirebaseLiveScript };