import { test } from 'node:test';
import assert from 'node:assert/strict';
import { discoverOwnedInfinity } from '../scripts/alchemy-ownership.mjs';
import { OWNERS, CL_POSITION_MANAGER } from '../src/ownership.mjs';

test('Alchemy discovery paginates both wallets, restricts the manager and retains empty NFTs', async () => {
  const calls = [];
  const fetcher = async url => {
    const parsed = new URL(url); calls.push(parsed);
    const first = parsed.searchParams.get('owner') === OWNERS[0], page = parsed.searchParams.get('pageKey');
    return { ok: true, json: async () => ({ ownedNfts: first ? [{ contract: { address: CL_POSITION_MANAGER }, tokenId: page ? '0x2' : '1', balance: '1' }] : [],
      totalCount: first ? 2 : 0, pageKey: first && !page ? 'next-page' : null }) };
  };
  const data = await discoverOwnedInfinity('TEST_ONLY_PLACEHOLDER', fetcher);
  assert.deepEqual(data.map(n => n.tokenId), ['1', '2']);
  assert.equal(calls.length, 3);
  assert.ok(calls.every(u => u.hostname === 'bnb-mainnet.g.alchemy.com' && u.searchParams.get('contractAddresses[]') === CL_POSITION_MANAGER && u.searchParams.get('withMetadata') === 'false'));
  assert.ok(calls.every(u => !u.searchParams.has('excludeFilters[]')));
});

test('Malformed, repeated or failed private API responses produce only a generic error', async () => {
  for (const fetcher of [async () => { throw new Error('endpoint-with-private-key'); },
    async () => ({ ok: false }),
    async () => ({ ok: true, json: async () => ({ ownedNfts: [], totalCount: 1 }) }),
    async () => ({ ok: true, json: async () => ({ ownedNfts: [], pageKey: 'same' }) })]) {
    await assert.rejects(() => discoverOwnedInfinity('TEST_ONLY_PLACEHOLDER', fetcher), e => e.message === 'Alchemy LP discovery unavailable');
  }
});
