# ProofSet — Verifiable AI Dataset Marketplace

Buy AI training data. Verify it first. No trust.

Sellers upload datasets to **Walrus** decentralized storage. A Merkle root is registered on **Sui**. Buyers request random cryptographic samples — each blob comes with a Merkle proof verified against the on-chain root. Payment releases only after verification passes.

## Stack

| Layer | Technology |
|---|---|
| Storage | Walrus (testnet) |
| Blockchain | Sui (testnet, chain 1315) |
| RPC | Tatum |
| Frontend | Next.js 16, Tailwind CSS, Framer Motion |
| Wallet | Sui dApp Kit (@mysten/dapp-kit) |

## Run

```bash
bun install
bun run dev
```

## How It Works

1. **Upload** — Dataset files uploaded to Walrus. SHA-256 Merkle root computed.
2. **Register** — Merkle root + metadata stored. On-chain commitment.
3. **Sample** — Buyer requests N random blobs. Merkle proofs verify each one.
4. **Pay** — If proofs match, buyer confirms purchase. SUI transferred to seller.

## No .env Required

All endpoints use public testnet defaults. Optional overrides:

```
NEXT_PUBLIC_WALRUS_PUBLISHER  # default: walrus-testnet
NEXT_PUBLIC_WALRUS_AGGREGATOR # default: walrus-testnet
```
