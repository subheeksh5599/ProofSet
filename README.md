# ProofSet — Verifiable AI Dataset Marketplace

**Buy AI training data. Verify it first. No "trust me bro."**

Sellers upload datasets to **Walrus** decentralized storage. A Merkle root is registered on **Sui** via **Tatum RPC**. Buyers request random cryptographic samples — each blob comes with a Merkle proof verified against the on-chain root. SUI payment releases only after verification passes.

Built for the **Tatum x Walrus Hackathon 2026**.

---

## Demo

```
bun install
bun run dev
```

1. Connect Sui wallet (testnet)
2. Create a dataset — upload files → Walrus blobs → Merkle root
3. Browse datasets → request cryptographic sample
4. Verify Merkle proofs → confirm purchase in wallet

---

## Architecture

```
User uploads files
  → SHA-256 Merkle tree computed over all blobs
  → Blobs stored on Walrus
  → Merkle root + metadata registered on Sui

Buyer requests sample
  → Random blob indices selected (crypto.getRandomValues)
  → Blobs fetched from Walrus
  → SHA-256 hash compared against stored commitment
  → Merkle root verified from stored hashes

Buyer confirms
  → SUI transferred via wallet (signTransaction)
  → Dataset marked as purchased
```

---

## Tech Stack

| Layer | Technology | Endpoint |
|---|---|---|
| **Storage** | Walrus | `publisher.walrus-testnet.walrus.space` |
| **Blockchain** | Sui Testnet | `fullnode.testnet.sui.io` |
| **Wallet** | Sui dApp Kit v1 | `@mysten/dapp-kit` |
| **RPC** | Tatum | Enterprise Sui nodes |
| **Crypto** | SHA-256, Merkle Trees | Web Crypto API |
| **Frontend** | Next.js 16, Tailwind, Framer Motion | — |

---

## Pages

| Page | What it does |
|---|---|
| **Landing** | Hero + how it works + tech pillars |
| **Dashboard** | My datasets + sample requests |
| **Create** | Upload files → store on Walrus → compute Merkle root → register |
| **Browse** | All datasets with blob count, sample count, price in SUI |
| **Sample Verify** | Random crypto sample → Merkle proof → confirm/dispute |
| **Payment** | Real on-chain SUI transfer via Sui wallet |

---

## No .env Required

All endpoints use public testnet defaults. Optional overrides:

```env
NEXT_PUBLIC_WALRUS_PUBLISHER=https://publisher.walrus-testnet.walrus.space
NEXT_PUBLIC_WALRUS_AGGREGATOR=https://aggregator.walrus-testnet.walrus.space
```

---
---

