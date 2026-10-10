const {test}=require('node:test'),assert=require('node:assert/strict');
test('panel routing survives Telegram hash replacement, supports accounts and late SDK start param',async()=>{
 const {readDestination}=await import('../frontend/src/lib/navigation.js');
 assert.deepEqual(readDestination({search:'?tab=fakesite&section=accounts',hash:'#tgWebAppData=abc'},null),{tab:'fakesite',section:'accounts'});
 assert.equal(readDestination({search:'?tab=deploy',hash:'#home'},null).tab,'deploy');
 assert.equal(readDestination({search:'',hash:'#wallet'},null).tab,'wallet');
 assert.deepEqual(readDestination({search:'',hash:'#tgWebAppData=abc'},{initDataUnsafe:{start_param:'fakesite_accounts'}}),{tab:'fakesite',section:'accounts'});
 assert.equal(readDestination({search:'?tgWebAppStartParam=deploy',hash:''},null).tab,'deploy');
 assert.equal(readDestination({search:'?tab=https://evil.test',hash:''},null).tab,'home');
});
