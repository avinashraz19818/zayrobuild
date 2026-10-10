'use strict';
const fs = require('node:fs');
const { createMp3Library, LEGACY_ROOT } = require('./mp3-library');

// Admin-only MP3 library routes.
//   GET    /api/admin/mp3            → { files: [...] }
//   GET    /api/admin/mp3/:name      → audio/mpeg (name "200" ya "deposit" ya "200.mp3")
//   POST   /api/admin/mp3            → multipart: file (required), name (optional; default = file ka naam). Same naam par replace.
//   DELETE /api/admin/mp3/:name      → { files: [...] }
function registerMp3Library(app, requireAdmin, { service = createMp3Library({ legacyRoot: LEGACY_ROOT }), upload } = {}) {
  const headers = (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); };
  const fail = (res, e) => {
    if (e.code === 'INVALID') return res.status(400).json({ error: e.message, code: e.code });
    if (e.code === 'NOT_FOUND') return res.status(404).json({ error: e.message, code: e.code });
    return res.status(500).json({ error: 'MP3 save/read nahi hua. Server permissions check karein.', code: 'STORAGE' });
  };
  const uploadOne = (req, res, next) => {
    if (!upload) return next();
    upload.single('file')(req, res, (err) => {
      if (err) return res.status(400).json({ error: 'MP3 file 8 MB se chhoti honi chahiye.', code: 'INVALID' });
      next();
    });
  };

  app.get('/api/admin/mp3', requireAdmin, headers, (_req, res) => {
    try { res.json({ files: service.list() }); } catch (e) { fail(res, e); }
  });
  app.get('/api/admin/mp3/:name', requireAdmin, headers, (req, res) => {
    try {
      const bytes = service.read(req.params.name);
      res.set('Content-Type', 'audio/mpeg');
      res.send(bytes);
    } catch (e) { fail(res, e); }
  });
  app.post('/api/admin/mp3', requireAdmin, headers, uploadOne, (req, res) => {
    const temp = req.file?.path;
    try {
      if (!req.file) return res.status(400).json({ error: 'MP3 file chuniye.', code: 'INVALID' });
      const given = String(req.body?.name ?? '').trim();
      const fallback = String(req.file.originalname || '').replace(/\.mp3$/i, '');
      const bytes = fs.readFileSync(temp);
      res.json({ files: service.save(given || fallback, bytes) });
    } catch (e) { fail(res, e); }
    finally { if (temp) { try { fs.unlinkSync(temp); } catch {} } }
  });
  app.delete('/api/admin/mp3/:name', requireAdmin, headers, (req, res) => {
    try { res.json({ files: service.remove(req.params.name) }); } catch (e) { fail(res, e); }
  });
  return service;
}

module.exports = { registerMp3Library };
