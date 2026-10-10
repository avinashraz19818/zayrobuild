'use strict';
const fs=require('node:fs'),path=require('node:path');
// Intentionally public branding only. No caller-selected filename or generic upload access.
function brandLogo(db,uploads,detectMimeType){return (req,res)=>{
 const name=String(db.prepare("SELECT value FROM settings WHERE key='logo_file'").get()?.value||'').trim();
 if(!name||name!==path.basename(name)||name==='.'||name==='..'||/[\\\x00-\x1f]/.test(name))return res.sendStatus(404);
 const file=path.join(uploads,name);
 if(!fs.existsSync(file)||!fs.statSync(file).isFile())return res.sendStatus(404);
 const type=detectMimeType(file);
 if(!['image/png','image/jpeg','image/webp','image/gif','image/svg+xml'].includes(type))return res.sendStatus(404);
 res.set({'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'; script-src 'none'"});
 res.sendFile(file,error=>{if(error&&!res.headersSent)res.sendStatus(404);});
};}
module.exports={brandLogo};
