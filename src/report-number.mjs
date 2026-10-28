// Round with integer arithmetic: never turn token wei into a floating point value.
export function reportAmount(wei,scale=1,decimals=2){
 if(wei==null)return '待核验';
 const n=BigInt(wei),d=BigInt(scale)*10n**18n,f=10n**BigInt(decimals);
 const rounded=((n<0n?-n:n)*f+d/2n)/d;
 return `${n<0n?'−':''}${(rounded/f).toLocaleString('en-US')}${decimals?'.'+String(rounded%f).padStart(decimals,'0'):''}`;
}
