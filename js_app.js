const tg = Telegram.WebApp; tg.ready(); tg.expand();
const U = tg.initDataUnsafe?.user, uid = U ? String(U.id) : null;
const I = IC;
let S = {}, me = {}, coins = 0, designs = [], orders = [], deps = [], txs = [], notices = [], pop = {}, nIdx = 0, nTimer = null, refs = [], myRef = null;
let tab = 'home', flt = 'latest', cur = null, mode = 'member', amt = 0, wsec = 'upi', dflt = 'all', tflt = 'all', pdf = 'approved', slideTimer = null;
const PK = { upi: [100, 300, 500, 1000, 2000, 5000], usdt: [10, 20, 50, 100, 500, 1000] };
const rs = n => '₹' + n, rate = () => +S.usdtRate || 90, kd = m => m === 'upi' ? 'upi' : 'usdt';
const toC = (a, m) => m === 'upi' ? a : Math.floor(a * rate());
let hist = [], mLvl = 'x', fstyle = 0, payTimer = null;
let bdCfgV = {}, bdPlansV = [], bdF = { name: '', token: '', aid: '', plan: '' }, bdChk = null, bdInfoV = null, bdBuying = false, bdRid = '', bso = null, bsoErr = false, bsoAt = 0, bsoBusy = false, bsoT = 0, bdRenew = null, bdPosRaw = null, bdPosSrc = '', bdNmC = null, bdNmT = 0, bdNmSeq = 0, bdNmTouch = false, bdCp = null, bdCpc = '', bdCpBusy = false, bdCpMsg = null, bdCpSeq = 0;   // Bot Deploy (bdPosRaw null = poster abhi load ho raha)
let cxProds = [], cso = null, csoErr = false, csoAt = 0, csoBusy = false, cxSkew = 0, cxSel = '', cxRid = '', cxPid = '', cxBuying = false, ordF = 'all';
const ROOT = ['home', 'csite', 'orders', 'refer', 'profile'];
const TABN = { home: 'Home', bdeploy: 'Bot Deploy', csite: 'FAKE WEBSITE', csplan: 'Choose Plan', orders: 'Orders', profile: 'Account', wallet: 'Deposit', dephist: 'Deposit History', txhist: 'Transaction', refer: 'Refer To Earn', care: 'Customer Care', careai: 'AI Support', caredep: 'Deposit Not Received', caremine: 'My Requests', careissue: 'Store Issue' };
const CARE = ['care', 'careissue', 'careai', 'caredep', 'caremine'], SUBS = ['wallet', 'dephist', 'txhist', ...CARE];   // Account ke andar ke pages (nav me Account highlight rehta hai)
const backBtn = () => `<button class="back-btn" onclick="goBack()"><span class="bk-ic">${I('chev')}</span><span class="bk-t"><small>Back to</small><b>${TABN[hist[hist.length - 1]] || 'Home'}</b></span></button>`;
const X = () => ({ ...EXTRA, ...(S.prices || {}) });
const cost = (d, m = mode) => m === 'fake' ? X().fake : m === 'both' ? d.price + X().both : m === 'demo' ? d.price + X().demo : d.price;
const NETS = { trc20: 'TRC20', bep20: 'BEP20' };
const uc = k => { const o = S[k] || {}, leg = (S.usdtNetwork || 'TRC20').toLowerCase() === k; return { on: o.on ?? (leg ? S.usdtOn : false), address: o.address ?? (leg ? S.usdtAddress : ''), qr: o.qr ?? (leg ? S.usdtQr : ''), bonus: o.bonus ?? S.usdtBonus ?? 5, auto: o.auto !== false }; };
const bPct = m => m === 'upi' ? (+S.upiBonus || 0) : uc(m).bonus;
const bOf = (n, m) => Math.floor(n * bPct(m) / 100);
const mLabel = d => d.method === 'usdt' ? 'USDT ' + (d.network || 'TRC20') + ' Deposit' : 'UPI-QR Deposit';
const banned = () => me.banned === true;
/* ---------- Maintenance mode (Admin > Maintenance). Poora store ya sirf Templates / FAKE WEBSITE / ek product. Order, buy, coupon sab band; "Expected back" page dikhta hai ---------- */
const maintCfg = () => { const m = S.maintenance || {}; return { on: m.on === true, msg: String(m.msg || ''), eta: +m.eta || 0 }; };
const isOwner = () => !!uid && String(uid) === String(S.ownerTgId || APP.owner);
const maintOn = () => maintCfg().on && !isOwner();   // sirf deposit / wallet jaise kaam ke liye; product aur order ke liye mtBlock (owner ko bhi rokta hai)
const etaTxt = ms => ms > Date.now() ? new Date(ms).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';
const MT_MSG = 'We are upgrading the store to serve you better. Please check back shortly.';
let mtKey = '';
function maintSync() {
  const c = maintCfg(), old = $('#maint'), bar = $('#maintbar');
  document.body.classList.toggle('maint', maintOn());
  if (!c.on) { if (old) old.remove(); if (bar) bar.remove(); document.body.classList.remove('mbar'); goPTry(); return; }
  if (isOwner()) {   // owner store dekh sakta hai, par product / order uske liye bhi band (jaisa users ko dikhta hai wahi dikhao)
    if (old) old.remove(); document.body.classList.add('mbar');
    if (!bar) document.body.insertAdjacentHTML('beforeend', `<div id="maintbar" class="maintbar">${I('alert', 'sm')}<span>Maintenance is ON. Products and orders are closed for everyone.</span></div>`);
    return;
  }
  if (bar) bar.remove(); document.body.classList.remove('mbar');
  const h = `<div class="mt-card"><div class="mt-ic">${I('sliders')}</div><h2>We'll be back soon</h2><p>${esc(c.msg) || MT_MSG}</p><div class="mt-eta">${I('clock', 'sm')}Expected back: <b>${etaTxt(c.eta) || 'Very soon'}</b></div><button class="btn-outline" onclick="support()">${I('chat', 'sm')}Contact Support</button><small>This screen opens the store automatically when we are back.</small></div>`;
  if (old) { if (mtKey !== h) { old.innerHTML = h; mtKey = h; } return; }
  if (modalOpen()) closeM();
  mtClose(); mtKey = h; document.body.insertAdjacentHTML('beforeend', `<div id="maint" class="maint">${h}</div>`);
}
/* ---------- Store-wide / sirf Templates / sirf FAKE WEBSITE / sirf ek product ka maintenance. Server bhi order, buy, coupon rokta hai ---------- */
const secCfg = k => { const m = S[k === 'cs' ? 'maintCs' : 'maintTpl'] || {}; return { on: m.on === true, msg: String(m.msg || ''), eta: +m.eta || 0 }; };
const mtSig = () => JSON.stringify([S.maintenance || null, S.maintTpl || null, S.maintCs || null]);
const mtOf = (k, it) => {   // is product par kaun sa maintenance laga hai: poora store > section > ye product
  const w = maintCfg(); if (w.on) return { scope: 'store', k, msg: w.msg, eta: w.eta };
  const c = secCfg(k); if (c.on) return { scope: 'sec', k, msg: c.msg, eta: c.eta };
  const m = it && it.maint; if (m && typeof m === 'object' && m.on === true) return { scope: 'item', k, msg: String(m.msg || ''), eta: +m.eta || 0 };
  return null;
};
const mtBlock = mtOf;   // owner ko bhi rokta hai: maintenance me koi order nahi
const mtOv = () => `<div class="mt-ov"><span>${I('sliders', 'sm')}<b>Under<br>Maintenance</b></span></div>`;
let mtCsKey = '';
let mtPg = null;   // khula hua "Expected back" page: { title, chk } (chk = abhi bhi maintenance hai? nahi to page apne aap band)
function mtPgHtml(m, title) {
  const nm = m.scope === 'sec' ? (m.k === 'cs' ? 'FAKE WEBSITE' : 'Templates') : m.scope === 'item' ? (title || 'This product') : '';
  const sub = nm ? `<div class="mt-for">${I('sliders', 'sm')}<span><b>${esc(nm)}</b> ${m.scope === 'sec' && m.k !== 'cs' ? 'are' : 'is'} under maintenance</span></div>` : '';
  return `<div class="mt-card"><div class="mt-ic">${I('sliders')}</div><h2>We'll be back soon</h2>${sub}<p>${esc(m.msg) || MT_MSG}</p><div class="mt-eta">${I('clock', 'sm')}Expected back: <b>${etaTxt(m.eta) || 'Very soon'}</b></div><button class="btn-gradient mt-back" onclick="mtClose()">Back to store</button><button class="btn-outline" onclick="mtClose();support()">${I('chat', 'sm')}Contact Support</button></div>`;
}
function mtInfo(m, title, chk) {   // product / section par click -> poora "We'll be back soon + Expected back" page
  if (modalOpen()) closeM();
  mtPg = { title, chk }; const h = mtPgHtml(m, title), o = $('#mtpg');
  if (o) o.innerHTML = h; else document.body.insertAdjacentHTML('beforeend', `<div id="mtpg" class="maint mtpg" role="dialog" aria-label="Under maintenance">${h}</div>`);
  syncBack();
}
function mtClose() { const o = $('#mtpg'); if (o) o.remove(); mtPg = null; syncBack(); }
function mtPgSync() {   // page khula hai aur admin ne maintenance badla / hata diya
  const o = $('#mtpg'); if (!o || !mtPg || !mtPg.chk) return;
  const m = mtPg.chk(); if (!m) { mtClose(); toast('Maintenance is over. You can continue now.'); return; }
  const h = mtPgHtml(m, mtPg.title); if (o.innerHTML !== h) o.innerHTML = h;
}
const mtTpl = id => () => mtBlock('tpl', designs.find(x => x.id === id));
const mtCs = id => () => mtBlock('cs', cxFind(id));
function mtWatch() {   // product / order form khula hai aur admin ne maintenance laga diya -> page (bhejte waqt wala form nahi chhedte)
  mtPgSync();
  if (modalOpen() && cur && (mLvl === 'd' || (mLvl === 'o' && !($('#ob') || {}).disabled))) { const chk = mtTpl(cur.id), m = chk() || mtBlock('tpl', cur); if (m) mtInfo(m, cur.title, chk); }
  else if (!modalOpen() && tab === 'csplan' && cxPid) {   // plan page khula hai aur is product par maintenance lag gaya (ek hi badlav par ek hi baar)
    const p = cxFind(cxPid), m = p && mtBlock('cs', p), key = m ? cxPid + JSON.stringify(m) : '';
    if (m && key !== mtCsKey && !$('#mtpg')) mtInfo(m, p.title, mtCs(cxPid)); mtCsKey = key;
  }
}
function mtSrv(r, k, it, title, chk) {   // server ka maintenance jawab (store / sec / item) -> page. true = handle ho gaya
  if (!r || r.error !== 'maintenance') return false;
  mtInfo(mtOf(k, it) || { scope: r.scope || 'store', k, msg: String(r.msg || ''), eta: +r.eta || 0 }, title, chk); return true;
}
const DL = { pending: 'Pending', approved: 'Complete', rejected: 'Failed' }, SC = { pending: 'pending', approved: 'complete', rejected: 'rejected' }, SI = { pending: 'clock', approved: 'checkc', rejected: 'xc' };
const empty = (i, h, p) => `<div class="empty-state">${I(i)}<h4>${h}</h4><p>${p}</p></div>`;
try { document.documentElement.dataset.theme = localStorage.getItem('th') || 'dark'; } catch (e) { document.documentElement.dataset.theme = 'dark'; }
function toggleTheme() { const n = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = n; try { localStorage.setItem('th', n) } catch (e) { } }
function support() { const u = S.support || APP.support; tg.openTelegramLink ? tg.openTelegramLink(u) : window.open(u); }
function openM(h) { clearInterval(slideTimer); clearInterval(payTimer); $('#sheet').innerHTML = '<div class="modal-handle"></div>' + h; $('#modal').classList.add('on'); mLvl = 'x'; syncBack(); }
function closeM() { clearInterval(slideTimer); clearInterval(payTimer); $('#modal').classList.remove('on'); $('#sheet').innerHTML = ''; mLvl = 'x'; syncBack(); }
const modalOpen = () => $('#modal').classList.contains('on');
function guard() { if (maintOn()) { toast('Store is under maintenance. Please try again later.', 'err'); return false; } if (!uid) { toast('Please open from Telegram', 'err'); return false; } if (banned()) { toast('Your account is restricted. Contact support.', 'err'); return false; } return true; }

function shell() {
  $('#hdr').innerHTML = `<div class="header"><div class="logo" onclick="nav('home')"><div class="logo-img">${LOGO}</div><div class="logo-text"><b>YADAV JI <i>STORE</i></b><span>Premium APK Marketplace</span></div></div>
  <div class="actions"><button class="theme-toggle" onclick="toggleTheme()">${I('sun', 's')}${I('moon', 'm')}</button>
  <button class="btn-login-head" onclick="nav('profile')">${I('user', 'sm')}<span>${esc(U?.first_name || 'Profile')}</span></button></div></div>`;
  drawNav();
  if (!$('#fab')) document.body.insertAdjacentHTML('beforeend', `<button class="fab" id="fab" onclick="nav('care')" aria-label="Customer care">${I('headset')}</button>`);
  fabSync(); maintSync();
}
// Floating Customer Care icon: har page par dikhta hai (Customer Care ke apne pages par nahi), click par seedha Customer Care page
const CARE_TABS = ['care', 'careissue', 'careai', 'caredep', 'caremine'];
function fabSync() { const f = $('#fab'); if (f) f.style.display = CARE_TABS.includes(tab) ? 'none' : ''; }
function drawNav() {
  const T = [['home', 'Home', 'home'], ['csite', 'FAKE WEBSITE', 'globe'], ...(refCfg().on ? [['refer', 'Refer To Earn', 'refer']] : []), ['orders', 'Orders', 'bag'], ['profile', 'Account', 'user']];
  $('#nav').innerHTML = '<div class="bottom-nav n' + T.length + '">' + T.map(([t, l, i]) => `<button class="nav-item" data-t="${t}" onclick="nav('${t}')">${I(i)}<span>${l}</span>${t === 'orders' ? '<i class="ob" id="obadge" style="display:none"></i>' : ''}</button>`).join('') + '</div>';
  const hl = HL(tab); document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.t === hl));
}
const HL = t => SUBS.includes(t) ? 'profile' : t === 'csplan' ? 'csite' : t === 'bdeploy' ? 'home' : t;
function nav(t, back) {
  if (t === 'templates') t = 'home';
  if (!back) { if (ROOT.includes(t)) hist = []; else if (t !== tab) hist.push(tab); }
  if (t === 'wallet' && tab !== 'wallet') amt = 0;
  if (t === 'caremine') mine = null;
  tab = t; const hl = HL(t); document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.t === hl)); render(); scrollTo(0, 0); syncBack();
}
function goBack() { if ($('#mtpg')) return mtClose(); if (modalOpen()) return mBack(); nav(hist.pop() || 'home', true); }
function mBack() { if (mLvl === 'o' && cur) return openD(cur.id); closeM(); }
function syncBack() { try { (modalOpen() || hist.length || $('#mtpg')) ? tg.BackButton.show() : tg.BackButton.hide(); } catch (e) {} }
try { tg.BackButton.onClick(goBack); } catch (e) {}
const isIn = e => /^(INPUT|TEXTAREA)$/.test((e.target && e.target.tagName) || '');
document.addEventListener('contextmenu', e => { if (!isIn(e)) e.preventDefault(); });
['copy', 'cut', 'selectstart', 'dragstart'].forEach(ev => document.addEventListener(ev, e => { if (window.__cp || isIn(e)) return; e.preventDefault(); }));
function copyTxt(t) { window.__cp = 1; try { const x = document.createElement('textarea'); x.value = t; x.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(x); x.select(); document.execCommand('copy'); x.remove(); toast('Copied'); } catch (e) {} window.__cp = 0; }
/* ---------- Share product (Telegram link). t_<templateId> / c_<csiteProductId> ---------- */
// Admin > Referrals me Mini App short name ho to link seedha product kholta hai. Na ho to bot ka start link (store khulta hai).
const shareLink = (k, id) => { const bu = String(S.botUsername || APP.botUser || '').replace('@', '').trim(), c = refCfg(); if (!bu) return ''; const q = k + '_' + id; return c.app ? `https://t.me/${bu}/${c.app}?startapp=${q}` : `https://t.me/${bu}?start=${q}`; };
const shareBtn = (k, id, cls = '') => `<button type="button" class="shr-i ${cls}" aria-label="Share" onclick="event.stopPropagation();shareP('${k}','${id}')">${I('share', 'sm')}</button>`;
let shr = { l: '', t: '' };
function shareP(k, id) {
  const d = k === 't' ? designs.find(x => x.id === id) : cxFind(id), name = d ? d.title : ''; if (!name) return;
  const l = shareLink(k, id); if (!l) return toast('Share link is not ready yet. Please contact support.', 'err');
  shr = { l, t: `${name} on ${APP.name}. Check it out:` };
  openM(`<div class="shr-sheet"><div class="shr-ic">${I('share')}</div><h3>Share this product</h3><p class="shr-n">${esc(name)}</p><div class="shr-link">${esc(l)}</div>
  <button class="btn-gradient" onclick="shareTg()">${I('send', 'sm')}Share on Telegram</button><button class="btn-outline" onclick="copyTxt(shr.l)">${I('copy', 'sm')}Copy Link</button><button class="btn-outline shr-x" onclick="closeM()">Close</button></div>`);
}
function shareTg() { const u = 'https://t.me/share/url?url=' + encodeURIComponent(shr.l) + '&text=' + encodeURIComponent(shr.t); tg.openTelegramLink ? tg.openTelegramLink(u) : window.open(u); closeM(); }
// Link se aaya hua product seedha kholo. Data aane tak ruko; product hat gaya ho to batao.
let goP = (() => { const m = /^([tc])_([\w-]{1,60})$/.exec(String(tg.initDataUnsafe?.start_param || '')) || /[?&]p=([tc])_([\w-]{1,60})(?:&|$)/.exec(location.search); return m ? { k: m[1], id: m[2] } : null; })(), cxReady = false;
function goPTry() {
  if (!goP || maintOn()) return;
  if (goP.k === 't') { if (!dReady) return; const d = designs.find(x => x.id === goP.id); goP = null; if (!d) return toast('This product is no longer available', 'err'); if (tab !== 'home') nav('home'); openD(d.id); }
  else { if (!cxReady) return; const p = cxFind(goP.id); goP = null; if (!p || p.active === false) return toast('This product is no longer available', 'err'); cxOpen(p.id); }
}

/* ---------- Badges: Best Seller / Trending / New. Sab apne aap, orders ke hisaab se (stats/designOrders) ---------- */
const BD = { best: ['star', 'Best Seller'], hot: ['trend', 'Trending'], new: ['sparkle', 'New'] };
let bdgC = { d: null, p: null, m: {} };   // designs/pop badalne par hi dobara hisaab
function bdgMap() {
  if (bdgC.d === designs && bdgC.p === pop) return bdgC.m;
  const m = {}, r = designs.filter(d => (pop[d.id] || 0) >= 2).sort((a, b) => (pop[b.id] || 0) - (pop[a.id] || 0) || (b.timestamp || 0) - (a.timestamp || 0));
  if (r.length && (pop[r[0].id] || 0) >= 3) { m[r[0].id] = 'best'; r.shift(); }
  r.slice(0, 2).forEach(d => { m[d.id] = 'hot'; });
  const wk = Date.now() - 7 * 86400000; designs.forEach(d => { if (!m[d.id] && d.timestamp > wk) m[d.id] = 'new'; });
  bdgC = { d: designs, p: pop, m }; return m;
}
const bdgH = (id, inl) => { const k = bdgMap()[id]; return k ? `<span class="bdg ${k}${inl ? ' in' : ''}">${I(BD[k][0], 'sm')}${BD[k][1]}</span>` : ''; };

const disc = d => d.originalPrice > d.price ? Math.round((d.originalPrice - d.price) / d.originalPrice * 100) : 0;
const dscH = p => p ? `<div class="dsc" aria-label="${p}% off"><span>${p}% OFF</span></div>` : '';   // 45 degree corner strip (top-right)
const card = d => { const p = disc(d), m = mtOf('tpl', d); return `<div class="design-card${m ? ' mt' : ''}" onclick="openD('${d.id}')"><div class="img-wrap">${m ? '' : dscH(p)}${shareBtn('t', d.id)}${m ? mtOv() : bdgH(d.id)}<img src="${d.thumb || d.logo || d.images?.[0] || ''}" loading="lazy" decoding="async"></div><div class="content"><div><div class="title">${esc(d.title)}</div><div class="desc">${esc(d.desc || d.category || '')}</div></div><div class="price-row"><div><span class="price-main">${rs(d.price)}</span>${p ? `<span class="price-original">${rs(d.originalPrice)}</span>` : ''}</div></div><button class="btn-create${m ? ' mt-b' : ''}">${m ? I('clock', 'sm') + 'MAINTENANCE' : I('bolt', 'sm') + 'CREATE APK'}</button></div></div>`; };
const sorted = () => { const a = [...designs]; return flt === 'low' ? a.sort((x, y) => x.price - y.price) : flt === 'high' ? a.sort((x, y) => y.price - x.price) : flt === 'popular' ? a.sort((x, y) => (pop[y.id] || 0) - (pop[x.id] || 0) || (y.timestamp || 0) - (x.timestamp || 0)) : a.sort((x, y) => (y.timestamp || 0) - (x.timestamp || 0)); };
const none = empty('bag', 'No templates yet', 'Check back later!');
let dReady = false;   // products ka pehla data aa gaya?
const skCards = () => Array.from({ length: 4 }, () => '<div class="design-card sk-card"><div class="img-wrap"><div class="vid-skel" style="height:100%;margin:0;border-radius:0"></div></div><div class="content"><div class="vid-skel" style="height:14px;margin:0 0 8px"></div><div class="vid-skel" style="height:12px;width:60%;margin:0"></div></div></div>').join('');
const tgridHtml = () => sorted().map(card).join('') || (dReady ? none : skCards());


/* ---------- Notice bar (admin se control) ---------- */
const NI = { offer: 'gift', info: 'bell', important: 'alert', update: 'refresh' };
const nlist = () => Object.values(notices).filter(n => n.active !== false && (n.text || n.title) && !(n.expiresAt && n.expiresAt < Date.now())).sort((x, y) => (x.sort ?? 999) - (y.sort ?? 999) || (x.timestamp || 0) - (y.timestamp || 0));
const noticeBar = () => nlist().length ? `<div class="notice-bar" id="nb" onclick="nbNext()"><div class="nb-ic" id="nbi"></div><div class="nb-body"><span class="nb-tag" id="nbt"></span><div class="nb-text" id="nbx"></div></div><div class="nb-dots" id="nbd"></div><i class="nb-prog" id="nbp"></i></div>` : '';
function nbSet(i) {
  const l = nlist(), b = $('#nb'); if (!b || !l.length) return; nIdx = ((i % l.length) + l.length) % l.length; const n = l[nIdx];
  const fill = () => { b.className = 'notice-bar t-' + (n.type || 'info') + (l.length > 1 ? ' run' : '');
    $('#nbi').innerHTML = I(NI[n.type] || 'bell'); $('#nbt').textContent = n.title || 'Notice'; $('#nbx').textContent = n.text || '';
    $('#nbd').innerHTML = l.length > 1 ? l.map((_, k) => `<i class="${k === nIdx ? 'on' : ''}"></i>`).join('') : '';
    const pr = $('#nbp'); if (pr) { pr.style.animation = 'none'; void pr.offsetWidth; pr.style.animation = ''; }
    b.classList.add('in'); };
  if (!b.dataset.init) { b.dataset.init = 1; return fill(); }
  b.classList.remove('in'); b.classList.add('out'); setTimeout(() => { b.classList.remove('out'); fill(); }, 260);
}
function nbNext() { nbSet(nIdx + 1); startNotices(); }
function startNotices() { clearInterval(nTimer); if (!$('#nb')) return; nbSet(nIdx); if (nlist().length > 1) nTimer = setInterval(() => nbSet(nIdx + 1), 4000); }

/* ---------- Wallet sections ---------- */
const balCard = () => `<div class="coin-balance-card"><div class="coin-info"><h3>Available Balance</h3><div class="coin-value"><span class="cur">₹</span><span class="cb">${coins}</span></div></div></div>`;
const uIc = m => I(m === 'bep20' ? 'bep20' : m === 'trc20' ? 'trc20' : 'usdt', 'u-ic');
const amtLbl = (n, m) => m === 'upi' ? '₹' + n : uIc(m) + n;
const packs = m => `<h3 class="sub-h">Choose amount</h3><div class="coin-pack-grid">${PK[kd(m)].map(n => { const b = bOf(toC(n, m), m); return `<div class="coin-pack ${amt === n ? 'selected' : ''}" data-n="${n}" onclick="selPack(${n})"><div class="pack-amt">${amtLbl(n, m)}</div>${b ? `<div class="pack-bonus">Bonus +₹${b}</div>` : ''}</div>`; }).join('')}</div>
<div class="coin-custom-input">${m === 'upi' ? '<b class="cur-in">₹</b>' : uIc(m)}<input type="number" id="ci" min="10" placeholder="Enter amount" oninput="customAmt()" value="${amt && !PK[kd(m)].includes(amt) ? amt : ''}">${m === 'upi' ? '' : '<b>USDT</b>'}</div>`;
const sumIn = m => {
  const c = toC(amt, m), b = bOf(c, m), bp = bPct(m);
  return `<div class="srow"><span>You pay</span><b>${m === 'upi' ? rs(amt) : uIc(m) + amt + ' USDT'}</b></div>${m === 'upi' ? '' : `<div class="srow"><span>Amount</span><b>${rs(c)}</b></div>`}${bp ? `<div class="srow"><span>Bonus (${bp}%)</span><b class="ok">+₹${b}</b></div>` : ''}<div class="srow"><span>Total credited</span><b class="ok">${rs(c + b)}</b></div>`;
};
const sumBox = m => `<div class="deposit-sum" id="sumw">${sumIn(m)}</div>`;
function upiSec() {
  if (!(S.upi || APP.upi || S.upiQr)) return empty('upi', 'UPI deposit unavailable', 'Please contact support.');
  const bp = bPct('upi');
  return `${bp ? `<div class="bonus-banner">${I('gift')}<div><b>${bp}% Bonus on UPI-QR</b><span>Extra balance added on every approved UPI deposit</span></div></div>` : `<div class="info-box">${I('upi', 'sm')}<span>Pay via UPI or scan the QR code</span></div>`}${packs('upi')}
  ${sumBox('upi')}
  <button class="btn-gradient" onclick="startDeposit('upi')">${I('upi', 'sm')}Continue with UPI-QR</button>`;
}
function usdtSec(k) {
  const c = uc(k), n = NETS[k];
  if (!(c.on && c.address)) return empty('usdt', 'USDT ' + n + ' deposit unavailable', 'Please contact support.');
  const bp = bPct(k);
  return `${bp ? `<div class="bonus-banner">${I('gift')}<div><b>${bp}% Bonus on USDT ${n}</b><span>Extra balance added on every approved ${n} deposit</span></div></div>` : `<div class="info-box">${I(k, 'sm')}<span>Send USDT on ${n} network only</span></div>`}<div class="info-box min-box"><span>Minimum deposit: <b>10 USDT</b></span></div>${packs(k)}
  ${sumBox(k)}
  <button class="btn-gradient" id="cb" onclick="startDeposit('${k}')">${I(k, 'sm')}Continue with USDT ${n}</button>`;
}
function depSec() {
  const F = [['all', 'All'], ['pending', 'Pending'], ['approved', 'Complete'], ['rejected', 'Failed']], c = k => k === 'all' ? deps.length : deps.filter(d => d.status === k).length;
  const list = deps.filter(d => dflt === 'all' || d.status === dflt);
  return `<div class="chips">${F.map(([k, l]) => `<button class="chip ${dflt === k ? 'on' : ''}" onclick="dflt='${k}';render()">${l}<i>${c(k)}</i></button>`).join('')}</div>` +
    (list.length ? list.map(d => `<div class="row-item"><div class="ri-ic ${d.status}">${I(SI[d.status] || 'clock')}</div><div class="ri-b"><b>${mLabel(d)}</b><small>${fmtS(d.timestamp)}<br>${d.method === 'usdt' ? 'TXID' : 'UTR'}: ${esc(d.utr)}</small>${payNow(d)}</div><div class="ri-r"><b class="cr">+₹${d.coins}${d.bonus ? `<span class="bonus-tag">Bonus +₹${d.bonus}</span>` : ''}</b><span class="status-badge ${SC[d.status] || 'pending'}">${DL[d.status] || d.status}</span></div></div>`).join('') : empty('receipt', 'No deposits found', 'Your deposit requests will appear here.'));
}
function txSec() {
  const F = [['all', 'All'], ['credit', 'Credit'], ['debit', 'Debit']], list = txs.filter(t => tflt === 'all' || t.type === tflt);
  return `<div class="chips">${F.map(([k, l]) => `<button class="chip ${tflt === k ? 'on' : ''}" onclick="tflt='${k}';render()">${l}</button>`).join('')}</div>` +
    (list.length ? list.map(t => `<div class="row-item"><div class="ri-ic ${t.type}">${I(t.type === 'credit' ? 'plus' : 'minus')}</div><div class="ri-b"><b>${TXL[t.reason] || 'Transaction'}</b><small>${fmtS(t.timestamp)}${t.note ? '<br>' + esc(t.note) : ''}</small></div><div class="ri-r"><b class="${t.type === 'credit' ? 'cr' : 'db'}">${t.type === 'credit' ? '+' : '-'}₹${t.amount}</b><small style="color:var(--tm);font-weight:600;font-size:.68rem">Bal: ₹${t.balanceAfter ?? '-'}</small></div></div>`).join('') : empty('trend', 'No transactions', 'Every coin movement will be listed here.'));
}
function setW(k) { wsec = k; amt = 0; render(); }
function walletView() {
  const T = [['upi', 'UPI-QR', 'upi'], ['trc20', 'USDT TRC20', 'trc20'], ['bep20', 'USDT BEP20', 'bep20']];
  if (!T.some(x => x[0] === wsec)) wsec = 'upi';
  return `<div class="page-header-custom"><h2>${I('wallet')}Deposit</h2>${backBtn()}</div>${balCard()}<div class="chips">${T.map(([k, l, i]) => `<button class="chip ${wsec === k ? 'on' : ''}" onclick="setW('${k}')">${I(i, 'sm')}${l}</button>`).join('')}</div>` +
    (wsec === 'upi' ? upiSec() : usdtSec(wsec));
}
function upd() { const w = $('#sumw'); if (w) w.innerHTML = sumIn(wsec); }
function selPack(n) { amt = n; document.querySelectorAll('.coin-pack').forEach(p => p.classList.toggle('selected', +p.dataset.n === n)); $('#ci').value = ''; upd(); }
function customAmt() { amt = +$('#ci').value || 0; document.querySelectorAll('.coin-pack').forEach(p => p.classList.remove('selected')); upd(); }

/* ---------- Profile ---------- */
const depRows = k => { const l = deps.filter(d => d.status === k);
  return l.length ? l.map(d => `<div class="row-item"><div class="ri-ic ${d.status}">${I(SI[d.status] || 'clock')}</div><div class="ri-b"><b>${mLabel(d)}</b><small>${fmtS(d.timestamp)}<br>${d.method === 'usdt' ? 'TXID' : 'UTR'}: ${esc(d.utr)}</small>${payNow(d)}</div><div class="ri-r"><b class="${d.status === 'rejected' ? 'db' : 'cr'}">${d.status === 'rejected' ? '' : '+'}₹${d.coins}${d.bonus && d.status !== 'rejected' ? `<span class="bonus-tag">Bonus +₹${d.bonus}</span>` : ''}</b><span class="status-badge ${SC[d.status]}">${DL[d.status]}</span></div></div>`).join('')
    : empty('receipt', 'No ' + DL[k].toLowerCase() + ' deposits', 'Nothing to show here yet.'); };
const depBox = () => `<div class="pbox-tabs">${[['approved', 'Complete'], ['rejected', 'Failed'], ['pending', 'Pending']].map(([k, l]) => `<button class="${pdf === k ? 'on ' + k : k}" onclick="setPdf('${k}')">${l}<i>${deps.filter(d => d.status === k).length}</i></button>`).join('')}</div><div class="pbox-list">${depRows(pdf)}</div>`;
function setPdf(k) { pdf = k; render(); }
const txBox = () => `<div class="pbox-list">${txs.length ? txs.map(t => `<div class="row-item"><div class="ri-ic ${t.type}">${I(t.type === 'credit' ? 'plus' : 'minus')}</div><div class="ri-b"><b>${t.type === 'credit' ? 'Added' : 'Deducted'}: ${TXL[t.reason] || 'Transaction'}</b><small>${fmtS(t.timestamp)}${t.note ? '<br>' + esc(t.note) : ''}</small></div><div class="ri-r"><b class="${t.type === 'credit' ? 'cr' : 'db'}">${t.type === 'credit' ? '+' : '-'}₹${t.amount}</b><small style="color:var(--tm);font-weight:600;font-size:.68rem">Balance: ₹${t.balanceAfter ?? '-'}</small></div></div>`).join('') : empty('trend', 'No transactions', 'Every coin added or deducted will be listed here.')}</div>`;
const subHead = (i, t) => `<div class="page-header-custom"><h2>${I(i)}${t}</h2>${backBtn()}</div>`;
function profileView() {
  const nm = ((U?.first_name || '') + ' ' + (U?.last_name || '')).trim() || 'User', ok = deps.filter(d => d.status === 'approved');
  const dep = ok.reduce((x, d) => x + (d.coins || 0), 0), bonus = ok.reduce((x, d) => x + (d.bonus || 0), 0), csOk = (cso || []).filter(o => o.status === 'active' || o.status === 'expired'), spent = orders.filter(o => o.status !== 'rejected').reduce((x, o) => x + (o.paymentAmount || 0), 0) + csOk.reduce((x, o) => x + (o.price || 0), 0);
  const allTime = Math.max(txs.filter(t => t.type === 'credit' && t.reason !== 'refund').reduce((x, t) => x + t.amount, 0), coins + spent);
  return `<div class="pf">
  <div class="p-head"><div class="p-av">${U?.photo_url ? `<img src="${esc(U.photo_url)}">` : esc(nm[0].toUpperCase())}</div><div class="p-id"><div class="p-name">${esc(nm)}</div><div class="p-tid">${I('badge', 'sm')}<span>ID</span><b>${uid || '-'}</b></div></div></div>
  <div class="coin-balance-card pf-bal"><div class="coin-info"><h3>Total Balance</h3><div class="coin-value"><span class="cur">₹</span><span class="cb">${coins}</span></div></div></div>
  <button class="btn-gradient pf-dep" onclick="wsec='upi';nav('wallet')">${I('wallet')}DEPOSIT</button>
  <div class="ptiles"><button class="ptile" onclick="nav('dephist')"><span class="pbox-ic">${I('receipt')}</span><b>DEPOSIT HISTORY</b><small>${deps.length} records</small></button><button class="ptile" onclick="nav('txhist')"><span class="pbox-ic">${I('trend')}</span><b>TRANSACTION</b><small>${txs.length} records</small></button></div>
  ${giftBox()}
  <div class="info-list">${[['chat', 'Username', U?.username ? '@' + esc(U.username) : '-'], ['wallet', 'Available Balance', rs(coins)], ['gift', 'Total Bonus', rs(bonus)], ...(refs.length ? [['users', 'Referral Earned', rs(refs.reduce((x, r) => x + (r.earned || 0), 0))]] : []), ['bag', 'Total Order', orders.length + csOk.length + (bso || []).filter(o => o.status !== 'failed').length], ['download', 'Total Deposited', rs(dep)], ['tag', 'Total Spent', rs(spent)]].map(([i, l, v]) => `<div class="irow"><span>${I(i)}${l}</span><b>${v}</b></div>`).join('')}</div>
  <div class="ptiles pf-cs"><button class="ptile ptile-wide" onclick="nav('care')"><span class="pbox-ic">${svgIc('headset')}</span><span class="pt-tx"><b>CUSTOMER CARE</b><small>Report a problem, AI help, deposit not received</small></span><span class="pt-ar">${I('arrow', 'sm')}</span></button></div></div>`;
}

function render() {
  document.body.classList.toggle('chat', tab === 'careai' && aiOn()); fabSync();
  clearInterval(nTimer); const v = $('#view'), active = orders.filter(o => o.status === 'pending' || o.status === 'in-progress').length + (bso || []).filter(o => o.status === 'queued' || o.status === 'deploying').length;
  if (tab === 'home') v.innerHTML = `${noticeBar()}${bdHero()}${balBox()}<div class="stats-row">${[['bag', (dReady ? designs.length + '+ ' : '') + 'Templates'], ['shield', '100% Secure And Fast']].map(([i, t]) => `<div class="stat-pill">${I(i)}${t}</div>`).join('')}</div>
  <h2 class="section-title" id="tpl">${I('layers')}Available Templates</h2>${fltBar()}<div class="design-grid" id="tgrid">${tgridHtml()}</div>`;
  else if (tab === 'csite') v.innerHTML = cxView();
  else if (tab === 'csplan') v.innerHTML = cxPlanView();
  else if (tab === 'bdeploy') v.innerHTML = bdView();
  else if (tab === 'refer') v.innerHTML = referView();
  else if (tab === 'wallet') v.innerHTML = walletView();
  else if (tab === 'orders') { v.innerHTML = ordersView(); loadCso(); loadBso(); bsoArm(); }
  else if (tab === 'dephist') v.innerHTML = `<div class="pg-list">${subHead('receipt', 'Deposit History')}${depBox()}</div>`;
  else if (tab === 'txhist') v.innerHTML = `<div class="pg-list">${subHead('trend', 'Transaction History')}${txBox()}</div>`;
  else if (tab === 'care') v.innerHTML = careView();
  else if (tab === 'careissue') v.innerHTML = careIssueView();
  else if (tab === 'careai') { v.innerHTML = aiView(); aiDraw(true); }
  else if (tab === 'caredep') v.innerHTML = depNrView();
  else if (tab === 'caremine') { v.innerHTML = mineView(); if (mine === null) loadMine(); }
  else { v.innerHTML = profileView(); loadCso(); }
  document.querySelectorAll('.cb').forEach(e => e.textContent = coins);
  if (tab === 'home') startNotices();
  const b = $('#obadge'); if (b) { b.style.display = active ? 'inline' : 'none'; b.textContent = active; }
}

/* ---------- Refer To Earn ---------- */
// 3 slots: friend ke 1st / 2nd / 3rd deposit par bonus. t='pct' (deposit ka %) ya 'fix' (fixed Rs). Admin > Settings > Referral Program se set hota hai.
const refCfg = () => {
  const r = S.referral || {}, sl = r.slots || null, lp = +(r.pct ?? 10), lm = Math.max(1, parseInt(r.max ?? 3) || 3), slots = [1, 2, 3].map(i => {
    if (sl) { const x = sl['d' + i] || sl[i - 1]; if (!x) return { t: 'pct', v: 0 }; const t = x.t === 'fix' ? 'fix' : 'pct', v = Math.max(0, +x.v || 0); return { t, v: t === 'pct' ? Math.min(100, v) : v }; }
    return { t: 'pct', v: i <= lm ? Math.max(0, Math.min(100, lp)) : 0 };
  });
  return { on: r.on !== false && slots.some(x => x.v > 0), slots, max: 3, welcome: +(r.welcome || 0), app: String(r.app || '').replace(/[^\w]/g, '') };
};
const slotVal = x => x.v > 0 ? (x.t === 'fix' ? '₹' + x.v : x.v + '%') : '—';
const slotSub = x => x.v > 0 ? (x.t === 'fix' ? 'flat bonus' : 'of deposit') : 'no bonus';
const slotAmt = (x, n) => x.v <= 0 ? 0 : x.t === 'fix' ? Math.floor(x.v) : Math.floor(n * x.v / 100);
const ORD = ['1st', '2nd', '3rd'];
const refLink = () => { const bu = String(S.botUsername || APP.botUser || '').replace('@', '').trim(), c = refCfg(); if (!bu || !me.displayId) return ''; return c.app ? `https://t.me/${bu}/${c.app}?startapp=ref_${me.displayId}` : `https://t.me/${bu}?start=ref_${me.displayId}`; };
function copyRef() { const l = refLink(); if (!l) return toast('Your invite link is not ready yet. Please contact support.', 'err'); copyTxt(l); }
function shareRef() {
  const l = refLink(); if (!l) return toast('Your invite link is not ready yet. Please contact support.', 'err');
  const u = 'https://t.me/share/url?url=' + encodeURIComponent(l) + '&text=' + encodeURIComponent('Get your own APK built on ' + APP.name + '. Join with my invite link:');
  tg.openTelegramLink ? tg.openTelegramLink(u) : window.open(u);
}
const REFART = `<svg viewBox="0 0 120 120" class="rf-art" aria-hidden="true"><defs><linearGradient id="rg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C4B5FD"/><stop offset="1" stop-color="#818CF8"/></linearGradient><linearGradient id="rg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FDE68A"/><stop offset="1" stop-color="#F59E0B"/></linearGradient></defs>
<ellipse cx="60" cy="108" rx="34" ry="6" fill="#000" opacity=".25"/><rect x="26" y="52" width="68" height="52" rx="10" fill="url(#rg1)"/><rect x="20" y="40" width="80" height="20" rx="8" fill="#fff" fill-opacity=".92"/><rect x="53" y="40" width="14" height="64" fill="url(#rg2)"/><rect x="53" y="40" width="14" height="20" fill="url(#rg2)"/>
<path d="M60 40c-6-14-24-16-24-6s14 8 24 6zM60 40c6-14 24-16 24-6s-14 8-24 6z" fill="none" stroke="url(#rg2)" stroke-width="5" stroke-linecap="round"/>
<g class="rf-c1"><circle cx="100" cy="30" r="9" fill="url(#rg2)"/><path d="M100 25v10M97 28h6M97 32h6" stroke="#B45309" stroke-width="1.8" fill="none" stroke-linecap="round"/></g><g class="rf-c2"><circle cx="18" cy="52" r="7" fill="url(#rg2)"/><circle cx="18" cy="52" r="3.4" fill="none" stroke="#B45309" stroke-width="1.6"/></g>
<path class="rf-sp" d="M92 8l1.8 4.2L98 14l-4.2 1.8L92 20l-1.8-4.2L86 14l4.2-1.8z" fill="#fff"/><path class="rf-sp s2" d="M24 22l1.4 3.2L28.6 26.6l-3.2 1.4L24 31.2l-1.4-3.2-3.2-1.4 3.2-1.4z" fill="#fff"/></svg>`;
const rfFriend = r => { const c = Math.min(3, r.count || 0); return `<div class="rf-friend"><div class="rf-av ${c ? 'on' : ''}">${esc((r.name || 'F')[0].toUpperCase())}</div><div class="rf-fb"><b>${esc(r.name || 'Friend')}</b><small>${r.friendDisplayId ? '#' + r.friendDisplayId + ' • ' : ''}Joined ${fmtD(r.at)}</small><div class="rf-prog" title="${c}/3 deposits">${[0, 1, 2].map(k => `<i class="${k < c ? 'on' : ''}"></i>`).join('')}<em>${c}/3 deposits</em></div></div><div class="rf-fe"><b>+₹${r.earned || 0}</b><small>earned</small></div></div>`; };
function referView() {
  const c = refCfg(), link = refLink(), earned = refs.reduce((x, r) => x + (r.earned || 0), 0), paid = refs.filter(r => (r.count || 0) > 0).length, head = `<div class="page-header-custom"><h2>${I('refer')}Refer To Earn</h2></div>`;
  if (!c.on) return head + empty('gift', 'Referral paused', 'The referral program is paused right now. It will be back soon.');
  const ex = 1000, tot = c.slots.reduce((x, y) => x + slotAmt(y, ex), 0), per = c.slots.map((x, i) => slotAmt(x, ex)).filter(n => n > 0);
  return `${head}
  <div class="rf-hero"><i class="rf-orb o1"></i><i class="rf-orb o2"></i><div class="rf-hero-in"><div class="rf-ht"><span class="rf-badge">${I('sparkle', 'sm')}Referral Rewards</span><h3>Invite friends.<br><em>Earn</em> on every deposit.</h3><p>Earn a bonus on each of your friend's first 3 deposits.</p></div>${REFART}</div>
  <div class="rf-earn"><span>Total earned</span><b>₹${earned}</b></div></div>
  <div class="rf-card rf-invite"><div class="rf-ct"><span>${I('link', 'sm')}Your invite link</span>${me.displayId ? `<span class="rf-id">ID #${me.displayId}</span>` : ''}</div><div class="rl-box" id="rlink">${link ? esc(link) : 'Preparing your link...'}</div><div class="rl-btns"><button class="btn-gradient" onclick="shareRef()">${I('share', 'sm')}Share Invite</button><button class="btn-outline" onclick="copyRef()">${I('copy', 'sm')}Copy Link</button></div></div>
  <h3 class="rf-h">${I('crown', 'sm')}Reward per deposit</h3>
  <div class="rf-ladder">${c.slots.map((x, i) => `<div class="rf-step s${i + 1} ${x.v > 0 ? '' : 'off'}"><span class="rf-n">${ORD[i]}</span><b>${slotVal(x)}</b><small>${slotSub(x)}</small><span class="rf-tag">deposit</span></div>`).join('')}</div>
  ${tot > 0 ? `<div class="rf-ex">${I('info', 'sm')}<span>Example: when your friend deposits <b>₹${ex}</b>, you earn ${c.slots.map((x, i) => slotAmt(x, ex) > 0 ? `<b>₹${slotAmt(x, ex)}</b> on the ${ORD[i]} deposit` : '').filter(Boolean).join(', ')}.${c.welcome ? ` Your friend also gets <b>₹${c.welcome}</b> extra on the first deposit.` : ''}</span></div>` : ''}
  <div class="rf-stats"><div class="rf-st"><span class="rf-si">${I('users')}</span><b>${refs.length}</b><small>Friends joined</small></div><div class="rf-st"><span class="rf-si">${I('checkc')}</span><b>${paid}</b><small>Deposited</small></div><div class="rf-st gold"><span class="rf-si">${I('wallet')}</span><b>₹${earned}</b><small>Total earned</small></div></div>
  <h3 class="rf-h">${I('bolt', 'sm')}How it works</h3>
  <div class="rf-how">${[['share', 'Share your link', 'Send your invite link to a friend. Your friend must be a new user.'], ['download', 'Friend makes a deposit', 'Your friend opens the store from your link and makes a deposit.'], ['gift', 'Earn your bonus', "You earn a bonus on each of your friend's first 3 approved deposits. It is added to your balance."]].map(([ic, t, d], i) => `<div class="rf-hs"><span class="rf-hi">${I(ic, 'sm')}<i>${i + 1}</i></span><div><b>${t}</b><small>${d}</small></div></div>`).join('')}</div>
  ${myRef && myRef.byDisplayId ? `<div class="info-box">${I('badge', 'sm')}<span>You were invited by <b>#${myRef.byDisplayId}</b></span></div>` : ''}
  <h3 class="rf-h">${I('users', 'sm')}Your friends <i class="rf-cnt">${refs.length}</i></h3>${refs.length ? refs.map(rfFriend).join('') : `<div class="rf-empty">${I('users')}<b>No friends yet</b><small>Share your invite link. Friends who join will appear here.</small></div>`}
  <p class="rf-note">A bonus is paid only on approved deposits. Your friend must join using your link and must not have deposited before.</p>`;
}
// Invite link ka code (start_param / ?ref= / pichla yaad kiya hua) server ko bhejta hai. Server Telegram signature verify karke friend ko jodta hai.
const refKey = () => uid + '|' + myJoined;
function refParam() {
  try {
    const sp = String(tg.initDataUnsafe?.start_param || ''), a = /^ref_(\d{3,9})$/.exec(sp), b = /[?&]ref=(\d{3,9})(?:&|$)/.exec(location.search), v = a ? a[1] : b ? b[1] : '';
    if (v) { try { localStorage.setItem('ref', v); localStorage.setItem('refUid', refKey()); } catch (e) { } return v; }
    return localStorage.getItem('refUid') === refKey() ? (localStorage.getItem('ref') || '') : '';   // yaad kiya hua code sirf usi account ke liye (delete ke baad naya account)
  } catch (e) { return ''; }
}
// Code link me ho to wo bhejta hai. Link me na ho (jaise user ne Menu button se store khola) to bhi server se poochta hai:
// bot ne /start ref_XXXX par jo code yaad rakha tha wo wahan se lag jata hai.
async function bindRef() {
  const r = refParam(); let done = ''; try { done = localStorage.getItem('refDone') || ''; } catch (e) { }
  if (done === refKey() + '|*' || (r && done === refKey() + '|' + r)) return;
  try {
    const x = await api('refbind', r ? { ref: r } : {});
    if (!x) return;
    if (x.ok) { try { localStorage.setItem('refDone', refKey() + '|*'); } catch (e) { } if (!x.already) toast('Invite link applied'); }
    else if (r && ['invalid', 'self', 'late', 'circular', 'banned'].includes(x.error)) { try { localStorage.setItem('refDone', refKey() + '|' + r); } catch (e) { } }
  } catch (e) { }
}

/* ---------- Order flow ---------- */
const ytId = u => (String(u).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/) || [])[1];
const slider = im => `<div class="slider"><div class="slides" id="slides" onscroll="slideSync()" ontouchstart="this.dataset.hold=1">${im.map(i => `<div class="slide"><img src="${i}" loading="lazy"></div>`).join('')}</div>${im.length > 1 ? `<button class="sl-btn sl-prev" onclick="slideGo(-1)">${I('chev')}</button><button class="sl-btn sl-next" onclick="slideGo(1)">${I('chev')}</button><div class="sl-dots" id="sld">${im.map((_, k) => `<i class="${k ? '' : 'on'}"></i>`).join('')}</div><span class="sl-count" id="slc">1/${im.length}</span>` : ''}</div>`;
function slideGo(d) { const s = $('#slides'); if (!s) return; s.dataset.hold = 1; s.scrollBy({ left: d * s.clientWidth, behavior: 'smooth' }); }
function slideSync() { const s = $('#slides'); if (!s) return; const n = s.children.length, i = Math.min(n - 1, Math.max(0, Math.round(s.scrollLeft / s.clientWidth))); document.querySelectorAll('#sld i').forEach((e, k) => e.classList.toggle('on', k === i)); const c = $('#slc'); if (c) c.textContent = (i + 1) + '/' + n; }
function startSlide() { clearInterval(slideTimer); const s = $('#slides'); if (!s || s.children.length < 2) return; slideTimer = setInterval(() => { const e = $('#slides'); if (!e) return clearInterval(slideTimer); if (e.dataset.hold) return; const n = e.children.length, i = Math.round(e.scrollLeft / e.clientWidth); e.scrollTo({ left: ((i + 1) % n) * e.clientWidth, behavior: 'smooth' }); }, 3500); }
const mBackBtn = l => `<div class="m-top"><button class="back-btn" onclick="mBack()"><span class="bk-ic">${I('chev')}</span><span class="bk-t"><small>Back to</small><b>${l}</b></span></button></div>`;
const mstrip = (hasV, im) => `<h3 class="m-h">${I('play', 'sm')}Preview</h3><div class="mstrip" id="mstrip">${hasV ? '<div class="mcard vcard" id="vid"><div class="vid-skel"></div></div>' : ''}${im.map(i => `<div class="mcard"><img src="${i}" loading="lazy"></div>`).join('')}</div>`;
async function loadVid(id) {
  try {
    const m = (await db.ref('designMedia/' + id).once('value')).val(), box = $('#vid'); if (!box || !cur || cur.id !== id) return;
    if (!m || !m.video) return box.remove();
    const yt = ytId(m.video);
    if (yt) box.innerHTML = `<iframe src="https://www.youtube.com/embed/${yt}?rel=0&playsinline=1" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    else { let src = m.video; if (src.startsWith('data:')) src = URL.createObjectURL(await (await fetch(src)).blob()); box.innerHTML = `<video src="${esc(src)}" controls playsinline preload="metadata" poster="${esc(cur.images?.[0] || '')}"></video>`; }
  } catch (e) { const b = $('#vid'); if (b) b.remove(); }
}
const FULL = {};   // id -> poora design (sab images ke saath). Home par sirf chhote cards aate hain, poori images product kholne par ek baar
let cardsOn = false;
const mstripSk = (hasV, n) => `<h3 class="m-h">${I('play', 'sm')}Preview</h3><div class="mstrip" id="mstrip">${hasV ? '<div class="mcard vcard" id="vid"><div class="vid-skel"></div></div>' : ''}${Array.from({ length: Math.min(n || 0, 3) }, () => '<div class="mcard"><div class="vid-skel"></div></div>').join('')}</div>`;
function openD(id) {
  const c = designs.find(d => d.id === id); if (!c) return;
  const mb = mtBlock('tpl', c); if (mb) return mtInfo(mb, c.title, mtTpl(id));   // store / Templates / is product ka maintenance -> Expected back page
  if (!cardsOn) return showD(c);
  if (FULL[id]) return showD({ ...FULL[id], ...c });   // card (taaza price/title) + cache ki images
  showD(c, true);   // pehle card se turant kholo, poori images aate hi gallery bhar jayegi
  db.ref('designs/' + id).once('value').then(s => {
    const f = s.val(); if (!f || typeof f !== 'object') return; FULL[id] = { id, ...f };
    if (cur && cur.id === id) { cur = FULL[id]; const m = $('#mgal'); if (m && mLvl === 'd') { m.innerHTML = cur.hasVideo || (cur.images || []).length ? mstrip(cur.hasVideo, cur.images || []) : ''; if (cur.hasVideo) loadVid(cur.id); } }
  }).catch(() => { });
}
function showD(d, loading) {
  cur = d; const p = disc(cur), im = cur.images || [], lg = cur.logo || cur.thumb || im[0] || '';
  openM(`${mBackBtn(TABN[tab] || 'Templates')}<div class="detail-top"><img class="detail-img" src="${lg}"><div class="detail-info"><h2>${esc(cur.title)}</h2><span class="d-tag">${I('tag', 'sm')}${esc(cur.category || 'APK')}</span>${bdgH(cur.id, 1)}<div class="d-price"><span class="price-final">${rs(cur.price)}</span>${p ? `<span class="price-original">${rs(cur.originalPrice)}</span><span class="discount-tag">SAVE ${p}%</span>` : ''}</div></div></div>
  <div id="mgal">${loading ? (cur.hasVideo || cur.imgN ? mstripSk(cur.hasVideo, cur.imgN) : '') : cur.hasVideo || im.length ? mstrip(cur.hasVideo, im) : ''}</div>
  <h3 style="font-size:.8rem;font-weight:800;color:var(--t2);margin-bottom:6px">Description</h3><p style="font-size:.8rem;color:var(--tm);text-transform:uppercase;line-height:1.5;font-weight:600;margin-bottom:20px">${esc(cur.desc || 'ALL GAME WORKING')}</p>
  <div style="display:flex;gap:10px"><button class="btn-outline shr-sq" aria-label="Share" onclick="shareP('t','${cur.id}')">${I('share')}</button><button class="btn-outline" style="flex:.5" onclick="closeM()">Cancel</button><button class="btn-gradient" style="flex:1" onclick="startOrder()">Continue ${I('arrow', 'sm')}</button></div>`);
  mLvl = 'd'; if (cur.hasVideo && !loading) loadVid(cur.id);
}
const MODES = [['member', 'member', 'Only Member Hack'], ['both', 'both', 'Member Hack + Fake Website Hack'], ['demo', 'demo', 'Member + Fake + Prediction'], ['fake', 'fake', 'Prediction Website', true]];
const MG = (id, a, b) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>`;
const MI = {
  member: `<svg viewBox="0 0 48 48" class="mi-svg">${MG('mg1', '#C4B5FD', '#60A5FA')}<path d="M24 4.5l16 6v12.2c0 9.8-6.8 17.4-16 21-9.2-3.6-16-11.2-16-21V10.5z" fill="url(#mg1)" fill-opacity=".2" stroke="url(#mg1)" stroke-width="2.4" stroke-linejoin="round"/><path d="M16 24.5l6 6 11-12.5" fill="none" stroke="url(#mg1)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" class="mi-draw"/><circle cx="39" cy="7" r="2.2" fill="#FDE68A" class="mi-spark"/></svg>`,
  both: `<svg viewBox="0 0 48 48" class="mi-svg">${MG('mg2', '#A78BFA', '#38BDF8')}<circle cx="22" cy="23" r="15" fill="url(#mg2)" fill-opacity=".18" stroke="url(#mg2)" stroke-width="2.4"/><ellipse cx="22" cy="23" rx="6.5" ry="15" fill="none" stroke="url(#mg2)" stroke-width="2"/><path d="M7 23h30M9.5 14h25M9.5 32h25" stroke="url(#mg2)" stroke-width="1.8" fill="none"/><g class="mi-pop"><rect x="29" y="27" width="15" height="13" rx="3.5" fill="#6D28D9" stroke="#fff" stroke-width="1.6"/><path d="M33 27v-3a3.5 3.5 0 0 1 7 0v3" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle cx="36.5" cy="33.5" r="1.8" fill="#FDE68A"/></g></svg>`,
  demo: `<svg viewBox="0 0 48 48" class="mi-svg">${MG('mg3', '#F0ABFC', '#818CF8')}<path d="M13 6h22l8 11-19 25L5 17z" fill="url(#mg3)" fill-opacity=".22" stroke="url(#mg3)" stroke-width="2.4" stroke-linejoin="round"/><path d="M5 17h38M17 6l-4 11 11 25M31 6l4 11-11 25" fill="none" stroke="url(#mg3)" stroke-width="1.9" stroke-linejoin="round"/><path d="M40 3l1.4 3.1L44.5 7.5l-3.1 1.4L40 12l-1.4-3.1L35.5 7.5l3.1-1.4z" fill="#FDE68A" class="mi-spark"/></svg>`,
  fake: `<svg viewBox="0 0 48 48" class="mi-svg">${MG('mg4', '#7DD3FC', '#A78BFA')}<rect x="5" y="7" width="38" height="34" rx="8" fill="url(#mg4)" fill-opacity=".16" stroke="url(#mg4)" stroke-width="2.4"/><path d="M11 32l9-9 6 5 11-14" fill="none" stroke="url(#mg4)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" class="mi-draw"/><circle cx="37" cy="14" r="3.6" fill="#FDE68A" stroke="#fff" stroke-width="1.4" class="mi-pop"/></svg>`
};
function startOrder() {
  if (!guard()) return;
  { const mb = mtBlock('tpl', designs.find(x => x.id === cur.id) || cur); if (mb) return mtInfo(mb, cur.title, mtTpl(cur.id)); }
  mode = 'member'; fstyle = 0; cpn = null; cpBusy = false; cpSeq++; tpRid = newRid(); const lg = cur.logo || cur.thumb || cur.images?.[0] || '';
  openM(`${mBackBtn('Details')}<div class="detail-top o-top"><img class="detail-img" src="${lg}"><div class="detail-info"><h2>${esc(cur.title)}</h2><p class="o-desc">${esc(cur.desc || cur.category || 'ALL GAME WORKING')}</p></div></div>
  <label class="lbl">Select Build Mode</label><div class="build-mode-grid">${MODES.map(([k, i, t, off]) => `<div class="build-mode-card ${off ? 'off' : ''}" data-m="${k}" ${off ? '' : `onclick="setMode('${k}')"`}>${off ? '<span class="mt-badge">MAINTENANCE</span>' : ''}<span class="mi">${MI[i]}</span><div class="mode-title">${t}</div><div class="mode-price">${rs(cost(cur, k))}</div></div>`).join('')}</div>
  <div class="form-group"><label>App Name <span class="req">*</span></label><input id="an" placeholder="e.g. My App" oninput="prevName()"></div>
  <div class="font-pick"><label class="lbl">App name font style <span class="opt">(Optional)</span></label><div class="font-row">${[1, 2, 3].map(k => `<button type="button" class="font-box" data-f="${k}" onclick="setFont(${k})">${fancy('Font', k)}</button>`).join('')}</div><div class="font-prev" id="fprev"></div></div>
  <div class="form-group"><label>App Logo <span class="req">*</span></label><input id="al" type="file" accept="image/*"></div>
  <div class="form-group"><label>Minimum Deposit Amount</label><input id="md" type="number" min="1" placeholder="Enter minimum deposit"></div>
  <div class="form-group" id="l1"><label>Website/Referral Link <span class="req">*</span></label><input id="rl" type="url" placeholder="https://game.com/ref"></div>
  <div class="form-group" id="l2" style="display:none"><label>Fake Website URL <span class="req">*</span></label><input id="fl" type="url" placeholder="https://fakesite.com"></div>
  <div class="form-group" id="l3" style="display:none"><label>Prediction Website URL <span class="req">*</span></label><input id="dl" type="url" placeholder="https://prediction.com"></div>
  <div class="form-group"><label>Demo Account Number <span class="opt">(Optional)</span></label><input id="da" type="tel" inputmode="numeric" maxlength="30" placeholder="Enter demo account number"></div>
  <div class="cpn"><label class="lbl">Coupon code <span class="opt">(Optional)</span></label><div class="cpn-row"><input id="cpc" maxlength="24" placeholder="Enter coupon code" autocomplete="off" autocapitalize="characters" onkeydown="if(event.key==='Enter')cpBtn()"><button type="button" class="cpn-b" id="cpb" onclick="cpBtn()">Apply</button></div><div id="cpm" class="cpn-msg"></div></div>
  <div class="o-sum" id="osum"></div>
  <div class="info-box">${I('wallet', 'sm')}<span>Your Balance: <b style="color:var(--coin)">₹<span class="cb">${coins}</span></b></span></div>
  <button class="btn-gradient" id="ob" onclick="order()">Place Order ${I('bolt', 'sm')}</button>`);
  mLvl = 'o'; addPaste(['an', 'md', 'da', 'rl', 'fl', 'dl', 'cpc']); setMode('member');
}
function addPaste(ids) {
  ids.forEach(id => { const i = $('#' + id); if (!i || i.parentNode.classList.contains('pst')) return; const w = document.createElement('div'); w.className = 'pst'; i.parentNode.insertBefore(w, i); w.appendChild(i);
    const b = document.createElement('button'); b.type = 'button'; b.className = 'pst-b'; b.innerHTML = I('paste', 'sm') + 'Paste'; b.onclick = () => pasteTo(id); w.appendChild(b); });
}
function applyPaste(id, t) {
  t = String(t || '').trim(); if (!t) return false; const i = $('#' + id); if (!i) return false;
  i.value = (i.type === 'number' || i.type === 'tel') ? t.replace(/[^\d]/g, '') : t; i.dispatchEvent(new Event('input', { bubbles: true })); toast('Pasted'); return true;
}
function pasteTo(id) {
  const i = $('#' + id); if (!i) return;
  const to = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r('timeout'), ms))]);
  const viaNav = () => (navigator.clipboard && navigator.clipboard.readText) ? navigator.clipboard.readText().then(t => t || Promise.reject()) : Promise.reject();
  const viaTg = () => new Promise((res, rej) => { try { if (!(tg.readTextFromClipboard && tg.isVersionAtLeast && tg.isVersionAtLeast('6.4'))) return rej(); tg.readTextFromClipboard(t => t ? res(t) : rej()); } catch (e) { rej(); } });
  const viaCmd = () => new Promise((res, rej) => { try { const old = i.value; i.focus(); const ok = document.execCommand && document.execCommand('paste'); setTimeout(() => (ok && i.value !== old) ? res(null) : rej(), 60); } catch (e) { rej(); } });
  const fail = () => { i.focus(); try { i.setSelectionRange(i.value.length, i.value.length); } catch (e) { } toast('Box ke andar tap/long-press karke Paste dabao', 'err'); };
  to(viaNav(), 1200).catch(() => to(viaTg(), 1200)).then(t => { if (!applyPaste(id, t)) throw 0; }).catch(() => viaCmd().then(() => { i.dispatchEvent(new Event('input', { bubbles: true })); toast('Pasted'); }).catch(fail));
}
function getApk(i) {
  const o = orders[i]; if (!o) return;
  if (!o.orderNo) return o.apkUrl ? window.open(o.apkUrl) : toast('Product abhi ready nahi hai', 'err');
  const bu = String(S.botUsername || APP.botUser || '').replace('@', '').trim();
  if (!bu) return toast('Bot username set nahi hai. Support se baat karo', 'err');
  const l = `https://t.me/${bu}?start=order_${o.orderNo}`; tg.openTelegramLink ? tg.openTelegramLink(l) : window.open(l);
}
function setFont(k) { fstyle = fstyle === k ? 0 : k; document.querySelectorAll('.font-box').forEach(b => b.classList.toggle('on', +b.dataset.f === fstyle)); prevName(); }
function prevName() { const v = ($('#an').value || '').trim(), e = $('#fprev'); if (e) e.innerHTML = v ? `<small>Your app name will be sent as</small><b>${esc(fancy(v, fstyle))}</b>` : ''; }
function setMode(m) {
  mode = m; document.querySelectorAll('.build-mode-card').forEach(c => c.classList.toggle('selected', c.dataset.m === m));
  $('#l1').style.display = 'block'; $('#l2').style.display = (m === 'both' || m === 'demo') ? 'block' : 'none'; $('#l3').style.display = m === 'demo' ? 'block' : 'none';
  if (cpn && cpn.mode !== m) cpRequote(); else cpUi();
}
async function order() {
  if (!guard()) return;
  { const mb = mtBlock('tpl', designs.find(x => x.id === cur.id) || cur); if (mb) return mtInfo(mb, cur.title, mtTpl(cur.id)); }
  const an = $('#an').value.trim(), f = $('#al').files[0], need = cost(cur), rl = $('#rl').value.trim(), fl = $('#fl').value.trim(), dl = $('#dl').value.trim();
  const da = $('#da').value.trim();
  if (!an || !f) return toast('App name aur logo zaroori hai', 'err');
  if (da && !/^\d{3,30}$/.test(da)) return toast('Demo account number sirf digits mein daalo', 'err');
  if (mode === 'fake') return toast('Ye option abhi maintenance mein hai', 'err');
  if (!rl.startsWith('http')) return toast('Valid referral link daalo (https://...)', 'err');
  if ((mode === 'both' || mode === 'demo') && !fl.startsWith('http')) return toast('Valid fake website URL daalo', 'err');
  if (mode === 'demo' && !dl.startsWith('http')) return toast('Valid prediction website URL daalo', 'err');
  const cp = cpn && cpn.mode === mode ? cpn : null;
  if (cpBusy || (cpn && !cp)) return toast('Checking your coupon, please wait a moment', 'err');
  const pay = cp || { code: '', discount: 0, final: need };   // coupon ho ya na ho, order hamesha server se: maintenance aur price server hi dekhta hai
  if (coins < pay.final) { toast(`₹${pay.final - coins} aur chahiye`, 'err'); closeM(); wsec = 'upi'; return nav('wallet'); }
  return orderCp(pay, { an, f, da, rl, fl, dl });
}

/* ---------- Deposit flow (UPI-QR and USDT are separate) ---------- */
function startDeposit(m) {
  if (!guard()) return; if (amt < 10) return toast(m === 'upi' ? 'Minimum deposit ₹10' : 'Minimum deposit 10 USDT', 'err');
  if (m !== 'upi' && uc(m).auto) return autoDeposit(m);
  openPay(amt, m);
}
/* ---------- USDT automatic verification (server: api/usdt.php) ---------- */
async function api(a, b) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), 25000);
  try { const r = await fetch('api/usdt.php?action=' + a, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...b, initData: tg.initData }), signal: c.signal, cache: 'no-store' }); return await r.json(); } finally { clearTimeout(t); }
}
const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
const payNow = d => d.auto && d.status === 'pending' && d.expiresAt > Date.now() ? `<button class="mini-pay" onclick="reopenAuto('${d.id}')">Pay now</button>` : '';
async function autoDeposit(m) {
  const b = $('#cb'), old = b ? b.innerHTML : ''; if (b) { b.disabled = true; b.textContent = 'Please wait...'; }
  let r = null; try { r = await api('create', { network: m, amount: amt }); } catch (e) { r = null; }
  if (b) { b.disabled = false; b.innerHTML = old; }
  if (!r || ['manual', 'not_configured'].includes(r.error)) return openPay(amt, m);   // API setup nahi / admin ne manual rakha -> proof wala flow
  if (r.ok) return openAuto(r, m);
  const E = { disabled: 'This network is unavailable right now', min: 'Minimum deposit 10 USDT', too_many: 'Pehle ki pending requests complete karo ya thodi der ruko', busy: 'Server busy, thodi der baad try karo', banned: 'Your account is restricted. Contact support.', auth: 'Please reopen the store from Telegram', chain: 'Network busy, dobara try karo', server: 'Server error, dobara try karo' };
  toast(E[r.error] || 'Failed, dobara try karo', 'err');
}
function reopenAuto(id) {
  const d = deps.find(x => x.id === id); if (!d || !d.address) return;
  openAuto({ id, network: d.network, amount: String(d.usdt), address: d.address, coins: d.coins, bonus: d.bonus || 0, expiresAt: d.expiresAt, now: Date.now(), base: d.baseUsdt }, String(d.network).toLowerCase());
}
function openAuto(r, m) {
  const qr = uc(m).qr || 'https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=' + encodeURIComponent(r.address), off = (r.now || Date.now()) - Date.now();
  openM(`<div class="pay apay"><div class="pay-amount">${uIc(m)}<span>${r.amount}</span>&nbsp;USDT</div>
  <button class="copy-btn" onclick="copyTxt('${r.amount}')">${I('copy', 'sm')}Copy Amount</button>
  <div class="exact-note">Bilkul <b>${r.amount} USDT</b> hi bhejo. Amount same hona zaroori hai, tabhi payment automatic verify hogi. Exchange se bhej rahe ho to fee alag se add karo.</div>
  <div class="net-warn">Send only on <b>${r.network}</b> network</div>
  <div class="pay-id">USDT ${r.network} • ${esc(r.address)}</div><button class="copy-btn" onclick="copyTxt('${esc(r.address).replace(/'/g, '')}')">${I('copy', 'sm')}Copy Address</button><img class="pay-qr" src="${qr}">
  <div class="pay-recv">You will receive <b>${rs(r.coins + (r.bonus || 0))}</b>${r.bonus ? ` (Bonus +₹${r.bonus})` : ''}</div>
  <div class="pay-wait" id="pw"><span class="pw-sp"></span><div><b id="pws">Waiting for payment</b><small id="pwt"></small></div></div>
  <button class="btn-outline" onclick="closeM()">Close</button>
  <div class="ok-note" style="margin:12px 0 0">Close karne ke baad bhi payment aate hi balance apne aap add ho jayega.</div>
  ${r.base ? `<button class="link-btn" onclick="openPay(${r.base},'${m}')">Alag amount bheja? Proof submit karo</button>` : ''}</div>`);
  payWatch(r, off);
}
function payWatch(r, off) {
  clearInterval(payTimer); let tick = 0, busy = false;
  const clock = () => {
    const t = $('#pwt'); if (!t) return false;
    const left = r.expiresAt - (Date.now() + off);
    if (left > 0) t.textContent = 'Time left ' + mmss(left); else { $('#pws').textContent = 'Still waiting for payment'; t.textContent = 'Time over. Payment bhej di hai to 24 ghante ke andar automatic credit ho jayegi.'; $('#pw').classList.add('late'); }
    return true;
  };
  clock();
  payTimer = setInterval(async () => {
    if (!clock()) return clearInterval(payTimer);
    if (busy || ++tick % 5 !== 1) return; busy = true;
    try {
      const s = await api('status', { id: r.id });
      if (s && s.ok && s.status === 'approved') {
        clearInterval(payTimer); toast('Deposit successful');
        openM(`<div class="ok-wrap"><div class="ok-ic">${I('checkc')}</div><h3>Deposit Successful</h3><p class="ok-l">Credited to your balance</p><div class="ok-no">${rs((s.coins || 0) + (s.bonus || 0))}</div>${s.bonus ? `<p class="ok-note">Deposit ${rs(s.coins)} + Bonus ${rs(s.bonus)}</p>` : ''}<button class="btn-gradient" onclick="closeM()">Done</button></div>`);
      }
    } catch (e) { } finally { busy = false; }
  }, 1000);
}
// Manual deposit submit hote hi owner ko Telegram alert (server bhejta hai). Fail ho to cron backup bhej deta hai.
async function notifyDep(id) {
  for (let i = 0; i < 2; i++) { try { const r = await api('notify', { id }); if (r && (r.ok || r.error === 'notfound')) return; } catch (e) { } await new Promise(r => setTimeout(r, 1500)); }
}
function openPay(a, m) {
  const qrg = d => 'https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=' + encodeURIComponent(d), upi = S.upi || APP.upi;
  const n = toC(a, m), usdt = m === 'upi' ? '' : String(a), bonus = bOf(n, m), net = m === 'upi' ? '' : NETS[m], cfg = m === 'upi' ? null : uc(m);
  const qr = m === 'upi' ? (S.upiQr || qrg(`upi://pay?pa=${upi}&pn=${APP.name}&am=${n}&cu=INR`)) : (cfg.qr || qrg(cfg.address)), idv = m === 'upi' ? upi : cfg.address;
  openM(`<div class="pay"><div class="pay-amount">${m === 'upi' ? rs(n) : uIc(m) + usdt + ' USDT'}</div>
  <div style="font-size:.8rem;color:var(--tm);font-weight:700">You will receive <b style="color:var(--coin)">${rs(n + bonus)}</b>${bonus ? ` (Bonus +₹${bonus})` : ''}</div>
  ${m !== 'upi' ? `<div class="net-warn">Send only on <b>${net}</b> network</div>` : ''}<div class="pay-id">${m === 'upi' ? 'UPI: ' : 'USDT ' + net + ' • '}${esc(idv)}</div><button class="copy-btn" onclick="copyTxt('${esc(idv).replace(/'/g, '')}')">${I('copy', 'sm')}Copy ${m === 'upi' ? 'UPI ID' : 'Address'}</button><img class="pay-qr" src="${qr}">
  <div class="form-group"><label>${m === 'upi' ? 'UTR Number' : 'Transaction Hash (TXID)'} <span class="req">*</span></label><input id="utr" maxlength="100" placeholder="${m === 'upi' ? '123456789012' : 'Paste TXID'}"></div>
  <div class="form-group"><label>Payment Screenshot <span class="req">*</span></label><input id="ss" type="file" accept="image/*"></div>
  <button class="btn-gradient" id="pb" onclick="deposit(${n},'${m}','${usdt}',${bonus})">Submit Deposit</button><button class="btn-outline" style="margin-top:12px" onclick="closeM()">Cancel</button></div>`); addPaste(['utr']);
}
async function deposit(n, m, usdt, bonus) {
  if (!guard()) return;
  const utr = $('#utr').value.trim(), f = $('#ss').files[0], ok = m === 'upi' ? /^[A-Za-z0-9]{6,30}$/.test(utr) : /^[A-Za-z0-9]{10,100}$/.test(utr);
  if (!ok || !f) return toast('Valid ' + (m === 'upi' ? 'UTR' : 'TXID') + ' aur screenshot do', 'err');
  $('#pb').disabled = true;
  try {
    const ref = db.ref('deposits').push(); await db.ref('depositProofs/' + ref.key).set({ screenshot: await fileToData(f, 900) });
    await ref.set({ userId: uid, userDisplayId: me.displayId || '', user: U.username ? '@' + U.username : U.first_name, coins: n, bonus, bonusPct: bonus ? bPct(m) : 0, method: m === 'upi' ? 'upi' : 'usdt', network: m === 'upi' ? '' : NETS[m], usdt: m !== 'upi' ? +usdt : 0, utr, status: 'pending', timestamp: Date.now() });
    notifyDep(ref.key); toast('Deposit request submitted'); closeM(); nav('dephist');
  } catch (e) { toast('Failed, dobara try karo', 'err'); $('#pb').disabled = false; }
}

/* ---------- Customer Care: issue form, AI chat, Deposit Not Received, My Requests (server: api/support.php) ---------- */
let AIC = {}, csTxt = '', csImgs = [], csBusy = false, aiMsgs = [], aiBusy = false, mine = null, mineBusy = false, dn = { receiver: '', sender: '', utr: '', dt: '', amount: '', img: '' };
async function capi(a, b, ms = 30000, f = 'support') {
  const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch('api/' + f + '.php?action=' + a, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...b, initData: tg.initData }), signal: c.signal, cache: 'no-store' }); return await r.json(); } finally { clearTimeout(t); }
}
const CSE = { short: 'Please describe your problem (at least 5 characters)', toomany: 'Maximum 5 images allowed', image: 'One image is not valid. Please choose a JPG or PNG screenshot', slow: 'Please wait a few seconds and try again', toomany_open: 'You already have many open requests. Please wait for a reply first', auth: 'Please reopen the store from Telegram', nouser: 'Please reopen the store from Telegram', banned: 'Your account is restricted. Contact support.', fields: 'Please fill all required fields correctly', noimage: 'Please add the payment screenshot', server: 'Server error, please try again', not_configured: 'Support is not available right now' };
const aiOn = () => AIC.on !== false;
const imgData = async f => { let d = await fileToData(f, 1000, .72); if (d.length > 700000) d = await fileToData(f, 700, .6); return d; };
function csDone(no, msg) {
  openM(`<div class="ok-wrap"><div class="ok-ic">${I('checkc')}</div><h3>Request Submitted</h3><p class="ok-l">Request Number</p><div class="ok-no">#${no}</div><p class="ok-note">${msg}</p><button class="btn-gradient" onclick="csExit('caremine')">View My Requests</button><button class="btn-outline" style="margin-top:10px" onclick="csExit()">Done</button></div>`);
}
function csExit(to) {   // form ke baad wapas Customer Care menu par
  closeM(); if (['careissue', 'caredep'].includes(tab)) { if (hist[hist.length - 1] === 'care') hist.pop(); tab = 'care'; }
  if (to) nav(to); else { render(); scrollTo(0, 0); syncBack(); }
}
const copt = (cls, fn, ic, t, sm) => `<button class="cs-opt ${cls}" onclick="${fn}"><span class="pbox-ic">${I(ic)}</span><span class="co-t"><b>${t}</b><small>${sm}</small></span><span class="co-ar">${I('arrow', 'sm')}</span></button>`;
function careView() {
  return `<div class="pg-list">${subHead('headset', 'Customer Care')}
  <div class="info-box cs-intro">${I('info', 'sm')}<span>How can we help you today? Choose an option below.</span></div>
  ${copt('', "nav('careissue')", 'chat', 'Store Issue', 'Report a problem with the store, an order or your account. Add up to 5 screenshots')}
  ${copt(aiOn() ? 'ai' : 'ai off', "nav('careai')", 'bot', 'Fix Your Issues By Ai Chat', aiOn() ? 'Instant help: referral bonus, refund, orders, offers, transactions, deposits' : 'AI support is turned off right now. Please use Store Issue.')}
  ${copt('', "nav('caredep')", 'wallet', 'Deposit Not Received', 'Paid but balance not added? Send the payment details with a screenshot')}
  ${copt('', "nav('caremine')", 'receipt', 'My Requests', 'Track replies from our support team')}</div>`;
}
function careIssueView() {
  const th = csImgs.map((s, i) => `<div class="cs-th"><img src="${s}"><button onclick="csRm(${i})" aria-label="Remove image">${I('x', 'sm')}</button></div>`).join('');
  const add = csImgs.length < 5 ? `<label class="cs-add">${I('image')}<span>Add image</span><input type="file" accept="image/*" multiple hidden onchange="csPick(this)"></label>` : '';
  return `<div class="pg-list">${subHead('chat', 'Store Issue')}
  <div class="info-box cs-intro">${I('info', 'sm')}<span>Tell us what went wrong. Our team will reply here and on Telegram.</span></div>
  <div class="form-group"><label>Your problem <span class="req">*</span></label><textarea id="cst" rows="5" maxlength="1500" placeholder="Write your problem in detail..." oninput="csTxt=this.value;$('#csc').textContent=this.value.length+'/1500'">${esc(csTxt)}</textarea><small class="cs-cnt" id="csc">${csTxt.length}/1500</small></div>
  <div class="form-group"><label>Screenshots <span class="cs-ol">(optional, up to 5)</span></label><div class="cs-imgs">${th}${add}</div></div>
  <button class="btn-gradient" id="csb" onclick="csSubmit()">${I('send', 'sm')}Submit</button></div>`;
}
async function csPick(el) {
  const room = 5 - csImgs.length, fl = [...el.files]; el.value = ''; if (!fl.length) return;
  if (fl.length > room) toast('Maximum 5 images', 'err');
  for (const f of fl.slice(0, room)) { if (!/^image\//.test(f.type)) { toast('Only images are allowed', 'err'); continue; } try { csImgs.push(await imgData(f)); } catch (e) { toast('Could not read the image', 'err'); } }
  render();
}
function csRm(i) { csImgs.splice(i, 1); render(); }
async function csSubmit() {
  if (!guard() || csBusy) return; const t = csTxt.trim(); if (t.length < 5) return toast(CSE.short, 'err');
  csBusy = true; const b = $('#csb'); if (b) { b.disabled = true; b.textContent = 'Submitting...'; }
  let r = null; try { r = await capi('ticket', { text: t, images: csImgs }, 60000); } catch (e) { r = null; }
  csBusy = false;
  if (r && r.ok) { csTxt = ''; csImgs = []; mine = null; render(); return csDone(r.no, 'Your problem has been sent to our team. We will reply here and on Telegram.'); }
  toast(r ? (CSE[r.error] || 'Failed, please try again') : 'Connection problem, please try again', 'err'); render();
}

/* AI chat */
const AISUG = ['My friend deposited but I did not get the referral bonus', 'My order was rejected but I did not get a refund', 'Check my order status', 'My deposit is still pending', 'Check my transactions', 'What offers are available?'];
const AIE = { ai_nokey: 'AI support is not available right now. Please send your problem to our team and we will reply soon.', limit: 'You have used today\'s AI chat limit. Please send your problem to our team and we will reply soon.', slow: 'Please wait a moment before sending another message.', auth: CSE.auth, nouser: CSE.auth, banned: CSE.banned, server: 'Something went wrong on our side. Please try again in a moment.', not_configured: CSE.not_configured, bad: 'Please type your message again' };
const AIW = { quota: 'Our AI helper is very busy right now. Please try again in a minute, or send your problem to our team.', busy: 'The AI helper is not responding right now. Please try again in a moment, or send your problem to our team.' };
const AIOFFER = ['ai_nokey', 'limit', 'ai_error', 'server'];   // in errors par "Send to our team" button dikhta hai
const aiErrText = r => r.error === 'ai_error' ? (AIW[r.why] || 'AI support is not available right now. Please send your problem to our team and we will reply soon.') : (AIE[r.error] || 'Something went wrong, please try again');
function aiToTeam() {   // chat ka aakhri message form me daalke Store Issue kholo
  const last = [...aiMsgs].reverse().find(m => m.role === 'user'); if (last && !csTxt.trim()) csTxt = last.text.slice(0, 1500); nav('careissue');
}
const fmtAi = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/^[-*] /gm, '• ').replace(/\n/g, '<br>');
const aiAct = a => a.type === 'referral_fix' ? `₹${a.amount} referral bonus added to your balance` : `₹${a.amount} refunded to your balance`;
function aiView() {
  const head = subHead('bot', 'AI Support');
  if (!aiOn()) return `<div class="pg-list">${head}<div class="empty-state">${I('bot')}<h4>AI support is off</h4><p>AI support is turned off right now. Please submit your problem on the Customer Care page.</p><button class="btn-gradient" onclick="goBack()">Go to Customer Care</button></div></div>`;
  return `<div class="pg-list ai-pg">${head}<div class="ai-box" id="aim"></div><div class="ai-in"><textarea id="aii" rows="1" maxlength="600" placeholder="Type your problem..." onkeydown="aiKey(event)" oninput="aiGrow(this)"></textarea><button id="ais" onclick="aiSend()" aria-label="Send">${I('send')}</button></div></div>`;
}
function aiDraw(first) {
  const box = $('#aim'); if (!box) return;
  let h = `<div class="ai-m bot">Hi ${esc(U?.first_name || 'there')}! I am your store helper. Tell me what happened and I will check your orders, deposits, referral bonus and refunds right now. You can write in Hindi, Hinglish or English.</div>`;
  if (!aiMsgs.length) h += `<div class="ai-sug">${AISUG.map((s, i) => `<button onclick="aiSend(${i})">${esc(s)}</button>`).join('')}</div>`;
  aiMsgs.forEach(m => { h += `<div class="ai-m ${m.role === 'user' ? 'me' : 'bot'}${m.err ? ' err' : ''}">${fmtAi(m.text)}</div>`; if (m.offer) h += `<button class="ai-team" onclick="aiToTeam()">${I('send', 'sm')}Send my problem to our team</button>`; (m.actions || []).forEach(a => h += `<div class="ai-act">${I('checkc', 'sm')}${esc(aiAct(a))}</div>`); if (m.ticket) h += `<div class="ai-act tk">${I('info', 'sm')}Request #${m.ticket} sent to our team</div>`; });
  if (aiBusy) h += '<div class="ai-typing"><i></i><i></i><i></i></div>';
  box.innerHTML = h; if (!first || aiMsgs.length) window.scrollTo({ top: document.body.scrollHeight });
}
function aiKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); aiSend(); } }
function aiGrow(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 110) + 'px'; }
async function aiSend(i) {
  if (!guard() || aiBusy) return; const inp = $('#aii'), t = typeof i === 'number' ? AISUG[i] : (inp ? inp.value.trim() : '');
  if (!t) return; if (inp) { inp.value = ''; aiGrow(inp); }
  aiMsgs.push({ role: 'user', text: t }); aiMsgs = aiMsgs.slice(-40); aiBusy = true; aiDraw(); const bt = $('#ais'); if (bt) bt.disabled = true;
  let r = null; try { r = await capi('chat', { messages: aiMsgs.filter(m => !m.err).slice(-12).map(m => ({ role: m.role, text: m.text })) }, 90000); } catch (e) { r = null; }
  aiBusy = false; const b2 = $('#ais'); if (b2) b2.disabled = false;
  if (r && r.ok) aiMsgs.push({ role: 'model', text: r.reply, actions: r.actions || [], ticket: r.ticket || null });
  else if (r && r.error === 'ai_off') { AIC.on = false; return render(); }
  else aiMsgs.push({ role: 'model', err: true, offer: !!(r && AIOFFER.includes(r.error)), text: r ? aiErrText(r) : 'Connection problem, please try again' });
  aiDraw();
}

/* Deposit Not Received */
function depNrView() {
  const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const fld = (id, k, lbl, ph, extra = '') => `<div class="form-group"><label>${lbl}</label><input id="${id}" ${extra} placeholder="${ph}" value="${esc(dn[k])}" oninput="dn.${k}=this.value"></div>`;
  return `<div class="pg-list">${subHead('wallet', 'Deposit Not Received')}
  <div class="info-box cs-intro">${I('info', 'sm')}<span>Paid but balance not added? Fill the payment details exactly as shown in your payment app.</span></div>
  ${fld('dnr', 'receiver', 'Receiver name <span class="req">*</span>', 'Name of the account you paid to', 'maxlength="60"')}
  ${fld('dns', 'sender', 'Sender name <span class="req">*</span>', 'Name of the account you paid from', 'maxlength="60"')}
  ${fld('dnu', 'utr', 'UTR / Transaction ID <span class="req">*</span>', 'e.g. 412345678901', 'maxlength="80"')}
  <div class="form-group"><label>Date and time of payment <span class="req">*</span></label><input id="dnd" type="datetime-local" max="${now}" value="${esc(dn.dt)}" oninput="dn.dt=this.value"></div>
  ${fld('dna', 'amount', 'Amount paid (optional)', 'e.g. 500', 'type="number" inputmode="decimal" min="0"')}
  <div class="form-group"><label>Payment screenshot <span class="req">*</span></label><div class="cs-imgs">${dn.img ? `<div class="cs-th"><img src="${dn.img}"><button onclick="dnRm()" aria-label="Remove image">${I('x', 'sm')}</button></div>` : `<label class="cs-add">${I('image')}<span>Add screenshot</span><input type="file" accept="image/*" hidden onchange="dnPick(this)"></label>`}</div></div>
  <button class="btn-gradient" id="dnb" onclick="dnSubmit()">${I('send', 'sm')}Submit</button></div>`;
}
async function dnPick(el) { const f = el.files[0]; el.value = ''; if (!f) return; if (!/^image\//.test(f.type)) return toast('Only images are allowed', 'err'); try { dn.img = await imgData(f); render(); } catch (e) { toast('Could not read the image', 'err'); } }
function dnRm() { dn.img = ''; render(); }
async function dnSubmit() {
  if (!guard() || csBusy) return;
  const rc = dn.receiver.trim(), sn = dn.sender.trim(), utr = dn.utr.replace(/\s+/g, ''), d = dn.dt ? new Date(dn.dt) : null;
  if (rc.length < 2) return toast('Enter the receiver name', 'err'); if (sn.length < 2) return toast('Enter the sender name', 'err');
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(utr)) return toast('Enter a valid UTR / transaction ID', 'err');
  if (!d || isNaN(d)) return toast('Select the date and time of payment', 'err'); if (!dn.img) return toast('Add the payment screenshot', 'err');
  const dt = d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  csBusy = true; const b = $('#dnb'); if (b) { b.disabled = true; b.textContent = 'Submitting...'; }
  let r = null; try { r = await capi('deposit_nr', { receiver: rc, sender: sn, utr, dt, amount: dn.amount, images: [dn.img] }, 60000); } catch (e) { r = null; }
  csBusy = false;
  if (r && r.ok) { dn = { receiver: '', sender: '', utr: '', dt: '', amount: '', img: '' }; mine = null; render(); return csDone(r.no, 'We will verify your payment and update you here and on Telegram.'); }
  toast(r ? (r.error === 'dup' ? `You already sent a request with this UTR (#${r.no}). Please wait for the reply.` : (CSE[r.error] || 'Failed, please try again')) : 'Connection problem, please try again', 'err'); render();
}

/* My Requests */
const TKS = { open: ['pending', 'Open'], replied: ['in-progress', 'Replied'], resolved: ['complete', 'Resolved'], rejected: ['rejected', 'Closed'] }, TKT = { issue: 'Support request', deposit: 'Deposit Not Received', ai: 'Support request' };
function mineView() {
  const head = subHead('receipt', 'My Requests');
  if (mine === null) return `<div class="pg-list">${head}${empty('clock', 'Loading...', 'Getting your requests.')}</div>`;
  if (mine === false) return `<div class="pg-list">${head}<div class="empty-state">${I('alert')}<h4>Could not load</h4><p>Please check your connection and try again.</p><button class="btn-gradient" onclick="mine=null;render()">Try again</button></div></div>`;
  if (!mine.length) return `<div class="pg-list">${head}${empty('receipt', 'No requests yet', 'Your support requests will appear here.')}</div>`;
  return `<div class="pg-list">${head}${mine.map(t => { const s = TKS[t.status] || TKS.open; return `<div class="tk"><div class="tk-h"><b>${TKT[t.type] || 'Support request'} #${t.no}</b><span class="status-badge ${s[0]}">${s[1]}</span></div><p>${t.type === 'deposit' ? 'UTR: ' + esc(t.utr) : esc(t.text)}</p><small>${fmt(t.createdAt)}${t.imgCount ? ' • ' + t.imgCount + ' image' + (t.imgCount > 1 ? 's' : '') : ''}</small>${t.reply ? `<div class="tk-r"><span>Reply from support</span><div>${esc(t.reply).replace(/\n/g, '<br>')}</div></div>` : ''}</div>`; }).join('')}</div>`;
}
async function loadMine() {
  if (mineBusy) return; mineBusy = true;
  try { const r = await capi('mytickets', {}, 20000); mine = r && r.ok ? r.tickets : false; } catch (e) { mine = false; }
  mineBusy = false; if (tab === 'caremine') render();
}

/* ---------- Home: template filters ---------- */
const FLT = [['latest', 'Latest', 'clock'], ['high', 'High', 'up'], ['low', 'Low', 'down'], ['popular', 'Popular', 'star']];
const fltBar = () => `<div class="filter-tabs sm" id="fbar">${FLT.map(([k, l, i]) => `<button data-k="${k}" class="${flt === k ? 'active' : ''}" onclick="setFlt('${k}')">${I(i, 'sm')}${l}</button>`).join('')}</div>`;
function setFlt(k) { flt = k; const g = $('#tgrid'); if (g) g.innerHTML = tgridHtml(); document.querySelectorAll('#fbar button').forEach(b => b.classList.toggle('active', b.dataset.k === k)); }
function goTpl() { if (tab !== 'home') nav('home'); const e = $('#tpl'); if (e) e.scrollIntoView({ behavior: 'smooth', block: 'start' }); }

/* ---------- Coupons + Gift codes (server: api/offers.php) ---------- */
let cpn = null, cpBusy = false, cpSeq = 0, tpRid = '', cxCpn = null, cxCpc = '', cxCpBusy = false, cxCpMsg = null, cxCpSeq = 0, gfCode = '', gfBusy = false, gfMsg = null;
const newRid = () => 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
const oapi = (a, b, ms = 25000) => capi(a, b, ms, 'offers');
const CPE = { maintenance: 'Store is under maintenance. Please try again later.', invalid: 'This coupon code is not valid', expired: 'This coupon has expired', used_up: 'This coupon has reached its usage limit', user_limit: 'You have already used this coupon', zero: 'This coupon gives no discount on this amount', slow: 'Too many wrong tries. Please wait a few minutes and try again', wait: 'Please wait a moment and try again', busy: 'Your previous request is still processing. Please check Orders in a moment' };
function cpErr(r) {
  if (!r) return 'Connection problem, please try again';
  if (r.error === 'maintenance' && (r.scope === 'sec' || r.scope === 'item')) return String(r.msg || '') || (r.scope === 'item' ? 'This product is under maintenance. Please try again later.' : 'This section is under maintenance. Please try again later.');
  if (r.error === 'coupon') { const k = r.reason; if (k === 'scope') return r.for === 'cs' ? 'This coupon works only on FAKE WEBSITE plans' : r.for === 'bd' ? 'This coupon works only on Bot Deploy' : 'This coupon works only on Templates'; if (k === 'min') return `Minimum order of ${rs(r.need)} is needed for this coupon`; return CPE[k] || CPE.invalid; }
  return CPE[r.error] || CXE[r.error] || 'Something went wrong, please try again';
}
const CP_DEF = ['balance', 'soldout', 'gone', 'plan', 'price_changed', 'coupon', 'fields', 'bad'];   // in jawab ke baad naya request id (purana order kabhi nahi bana)
const cpSave = d => `Coupon ${d.code} applied. You save ${rs(d.discount)}`;
async function oq(b) { let r = await oapi('quote', b); if (r && r.error === 'wait') { await new Promise(x => setTimeout(x, 1150)); r = await oapi('quote', b); } return r; }   // 1 sec ke andar dusra check -> ek baar apne aap dobara
/* Templates: order form coupon */
function cpMsg(m, t) { const e = $('#cpm'); if (e) { e.className = 'cpn-msg' + (m ? ' ' + t : ''); e.textContent = m || ''; } }
function cpUi() {
  const i = $('#cpc'), b = $('#cpb'), s = $('#osum'); if (!i || !b || !s || !cur) return;
  const live = cpn && cpn.mode === mode ? cpn : null, base = cost(cur);
  i.readOnly = !!cpn || cpBusy; b.disabled = cpBusy; b.textContent = cpBusy ? 'Checking...' : cpn ? 'Remove' : 'Apply'; b.classList.toggle('on', !!cpn && !cpBusy);
  s.innerHTML = `<div><span>Price</span><b>${rs(base)}</b></div>${live ? `<div class="cp-d"><span>${I('tag', 'sm')}Coupon ${esc(live.code)}</span><b>-${rs(live.discount)}</b></div>` : ''}<div class="cp-t"><span>You pay</span><b>${rs(live ? live.final : base)}</b></div>`;
}
function cpBtn() { if (cpn) { cpn = null; cpSeq++; cpBusy = false; const i = $('#cpc'); if (i) i.value = ''; cpMsg(''); cpUi(); } else cpApply(); }
async function cpApply() {
  if (cpBusy || !guard()) return;
  const i = $('#cpc'), code = i ? i.value.trim().toUpperCase() : ''; if (!code) return cpMsg('Enter a coupon code', 'err');
  const my = ++cpSeq; cpBusy = true; cpMsg(''); cpUi();
  let r = null; try { r = await oq({ code, scope: 'tpl', designId: cur.id, mode }); } catch (e) { r = null; }
  if (my !== cpSeq) return; cpBusy = false;
  if (r && r.ok) { cpn = { code: r.code, discount: r.discount, final: r.final, price: r.price, mode }; cpUi(); cpMsg(cpSave(r), 'ok'); }
  else { cpn = null; cpUi(); cpMsg(cpErr(r), 'err'); }
}
async function cpRequote() {   // build mode badla -> naya discount (price mode ke hisaab se badalti hai)
  const c = cpn; if (!c) return cpUi();
  const my = ++cpSeq; cpBusy = true; cpUi();
  let r = null; try { r = await oq({ code: c.code, scope: 'tpl', designId: cur.id, mode }); } catch (e) { r = null; }
  if (my !== cpSeq) return; cpBusy = false;
  if (r && r.ok) { cpn = { code: r.code, discount: r.discount, final: r.final, price: r.price, mode }; cpUi(); cpMsg(cpSave(r), 'ok'); }
  else { cpn = null; cpUi(); cpMsg(cpErr(r), 'err'); }
}
async function orderCp(cp, v) {   // coupon wala order: balance + order + coupon sab server karta hai (api/offers.php)
  const b = $('#ob'); b.disabled = true; b.textContent = 'Processing...';
  const back = () => { const x = $('#ob'); if (x) { x.disabled = false; x.textContent = 'Place Order'; } };
  let r = null;
  try {
    const icon = await fileToData(v.f, 256);
    r = await oapi('tplorder', { rid: tpRid, designId: cur.id, mode, coupon: cp.code, expect: cp.final, appName: fancy(v.an, fstyle), appNameRaw: v.an, fontStyle: fstyle, demoAccount: v.da, appIconUrl: icon, minDeposit: +$('#md').value || 0, registerLink: v.rl, fakeSiteUrl: (mode === 'both' || mode === 'demo') ? v.fl : '', demoSiteUrl: mode === 'demo' ? v.dl : '' }, 60000);
  } catch (e) { toast('Network problem. Please check Orders first, if your order is not there press Place Order again.', 'err'); return back(); }
  if (r && r.ok) {
    cpn = null; tpRid = ''; toast('Order placed successfully');
    openM(`<div class="ok-wrap"><div class="ok-ic">${I('checkc')}</div><h3>Order Placed!</h3><p class="ok-l">Your Order Number</p><div class="ok-no">#${r.orderNo}</div><button class="copy-btn" onclick="copyTxt('${r.orderNo}')">${I('copy', 'sm')}Copy Order Number</button>${r.discount ? `<p class="ok-save">${I('tag', 'sm')}Coupon applied: you saved ${rs(r.discount)}</p>` : ''}<p class="ok-note">Ye number save kar lo. Order complete hone par bot mein <b>My Orders</b> dabakar ye number bhejo, ya Orders page se <b>Download</b> dabao.</p><button class="btn-gradient" onclick="closeM();nav('orders')">View My Orders</button></div>`);
    return;
  }
  if (mtSrv(r, 'tpl', designs.find(x => x.id === cur.id) || cur, cur.title, mtTpl(cur.id))) return;   // order bana hi nahi, rid wahi rehne do
  if (r && CP_DEF.includes(r.error)) tpRid = newRid();
  if (r && r.error === 'balance') { toast(`${rs((r.need || cp.final) - (r.have || 0))} aur chahiye`, 'err'); closeM(); wsec = 'upi'; return nav('wallet'); }
  if (r && r.error === 'coupon') { cpn = null; cpUi(); cpMsg(cpErr(r), 'err'); }
  else if (r && r.error === 'price_changed' && r.final != null) { if (cp.code) { cpn = { ...cp, discount: r.discount, final: r.final, price: r.price }; cpUi(); cpMsg('The price was updated. Please check the new total and press Place Order again.', 'err'); } else cpUi(); }
  toast(cpErr(r), 'err'); back();
}
/* FAKE WEBSITE: plan page coupon */
function cxCpBtn() {
  if (cxCpn) { cxCpn = null; cxCpSeq++; cxCpBusy = false; cxCpc = ''; cxCpMsg = null; return render(); }
  cxCpApply();
}
async function cxCpApply(keep) {
  if (cxCpBusy || (!keep && !guard())) return;
  const p = cxFind(cxPid), pk = cxSel, code = (keep ? keep.code : cxCpc).trim().toUpperCase();
  if (!p || !pk) return; if (!code) { cxCpMsg = { t: 'err', m: 'Enter a coupon code' }; return render(); }
  cxCpc = code; const my = ++cxCpSeq; cxCpBusy = true; cxCpMsg = null; render();
  let r = null; try { r = await oq({ code, scope: 'cs', pid: p.id, plan: pk }); } catch (e) { r = null; }
  if (my !== cxCpSeq) return; cxCpBusy = false;
  if (r && r.ok) { cxCpn = { code: r.code, discount: r.discount, final: r.final, price: r.price, pid: p.id, plan: pk }; cxCpc = r.code; cxCpMsg = { t: 'ok', m: cpSave(r) }; }
  else { cxCpn = null; cxCpMsg = { t: 'err', m: cpErr(r) }; }
  if (tab === 'csplan') render();
}
const cxCpBox = cur => `<div class="cpn"><div class="cpn-lb">Coupon code</div><div class="cpn-row"><input id="cxc" value="${esc(cxCpn ? cxCpn.code : cxCpc)}" ${cxCpn || cxCpBusy ? 'readonly' : ''} maxlength="24" placeholder="Have a coupon? Enter code" autocomplete="off" autocapitalize="characters" oninput="cxCpc=this.value;if(cxCpMsg){cxCpMsg=null;const m=$('#cxcm');if(m){m.textContent='';m.className='cpn-msg'}}" onkeydown="if(event.key==='Enter')cxCpBtn()"><button class="cpn-b ${cxCpn && !cxCpBusy ? 'on' : ''}" id="cxcb" ${!cur || cxCpBusy ? 'disabled' : ''} onclick="cxCpBtn()">${cxCpBusy ? 'Checking...' : cxCpn ? 'Remove' : 'Apply'}</button></div><div id="cxcm" class="cpn-msg${cxCpMsg ? ' ' + cxCpMsg.t : ''}">${cxCpMsg ? esc(cxCpMsg.m) : ''}</div></div>`;
/* Gift code claim (Account) */
const GFE = { maintenance: 'Store is under maintenance. Please try again later.', invalid: 'This gift code is not valid', expired: 'This gift code has expired', used_up: 'This gift code has already been claimed by everyone it was made for', already: 'You have already claimed this gift code', slow: 'Too many wrong tries. Please wait a few minutes and try again', wait: 'Please wait a moment and try again', banned: 'Your account is restricted. Contact support.', auth: 'Please reopen the store from Telegram', nouser: 'Please reopen the store from Telegram', server: 'Something went wrong, please try again', not_configured: 'Gift codes are not available right now' };
function gfUi() {
  const b = $('#gfb'), m = $('#gfm'), i = $('#gfc');
  if (b) { b.disabled = gfBusy; b.textContent = gfBusy ? 'Checking...' : 'Redeem'; }
  if (i) { i.readOnly = gfBusy; if (!gfBusy && !gfCode && i.value) i.value = ''; }
  if (m) { m.className = 'gf-msg' + (gfMsg ? ' ' + gfMsg.t : ''); m.innerHTML = gfMsgH(); }
}
// Gift message + admin ka remark (remark claim ke baad user ko dikhta hai)
const gfMsgH = () => gfMsg ? esc(gfMsg.m) + (gfMsg.r ? `<span class="gf-rm"><i>Remark</i>${esc(gfMsg.r)}</span>` : '') : '';
const giftBox = () => `<div class="gf-box"><div class="gf-h"><span class="pbox-ic">${I('gift')}</span><div><b>GIFT CODE</b><small>Have a gift code? Enter it here to add money to your wallet</small></div></div>
  <div class="gf-row"><input id="gfc" value="${esc(gfCode)}" ${gfBusy ? 'readonly' : ''} maxlength="24" placeholder="Enter gift code" autocomplete="off" autocapitalize="characters" oninput="gfCode=this.value;if(gfMsg){gfMsg=null;gfUi()}" onkeydown="if(event.key==='Enter')gfClaim()"><button class="cpn-b" id="gfb" ${gfBusy ? 'disabled' : ''} onclick="gfClaim()">${gfBusy ? 'Checking...' : 'Redeem'}</button></div>
  <div id="gfm" class="gf-msg${gfMsg ? ' ' + gfMsg.t : ''}">${gfMsgH()}</div></div>`;
async function gfClaim() {
  if (gfBusy || !guard()) return;
  const code = String(gfCode || '').trim().toUpperCase(); if (!code) { gfMsg = { t: 'err', m: 'Enter your gift code' }; return gfUi(); }
  gfBusy = true; gfMsg = null; gfUi();
  let r = null; try { r = await oapi('claim', { code }); } catch (e) { r = null; }
  gfBusy = false;
  if (r && r.ok) {
    const rm = String(r.remark || '').trim(); gfCode = '';
    gfMsg = { t: 'ok', m: `${rs(r.amount)} added to your wallet. New balance ${rs(r.balance)}`, r: rm };
    openM(`<div class="ok-wrap"><div class="ok-ic">${I('checkc')}</div><h3>Gift Code Redeemed</h3><p class="ok-l">Added to your wallet</p><div class="ok-no">${rs(r.amount)}</div><p class="ok-note" style="margin:6px 0 0">New balance <b>${rs(r.balance)}</b></p>${rm ? `<div class="gf-remark"><small>Remark</small><p>${esc(rm)}</p></div>` : ''}<button class="btn-gradient" style="margin-top:16px" onclick="closeM()">Done</button></div>`);
  }
  else gfMsg = { t: 'err', m: r ? (GFE[r.error] || GFE.server) : 'Connection problem, please try again' };
  gfUi();
}

/* ---------- FAKE WEBSITE (server: api/csite.php) ---------- */
const cxList = () => cxProds.filter(p => p.active !== false).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
const cxPlans = p => Object.entries(p.plans || {}).map(([k, x]) => ({ k, days: +x.days || 0, price: +x.price || 0, orig: +x.orig || 0 })).filter(x => x.days > 0 && x.price > 0).sort((a, b) => a.days - b.days || a.price - b.price);
const cxPrem = p => { const m = p.premium; return m && m.on && +m.price > 0 ? { k: 'premium', name: m.name || 'Premium', price: +m.price, orig: +m.orig || 0 } : null; };
const cxStock = p => Math.max(0, +p.stock || 0);
const cxFind = id => cxProds.find(x => x.id === id);
const cxLogo = p => p && p.logo ? `<img src="${esc(p.logo)}" alt="" decoding="async">` : I('globe');
const cxNow = () => Date.now() + cxSkew;
const cxLeft = o => { const d = Math.ceil((o.expiresAt - cxNow()) / 86400000); return d + ' day left'; };
const cxPick1 = p => { const pl = cxPlans(p), st = cxStock(p); return pl.length && st > 0 ? pl[0].k : (cxPrem(p) ? 'premium' : ''); };
const CXE = { maintenance: 'Store is under maintenance. Please try again later.', balance: 'Your balance is not enough for this plan', soldout: 'Sorry, this plan is sold out right now', gone: 'This product is not available right now', plan: 'This plan is not available right now', price_changed: 'The price was updated. Please check the new price and try again', wait: 'Please wait a moment and try again', busy: 'Your previous request is still processing. Please check Orders in a moment', pending: 'Your order is being finished. It will appear in Orders within a minute', auth: 'Please reopen the store from Telegram', nouser: 'Please reopen the store from Telegram', banned: 'Your account is restricted. Contact support.', bad: 'Something went wrong, please try again', fields: 'Please check the details you entered', server: 'Something went wrong, please try again' };

const cxAll = p => [...cxPlans(p).map(x => ({ ...x, n: x.days + ' Day' })), ...(cxPrem(p) ? [{ ...cxPrem(p), n: 'Premium' }] : [])];
const cxDisc = x => x && x.orig > x.price ? Math.round((x.orig - x.price) / x.orig * 100) : 0;   // "Starts from" wale plan par kitna discount (orig vs price)
const cxCard = p => {
  const pl = cxPlans(p), pm = cxPrem(p), st = cxStock(p), m = mtOf('cs', p), can = m || (pl.length && st > 0) || !!pm;
  const buy = [...(pl.length && st > 0 ? pl : []), ...(pm ? [pm] : [])], lo = [...(buy.length ? buy : cxAll(p))].sort((a, b) => a.price - b.price)[0];
  const per = lo ? (lo.k === 'premium' ? '1 Year plan' : lo.days + ' Day plan') : '';
  const dp = !m && can ? cxDisc(lo) : 0;   // maintenance / out of stock par patti nahi
  return `<div class="design-card cx-card${m ? ' mt' : can ? '' : ' out'}${dp ? ' dc' : ''}"${can ? ` onclick="cxOpen('${p.id}')"` : ''}>${dscH(dp)}
  <div class="cx-top"><div class="cx-logo">${cxLogo(p)}</div><div class="cx-tt"><div class="title">${esc(p.title)}</div><div class="cx-tl">${I('key', 'sm')}Ready login &bull; Instant delivery</div></div></div>${shareBtn('c', p.id)}
  <div class="cx-info"><div class="cx-start"><span>Starts from</span><b class="price-main">${lo ? rs(lo.price) : '-'}</b>${per ? `<small>${per}</small>` : ''}</div>
  ${m ? `<div class="cx-mt">${I('sliders', 'sm')}<span>Under maintenance</span></div>` : `<div class="cx-stock"><i></i><span>Stock</span><b${pl.length ? '' : ' class="tx"'}>${pl.length ? st : 'Unlimited'}</b></div>`}</div>
  ${m ? '' : `<div class="cx-pre">${I('crown', 'sm')}<span>1 Year Premium Plan Available</span></div>`}
  <button class="btn-create cx-buy${m ? ' mt-b' : ''}" ${can ? '' : 'disabled'}>${m ? I('clock', 'sm') + 'MAINTENANCE' : can ? I('bolt', 'sm') + 'BUY NOW' : 'OUT OF STOCK'}</button></div>`;
};
const cxHow = () => `<div class="cx-how"><div class="cx-how-h">How it works</div><div class="cx-steps">${[['globe', 'Choose a site', 'Pick a product below'], ['calendar', 'Select a plan', 'Choose how long you need it'], ['key', 'Get your login', 'Instantly, also on Telegram']].map(([ic, t, s], i) => `<div class="cx-st"><div class="cx-si">${I(ic)}<em>${i + 1}</em></div><b>${t}</b><small>${s}</small></div>`).join('<i class="cx-ar"></i>')}</div></div>`;
function cxView() {
  const l = cxList();
  return `<h2 class="section-title">${I('globe')}Available FAKE WEBSITE</h2><div class="cx-sub">Products <b>${l.length}</b></div>${cxHow()}` + (l.length ? `<div class="design-grid cx-grid">${l.map(cxCard).join('')}</div>` : empty('globe', 'No FAKE WEBSITE products yet', 'Please check back soon.'));
}
function cxOpen(id) { const p = cxFind(id); if (!p) return; const mb = mtBlock('cs', p); if (mb) return mtInfo(mb, p.title, mtCs(id)); cxPid = id; cxSel = cxPick1(p); cxRid = newRid(); cxCpn = null; cxCpc = ''; cxCpMsg = null; cxCpBusy = false; cxCpSeq++; nav('csplan'); }
function cxPickPlan(k) {   // plan badla -> coupon naye plan par dobara check (purana jawab ignore)
  const had = cxCpn || cxCpBusy; cxSel = k; cxCpSeq++; cxCpBusy = false; if (cxCpn) cxCpc = cxCpn.code; cxCpn = null; cxCpMsg = null;
  if (had && cxCpc.trim()) cxCpApply({ code: cxCpc }); else render();
}
function cxPlanView() {
  const p = cxFind(cxPid);
  if (!p || p.active === false) return `<div class="pg-list">${empty('globe', 'Product not available', 'This product was removed or is hidden.')}<button class="btn-outline" style="margin-top:14px" onclick="goBack()">Cancel</button></div>`;
  const st = cxStock(p), pl = cxPlans(p), pm = cxPrem(p), sel = cxSel, mb = mtBlock('cs', p);
  const out = !pl.length || st < 1, cur = sel === 'premium' ? pm : (out ? null : pl.find(x => x.k === sel)), cc = cur && cxCpn && cxCpn.pid === p.id && cxCpn.plan === sel ? cxCpn : null, fin = cc ? cc.final : (cur ? cur.price : 0), low = cur && coins < fin;
  const box = x => `<button class="cx-plan ${sel === x.k ? 'on' : ''} ${out ? 'off' : ''}" ${out ? 'disabled' : ''} onclick="cxPickPlan('${x.k}')"><b>${x.days} Day</b><span class="cx-pr">${rs(x.price)}</span>${x.orig > x.price ? `<s>${rs(x.orig)}</s>` : ''}${out ? '<em>Sold out</em>' : ''}</button>`;
  const premBtn = pm ? `<button class="cx-prem ${sel === 'premium' ? 'on' : ''}" onclick="cxPickPlan('premium')"><span class="cx-pi">${I('crown')}</span><span class="cx-pb"><b>${esc(pm.name)}</b><small>1 Year &bull; Link + Admin Panel login</small></span><span class="cx-pp"><b>${rs(pm.price)}</b>${pm.orig > pm.price ? `<s>${rs(pm.orig)}</s>` : ''}</span></button>`
    : `<button class="cx-prem soon" onclick="support()"><span class="cx-pi">${I('crown')}</span><span class="cx-pb"><b>1 Year Premium</b><small>Contact support to get this plan</small></span><span class="cx-pp">${I('chat', 'sm')}</span></button>`;
  return `<div class="cx-ph"><div class="cx-logo">${cxLogo(p)}</div><div class="cx-pt"><h2>${esc(p.title)}</h2><span>Select your plan</span></div>${shareBtn('c', p.id, 'big')}</div>
  ${mb ? `<div class="mt-note err">${I('sliders', 'sm')}<span>${esc(mb.msg) || 'This ' + (mb.scope === 'item' ? 'product' : 'section') + ' is under maintenance. Please check back shortly.'}</span></div>` : ''}
  <div class="cx-pcap">${I('crown', 'sm')}Premium 1 Year Plan Available</div>
  ${premBtn}
  ${pl.length ? `<div class="cx-sl">Select Plan</div><div class="cx-plans">${pl.map(box).join('')}</div>` : ''}
  ${cxCpBox(cur)}
  <div class="cx-sum">${cur ? `<div><span>Selected</span><b>${sel === 'premium' ? esc(cur.name) + ' (1 Year)' : cur.days + ' Day'}</b></div><div><span>Price</span><b>${rs(cur.price)}</b></div>${cc ? `<div class="cx-dis"><span>Coupon ${esc(cc.code)}</span><b>-${rs(cc.discount)}</b></div>` : ''}${cc ? `<div><span>You pay</span><b>${rs(fin)}</b></div>` : ''}` : '<div><span>Select a plan to continue</span></div>'}<div><span>Your balance</span><b class="${low ? 'cx-low' : ''}">${rs(coins)}</b></div></div>
  ${low ? `<div class="cx-need">You need ${rs(fin - coins)} more. <a onclick="wsec='upi';nav('wallet')">Add funds</a></div>` : ''}
  <div class="cx-btns"><button class="btn-outline" onclick="goBack()">Cancel</button><button class="btn-gradient" id="cxb" ${!cur || cxBuying || cxCpBusy || mb ? 'disabled' : ''} onclick="cxBuy()">${cxBuying ? 'Processing...' : 'Purchase'}</button></div>`;
}
async function cxBuy() {
  if (cxBuying || !guard()) return;
  const p = cxFind(cxPid), pk = cxSel; if (!p) return;
  { const mb = mtBlock('cs', p); if (mb) return mtInfo(mb, p.title, mtCs(p.id)); }
  const pl = pk === 'premium' ? cxPrem(p) : cxPlans(p).find(x => x.k === pk);
  if (!pl) return toast('Please select a plan', 'err');
  const cp = cxCpn && cxCpn.pid === p.id && cxCpn.plan === pk ? cxCpn : null;
  if (cxCpBusy || (cxCpn && !cp)) return toast('Checking your coupon, please wait a moment', 'err');
  const fin = cp ? cp.final : pl.price;
  if (coins < fin) { toast(`${rs(fin - coins)} more needed`, 'err'); wsec = 'upi'; return nav('wallet'); }
  cxBuying = true; render();
  try {
    const r = await capi('buy', { pid: p.id, plan: pk, rid: cxRid, price: pl.price, expect: fin, ...(cp ? { coupon: cp.code } : {}) }, 45000, 'csite');
    if (r && r.ok) { cxRid = ''; cxCpn = null; cxCpc = ''; cxCpMsg = null; cxAdd(r.order); cxBuying = false; nav('csite'); cxDone(r.order); loadCso(true); return; }
    if (mtSrv(r, 'cs', p, p.title, mtCs(p.id))) { cxBuying = false; if (tab === 'csplan') render(); return; }   // order bana hi nahi, rid wahi rehne do
    if (r && CP_DEF.includes(r.error)) cxRid = newRid();
    if (r && r.error === 'coupon') { cxCpn = null; cxCpMsg = { t: 'err', m: cpErr(r) }; }
    else if (r && r.error === 'price_changed' && cp && r.final != null) { cxCpn = { ...cp, discount: r.discount, final: r.final, price: r.price }; cxCpMsg = { t: 'err', m: 'The price was updated. Please check the new total.' }; }
    toast(cpErr(r), 'err');
    if (r && r.error === 'balance') { cxBuying = false; wsec = 'upi'; return nav('wallet'); }
  } catch (e) { toast('Network problem. If money was deducted, the order will be in Orders shortly.', 'err'); loadCso(true); }
  cxBuying = false; if (tab === 'csplan') render();
}
function cxAdd(o) { if (!o) return; if (!cso) cso = []; cso = [o, ...cso.filter(x => x.id !== o.id)]; csoErr = false; }
const cxRows = o => (o.premium ? [['Link', o.link], ['Admin Panel Link', o.adminLink], ['User ID', o.adminUser], ['Password', o.adminPass]] : [['Link', o.link], ['Number', o.num], ['Password', o.pw]]).filter(r => r[1]);
const cxRowsH = o => cxRows(o).map(([l, v]) => `<div class="cx-cr"><span>${l}</span><code>${esc(v)}</code><button class="cx-cp" aria-label="Copy ${l}" data-v="${esc(v)}" onclick="copyTxt(this.dataset.v)">${I('copy', 'sm')}</button></div>`).join('');
function cxDone(o) {
  openM(`<div class="ok-wrap"><div class="ok-ic">${I('checkc')}</div><h3>Order Received</h3><p class="ok-note" style="margin:6px 0 14px"><b>${esc(o.title)}</b> &bull; ${esc(o.plan)}<br>Valid for ${o.days} days. Also sent to your Telegram chat.</p>${o.coupon ? `<p class="ok-save">${I('tag', 'sm')}Coupon ${esc(o.coupon)}: you saved ${rs(o.discount)}</p>` : ''}<div class="cx-rows">${cxRowsH(o)}</div><button class="btn-gradient" onclick="closeM();nav('orders')">View in Orders</button><button class="btn-outline" style="margin-top:10px" onclick="closeM()">Close</button></div>`);
}
async function loadCso(force) {
  if (!uid || csoBusy) return; if (!force && Date.now() - csoAt < 20000) return;
  csoBusy = true; csoAt = Date.now();
  try { const r = await capi('orders', {}, 20000, 'csite'); if (r && r.ok) { cso = r.orders || []; csoErr = false; if (r.now) cxSkew = r.now - Date.now(); } else csoErr = true; } catch (e) { csoErr = true; }
  csoBusy = false; if ((tab === 'orders' || tab === 'profile') && !modalOpen()) render();
}
function cxTick() {
  if (!cso && !bso) return; let ch = false;
  (cso || []).forEach(o => { if (o.status === 'active' && o.expiresAt <= cxNow()) { o.status = 'expired'; ['link', 'num', 'pw', 'adminLink', 'adminUser', 'adminPass'].forEach(k => delete o[k]); ch = true; } });
  (bso || []).forEach(o => { if (o.status === 'active' && o.expiresAt <= cxNow()) { o.status = 'expired'; ch = true; } });
  if (ch) { if (tab === 'orders' && !modalOpen()) render(); } else document.querySelectorAll('[data-exp]').forEach(e => { e.textContent = cxLeft({ expiresAt: +e.dataset.exp }); });
}
setInterval(cxTick, 30000);

/* ---------- Bot Deploy (server: api/botdeploy.php). Home button -> 4 step page -> payment -> Python bot deploys it -> status in Orders ---------- */
const BD_TK = /^\d{6,12}:[A-Za-z0-9_-]{30,50}$/, BD_NM = /^[\p{L}\p{N}][\p{L}\p{M}\p{N} _.-]{1,39}$/u, BD_ID = /^[1-9]\d{4,14}$/;
const bdPlans = () => bdPlansV.filter(x => x.active !== false && x.days > 0 && x.price > 0).sort((a, b) => a.sort - b.sort || a.days - b.days || a.price - b.price);
const bdOn = () => bdCfgV.on === true;
const bdShow = () => (bdOn() && bdPlans().length > 0) || isOwner();
const bdMt = () => { const w = maintCfg(); return w.on ? { scope: 'store', k: 'bd', msg: w.msg, eta: w.eta } : null; };
const bdPName = x => x.name || (x.days + (x.days === 1 ? ' Day' : ' Days'));
const bdNm = () => bdF.name.trim().replace(/\s+/g, ' ');
const bdSel = () => bdPlans().find(x => x.k === bdF.plan) || null;
const bdNmKey = n => n.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
const bdNmValid = () => !/^\s/.test(bdF.name) && BD_NM.test(bdNm()) && bdNmKey(bdNm()).length >= 2;
const bdOk = () => [bdNmValid() && bdNmSt() !== 'taken', BD_TK.test(bdF.token.trim()), BD_ID.test(bdF.aid.trim()), !!bdSel()];
const bdBlocked = () => !!bdMt() || !bdOn() || !!(bdInfoV && bdInfoV.block === 'offline');
const BDE = { name: 'Wrong client name. Example: Rahul Store', nametaken: 'This client name is already in use. Choose another client name', token: 'This bot token is not valid. Copy it again from @BotFather', adminid: 'Enter a valid Telegram ID (numbers only)', tgfail: 'Could not reach Telegram to check the token. Please try again', taken: 'This bot is already running for another account', busy: 'An order for this bot is still being processed. Please check Orders', pending: 'Payment received. Your order is being finished, check Orders in a minute', wait: 'Please wait a few seconds and try again', off: 'Bot deploy is not available right now', offline: 'Our deploy service is offline for a moment. Please try again in a few minutes' };
const bdErr = r => !r ? 'Connection problem, please try again' : r.error === 'coupon' ? cpErr(r) : (BDE[r.error] || CXE[r.error] || 'Something went wrong, please try again');
const bdPosterOk = u => typeof u === 'string' && (/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+\/=]+$/.test(u) || /^https:\/\/[^\s"'<>]{4,}$/.test(u));
function bdPosApply(v) {   // poster: data-URL ko ek baar blob URL bana do (home baar baar render hota hai, bhaari string baar baar na bane)
  v = typeof v === 'string' ? v : ''; if (v === bdPosRaw) return; bdPosRaw = v;
  if (bdPosSrc.indexOf('blob:') === 0) { try { URL.revokeObjectURL(bdPosSrc); } catch (e) { } }
  bdPosSrc = bdPosterOk(v) ? v : '';
  const m = /^data:(image\/[a-z]+);base64,(.+)$/.exec(bdPosSrc);
  if (m) { try { const b = atob(m[2]), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); bdPosSrc = URL.createObjectURL(new Blob([u], { type: m[1] })); } catch (e) { bdPosSrc = v; } }
}
const bdMaxOff = () => bdPlans().reduce((m, x) => x.orig > x.price ? Math.max(m, Math.min(99, Math.round((1 - x.price / x.orig) * 100))) : m, 0);   // sabse zyada discount (%)
const bdArt = () => `<div class="bdh-art" aria-hidden="true"><i class="r1"></i><i class="r2"></i><span class="bdh-core">${I('bot')}</span><span class="bdh-b b1"><i></i><i></i></span><span class="bdh-b b2"><i></i><i></i><em>${I('tick', 'sm')}</em></span></div>`;
const bdHero = () => {
  if (!bdShow()) return '';
  const pl = bdPlans(), live = bdOn() && pl.length > 0, off = live ? bdMaxOff() : 0;
  const pic = bdPosRaw === null ? '' : bdPosSrc ? `<img src="${esc(bdPosSrc)}" alt="Welcome message bot" decoding="async">` : bdArt();
  // poster + button ek hi card: poora card tap hota hai, button poster ke neeche chipka hua (beech me gap nahi)
  return `<div class="bdh" role="button" tabindex="0" aria-label="Deploy Bot" onclick="bdOpen()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();bdOpen()}">${dscH(off)}<div class="bdh-pic${bdPosRaw === null ? ' ld' : ''}">${pic}${live ? '' : '<div class="bdh-off">Hidden from users until you switch it on</div>'}</div><div class="bdh-btn"><span class="bdh-ic">${I('bot')}</span><span class="bdh-tx">Deploy Bot</span><span class="bdh-pr">${live ? 'from ' + rs(Math.min(...pl.map(x => x.price))) : 'Preview'}</span><span class="bdh-ar">${I('arrow', 'sm')}</span></div></div>`;
};
const balBox = () => `<div class="balbox"><div class="bal-l"><span class="bal-ic">${I('wallet')}</span><span class="bal-t"><small>Balance</small><b><span class="cur">&#8377;</span><span class="cb">${coins}</span></b></span></div><button class="bal-add" onclick="wsec='upi';nav('wallet')">${I('plus', 'sm')}Add Fund</button></div>`;
function bdSync() { if (modalOpen()) return; if (tab === 'home' || tab === 'orders') rq(); else if (tab === 'bdeploy') { if (!bdShow()) render(); else bdPaint(); } }
function bdOpen(pre) {
  const mb = bdMt(); if (mb) return mtInfo(mb, 'Deploy Welcome Message Bot', bdMt);
  bdRid = newRid(); bdChk = null; bdInfoV = null; bdRenew = pre && !pre.retry ? pre : null;
  bdCp = null; bdCpc = ''; bdCpMsg = null; bdCpBusy = false; bdCpSeq++; bdNmC = null; bdNmTouch = false; clearTimeout(bdNmT); bdNmSeq++;
  if (pre) { if (pre.name) bdF.name = pre.name; if (pre.adminId) bdF.aid = pre.adminId; bdF.token = ''; }
  nav('bdeploy'); bdLoadInfo(); bdNmSched();
}
function bdRenewOrd(id) { const o = (bso || []).find(x => x.id === id); if (o) bdOpen({ name: o.name, adminId: o.adminId, bot: o.bot, retry: o.status === 'failed' }); }
async function bdLoadInfo() {
  try { const r = await capi('info', {}, 15000, 'botdeploy'); bdInfoV = r && r.ok ? r : { err: true }; } catch (e) { bdInfoV = { err: true }; }
  if (tab === 'bdeploy') bdPaint();
}
/* ---- Client name: galat naam / pehle se use me wala naam turant dikhta hai (asli rok server par bhi hai) ---- */
const BD_EX = 'Example: Rahul Store';
const bdNmBot = () => { const c = bdChk; return c && c.st === 'ok' && c.tok === bdF.token.trim() ? c.bot : (bdRenew && bdRenew.bot) || ''; };
const bdNmSt = () => { const c = bdNmC; return c && bdNmValid() && c.nm === bdNm().toLowerCase() && c.bot === bdNmBot() ? c.st : ''; };
function bdNmErr() {
  const raw = bdF.name; if (raw === '') return bdNmTouch ? 'Enter a client name. ' + BD_EX : '';
  if (/^\s/.test(raw)) return 'Wrong name: it cannot start with a space. ' + BD_EX;
  const nm = bdNm();
  if (/[^\p{L}\p{M}\p{N} _.-]/u.test(nm)) return 'Wrong name: only letters, numbers, spaces and - _ . are allowed. ' + BD_EX;
  if (!/^[\p{L}\p{N}]/u.test(nm)) return 'Wrong name: it must start with a letter or a number. ' + BD_EX;
  if (!BD_NM.test(nm) || bdNmKey(nm).length < 2) return bdNmTouch ? 'Name is too short. Use at least 2 letters or numbers. ' + BD_EX : '';
  return '';
}
function bdNmH() {
  const e = bdNmErr(); if (e) return `<div class="bd-tk err">${I('xc', 'sm')}<span>${esc(e)}</span></div>`;
  const st = bdNmSt();
  if (st === 'busy') return `<div class="bd-tk"><i class="bd-sp"></i><span>Checking name...</span></div>`;
  if (st === 'taken') return `<div class="bd-tk err">${I('xc', 'sm')}<span>${BDE.nametaken}.</span></div>`;
  if (st === 'ok') return `<div class="bd-tk ok">${I('checkc', 'sm')}<span>This name is available</span></div>`;
  return '';
}
async function bdq(a, b) { let r = await capi(a, b, 20000, 'botdeploy'); if (r && r.error === 'wait') { await new Promise(x => setTimeout(x, 1150)); r = await capi(a, b, 20000, 'botdeploy'); } return r; }   // 1 sec ke andar dusra check -> ek baar apne aap dobara
function bdNmSched() {   // naam likhna ruke (0.6 sec) tab hi server se poochho
  clearTimeout(bdNmT); bdNmSeq++;
  if (!bdNmValid()) { bdNmC = null; return; }
  const nm = bdNm().toLowerCase(), bot = bdNmBot(), c = bdNmC;
  if (c && c.nm === nm && c.bot === bot && c.st !== 'busy') return;
  bdNmT = setTimeout(async () => {
    const my = ++bdNmSeq; bdNmC = { nm, bot, st: 'busy' }; bdPaint();
    let r = null; try { r = await bdq('name', { name: bdNm(), bot }); } catch (e) { r = null; }
    if (my !== bdNmSeq) return;
    bdNmC = { nm, bot, st: r && r.ok ? (r.free === false ? 'taken' : 'ok') : 'err' }; bdPaint();
  }, 600);
}

/* ---- Coupon (server: api/botdeploy.php quote/buy, coupon scope 'bd' ya 'all') ---- */
const bdCpLive = () => bdCp && bdCp.plan === bdF.plan && bdCp.ren === bdRen() ? bdCp : null;
const bdFinal = x => { const c = bdCpLive(); return c ? c.final : bdPrice(x); };
const bdCpBox = () => `<div class="cpn bd-cp"><div class="cpn-lb">Coupon code <span class="opt">(Optional)</span></div><div class="cpn-row"><input id="bdc" value="${esc(bdCp ? bdCp.code : bdCpc)}" ${bdCp || bdCpBusy ? 'readonly' : ''} maxlength="24" placeholder="Have a coupon? Enter code" autocomplete="off" autocapitalize="characters" oninput="bdCpc=this.value;if(bdCpMsg){bdCpMsg=null;bdCpUi(1)}" onkeydown="if(event.key==='Enter')bdCpBtn()"><button type="button" class="cpn-b${bdCp && !bdCpBusy ? ' on' : ''}" id="bdcb" ${bdCpBusy || !bdSel() ? 'disabled' : ''} onclick="bdCpBtn()">${bdCpBusy ? 'Checking...' : bdCp ? 'Remove' : 'Apply'}</button></div><div id="bdcm" class="cpn-msg${bdCpMsg ? ' ' + bdCpMsg.t : ''}">${bdCpMsg ? esc(bdCpMsg.m) : ''}</div></div>`;
function bdCpUi(quiet) {   // coupon box ko jagah par badlo (input nahi todte), phir summary
  const i = $('#bdc'), b = $('#bdcb'), m = $('#bdcm');
  if (i && b && m) {
    i.readOnly = !!bdCp || bdCpBusy; if (bdCp && i.value !== bdCp.code) i.value = bdCp.code; if (!bdCp && !bdCpBusy && !bdCpc && i.value) i.value = '';
    b.disabled = bdCpBusy || !bdSel(); b.textContent = bdCpBusy ? 'Checking...' : bdCp ? 'Remove' : 'Apply'; b.classList.toggle('on', !!bdCp && !bdCpBusy);
    m.className = 'cpn-msg' + (bdCpMsg ? ' ' + bdCpMsg.t : ''); m.textContent = bdCpMsg ? bdCpMsg.m : '';
  }
  if (!quiet) bdPaint();
}
function bdCpBtn() { if (bdCp) { bdCp = null; bdCpSeq++; bdCpBusy = false; bdCpc = ''; bdCpMsg = null; bdCpUi(); } else bdCpApply(); }
async function bdCpApply(keep) {
  if (bdCpBusy || (!keep && !guard())) return;
  const pl = bdSel(); if (!pl) return;
  const code = (keep ? keep.code : bdCpc).trim().toUpperCase(); if (!code) { bdCpMsg = { t: 'err', m: 'Enter a coupon code' }; return bdCpUi(); }
  bdCpc = code; const my = ++bdCpSeq, ren = bdRen(); bdCpBusy = true; bdCpMsg = null; bdCpUi();
  let r = null; try { r = await bdq('quote', { code, plan: pl.k, renew: ren }); } catch (e) { r = null; }
  if (my !== bdCpSeq) return; bdCpBusy = false;
  if (r && r.ok) { bdCp = { code: r.code, discount: r.discount, final: r.final, price: r.price, plan: pl.k, ren }; bdCpc = r.code; bdCpMsg = { t: 'ok', m: cpSave(r) }; }
  else { bdCp = null; bdCpMsg = { t: 'err', m: cpErr(r) }; }
  bdCpUi();
}
function bdCpRe() {   // plan ya (naya <-> renewal) badla -> coupon naye price par dobara check
  const c = bdCp, code = c ? c.code : (bdCpBusy ? bdCpc.trim().toUpperCase() : ''); if (!code) return;
  if (c && c.plan === bdF.plan && c.ren === bdRen()) return;
  bdCpBusy = false; bdCpApply({ code });
}
function bdSvcH() {
  const mb = bdMt();
  if (mb) return `<div class="mt-note err">${I('sliders', 'sm')}<span>${esc(mb.msg) || MT_MSG}</span></div>`;
  if (!bdOn()) return `<div class="mt-note err">${I('alert', 'sm')}<span>Bot deploy is switched off. Only you (the owner) can see this page.</span></div>`;
  if (bdInfoV && bdInfoV.block === 'offline') return `<div class="mt-note err">${I('clock', 'sm')}<span>${BDE.offline}.</span></div>`;
  return '';
}
function bdTkH() {
  const c = bdChk, t = bdF.token.trim(); if (!c || c.tok !== t) return '';
  if (c.st === 'busy') return `<div class="bd-tk"><i class="bd-sp"></i><span>Checking with Telegram...</span></div>`;
  if (c.st === 'ok') return `<div class="bd-tk ok">${I('checkc', 'sm')}<span>Bot found: <b>@${esc(c.bot)}</b>${c.mode === 'renew' ? ` &bull; renewal${c.exp > Date.now() ? ' (current plan till ' + fmtD(c.exp) + ')' : ''}` : ''}</span></div>`;
  return `<div class="bd-tk err">${I('xc', 'sm')}<span>${esc(c.msg)}</span></div>`;
}
// renewal: isi user ka purana bot dobara badhana = admin ka set kiya sasta renewal price. Server hi final tay karta hai; yahan sirf dikhane ke liye
const bdRp = x => x.rprice > 0 && x.rprice < x.price ? x.rprice : x.price;
const bdRen = () => { const t = bdF.token.trim(); return bdChk && bdChk.st === 'ok' && bdChk.tok === t ? bdChk.mode === 'renew' : !!bdRenew; };
const bdPrice = x => bdRen() ? bdRp(x) : x.price;
const perDay = (p, d) => { const v = p / d; return '&#8377;' + (v >= 10 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, '')) + ' per day'; };
function bdPlH() {
  const pl = bdPlans(); if (!pl.length) return '<div class="bd-h">No plans yet. Please check back soon.</div>';
  const ren = bdRen(), best = pl.length > 1 ? pl.reduce((a, b) => bdPrice(b) / b.days < bdPrice(a) / a.days ? b : a) : null;
  return `<div class="bd-plans" role="radiogroup" aria-label="Select plan">${pl.map(x => {
    const on = bdF.plan === x.k, pr = bdPrice(x), cut = ren ? (pr < x.price ? x.price : 0) : (x.orig > x.price ? x.orig : 0), off = cut > pr ? Math.round((1 - pr / cut) * 100) : 0;
    const sub = ren ? (pr < x.price ? `<span class="bd-pt rn">${I('refresh', 'sm')}Renewal price</span>` : `<span class="bd-pt">${perDay(pr, x.days)}</span>`) : (bdRp(x) < x.price ? `<span class="bd-pt rn">${I('refresh', 'sm')}Renews at ${rs(bdRp(x))}</span>` : `<span class="bd-pt">${perDay(pr, x.days)}</span>`);
    return `<button type="button" class="bd-pl${on ? ' on' : ''}" role="radio" aria-checked="${on}" data-k="${esc(x.k)}" onclick="bdPick(this.dataset.k)"><span class="bd-pd"><b>${x.days}</b><small>${x.days === 1 ? 'day' : 'days'}</small></span><span class="bd-pm"><span class="bd-pn">${esc(x.name || x.days + (x.days === 1 ? ' day plan' : ' days plan'))}${best && best.k === x.k ? '<em class="bd-best">Best value</em>' : ''}</span><span class="bd-pp"><b>${rs(pr)}</b>${cut > pr ? `<s>${rs(cut)}</s><i class="bd-po">${off}% off</i>` : ''}</span>${sub}</span><span class="bd-pc">${I('tick', 'sm')}</span></button>`;
  }).join('')}</div>`;
}
function bdSumH() {
  const x = bdSel(), ok = bdOk(), cp = x ? bdCpLive() : null, fin = x ? bdFinal(x) : 0, low = x && coins < fin, c = bdChk && bdChk.st === 'ok' && bdChk.tok === bdF.token.trim() ? bdChk : null;
  const rows = [...(ok[0] ? [['Client', esc(bdNm())]] : []), ...(c ? [['Bot', '@' + esc(c.bot)]] : []), ...(ok[2] ? [['Admin ID', esc(bdF.aid.trim())]] : []), ...(x ? [['Plan', esc(bdPName(x))], [bdRen() && bdPrice(x) < x.price ? 'Renewal price' : 'Price', rs(bdPrice(x))], ...(cp ? [[`Coupon ${esc(cp.code)}`, '-' + rs(cp.discount), 'cx-dis'], ['You pay', rs(cp.final)]] : [])] : [])];
  return `<div class="cx-sum">${rows.length ? rows.map(([l, v, k]) => `<div${k ? ` class="${k}"` : ''}><span>${l}</span><b>${v}</b></div>`).join('') : '<div><span>Fill the steps above to continue</span></div>'}<div><span>Your balance</span><b class="${low ? 'cx-low' : ''}">${rs(coins)}</b></div></div>${low ? `<div class="cx-need">You need ${rs(fin - coins)} more. <a onclick="wsec='upi';nav('wallet')">Add funds</a></div>` : ''}<div class="bd-note">${I('shield', 'sm')}<span>If your bot cannot be deployed, the full amount goes back to your wallet automatically.</span></div>`;
}
function bdView() {
  if (!bdShow()) return `<div class="pg-list">${subHead('bot', 'Bot Deploy')}${empty('bot', 'Not available right now', 'Bot deploy is not open at the moment. Please check back soon.')}</div>`;
  const pl = bdPlans(); if (!bdSel()) bdF.plan = pl[0] ? pl[0].k : '';
  const ok = bdOk(), n = i => ok[i - 1] ? I('tick', 'sm') : i;
  return `<div class="pg-list">${subHead('bot', 'Bot Deploy')}
  <div class="bd-intro"><span class="bd-ic sm">${I('bot')}</span><div><b>Deploy Welcome Message Bot</b><small>${esc(bdCfgV.note) || 'Fill the 4 steps below. Your bot is deployed automatically right after payment, and you get a message on Telegram.'}</small></div></div>
  <div id="bdsvc">${bdSvcH()}</div>
  ${bdRenew ? `<div class="bd-rn">${I('refresh', 'sm')}<span>${bdRenew.bot ? 'Renewing <b>@' + esc(bdRenew.bot) + '</b>. ' : ''}Paste the same bot token again to continue. Renewal prices are applied.</span></div>` : ''}
  <div class="bd-steps">
  <div class="bd-st"><i class="bd-n${ok[0] ? ' ok' : ''}" id="bdn1">${n(1)}</i><div class="bd-b"><label for="bdn">Client name</label><input id="bdn" maxlength="40" autocomplete="off" placeholder="Business or person name" value="${esc(bdF.name)}" oninput="bdIn('name',this.value)" onblur="bdNmTouch=true;bdPaint()"><div id="bdnm">${bdNmH()}</div><div class="bd-h">Example: <b>Rahul Store</b>, <b>Sharma Traders</b>. Every client needs a different name. It is shown on your service card.</div></div></div>
  <div class="bd-st"><i class="bd-n${ok[1] ? ' ok' : ''}" id="bdn2">${n(2)}</i><div class="bd-b"><label for="bdt">Enter your bot token</label><div class="bd-row"><input id="bdt" class="bd-mono" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="70" placeholder="123456789:AAH..." value="${esc(bdF.token)}" oninput="bdIn('token',this.value)"><button type="button" class="bd-mini" id="bdv" onclick="bdVerify()">Verify</button></div><div id="bdtk">${bdTkH()}</div><div class="bd-h">Make a bot in <a onclick="tg.openTelegramLink('https://t.me/BotFather')">@BotFather</a> with /newbot and copy the token it gives you.</div></div></div>
  <div class="bd-st"><i class="bd-n${ok[2] ? ' ok' : ''}" id="bdn3">${n(3)}</i><div class="bd-b"><label for="bda">Send your ID</label><div class="bd-row"><input id="bda" inputmode="numeric" autocomplete="off" maxlength="15" placeholder="Telegram ID" value="${esc(bdF.aid)}" oninput="bdIn('aid',this.value)"><button type="button" class="bd-mini" onclick="bdMyId()">Use my ID</button></div><div class="bd-h">The Telegram ID of the person who will control the bot (admin). Your ID is <b>${esc(uid || '-')}</b>.</div><div class="bd-h">Need the ID of another account? Open <a onclick="tg.openTelegramLink('https://t.me/userinfobot')">@userinfobot</a> from that account, press Start and copy the number it shows as Id.</div></div></div>
  <div class="bd-st wide"><i class="bd-n${ok[3] ? ' ok' : ''}" id="bdn4">${n(4)}</i><div class="bd-b"><label>Select plan</label></div><div class="bd-wd"><div id="bdpl">${bdPlH()}</div>${bdCpBox()}</div></div>
  </div>
  <div id="bdsum">${bdSumH()}</div>
  <div class="cx-btns"><button class="btn-outline" onclick="goBack()">Cancel</button><button class="btn-gradient" id="bdb" ${bdBuying || !bdSel() || bdBlocked() ? 'disabled' : ''} onclick="bdBuy()">${bdBuying ? 'Processing...' : 'Purchase'}</button></div></div>`;
}
function bdPaint() {   // sirf badle hue hisse (typing ke beech poora page dobara nahi banta)
  if (tab !== 'bdeploy') return;
  if (!bdShow()) return render();
  const set = (id, h) => { const e = $('#' + id); if (e && e.innerHTML !== h) e.innerHTML = h; };
  if (!bdSel()) { const pl = bdPlans(); bdF.plan = pl[0] ? pl[0].k : ''; }
  const ok = bdOk();
  set('bdsvc', bdSvcH()); set('bdtk', bdTkH()); set('bdnm', bdNmH()); set('bdpl', bdPlH()); set('bdsum', bdSumH());
  const ni = $('#bdn'); if (ni) ni.classList.toggle('inv', !!bdNmErr() || bdNmSt() === 'taken');
  const cb = $('#bdcb'); if (cb) cb.disabled = bdCpBusy || !bdSel();
  ok.forEach((v, i) => { const e = $('#bdn' + (i + 1)); if (e) { e.classList.toggle('ok', v); const h = v ? I('tick', 'sm') : String(i + 1); if (e.innerHTML !== h) e.innerHTML = h; } });
  const b = $('#bdb'); if (b) { b.disabled = bdBuying || !bdSel() || bdBlocked(); b.textContent = bdBuying ? 'Processing...' : 'Purchase'; }
  const v = $('#bdv'); if (v) v.disabled = !ok[1] || !!(bdChk && bdChk.st === 'busy' && bdChk.tok === bdF.token.trim());
}
function bdIn(k, v) {
  if (k === 'token') { bdF.token = v.replace(/\s+/g, ''); if (bdF.token !== v) { const e = $('#bdt'); if (e) e.value = bdF.token; } }
  else if (k === 'aid') { bdF.aid = v.replace(/\D/g, ''); if (bdF.aid !== v) { const e = $('#bda'); if (e) e.value = bdF.aid; } }
  else { bdF.name = v; bdNmSched(); }
  bdPaint();
}
function bdPick(k) { bdF.plan = k; bdPaint(); bdCpRe(); }
function bdMyId() { if (!uid) return; bdF.aid = String(uid); const e = $('#bda'); if (e) e.value = bdF.aid; bdPaint(); }
async function bdVerify() {
  const t = bdF.token.trim();
  if (!BD_TK.test(t)) { bdChk = { st: 'err', tok: t, msg: BDE.token }; return bdPaint(); }
  if (!guard()) return;
  bdChk = { st: 'busy', tok: t }; bdPaint();
  try {
    const r = await capi('check', { token: t }, 20000, 'botdeploy');
    bdChk = r && r.ok ? { st: 'ok', tok: t, bot: r.bot, botName: r.botName, mode: r.mode, exp: +r.exp || 0 } : { st: 'err', tok: t, msg: bdErr(r) };
  } catch (e) { bdChk = { st: 'err', tok: t, msg: 'Connection problem, please try again' }; }
  bdPaint(); bdNmSched(); bdCpRe();   // bot pata chala: uska apna purana naam taken nahi, renewal ho to coupon naye price par
}
function bdValid() {
  const ok = bdOk();
  bdNmTouch = true; if (!ok[0]) return ['bdn', bdNmErr() || (bdNmSt() === 'taken' ? BDE.nametaken : BDE.name)]; if (!ok[1]) return ['bdt', BDE.token]; if (!ok[2]) return ['bda', BDE.adminid]; if (!ok[3]) return ['', 'Please select a plan'];
  return null;
}
async function bdBuy() {
  if (bdBuying || !guard()) return;
  const mb = bdMt(); if (mb) return mtInfo(mb, 'Deploy Welcome Message Bot', bdMt);
  const bad = bdValid(); if (bad) { bdPaint(); toast(bad[1], 'err'); const e = bad[0] && $('#' + bad[0]); if (e) { e.classList.add('bad'); e.focus(); setTimeout(() => e.classList.remove('bad'), 1600); } return; }
  if (bdCpBusy) return toast('Checking your coupon, please wait a moment', 'err');
  if (!bdCp && bdCpc.trim()) { bdCpMsg = { t: 'err', m: 'Tap Apply to use this coupon, or clear the box' }; bdCpUi(1); const ci = $('#bdc'); if (ci) ci.focus(); return toast('Tap Apply to use your coupon, or clear the box', 'err'); }
  const pl = bdSel(), t = bdF.token.trim();
  if (!(bdChk && bdChk.st === 'ok' && bdChk.tok === t)) {   // keemat bot par nirbhar hai (naya ya renewal): pehle bot check karo
    const was = bdFinal(pl); bdBuying = true; bdPaint();
    try { await bdVerify(); } catch (e) { }
    bdBuying = false;
    if (!(bdChk && bdChk.st === 'ok' && bdChk.tok === t)) return bdPaint();   // galti token ke neeche dikh rahi hai
    bdPaint(); if (bdCp && !bdCpLive()) return toast('Price updated for your bot. Check the total and tap Purchase', 'ok');
    if (bdFinal(pl) !== was) return toast((bdRen() ? 'Renewal price ' : 'Price ') + rs(bdFinal(pl)) + '. Tap Purchase to confirm', 'ok');
  }
  const price = bdPrice(pl), cp = bdCpLive(), final = cp ? cp.final : price;
  if (coins < final) { toast(`${rs(final - coins)} more needed`, 'err'); wsec = 'upi'; return nav('wallet'); }
  bdBuying = true; bdPaint();
  try {
    const r = await capi('buy', { plan: pl.k, rid: bdRid, price, name: bdNm(), token: t, adminId: bdF.aid.trim(), ...(cp ? { coupon: cp.code, expect: final } : {}) }, 45000, 'botdeploy');
    if (r && r.ok) { bdRid = ''; bdF.token = ''; bdF.name = ''; bdNmC = null; bdNmTouch = false; bdChk = null; bdRenew = null; bdCp = null; bdCpc = ''; bdCpMsg = null; bdAdd(r.order); bdBuying = false; ordF = 'bot'; nav('orders'); bdDone(r.order); loadBso(true); return; }
    if (r && r.error === 'maintenance') { bdBuying = false; mtInfo(bdMt() || { scope: r.scope || 'store', k: 'bd', msg: String(r.msg || ''), eta: +r.eta || 0 }, 'Deploy Welcome Message Bot', bdMt); bdPaint(); return; }
    if (r && ['balance', 'plan', 'price_changed', 'token', 'name', 'nametaken', 'adminid', 'off', 'offline', 'taken', 'tgfail', 'coupon', 'bad'].includes(r.error)) bdRid = newRid();   // order bana hi nahi -> naya request id
    if (r && r.error === 'price_changed') { bdChk = null; if (cp && r.final != null) bdCp = { ...cp, discount: r.discount, final: r.final, price: r.price }; }   // bot ki halat badal gayi (naya <-> renewal): agle Purchase par dobara check hoga
    if (r && r.error === 'nametaken') { bdNmC = { nm: bdNm().toLowerCase(), bot: bdNmBot(), st: 'taken' }; bdNmTouch = true; const ni = $('#bdn'); if (ni) ni.focus(); }
    if (r && r.error === 'coupon') { bdCp = null; bdCpMsg = { t: 'err', m: cpErr(r) }; bdCpUi(1); }
    if (r && r.error === 'offline') bdInfoV = { ok: true, block: 'offline' };
    toast(bdErr(r), 'err');
    if (r && r.error === 'pending') { bdBuying = false; bdRid = ''; ordF = 'bot'; nav('orders'); loadBso(true); return; }
    if (r && r.error === 'balance') { bdBuying = false; wsec = 'upi'; return nav('wallet'); }
  } catch (e) { toast('Network problem. If money was deducted, the order will be in Orders shortly.', 'err'); loadBso(true); }
  bdBuying = false; bdPaint(); bdCpUi(1);
}
function bdAdd(o) { if (!o) return; if (!bso) bso = []; bso = [o, ...bso.filter(x => x.id !== o.id)]; bsoErr = false; }
function bdDone(o) {
  openM(`<div class="ok-wrap"><div class="ok-ic">${I('checkc')}</div><h3>Order Received</h3><p class="ok-note" style="margin:6px 0 14px"><b>@${esc(o.bot)}</b> &bull; ${esc(o.plan)}<br>We are deploying your bot now. You will get a message on Telegram as soon as it is live. The status updates here in Orders.</p><button class="btn-gradient" onclick="closeM()">Done</button></div>`);
}
async function loadBso(force) {
  if (!uid || bsoBusy) return; if (!force && Date.now() - bsoAt < 20000) return;
  bsoBusy = true; bsoAt = Date.now(); const was = {}; (bso || []).forEach(o => was[o.id] = o.status);
  try { const r = await capi('mine', {}, 20000, 'botdeploy'); if (r && r.ok) { bso = r.orders || []; bsoErr = false; if (r.now) cxSkew = r.now - Date.now(); } else bsoErr = true; } catch (e) { bsoErr = true; }
  bsoBusy = false; clearTimeout(bsoT);
  (bso || []).forEach(o => { const w = was[o.id]; if (w && (w === 'queued' || w === 'deploying')) { if (o.status === 'active') toast('Your bot @' + o.bot + ' is live'); else if (o.status === 'failed') toast('Bot deploy failed. Your money was returned.', 'err'); } });
  bsoArm();
  if (tab === 'orders' && !modalOpen()) render(); else if (tab === 'home' || tab === 'profile') rq();
}
function bsoArm() {   // deploy chal raha hai aur user Orders par hai -> status khud update hota rahe (naye order par 6s, purane par 20s)
  clearTimeout(bsoT); const prog = (bso || []).filter(o => o.status === 'queued' || o.status === 'deploying');
  if (prog.length && tab === 'orders') { const young = Date.now() - Math.min(...prog.map(o => o.createdAt)) < 180000; bsoT = setTimeout(() => loadBso(true), young ? 6000 : 20000); }
}
const BDS = { queued: ['wait', 'In queue'], deploying: ['run', 'Deploying'], active: ['act', 'Live'], expired: ['ex', 'Expired'], renewed: ['mu', 'Renewed'], failed: ['ex', 'Refunded'] };
const BDM = { queued: 'Your payment is received. The bot will be deployed in a moment.', deploying: 'Your bot is being set up right now.', active: 'Your bot is live. Open it and send /start from your admin account.', expired: 'This plan has ended and the bot has stopped. Renew it to start it again.', renewed: 'This plan was extended by a newer order.', failed: 'We could not deploy this bot, so your money was returned to your wallet.' };
function bdTrk(o) {
  const s = o.status, up = ['active', 'expired', 'renewed'].includes(s);
  const st = s === 'failed' ? [['Payment received', 'done', o.createdAt], ['Not completed', 'bad', 0], [o.refunded ? 'Refunded' : 'Refund', o.refunded ? 'done' : 'now', 0]]
    : [['Payment received', 'done', o.createdAt], ['Deploying', up ? 'done' : 'now', up ? o.deployedAt : 0], ['Bot live', up ? 'done' : 'wait', up ? o.deployedAt : 0]];
  return `<div class="trk-w"><div class="trk">${st.map(([n, k, ts]) => `<div class="trk-s ${k}"><i>${k === 'done' ? I('tick', 'sm') : k === 'bad' ? I('cross', 'sm') : k === 'now' ? '<b class="trk-sp"></b>' : ''}</i><span>${n}</span><small>${ts ? fmtT(ts) : '&nbsp;'}</small></div>`).join('')}</div><p class="trk-m ${s === 'failed' ? 'bad' : s === 'active' ? 'ok' : ''}">${BDM[s] || ''}</p></div>`;
}
const bdRnHint = () => { const pl = bdPlans(); if (!pl.length) return ''; const lo = Math.min(...pl.map(bdRp)); return lo < Math.min(...pl.map(x => x.price)) ? ' from ' + rs(lo) : ''; };
function bdOrd(o) {
  const s = o.status, prog = s === 'queued' || s === 'deploying', [k, lb] = BDS[s] || ['mu', s];
  const tag = s === 'active' ? `<span class="cx-tag act"><i class="dot"></i>Live<em data-exp="${o.expiresAt}">${cxLeft(o)}</em></span>` : `<span class="cx-tag ${k}">${prog ? '<i class="bd-sp"></i>' : ''}${s === 'failed' && !o.refunded ? 'Failed' : lb}</span>`;
  const rows = [['Client', o.name], ['Bot', '@' + o.bot], ['Admin ID', o.adminId], ...(o.uidCode ? [['Client ID', o.uidCode]] : [])];
  const act = s === 'active' ? `<div class="bd-acts"><button class="btn-gradient" onclick="tg.openTelegramLink('https://t.me/${esc(o.bot)}?start=admin')">${I('bot', 'sm')}Open Bot</button><button class="btn-outline" onclick="bdRenewOrd('${o.id}')">${I('refresh', 'sm')}Renew${bdRnHint()}</button></div>`
    : s === 'expired' ? `<div class="bd-acts"><button class="btn-gradient" onclick="bdRenewOrd('${o.id}')">${I('refresh', 'sm')}Renew${bdRnHint()}</button></div>`
    : s === 'failed' ? `<div class="bd-acts"><button class="btn-gradient" onclick="bdRenewOrd('${o.id}')">${I('refresh', 'sm')}Try again</button></div>` : '';
  return `<div class="user-order-card cx-oc bd-oc ${s === 'active' || prog ? '' : 'ex'}"><div class="cx-oh"><div class="cx-logo sm">${I('bot')}</div><div class="info"><div class="info-header"><div><h4>@${esc(o.bot)}</h4><div class="ono" onclick="copyTxt('B${o.no}')">Order #B${o.no}${I('copy', 'sm')}</div><div class="sub-text">Welcome Message Bot &bull; ${esc(o.plan)}</div></div></div></div></div>
  <div class="cx-tags">${tag}</div>
  <div class="cx-rows">${rows.map(([l, v]) => `<div class="cx-cr"><span>${l}</span><code>${esc(v)}</code><button class="cx-cp" aria-label="Copy ${l}" data-v="${esc(v)}" onclick="copyTxt(this.dataset.v)">${I('copy', 'sm')}</button></div>`).join('')}</div>
  ${bdTrk(o)}${act}
  <div class="order-meta"><span class="price">${rs(o.price)}${o.discount ? `<s class="cpn-old">${rs(o.price + o.discount)}</s>` : ''}</span><span class="date">${fmtD(o.createdAt)}${o.expiresAt ? ' &rarr; ' + fmtD(o.expiresAt) : ''}</span></div>${o.coupon ? `<div class="cpn-tag">${I('tag', 'sm')}Coupon ${esc(o.coupon)} &bull; saved ${rs(o.discount)}</div>` : ''}</div>`;
}

/* ---------- Orders: FAKE WEBSITE + template (APK) orders ---------- */
/* ---------- Order tracking timeline: Placed -> In Progress -> Completed (ya Rejected -> Refunded). Time admin ke status badalne par track/ me likha jata hai ---------- */
const TRK_MSG = { pending: 'We have received your order. Our team will start working on it shortly.', 'in-progress': 'Our team is building your APK right now.', complete: 'Your APK is ready. Tap Download below.', rejected: 'This order could not be completed.' };
function trackH(o) {
  const s = o.status || 'pending', t = o.track || {}, done = s === 'complete', rej = s === 'rejected', rt = t.rejected || o.statusAt || 0;
  const st = rej ? [['Order Placed', 'done', o.timestamp], ['Rejected', 'bad', rt], [o.refunded ? 'Refunded' : 'Refund', o.refunded ? 'done' : 'now', o.refunded ? rt : 0]]
    : [['Order Placed', 'done', o.timestamp], ['In Progress', s === 'pending' ? 'wait' : s === 'in-progress' ? 'now' : 'done', s === 'pending' ? 0 : t.progress || 0], ['Completed', done ? 'done' : 'wait', done ? t.complete || o.statusAt || 0 : 0]];
  const msg = rej ? (o.refunded ? `${rs(o.paymentAmount)} was refunded to your wallet.` : 'Your refund is being processed.') : TRK_MSG[s] || '';
  return `<div class="trk-w"><div class="trk">${st.map(([n, k, ts]) => `<div class="trk-s ${k}"><i>${k === 'done' ? I('tick', 'sm') : k === 'bad' ? I('cross', 'sm') : k === 'now' ? '<b class="trk-sp"></b>' : ''}</i><span>${n}</span><small>${ts ? fmtT(ts) : '&nbsp;'}</small></div>`).join('')}</div><p class="trk-m ${rej ? 'bad' : done ? 'ok' : ''}">${msg}</p></div>`;
}
const apkCard = (o, oi) => { const s = o.status || 'pending'; return `<div class="user-order-card trk-card"><img class="order-img" src="${o.appIconUrl || ''}"><div class="info"><div class="info-header"><div><h4>${esc(o.appName)}</h4>${o.orderNo ? `<div class="ono" onclick="copyTxt('${o.orderNo}')">Order #${o.orderNo}${I('copy', 'sm')}</div>` : ''}<div class="sub-text">${esc(o.designName)} • ${MODEN[o.buildMode] || o.buildMode}</div></div><span class="status-badge ${s}">${s}</span></div>
  <div class="order-meta"><span class="price">${rs(o.paymentAmount)}${o.discount ? `<s class="cpn-old">${rs(o.listPrice)}</s>` : ''}</span><span class="date">${fmtD(o.timestamp)}</span></div>${o.couponCode ? `<div class="cpn-tag">${I('tag', 'sm')}Coupon ${esc(o.couponCode)} &bull; saved ${rs(o.discount)}</div>` : ''}
  ${(s === 'complete' && (o.orderNo || o.apkUrl)) ? `<button class="btn-gradient dl-btn" onclick="getApk(${oi})">${I('download', 'sm')}Download</button>` : ''}</div>${trackH(o)}</div>`; };
const cxOrd = o => {
  const act = o.status === 'active', p = cxFind(o.pid);
  return `<div class="user-order-card cx-oc ${act ? '' : 'ex'}"><div class="cx-oh"><div class="cx-logo sm">${cxLogo(p)}</div><div class="info"><div class="info-header"><div><h4>${esc(o.title)}</h4><div class="ono" onclick="copyTxt('C${o.no}')">Order #C${o.no}${I('copy', 'sm')}</div><div class="sub-text">FAKE WEBSITE &bull; ${esc(o.plan)}</div></div></div></div></div>
  <div class="cx-tags">${act ? `<span class="cx-tag act"><i class="dot"></i>Active<em data-exp="${o.expiresAt}">${cxLeft(o)}</em></span>` : '<span class="cx-tag ex">Expired</span>'}</div>
  ${act ? `<div class="cx-rows">${cxRowsH(o)}</div>` : '<p class="cx-exn">This plan has ended. The login details are no longer valid.</p>'}
  ${o.coupon ? `<div class="cpn-tag">${I('tag', 'sm')}Coupon ${esc(o.coupon)} &bull; saved ${rs(o.discount)}</div>` : ''}
  <div class="order-meta"><span class="price">${rs(o.price)}${o.discount ? `<s class="cpn-old">${rs(o.listPrice)}</s>` : ''}</span><span class="date">${fmtD(o.createdAt)} &rarr; ${fmtD(o.expiresAt)}</span></div></div>`;
};
function ordersView() {
  const A = orders.map((o, oi) => ({ h: apkCard(o, oi), at: o.timestamp || 0 })), C = (cso || []).map(o => ({ h: cxOrd(o), at: o.createdAt || 0 })), B = (bso || []).map(o => ({ h: bdOrd(o), at: o.createdAt || 0 }));
  const showB = B.length > 0 || ordF === 'bot' || bdShow();
  if (ordF === 'bot' && !showB) ordF = 'all';
  const list = ordF === 'csite' ? C : ordF === 'apk' ? A : ordF === 'bot' ? B : [...C, ...A, ...B].sort((a, b) => b.at - a.at);
  const chips = `<div class="filter-tabs sm">${[['all', 'All', A.length + C.length + B.length], ['csite', 'FAKE WEBSITE', C.length], ['apk', 'Templates', A.length], ...(showB ? [['bot', 'Bots', B.length]] : [])].map(([k, l, n]) => `<button class="${ordF === k ? 'active' : ''}" onclick="ordF='${k}';render()">${l}<i class="cx-n">${n}</i></button>`).join('')}</div>`;
  const bwait = (ordF === 'all' || ordF === 'bot') && showB ? (bso === null ? `<div class="cx-load">${bsoErr ? `Could not load Bot Deploy orders. <a onclick="loadBso(true)">Retry</a>` : 'Loading Bot Deploy orders...'}</div>` : bsoErr ? `<div class="cx-load">Could not refresh Bot Deploy orders. <a onclick="loadBso(true)">Retry</a></div>` : '') : '';
  const wait = (ordF !== 'apk' && ordF !== 'bot' && cso === null) ? `<div class="cx-load">${csoErr ? `Could not load FAKE WEBSITE orders. <a onclick="loadCso(true)">Retry</a>` : 'Loading FAKE WEBSITE orders...'}</div>` : (ordF !== 'apk' && ordF !== 'bot' && csoErr ? `<div class="cx-load">Could not refresh FAKE WEBSITE orders. <a onclick="loadCso(true)">Retry</a></div>` : '');
  const emp = `<div class="empty-state">${I('bag')}<h4>No Orders Found</h4><p>You haven't placed any orders yet.</p><div class="cx-ebt"><button class="btn-gradient" onclick="nav('csite')">Browse FAKE WEBSITE</button><button class="btn-outline" onclick="goTpl()">Browse Templates</button>${bdShow() ? `<button class="btn-outline" onclick="bdOpen()">Deploy Welcome Message Bot</button>` : ''}</div></div>`;
  return `<div class="page-header-custom"><h2>${I('bag')}My Orders</h2></div><div class="live-indicator"><span class="pulse"></span> Live Updates Active</div>${chips}${wait}${bwait}` + (list.length ? list.map(x => x.h).join('') : (wait || bwait ? '' : emp));
}

/* ---------- Boot ---------- */
let rqT = 0;   // listener se aane wale re-render ek saath jod do (boot par 10+ baar poora page banta tha)
function rq() { clearTimeout(rqT); rqT = setTimeout(() => { if (modalOpen()) return; const a = document.activeElement; if (a && (a.id === 'gfc' || a.id === 'cxc' || /^bd[ntai]$/.test(a.id))) return; render(); }, 40); }   // code likhte waqt page dobara nahi banta
shell(); nav(/[?&]go=csite(?:&|$)/.test(location.search) ? 'csite' : /[?&]go=orders(?:&|$)/.test(location.search) ? 'orders' : 'home');   // Telegram notification button: seedha FAKE WEBSITE tab
if (/[?&]go=tpl(?:&|$)/.test(location.search)) setTimeout(goTpl, 700);   // naye template ki notification: Available Templates par le jao
// Intro animation poori dikhe: kam se kam ~1.85s (pehle paint se). Automation (webdriver) aur reduced-motion par turant hatta do.
const hide = () => { const s = $('#splash'); if (!s) return; let w = 0; try { if (!navigator.webdriver && !matchMedia('(prefers-reduced-motion: reduce)').matches) w = Math.max(0, 1850 - (Date.now() - (window.__t0 || 0))); } catch (e) { } setTimeout(() => { s.classList.add('hide'); setTimeout(() => s.remove(), 600); }, Math.min(w, 1850)); };
let myJoined = 0;   // user ke account banne ka time: admin "Delete user data" kare to naya account maana jaye (referral flags reset)
async function initUser() {
  const ref = db.ref('users/' + uid), s = (await ref.once('value')).val() || {};
  const p = { id: uid, name: U.first_name, username: U.username || '', lastSeen: Date.now() };
  if (!s.joined) p.joined = Date.now();
  myJoined = s.joined || p.joined;
  if (!s.displayId) { const r = await db.ref('meta/lastUserId').transaction(n => (n || 999) + 1); p.displayId = r.snapshot.val(); }  // 1000 se shuru
  await ref.update(p);
}
auth.signInAnonymously().then(async () => {
  hide();
  db.ref('settings').on('value', s => { const was = refCfg().on, mk = mtSig(); S = s.val() || {}; maintSync(); if (mk !== mtSig()) { mtWatch(); if (!modalOpen() && (tab === 'home' || tab === 'csite' || tab === 'csplan')) rq(); else if (tab === 'bdeploy') bdPaint(); } if (was !== refCfg().on) { drawNav(); render(); return; } if (!modalOpen() && (tab === 'wallet' || tab === 'refer' || tab === 'profile')) render(); });
  db.ref('aiCfg').on('value', s => { AIC = s.val() || {}; if (tab === 'care' && !modalOpen() && !isIn({ target: document.activeElement })) render(); else if (tab === 'careai' && !aiBusy) { const f = $('#aii'), v = f ? f.value : ''; render(); const g = $('#aii'); if (g && v) g.value = v; } });
  db.ref('notices').on('value', s => { notices = s.val() || {}; if (!modalOpen() && tab === 'home') { rq(); } });
  db.ref('stats/designOrders').on('value', s => { pop = s.val() || {}; if (!modalOpen() && tab === 'home') rq(); });
  // Fast catalog: designCards (chhote thumbnails). Na ho (admin ne abhi banaya nahi) to purane tareeke se poora designs padho.
  const dList = v => Object.entries(v || {}).filter(([, d]) => d && typeof d === 'object').map(([id, d]) => ({ id, ...d })).filter(d => d.active !== false);
  let legacy = false;
  db.ref('designCards').on('value', s => {
    const v = s.val();
    if (v && Object.keys(v).length) { cardsOn = true; dReady = true; designs = dList(v); if (!modalOpen() && tab === 'home') rq(); mtWatch(); goPTry(); }
    else if (!legacy) { legacy = true; cardsOn = false; db.ref('designs').on('value', t => { if (cardsOn) return; dReady = true; designs = dList(t.val()); if (!modalOpen() && tab === 'home') rq(); mtWatch(); goPTry(); }); }
  });
  db.ref('csProducts').on('value', s => { cxProds = Object.entries(s.val() || {}).filter(([, p]) => p && typeof p === 'object').map(([id, p]) => ({ id, ...p })); if (!modalOpen() && (tab === 'csite' || tab === 'csplan' || tab === 'orders')) rq(); cxReady = true; mtWatch(); goPTry(); });
  db.ref('botCfg').on('value', s => { bdCfgV = s.val() || {}; bdSync(); });
  db.ref('botPlans').on('value', s => { bdPlansV = Object.entries(s.val() || {}).filter(([, x]) => x && typeof x === 'object').map(([k, x]) => ({ k, name: String(x.name || ''), days: +x.days || 0, price: +x.price || 0, rprice: +x.rprice || 0, orig: +x.orig || 0, active: x.active, sort: +x.sort || 0 })); bdSync(); });
  db.ref('botPoster').on('value', s => { const was = bdPosRaw; bdPosApply(s.val()); if (was !== bdPosRaw) bdSync(); });
  if (!uid) return toast('Please open from Telegram bot', 'err');
  const pu = initUser().catch(() => { });   // 2-3 network round-trip; neeche ke listeners ke saath ek hi waqt chalte hain (pehle ek ke baad ek)
  db.ref('users/' + uid).on('value', s => { me = s.val() || {}; coins = me.coins || 0; document.querySelectorAll('.cb').forEach(e => e.textContent = coins); if (!modalOpen() && (tab === 'profile' || tab === 'refer')) rq(); else if (tab === 'bdeploy') bdPaint(); });
  db.ref('orders').orderByChild('userId').equalTo(uid).on('value', s => { orders = Object.values(s.val() || {}).sort((a, b) => b.timestamp - a.timestamp); if (!modalOpen() && tab !== 'wallet' && !CARE.includes(tab)) rq(); });
  db.ref('deposits').orderByChild('userId').equalTo(uid).on('value', s => { deps = Object.values(s.val() || {}).sort((a, b) => b.timestamp - a.timestamp); if ($('#osum')) cpUi(); else if (!modalOpen() && (tab === 'wallet' && wsec === 'dep' || tab === 'profile' || tab === 'dephist' || tab === 'csplan')) rq(); });
  db.ref('referrals').orderByChild('by').equalTo(uid).on('value', s => { refs = Object.values(s.val() || {}).sort((a, b) => (b.at || 0) - (a.at || 0)); if (!modalOpen() && (tab === 'refer' || tab === 'profile')) rq(); });
  db.ref('referrals/' + uid).on('value', s => { myRef = s.val(); if (!modalOpen() && tab === 'refer') rq(); });
  db.ref('transactions').orderByChild('userId').equalTo(uid).on('value', s => { txs = Object.values(s.val() || {}).sort((a, b) => b.timestamp - a.timestamp); if (!modalOpen() && (tab === 'wallet' && wsec === 'tx' || tab === 'profile' || tab === 'txhist')) rq(); });
  await pu; bindRef(); loadCso(true); loadBso(true);
}).catch(() => { hide(); toast('Connection failed', 'err'); });
