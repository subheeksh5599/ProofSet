"use client";

// Merkle tree utilities for dataset verification
// Uses SHA-256, runs entirely in browser

export async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const buf = data.byteOffset === 0 && data.byteLength === data.buffer.byteLength
    ? data.buffer as ArrayBuffer
    : data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return new Uint8Array(hash);
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  return bytes;
}

export async function computeMerkleRoot(blobs: Uint8Array[]): Promise<string> {
  if (blobs.length === 0) return "0".repeat(64);
  const leaves = await Promise.all(blobs.map(b => sha256(b)));
  return buildMerkleRoot(leaves);
}

export async function computeMerkleRootFromHashes(hashes: string[]): Promise<string> {
  if (hashes.length === 0) return "0".repeat(64);
  const leaves = hashes.map(h => hexToBytes(h));
  return buildMerkleRoot(leaves);
}

async function buildMerkleRoot(leaves: Uint8Array[]): Promise<string> {
  if (leaves.length === 1) return bytesToHex(leaves[0]);
  const next: Uint8Array[] = [];
  for (let i = 0; i < leaves.length; i += 2) {
    const left = leaves[i];
    const right = i + 1 < leaves.length ? leaves[i + 1] : left;
    const combined = new Uint8Array(64);
    combined.set(left, 0);
    combined.set(right, 32);
    next.push(await sha256(combined));
  }
  return buildMerkleRoot(next);
}

export async function generateMerkleProof(
  blobs: Uint8Array[],
  targetIndex: number
): Promise<{ root: string; proof: string[]; leaf: string }> {
  const leaves = await Promise.all(blobs.map(b => sha256(b)));
  const root = await buildMerkleRoot(leaves);
  const leaf = bytesToHex(leaves[targetIndex]);
  const proof = await generateProof(leaves, targetIndex);
  return { root, proof: proof.map(p => bytesToHex(p)), leaf };
}

async function generateProof(leaves: Uint8Array[], index: number): Promise<Uint8Array[]> {
  const proof: Uint8Array[] = [];
  let idx = index;
  let level = leaves;
  while (level.length > 1) {
    const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
    if (siblingIdx < level.length) proof.push(level[siblingIdx]);
    else proof.push(level[idx]); // duplicate if odd
    idx = Math.floor(idx / 2);
    const next: Uint8Array[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : left;
      const combined = new Uint8Array(64);
      combined.set(left, 0);
      combined.set(right, 32);
      next.push(await sha256(combined));
    }
    level = next;
  }
  return proof;
}

export async function verifyMerkleProof(
  leaf: string,
  proof: string[],
  root: string,
  index: number
): Promise<boolean> {
  let current = hexToBytes(leaf);
  let idx = index;
  for (const p of proof) {
    const sibling = hexToBytes(p);
    const combined = new Uint8Array(64);
    if (idx % 2 === 0) {
      combined.set(current, 0);
      combined.set(sibling, 32);
    } else {
      combined.set(sibling, 0);
      combined.set(current, 32);
    }
    current = await sha256(combined);
    idx = Math.floor(idx / 2);
  }
  return bytesToHex(current) === root;
}
