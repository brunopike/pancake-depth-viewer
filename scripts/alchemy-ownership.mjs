import { OWNERS, CL_POSITION_MANAGER } from '../src/ownership.mjs';

// Server-only recovery when no recent canonical NFT checkpoint is available.
// The normal path reads bounded Transfer logs and current contract state instead.
export async function discoverOwnedInfinity(key, fetcher = fetch) {
  try {
    const groups = await Promise.all(OWNERS.map(async owner => {
      const nfts = [], seen = new Set(); let pageKey;
      for (let page = 0; page < 20; page++) {
        const url = new URL(`https://bnb-mainnet.g.alchemy.com/nft/v3/${encodeURIComponent(key)}/getNFTsForOwner`);
        url.searchParams.set('owner', owner); url.searchParams.set('contractAddresses[]', CL_POSITION_MANAGER);
        url.searchParams.set('withMetadata', 'false'); url.searchParams.set('pageSize', '100');
        if (pageKey) url.searchParams.set('pageKey', pageKey);
        const response = await fetcher(url, { signal: AbortSignal.timeout(20000) });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!Array.isArray(data.ownedNfts)) throw new Error();
        for (const nft of data.ownedNfts) {
          if ((nft.contract?.address || nft.contractAddress)?.toLowerCase() !== CL_POSITION_MANAGER || nft.balance != null && BigInt(nft.balance) !== 1n) throw new Error();
          const tokenId = String(BigInt(nft.tokenId));
          if (tokenId === '0' || seen.has(tokenId)) throw new Error();
          seen.add(tokenId); nfts.push({ manager: CL_POSITION_MANAGER, tokenId, owner });
        }
        if (!data.pageKey) {
          if (data.totalCount != null && Number(data.totalCount) !== nfts.length) throw new Error();
          return nfts;
        }
        if (pageKey === data.pageKey) throw new Error();
        pageKey = data.pageKey;
      }
      throw new Error();
    }));
    return groups.flat();
  } catch { throw new Error('Alchemy LP discovery unavailable'); }
}
