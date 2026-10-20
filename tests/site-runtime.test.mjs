import test from 'node:test';
import assert from 'node:assert/strict';
import {esimEndpoint} from '../src/site-runtime.mjs';
import {holderViewURL} from '../src/holder-insights.mjs';

test('custom and preview domains query their own backend without enabling an API on static hosts',()=>{
  assert.equal(esimEndpoint({},'https://esimonchain.imstark.site/esim.html'),'https://esimonchain.imstark.site/api/esim');
  assert.equal(esimEndpoint({},'https://pancake-depth-viewer-preview.vercel.app/esim.html'),'https://pancake-depth-viewer-preview.vercel.app/api/esim');
  assert.equal(esimEndpoint({},'https://starkweng.github.io/pancake-depth-viewer/esim.html'),null);
  assert.equal(esimEndpoint({},'http://127.0.0.1:4316/esim.html'),null);
  assert.equal(esimEndpoint({apiOrigin:'https://pancake-depth-viewer.vercel.app'},'https://starkweng.github.io/pancake-depth-viewer/esim.html'),'https://pancake-depth-viewer.vercel.app/api/esim');
});

test('report drill-through stays on the current deployment and preserves holder filters',()=>{
  for(const base of ['https://esimonchain.imstark.site/esim.html','https://preview.vercel.app/esim.html','https://starkweng.github.io/pancake-depth-viewer/esim.html']){
    const target=new URL(holderViewURL({tags:['received','own'],search:'0x123',zero:true,excludeOwn:true},base));
    assert.equal(target.origin,new URL(base).origin);
    assert.equal(target.pathname,new URL('./esim-holders.html',base).pathname);
    assert.equal(target.searchParams.get('tags'),'received,own');
    assert.equal(target.searchParams.get('search'),'0x123');
    assert.equal(target.searchParams.get('zero'),'1');
    assert.equal(target.searchParams.get('scope'),'external');
  }
});
