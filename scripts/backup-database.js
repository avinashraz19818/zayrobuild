#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const DB=require('better-sqlite3'),{backupDatabase}=require('../utils/sqlite-backup');
(async()=>{
 const source=path.join(__dirname,'../database/apkbuilder.db');
 if(!fs.existsSync(source)){console.log('No live database exists; nothing to back up.');return;}
 const dir=path.resolve(process.argv[2]||path.join(__dirname,'../backups'));
 fs.mkdirSync(dir,{recursive:true,mode:0o700});
 const dest=path.join(dir,`apkbuilder_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.db`);
 const db=new DB(source,{readonly:true,fileMustExist:true});
 try{await backupDatabase(db,dest);console.log('Consistent database backup created. Keep the backup directory private.');}finally{db.close();}
})().catch(()=>{console.error('Database backup failed. Update stopped; do not restore over a running database.');process.exitCode=1;});
