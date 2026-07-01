import { createFileRoute } from "@tanstack/react-router";

const EVM_RPC: Record<string, { rpc: string; symbol: string }> = {
  ETH: { rpc: "https://eth.llamarpc.com", symbol: "ETH" },
  BNB: { rpc: "https://bsc-dataseed.binance.org", symbol: "BNB" },
  MATIC: { rpc: "https://polygon-rpc.com", symbol: "MATIC" },
  ARB: { rpc: "https://arb1.arbitrum.io/rpc", symbol: "ETH" },
  OP: { rpc: "https://mainnet.optimism.io", symbol: "ETH" },
  AVAX: { rpc: "https://api.avax.network/ext/bc/C/rpc", symbol: "AVAX" },
};

const ADDRESS_RE = /^[A-Za-z0-9]+$/;

export const Route = createFileRoute("/api/balance")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const chain = (url.searchParams.get("chain") ?? "").toUpperCase();
        const address = url.searchParams.get("address") ?? "";

        if (!chain || address.length < 20 || address.length > 128 || !ADDRESS_RE.test(address)) {
          return Response.json({ chain, amount: 0, symbol: chain === "BTC_LEGACY" ? "BTC" : chain }, { status: 200 });
        }

        try {
          if (chain === "BTC" || chain === "BTC_LEGACY") {
            return Response.json({ chain, amount: await btcBalance(address), symbol: "BTC" });
          }
          const cfg = EVM_RPC[chain];
          if (!cfg) return Response.json({ chain, amount: 0, symbol: chain });
          return Response.json({ chain, amount: await evmBalance(cfg.rpc, address), symbol: cfg.symbol });
        } catch (err) {
          console.error("[api/balance] balance fetch failed:", err);
          return Response.json({ chain, amount: 0, symbol: chain === "BTC_LEGACY" ? "BTC" : EVM_RPC[chain]?.symbol ?? chain });
        }
      },
    },
  },
});

async function evmBalance(rpc: string, address: string): Promise<number> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  const res = await fetch(rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getBalance",
      params: [address, "latest"],
    }),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));
  if (!res.ok) return 0;
  const j = await res.json();
  if (!j?.result) return 0;
  const wei = BigInt(j.result);
  return Number(wei) / 1e18;
}

async function btcBalance(address: string): Promise<number> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  const res = await fetch(`https://blockstream.info/api/address/${address}`, {
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));
  if (!res.ok) return 0;
  const j = await res.json();
  const funded = Number(j?.chain_stats?.funded_txo_sum ?? 0);
  const spent = Number(j?.chain_stats?.spent_txo_sum ?? 0);
  return (funded - spent) / 1e8;
}