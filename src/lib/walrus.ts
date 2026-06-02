const PUBLISHER = "https://publisher.walrus-testnet.walrus.space";
const AGGREGATOR = "https://aggregator.walrus-testnet.walrus.space";

export async function uploadBlob(data: Uint8Array): Promise<string> {
  const res = await fetch(`${PUBLISHER}/v1/store?epochs=10`, {
    method: "PUT",
    body: data as BodyInit,
    headers: { "Content-Type": "application/octet-stream" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => `${res.status}`);
    throw new Error(`Walrus store failed (${res.status}): ${text}`);
  }
  const result = await res.json();
  return result.newlyCreated?.blobObject?.blobId || result.alreadyCertified?.blobId || "";
}

export async function readBlob(blobId: string): Promise<Uint8Array> {
  const res = await fetch(`${AGGREGATOR}/v1/${blobId}`);
  if (!res.ok) throw new Error(`Walrus read failed (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
}

export function getBlobUrl(blobId: string): string {
  return `${AGGREGATOR}/v1/${blobId}`;
}
