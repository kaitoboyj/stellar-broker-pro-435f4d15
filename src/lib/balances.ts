// Client helper to fetch on-chain balances for derived addresses through a
// same-origin backend route, avoiding browser CORS issues with public RPCs.

export interface Balance {
  chain: string;
  amount: number; // native units (BTC, ETH, BNB, MATIC, AVAX, etc.)
  symbol: string;
}

export async function fetchBalance(chain: string, address: string): Promise<Balance> {
  try {
    const params = new URLSearchParams({ chain, address });
    const res = await fetch(`/api/balance?${params.toString()}`);
    if (!res.ok) return { chain, amount: 0, symbol: chain === "BTC_LEGACY" ? "BTC" : chain };
    return res.json();
  } catch {
    return { chain, amount: 0, symbol: chain === "BTC_LEGACY" ? "BTC" : chain };
  }
}