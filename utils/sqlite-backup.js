'use strict';
const fs=require('node:fs'),crypto=require('node:crypto');
// Online backup includes committed WAL data. Publish only complete files, so
// concurrent backup retention cannot delete another operation's partial snapshot.
async function backupDatabase(db,destination){
 if(fs.existsSync(destination))throw Object.assign(new Error('EEXIST: backup already exists'),{code:'EEXIST'});
 const temporary=`${destination}.${crypto.randomBytes(8).toString('hex')}.tmp`;
 const fd=fs.openSync(temporary,'wx',0o600);fs.closeSync(fd);
 try{
  await db.backup(temporary);
  fs.linkSync(temporary,destination); // atomic and refuses an existing destination
  return destination;
 }finally{fs.unlinkSync(temporary);}
}
module.exports={backupDatabase};
