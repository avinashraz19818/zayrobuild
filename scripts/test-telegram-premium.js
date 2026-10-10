#!/usr/bin/env node
'use strict';
// Stable entry point for the current bold-italic / custom-emoji presentation tests.
// No bot token, live Telegram calls or production database is used.
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const result=spawnSync(process.execPath,['--test',path.join(__dirname,'../tests/telegram-presentation.test.js'),path.join(__dirname,'../tests/apk-delivery.test.js'),path.join(__dirname,'../tests/broadcast-bot.test.js')],{stdio:'inherit'});
if(result.error){console.error(result.error.message);process.exit(1);}
process.exit(result.status??1);
