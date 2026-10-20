// Static GitHub Pages has no Functions; Vercel and the custom domain do.
export function esimEndpoint(config={},pageURL=globalThis.location?.href){
  if(config.apiOrigin)return new URL('/api/esim',config.apiOrigin).href;
  if(!pageURL)return null;
  const page=new URL(pageURL);
  return page.hostname==='esimonchain.imstark.site'||page.hostname.endsWith('.vercel.app')
    ?new URL('/api/esim',page).href:null;
}
