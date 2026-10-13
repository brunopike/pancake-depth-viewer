export const HOLDER_SORT_KEYS=['address','balance','value','share','change24h','dayBuyCount','daySellCount','dayBuyAmount','daySellAmount','historyBuyCount','historySellCount','historyBuyAmount','historySellAmount'];

export function rankHolderRows(rows,key='balance',direction='desc'){
 if(!HOLDER_SORT_KEYS.includes(key))key='balance';
 const sign=direction==='asc'?1:-1;
 const value=row=>{
  if(['balance','value','share'].includes(key))return row.balance;
  if(key.startsWith('day')||key.startsWith('history')){
   const scope=key.startsWith('day')?'day':'history',field=key.slice(scope.length);
   return row[scope]?.[field[0].toLowerCase()+field.slice(1)]??null;
  }
  return row[key]??null;
 };
 return rows.map(row=>({row,value:value(row)})).sort((a,b)=>{
  if(a.value==null||b.value==null)return a.value==null&&b.value==null?a.row.address.localeCompare(b.row.address):a.value==null?1:-1;
  const x=key==='address'?a.value:BigInt(a.value),y=key==='address'?b.value:BigInt(b.value);
  return x===y?a.row.address.localeCompare(b.row.address):(x<y?-1:1)*sign;
 }).map(item=>item.row);
}
