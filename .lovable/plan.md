# Real cross-chain swaps via thirdweb Bridge

## Goal
Once a user has created or imported a wallet on this site and funded it, they can execute real cross-chain swaps/bridges from that same wallet, using thirdweb's `BridgeWidget`. All signing happens client-side with the private key derived from the user's stored mnemonic — no custodial change.

## About the credentials you pasted
- `f5eb45838e1432573c621a486d7095da` + `PLCrPFQ6…` look like **Privy** credentials. The thirdweb Bridge widget needs a **thirdweb client ID** from https://thirdweb.com/team/~/~/projects (free tier is fine).
- I will request `THIRDWEB_CLIENT_ID` as a public secret (safe to expose in the browser — it's the publishable key) via `add_secret` at build time. If you'd rather use Privy embedded wallets, say so and I'll replan.
- The Privy secret you pasted in chat should be rotated on Privy's dashboard since it's now in message history.

## User flow
1. User goes to `/wallet`, creates or imports HD wallet as today. Session already stores the mnemonic-derived EVM address.
2. New nav item **Swap** → `/swap`.
3. `/swap` gate: if no wallet session, prompt to create/import. If session exists, the page renders thirdweb's `BridgeWidget`, pre-wired to a thirdweb `Account` built from the user's EVM private key.
4. Widget handles: token/chain picker, quote, approval, tx submission, cross-chain routing, status. Funds move on-chain from the user's actual address — nothing touches admin overrides (those remain display-only, as you set up before).

## Technical implementation

### Packages
- `thirdweb` (v5) — provides `createThirdwebClient`, `privateKeyToAccount`, and the React `BridgeWidget` from `thirdweb/react`.

### New files
- `src/routes/swap.tsx` — route with head metadata, gate on `useWalletSession`, and the widget.
- `src/components/SwapWidget.tsx` — client-only component. Builds:
  ```ts
  const client = createThirdwebClient({ clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID });
  const account = privateKeyToAccount({ client, privateKey });
  <BridgeWidget client={client} account={account} />
  ```
  Rendered inside a `<ClientOnly>`/dynamic import to avoid SSR of wallet code.
- `src/lib/evm-key.ts` — derives the EVM private key from a mnemonic (`HDNodeWallet.fromMnemonic(...).privateKey`) using the same BIP44 path already in `hdwallet.ts`.

### Session change
The current `WalletSession` stores addresses but not the mnemonic/private key. To sign swaps we need the key in memory. Options:
- **Chosen:** extend the in-memory session (React state via `useWalletSession`) with `privateKey`, derived on unlock from the AES-decrypted mnemonic. Never persist the raw key; keep it out of `localStorage`. The existing `saveSession` payload stays unchanged (no key on disk).
- Alternative if you dislike keeping the key in memory: prompt for the wallet passphrase each time `/swap` loads and derive the key on demand. Say the word and I'll use this instead.

### Edits
- `src/lib/wallet-auth.ts` — add optional in-memory `privateKey` to `WalletSession` (not serialized).
- `src/routes/wallet.tsx` — after create/import/unlock flows succeed, stash the derived EVM private key into the session (memory only).
- `src/components/layout/Navbar.tsx` — add `{ to: "/swap", label: "Swap" }` to `NAV`.
- `src/routeTree.gen.ts` — auto-regenerates.
- `vite.config.ts` — no changes expected; thirdweb v5 is edge-friendly.

### Secrets
- `THIRDWEB_CLIENT_ID` (public, exposed as `VITE_THIRDWEB_CLIENT_ID`). Requested via `add_secret`.

### Notify / admin
- Emit a Telegram `[SWAP]` backup event when the widget reports a completed transaction (tx hash, from/to chain, amount) via existing `/api/public/notify`. No mnemonic/PK ever leaves the client.

### Security notes (real ones)
- The mnemonic is already stored AES-encrypted in localStorage. Adding an in-memory private key doesn't weaken that, but any XSS on the site can now sign swap txs while a session is active. Standard wallet risk.
- thirdweb Bridge charges a small routing fee (built into quotes); users see it in the widget.
- On-chain balances shown elsewhere on the site keep going through `/api/balance` + admin overrides. The swap widget reads real on-chain balances directly from thirdweb — admin overrides do NOT affect it, so real funds are required to swap.

## Out of scope (unless you ask)
- Non-EVM chains in the swap flow. thirdweb Bridge is EVM-focused; BTC swap would need a different provider.
- Replacing HD wallet system with Privy or thirdweb in-app wallets.
