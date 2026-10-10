'use strict';
function ownsUpload(db,userId,name){
 if(!Number.isSafeInteger(Number(userId))||Number(userId)<1)return false;
 return Boolean(db.prepare('SELECT 1 FROM coin_requests WHERE user_id=? AND screenshot_file=? LIMIT 1').get(userId,name)||db.prepare('SELECT 1 FROM orders WHERE user_id=? AND icon_file=? LIMIT 1').get(userId,name));
}
module.exports={ownsUpload};
