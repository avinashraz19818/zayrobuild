'use strict';

/**
 * Loading screen HTML resolve karo — build ya runtime kabhi is wajah se fail na ho.
 *
 *   Admin setting wali file → templates/ me koi bhi loading file → built-in default
 *
 * Pehle seed me 'loading.html' set tha jo templates/ me exist nahi karta tha, isliye
 * har build "Loading HTML not found" par fail ho jaata tha. Ab missing file par
 * build rukti nahi — available file (ya built-in) use hoti hai.
 */

const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

/** templates/ me maujood loading-jaise HTML files (redload.html sabse pehle). */
function loadingCandidates() {
  try {
    return fs.readdirSync(TEMPLATES_DIR)
      .filter((f) => /\.html?$/i.test(f) && /load/i.test(f))
      .sort((a, b) => (a === 'redload.html' ? -1 : b === 'redload.html' ? 1 : a.localeCompare(b)));
  } catch (_) {
    return [];
  }
}

/** Built-in loading screen (jab koi file hi na mile). */
function defaultLoadingHtml() {
  return `<!doctype html><html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Loading…</title>
<style>
  *{box-sizing:border-box} html,body{margin:0;height:100%}
  body{display:grid;place-items:center;background:radial-gradient(900px 520px at 20% 0%, rgba(103,92,236,.32), transparent 60%), linear-gradient(180deg,#0d1024,#090b1c);
       color:#f2f1fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
  .wrap{text-align:center;padding:24px}
  .mark{width:84px;height:84px;margin:0 auto 14px;border-radius:26px;display:grid;place-items:center;font-size:34px;font-weight:800;
        background:linear-gradient(140deg,#8b7cff,#4f46e5);box-shadow:0 20px 44px -18px rgba(103,92,236,.75)}
  h1{font-size:19px;letter-spacing:.08em;text-transform:uppercase;margin:0 0 4px}
  p{font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:#6f769b;margin:0 0 20px}
  .bar{width:220px;height:6px;margin:0 auto;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden}
  .bar i{display:block;height:100%;width:40%;border-radius:99px;background:linear-gradient(90deg,#4f46e5,#8b7cff,#38bdf8);animation:slide 1.1s ease-in-out infinite}
  @keyframes slide{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}
</style></head>
<body><div class="wrap">
  <div class="mark">Z</div>
  <h1>Loading</h1>
  <p>Please wait</p>
  <div class="bar"><i></i></div>
</div></body></html>`;
}

/**
 * @param {string} configuredName — setting `loading_html_file` ki value
 * @returns {{ html: string, file: string, fellBack: boolean }}
 */
function resolveLoadingHtml(configuredName = '') {
  const tried = [];
  if (configuredName) tried.push(configuredName);
  for (const name of loadingCandidates()) {
    if (!tried.includes(name)) tried.push(name);
  }

  for (const name of tried) {
    try {
      const p = path.join(TEMPLATES_DIR, name);
      if (fs.existsSync(p)) {
        return { html: fs.readFileSync(p, 'utf8'), file: name, fellBack: name !== configuredName };
      }
    } catch (_) { /* next candidate */ }
  }

  return { html: defaultLoadingHtml(), file: 'built-in default', fellBack: true };
}

module.exports = { resolveLoadingHtml, loadingCandidates, defaultLoadingHtml, TEMPLATES_DIR };
