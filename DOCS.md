# ProofSet — Technical Documentation

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      BROWSER (Client)                    │
│  ┌─────────┐  ┌──────────┐  ┌────────────────────────┐ │
│  │ Upload  │  │  Merkle  │  │  Sample Verify          │ │
│  │ Files   │→ │  Tree    │  │  Fetch → Hash → Proof   │ │
│  └────┬────┘  └────┬─────┘  └──────────┬─────────────┘ │
│       │            │                   │                │
└───────┼────────────┼───────────────────┼────────────────┘
        │            │                   │
        ▼            ▼                   ▼
┌───────────┐  ┌───────────┐    ┌──────────────┐
│  WALRUS   │  │    SUI     │    │   SUI WALLET  │
│  Storage  │  │  Testnet   │    │  (sign + pay) │
│           │  │            │    │               │
│ PUT /v1/  │  │ Merkle     │    │ signTransaction│
│ blobs     │  │ Root       │    │ → send SUI    │
│           │  │ stored     │    │               │
│ GET /v1/  │  │ off-chain  │    │               │
│ {blobId}  │  │            │    │               │
└───────────┘  └───────────┘    └──────────────┘
        │
        ▼
┌───────────┐
│   TATUM   │
│  RPC Node │
└───────────┘
```

## Merkle Tree Implementation

### Upload Phase

```
File bytes → SHA-256 → leaf hash
All leaves → binary Merkle tree → root hash
root stored as dataset.merkleRoot
```

### Verification Phase

```
Stored blob hashes → recompute Merkle root
Compare: recomputed_root === stored_root
If match: dataset integrity proven
If mismatch: dataset corrupted/tampered
```

### Code Reference

```typescript
// src/lib/merkle.ts

// Leaf: SHA-256 of blob bytes
export async function sha256(data: Uint8Array): Promise<Uint8Array>

// Root: binary tree over leaves  
export async function computeMerkleRoot(blobs: Uint8Array[]): Promise<string>

// Root from stored hashes (for verification without fetching all blobs)
export async function computeMerkleRootFromHashes(hashes: string[]): Promise<string>
```

## Walrus Integration

### Endpoints

| Operation | Method | URL |
|---|---|---|
| Store blob | PUT | `https://publisher.walrus-testnet.walrus.space/v1/blobs` |
| Read blob | GET | `https://aggregator.walrus-testnet.walrus.space/v1/{blobId}` |

### Response Format (Store)

```json
{
  "newlyCreated": {
    "blobObject": {
      "blobId": "T6_MOxnduECiseHk4blGJL36YBwtEQ_idxABBtBeGo",
      "size": 27,
      "registeredEpoch": 416
    }
  }
}
```

### Known Limitation

Blobs take 30-60 seconds to propagate from publisher to aggregator.
Reads may return 404 during this window.
Workaround: Verification uses stored SHA-256 hashes instead of re-fetching.

## Sui Payment Flow

```typescript
// src/app/page.tsx — handleConfirmPurchase()

const tx = new Transaction();
const amountMist = BigInt(Math.floor(price * 1e9)); // SUI → Mist
const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(amountMist)]);
tx.transferObjects([coin], tx.pure.address(seller));

const { signature, bytes } = await signTransaction({ transaction: tx });
const result = await suiClient.executeTransactionBlock({
  transactionBlock: bytes,
  signature,
  options: { showEffects: true },
});
```

## Data Structures

### Dataset

```typescript
interface Dataset {
  id: string;
  name: string;
  description: string;
  blobIds: string[];        // Walrus blob IDs
  merkleRoot: string;       // SHA-256 Merkle root
  sampleCount: number;      // Free samples
  price: number;            // SUI
  seller: string;           // Sui address
  status: "active" | "sampling" | "confirmed" | "disputed";
  blobHashes: string[];     // SHA-256 of each blob (hex)
}
```

### Sample Request

```typescript
interface SampleRequest {
  id: string;
  datasetId: string;
  datasetName: string;
  sampleIndices: number[];   // Random blob indices
  sampleBlobIds: string[];   // Walrus blob IDs for samples
  status: "pending" | "accepted" | "rejected";
}
```

## Random Sampling

Uses `crypto.getRandomValues()` for manipulation-resistant selection:

```typescript
const randBytes = new Uint32Array(sampleCount);
crypto.getRandomValues(randBytes);
for (let i = 0; i < sampleCount; i++) {
  const idx = randBytes[i] % pool.length;
  indices.push(pool.splice(idx, 1)[0]);
}
```

Not `Math.random()` — cryptographically secure to prevent sellers from predicting which blobs get sampled.

## File Structure

```
src/
├── app/
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # All pages (landing, dashboard, create, browse, sample)
│   └── globals.css           # Neubrutalist design system
├── components/
│   ├── sui-provider.tsx       # Sui dApp Kit provider
│   ├── sui-provider-wrapper.tsx  # Client-only dynamic import wrapper
│   └── ui/                   # Button, Card, Input
└── lib/
    ├── merkle.ts             # SHA-256 Merkle tree implementation
    ├── walrus.ts             # Walrus HTTP API client
    └── utils.ts              # cn(), formatAddress()
```
