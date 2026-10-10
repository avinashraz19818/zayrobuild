'use strict';
const crypto = require('node:crypto');
function headers(req, res, next) {
  res.set('Referrer-Policy', 'no-referrer');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Content-Security-Policy', "base-uri 'self'; object-src 'none'");
  // Observe the full policy before enforcement: Telegram, external product media and
  // customer preview content need a real-device compatibility review.
  res.set('Content-Security-Policy-Report-Only', "default-src 'self'; script-src 'self' https://telegram.org 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' blob: https:; connect-src 'self' https:; frame-src https:; object-src 'none'; base-uri 'self'");
  next();
}
function configuredOrigin(value) {
  try {
    const url=new URL(String(value||'').trim());
    return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password?url.origin:null;
  } catch { return null; }
}
function sameOriginMutation(req, res, next, publicUrl = undefined) {
  if (!req.path.toLowerCase().startsWith('/api/') || ['GET','HEAD','OPTIONS'].includes(req.method)) return next();
  // Installed APKs intentionally use a cross-origin, non-cookie runtime protocol.
  if (req.path.toLowerCase().startsWith('/api/rtdb/')) return next();
  const origin = req.get('Origin');
  let rejected = req.get('Sec-Fetch-Site') === 'cross-site';
  if (origin) {
    try {
      const url = new URL(origin);
      // TLS commonly terminates at nginx. Node may see HTTP and an internal
      // Host; compare against SERVER-configured public origin, never forwarded
      // headers supplied by an arbitrary client. Fall back for local/dev setups.
      const expected=configuredOrigin(publicUrl)||`${req.protocol}://${req.get('Host')}`;
      rejected ||= !['http:','https:'].includes(url.protocol) || url.origin !== expected || !!url.username || !!url.password;
    } catch { rejected = true; }
  }
  if (rejected) return res.status(403).json({ error: 'Cross-origin request denied', code: 'ORIGIN_DENIED' });
  // Non-browser integrations may omit Origin. Authentication/ownership still applies.
  return next();
}
function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const requestId = crypto.randomBytes(8).toString('hex');
  const tooLarge = error.type === 'entity.too.large' || error.code === 'LIMIT_FILE_SIZE';
  const invalid = error.type === 'entity.parse.failed' || error.name === 'MulterError';
  const status = tooLarge ? 413 : invalid ? 400 : 500;
  if (status === 500) {
    const kind=['Error','TypeError','SqliteError','SyntaxError'].includes(error.name)?error.name:'Error';
    const code=['SQLITE_BUSY','SQLITE_CONSTRAINT','SQLITE_CONSTRAINT_UNIQUE','ENOSPC','EACCES','ECONNRESET','ETIMEDOUT'].includes(error.code)?error.code:'UNEXPECTED';
    console.error(`[http-error] request=${requestId} method=${req.method} kind=${kind} code=${code} status=500`);
  }
  // Never echo arbitrary exception messages, SQL, filesystem paths or provider URLs.
  return res.status(status).set('Cache-Control','no-store').json({error: tooLarge ? 'Upload or request is too large.' : invalid ? 'Invalid request body or upload.' : 'Request could not be completed. Please try again or contact support.', request_id: requestId});
}
module.exports = { headers, sameOriginMutation, errorHandler };
