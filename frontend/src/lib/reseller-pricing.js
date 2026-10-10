export function resellerPercent(user,service){return user?.reseller?.status==='active'?Number(user.reseller[`${service}_percent`]||0):0;}
export function resellerPrice(amount,user,service){return Math.round(Math.round(Number(amount||0)*100)*(100-resellerPercent(user,service))/100)/100;}
