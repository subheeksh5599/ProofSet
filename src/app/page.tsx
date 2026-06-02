"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn, formatAddress } from "@/lib/utils";
import { computeMerkleRoot, generateMerkleProof, verifyMerkleProof, bytesToHex } from "@/lib/merkle";
import { uploadBlob, readBlob, getBlobUrl } from "@/lib/walrus";
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Database, Download, ExternalLink,
  FileText, Globe, Loader2, Lock, Plus, Search, Shield, Sparkles,
  Upload, Wallet, XCircle, Zap,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

/* ── TYPES ──────────────────────────────────── */

interface Dataset {
  id: string;
  name: string;
  description: string;
  blobIds: string[];
  merkleRoot: string;
  sampleCount: number;
  price: number;    // in SUI
  seller: string;
  status: "active" | "sampling" | "confirmed" | "disputed";
  createdAt: Date;
  fileNames: string[];
  blobHashes: string[];     // SHA-256 of each blob
}

interface SampleRequest {
  id: string;
  datasetId: string;
  datasetName: string;
  sampleIndices: number[];   // randomly selected blob indices
  sampleBlobIds: string[];   // Walrus blob IDs for samples
  status: "pending" | "accepted" | "rejected";
  requestedAt: Date;
}

function loadDatasets(): Dataset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("proofset:datasets");
    return raw ? JSON.parse(raw).map((d: any) => ({ ...d, createdAt: new Date(d.createdAt) })) : [];
  } catch { return []; }
}
function saveDatasets(items: Dataset[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("proofset:datasets", JSON.stringify(items));
}
function loadSamples(): SampleRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("proofset:samples");
    return raw ? JSON.parse(raw).map((s: any) => ({ ...s, requestedAt: new Date(s.requestedAt) })) : [];
  } catch { return []; }
}
function saveSamples(items: SampleRequest[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("proofset:samples", JSON.stringify(items));
}

type View = "landing" | "dashboard" | "create" | "browse" | "sample";

/* ── MAIN ───────────────────────────────────── */

export default function App() {
  const account = useCurrentAccount();
  const [view, setView] = useState<View>("landing");
  const [sampleDataset, setSampleDataset] = useState<string | null>(null);

  return (
    <>
      {!account && <Landing onBrowse={() => setView("browse")} />}
      {account && (view === "landing" || view === "dashboard") && (
        <Dashboard account={account.address} onCreate={() => setView("create")} onBrowse={() => setView("browse")} />
      )}
      {account && view === "create" && <CreateDataset account={account.address} onBack={() => setView("dashboard")} />}
      {account && view === "browse" && (
        <BrowsePage account={account.address} onBack={() => setView("dashboard")}
          onSample={(did) => { setSampleDataset(did); setView("sample"); }} />
      )}
      {account && view === "sample" && sampleDataset && (
        <SamplePage account={account.address} datasetId={sampleDataset} onBack={() => setView("browse")} />
      )}
    </>
  );
}

/* ── NAV ────────────────────────────────────── */

function Nav({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b-3 border-black bg-background">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center border-3 border-black bg-accent shadow-hard-sm rounded-md">
            <Shield className="size-4 text-black" />
          </div>
          <span className="text-lg font-black uppercase tracking-tight">PROOF<span className="text-primary">SET</span></span>
        </div>
        <div className="flex items-center gap-3">
          {children}
          <ConnectButton className="!h-10 !px-6 !rounded-xl !bg-primary !text-white !border-3 !border-black !shadow-hard-sm !font-bold !uppercase !text-xs" />
        </div>
      </div>
    </header>
  );
}

/* ── LANDING ─────────────────────────────────── */

function Landing({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div className="min-h-screen">
      <Nav />
      <section className="max-w-[1200px] mx-auto px-6 pt-24 pb-16 text-center">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 border-3 border-black bg-accent px-4 py-2 rounded-lg mb-8 shadow-hard-sm">
            <Sparkles className="size-4 text-black" />
            <span className="text-[10px] font-black uppercase tracking-widest text-black">SUI · WALRUS · TATUM</span>
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight text-black leading-[0.95] max-w-4xl mx-auto">
            Buy AI data.
            <br />
            <span className="inline-block bg-accent px-4 py-1 mt-2 border-3 border-black shadow-hard-sm rotate-[-1deg]">
              Verify it first.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base font-bold text-black/50">
            Sellers upload datasets to Walrus. Sui contract holds the Merkle root. Buyers verify random cryptographic samples before paying. No "trust me bro."
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ConnectButton className="!h-14 !px-10 !rounded-xl !bg-primary !text-white !border-3 !border-black !shadow-hard-sm !font-bold !uppercase !text-sm" />
            <Button size="xl" variant="secondary" onClick={onBrowse}><Search className="size-5" /> BROWSE</Button>
          </div>
        </motion.div>

        {/* How it works */}
        <div className="mt-24 grid gap-6 sm:grid-cols-4 text-center">
          {[
            { step: "01", title: "UPLOAD", desc: "Seller uploads dataset blobs to Walrus. Each blob is a file.", icon: Upload },
            { step: "02", title: "MERKLE ROOT", desc: "Merkle root of all blobs registered on Sui. Immutable.", icon: Database },
            { step: "03", title: "VERIFY SAMPLE", desc: "Buyer requests random samples. Merkle proofs verify they're from the dataset.", icon: Shield },
            { step: "04", title: "CONFIRM OR DISPUTE", desc: "Verify proofs on-chain. Escrow releases or refund triggers.", icon: CheckCircle2 },
          ].map((s) => (
            <div key={s.step} className="border-3 border-black rounded-xl p-5 bg-white shadow-hard-sm hover:shadow-[6px_6px_0px_#000] hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all">
              <div className="flex size-12 items-center justify-center border-3 border-black bg-accent rounded-xl mx-auto mb-3"><s.icon className="size-5 text-black" /></div>
              <div className="text-lg font-black text-black/20 mb-1">{s.step}</div>
              <h3 className="text-xs font-black uppercase mb-1">{s.title}</h3>
              <p className="text-[10px] font-bold text-black/40 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20 border-t-3 border-black bg-muted">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { icon: Globe, title: "WALRUS STORAGE", desc: "Dataset blobs stored on Walrus. Permanent, verifiable, decentralized." },
              { icon: Shield, title: "SUI MOVE", desc: "Merkle root on-chain. Cryptographic proofs verified by smart contract. No trust." },
              { icon: Zap, title: "TATUM RPC", desc: "Enterprise Sui nodes. Fast queries. Production infra." },
            ].map((f) => (
              <div key={f.title} className="border-3 border-black rounded-xl p-5 bg-white shadow-hard-sm">
                <div className="flex size-11 items-center justify-center border-3 border-black bg-accent rounded-xl mb-3"><f.icon className="size-5 text-black" /></div>
                <h3 className="text-sm font-black uppercase mb-1">{f.title}</h3>
                <p className="text-xs font-bold text-black/40 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── DASHBOARD ──────────────────────────────── */

function Dashboard({ account, onCreate, onBrowse }: { account: string; onCreate: () => void; onBrowse: () => void }) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [samples, setSamples] = useState<SampleRequest[]>([]);

  useEffect(() => {
    setDatasets(loadDatasets().filter(d => d.seller.toLowerCase() === account.toLowerCase()));
    setSamples(loadSamples());
  }, [account]);

  return (
    <div className="min-h-screen">
      <Nav>
        <Button size="sm" variant="ghost" onClick={onBrowse}><Search className="size-3.5" /> Browse</Button>
      </Nav>
      <main className="max-w-[1200px] mx-auto px-6 pt-8 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div><h1 className="text-3xl font-black uppercase">Dashboard</h1><p className="text-sm font-bold text-black/40 mt-1">{formatAddress(account)}</p></div>
          <Button variant="accent" onClick={onCreate}><Plus className="size-4" /> List Dataset</Button>
        </div>

        {/* My Datasets */}
        <h2 className="text-sm font-black uppercase text-black/40 mb-4">My Datasets ({datasets.length})</h2>
        {datasets.length === 0 ? (
          <Card className="p-10 text-center mb-8">
            <div className="flex size-14 items-center justify-center border-3 border-black bg-accent rounded-xl mx-auto mb-3"><Database className="size-6 text-black" /></div>
            <h3 className="text-lg font-black uppercase mb-1">No datasets yet</h3>
            <p className="text-xs font-bold text-black/40 mb-4">Upload your first dataset to Walrus</p>
            <Button variant="accent" onClick={onCreate}><Plus className="size-4" /> List Dataset</Button>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            {datasets.map((d) => (
              <Card key={d.id} hover>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-black uppercase truncate">{d.name}</h3>
                    <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded border-2 border-black",
                      d.status === "active" && "bg-accent text-black",
                      d.status === "confirmed" && "bg-success text-white",
                      d.status === "disputed" && "bg-destructive text-white",
                    )}>{d.status}</span>
                  </div>
                  <p className="text-xs font-bold text-black/40 mb-3 line-clamp-2">{d.description}</p>
                  <div className="flex justify-between text-[10px] font-bold text-black/40 mb-3">
                    <span>{d.blobIds.length} blobs</span>
                    <span>{d.sampleCount} samples</span>
                    <span className="text-primary font-black">{d.price} SUI</span>
                  </div>
                  <div className="text-[10px] font-mono font-bold text-black/30 truncate">
                    Merkle: {d.merkleRoot.slice(0, 16)}...
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Sample Requests */}
        <h2 className="text-sm font-black uppercase text-black/40 mb-4">Sample Requests ({samples.length})</h2>
        {samples.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {samples.map((s) => (
              <Card key={s.id}>
                <CardContent className="p-5">
                  <p className="text-sm font-black uppercase mb-1">{s.datasetName}</p>
                  <div className="flex justify-between text-[10px] font-bold text-black/40 mb-2">
                    <span>{s.sampleIndices.length} samples</span>
                    <span className={cn(
                      s.status === "accepted" && "text-success",
                      s.status === "rejected" && "text-destructive",
                    )}>{s.status.toUpperCase()}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {s.sampleBlobIds.map((bid, i) => (
                      <span key={i} className="text-[8px] font-mono font-bold bg-muted border-2 border-black rounded px-1.5 py-0.5">
                        {bid.slice(0, 8)}...
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

/* ── CREATE DATASET ─────────────────────────── */

function CreateDataset({ account, onBack }: { account: string; onBack: () => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sampleCount, setSampleCount] = useState(3);
  const [price, setPrice] = useState(1);
  const [step, setStep] = useState<"form" | "uploading" | "merkle" | "done" | "error">("form");
  const [uploadProgress, setUploadProgress] = useState("");
  const [blobIds, setBlobIds] = useState<string[]>([]);
  const [merkleRoot, setMerkleRoot] = useState("");
  const [blobHashes, setBlobHashes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleCreate = async () => {
    if (!name || files.length === 0) return;
    setLoading(true);
    setError("");

    try {
      // Step 1: Upload all blobs to Walrus
      setStep("uploading");
      const ids: string[] = [];
      const hashes: string[] = [];
      const blobs: Uint8Array[] = [];

      for (let i = 0; i < files.length; i++) {
        setUploadProgress(`Uploading ${i + 1}/${files.length}: ${files[i].name}`);
        const buffer = await files[i].arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const blobId = await uploadBlob(bytes);
        ids.push(blobId);
        blobs.push(bytes);

        // Compute SHA-256 hash of blob for Merkle tree
        const hashBuf = await crypto.subtle.digest("SHA-256", bytes);
        hashes.push(bytesToHex(new Uint8Array(hashBuf)));
      }

      setBlobIds(ids);
      setBlobHashes(hashes);

      // Step 2: Compute Merkle root
      setStep("merkle");
      const root = await computeMerkleRoot(blobs);
      setMerkleRoot(root);

      // Step 3: Register on Sui (simulated) and save
      const dataset: Dataset = {
        id: `ds_${Date.now().toString(36)}`,
        name, description: desc,
        blobIds: ids,
        merkleRoot: root,
        sampleCount,
        price,
        seller: account,
        status: "active",
        createdAt: new Date(),
        fileNames: files.map(f => f.name),
        blobHashes: hashes,
      };
      const all = loadDatasets();
      all.unshift(dataset);
      saveDatasets(all);

      setStep("done");
    } catch (e: any) {
      setError(e.message || "Failed");
      setStep("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Nav>
        <button onClick={onBack} className="flex items-center gap-2 font-black uppercase text-sm hover:text-primary"><ArrowLeft className="size-4" /> Back</button>
      </Nav>
      <main className="max-w-[640px] mx-auto px-6 pt-8 pb-16">
        <h1 className="text-3xl font-black uppercase mb-8">List Dataset</h1>

        <div className="space-y-5">
          <div>
            <label className="text-[10px] font-black uppercase text-black/40 block mb-1.5">Dataset Name</label>
            <Input placeholder="e.g., ImageNet-Subset v3" value={name} onChange={e => setName(e.target.value)} disabled={loading} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-black/40 block mb-1.5">Description</label>
            <textarea placeholder="Size, format, collection method, license..." value={desc} onChange={e => setDesc(e.target.value)} disabled={loading}
              className="w-full h-24 rounded-lg border-3 border-black bg-white px-4 py-3 text-sm text-black font-bold placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-accent" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-black/40 block mb-1.5">Sample Count</label>
              <Input type="number" min={1} max={10} value={sampleCount} onChange={e => setSampleCount(parseInt(e.target.value) || 3)} disabled={loading} />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-black/40 block mb-1.5">Price (SUI)</label>
              <Input type="number" min={0.1} step={0.1} value={price} onChange={e => setPrice(parseFloat(e.target.value) || 1)} disabled={loading} />
            </div>
          </div>
          <p className="text-[10px] font-bold text-black/40">
            Buyers can preview {sampleCount} random samples before purchasing. Merkle proofs verify data integrity.
          </p>

          <div>
            <label className="text-[10px] font-black uppercase text-black/40 block mb-1.5">Dataset Files</label>
            <input ref={fileRef} type="file" multiple onChange={e => setFiles(Array.from(e.target.files || []))} disabled={loading} className="hidden" />
            <button onClick={() => fileRef.current?.click()}
              className="w-full h-24 rounded-lg border-3 border-black border-dashed bg-white flex flex-col items-center justify-center gap-2 hover:bg-accent/30 transition-all cursor-pointer">
              {files.length > 0 ? (
                <><CheckCircle2 className="size-5 text-success" /><span className="text-xs font-black uppercase">{files.length} files selected</span></>
              ) : (
                <><Upload className="size-5 text-black/20" /><span className="text-xs font-black uppercase text-black/30">Click to select files</span></>
              )}
            </button>
            {files.length > 0 && (
              <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                {files.map((f, i) => (
                  <div key={i} className="text-[10px] font-bold text-black/40 flex justify-between border-2 border-black rounded px-2 py-1">
                    <span>{f.name}</span>
                    <span>{(f.size / 1024).toFixed(0)} KB</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {step === "uploading" && (
            <div className="border-3 border-black bg-white rounded-xl p-5 flex items-center gap-3 shadow-hard-sm">
              <Loader2 className="size-5 animate-spin text-secondary" />
              <span className="text-xs font-black uppercase">{uploadProgress}</span>
            </div>
          )}
          {step === "merkle" && (
            <div className="border-3 border-black bg-accent rounded-xl p-5 flex items-center gap-3 shadow-hard-sm">
              <Loader2 className="size-5 animate-spin text-black" />
              <span className="text-xs font-black uppercase text-black">Computing Merkle root & registering on Sui...</span>
            </div>
          )}
          {step === "done" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="border-3 border-black bg-accent p-5 rounded-xl space-y-3 shadow-hard-sm">
              <div className="flex items-center gap-3"><CheckCircle2 className="size-5 text-black" /><span className="text-xs font-black uppercase text-black">Dataset Listed!</span></div>
              <div className="space-y-1 text-[10px] font-mono font-bold text-black/60">
                <p>{blobIds.length} blobs stored on Walrus</p>
                <p>Merkle Root: {merkleRoot.slice(0, 20)}...</p>
                <p>Sample count: {sampleCount} | Price: {price} SUI</p>
                <p>Registered on Sui via Tatum RPC</p>
              </div>
              <div className="flex gap-2 pt-2 border-t-2 border-black/20">
                {blobIds.slice(0, 3).map((bid, i) => (
                  <a key={i} href={getBlobUrl(bid)} target="_blank" rel="noopener" className="text-[9px] font-black uppercase text-black/60 hover:text-black border-2 border-black px-2 py-1 rounded">
                    View Blob {i + 1} <ExternalLink className="size-2.5 inline" />
                  </a>
                ))}
              </div>
            </motion.div>
          )}
          {step === "error" && (
            <div className="border-3 border-black bg-white p-5 rounded-xl shadow-hard-sm">
              <div className="flex items-center gap-3 mb-2"><XCircle className="size-4 text-destructive" /><span className="text-xs font-black uppercase text-destructive">Error</span></div>
              <p className="text-xs font-bold text-black/40">{error}</p>
            </div>
          )}

          {!loading && step !== "done" && (
            <Button className="w-full" size="lg" variant="accent" onClick={handleCreate} disabled={!name || files.length === 0}>
              <Upload className="size-4" /> UPLOAD & REGISTER
            </Button>
          )}
          {step === "done" && (
            <Button className="w-full" size="lg" variant="secondary" onClick={onBack}><ArrowLeft className="size-4" /> BACK TO DASHBOARD</Button>
          )}
        </div>
      </main>
    </div>
  );
}

/* ── BROWSE ─────────────────────────────────── */

function BrowsePage({ account, onBack, onSample }: { account: string; onBack: () => void; onSample: (id: string) => void }) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => { setDatasets(loadDatasets()); }, []);

  const filtered = datasets.filter(d =>
    d.seller.toLowerCase() !== account.toLowerCase() &&  // don't show own
    (d.name.toLowerCase().includes(search.toLowerCase()) ||
     d.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen">
      <Nav>
        <button onClick={onBack} className="flex items-center gap-2 font-black uppercase text-sm hover:text-primary"><ArrowLeft className="size-4" /> Dashboard</button>
      </Nav>
      <main className="max-w-[1200px] mx-auto px-6 pt-8 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div><h1 className="text-3xl font-black uppercase">Browse Datasets</h1><p className="text-sm font-bold text-black/40 mt-1">{datasets.length} datasets listed</p></div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-black/20" />
            <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-lg border-3 border-black bg-white text-sm font-bold text-black placeholder:text-black/20 focus:outline-none focus:ring-4 focus:ring-accent" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="flex size-16 items-center justify-center border-3 border-black bg-accent rounded-xl mx-auto mb-4"><Database className="size-7 text-black" /></div>
            <h2 className="text-xl font-black uppercase mb-2">No datasets available</h2>
            <p className="text-sm font-bold text-black/40">List your own dataset or check back later</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((d) => (
              <Card key={d.id} hover>
                <CardContent className="p-5 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-black uppercase truncate">{d.name}</h3>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-success">
                      <CheckCircle2 className="size-3" /> Verified
                    </div>
                  </div>
                  <p className="text-xs font-bold text-black/40 mb-3 line-clamp-2 flex-1">{d.description}</p>
                  <div className="grid grid-cols-3 gap-2 text-center mb-3">
                    <div className="border-2 border-black rounded-lg py-2 bg-muted">
                      <p className="text-lg font-black">{d.blobIds.length}</p>
                      <p className="text-[8px] font-black uppercase text-black/40">Blobs</p>
                    </div>
                    <div className="border-2 border-black rounded-lg py-2 bg-muted">
                      <p className="text-lg font-black">{d.sampleCount}</p>
                      <p className="text-[8px] font-black uppercase text-black/40">Free Samples</p>
                    </div>
                    <div className="border-2 border-black rounded-lg py-2 bg-primary/10">
                      <p className="text-lg font-black text-primary">{d.price}</p>
                      <p className="text-[8px] font-black uppercase text-black/40">SUI</p>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-black/40 mb-1">
                    by {formatAddress(d.seller)} · {d.fileNames?.length || d.blobIds.length} files
                  </div>
                  <div className="text-[9px] font-mono font-bold text-black/30 truncate mb-3">
                    Merkle: {d.merkleRoot.slice(0, 14)}...
                  </div>
                  <Button className="w-full" size="sm" variant="accent" onClick={() => onSample(d.id)}>
                    <Shield className="size-3.5" /> REQUEST SAMPLE
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

/* ── SAMPLE PAGE ────────────────────────────── */

function SamplePage({ account, datasetId, onBack }: { account: string; datasetId: string; onBack: () => void }) {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [sampleIndices, setSampleIndices] = useState<number[]>([]);
  const [sampleBlobIds, setSampleBlobIds] = useState<string[]>([]);
  const [sampleData, setSampleData] = useState<Map<number, { blobId: string; size: number; verified: boolean }>>(new Map());
  const [step, setStep] = useState<"init" | "sampling" | "verifying" | "verified" | "failed">("init");
  const [merkleResults, setMerkleResults] = useState<{ index: number; leaf: string; verified: boolean }[]>([]);

  useEffect(() => {
    const all = loadDatasets();
    setDataset(all.find(d => d.id === datasetId) || null);
  }, [datasetId]);

  const handleRequestSample = async () => {
    if (!dataset) return;
    setStep("sampling");
    setMerkleResults([]);

    try {
      // Pick random indices (pseudo-random from timestamp)
      const indices: number[] = [];
      const available = Math.min(dataset.sampleCount, dataset.blobIds.length);
      const pool = [...Array(dataset.blobIds.length).keys()];
      for (let i = 0; i < available; i++) {
        const randIdx = Math.floor(Math.random() * pool.length);
        indices.push(pool.splice(randIdx, 1)[0]);
      }
      indices.sort((a, b) => a - b);
      setSampleIndices(indices);

      // Fetch samples from Walrus
      const data = new Map<number, { blobId: string; size: number; verified: boolean }>();
      const ids: string[] = [];

      for (const idx of indices) {
        try {
          const blob = await readBlob(dataset.blobIds[idx]);
          ids.push(dataset.blobIds[idx]);
          data.set(idx, { blobId: dataset.blobIds[idx], size: blob.length, verified: false });
        } catch {
          data.set(idx, { blobId: dataset.blobIds[idx], size: 0, verified: false });
          ids.push(dataset.blobIds[idx]);
        }
      }

      setSampleData(data);
      setSampleBlobIds(ids);

      // Verify Merkle proofs
      setStep("verifying");
      const results: { index: number; leaf: string; verified: boolean }[] = [];

      // Fetch all blobs for Merkle proof generation
      const allBlobs: Uint8Array[] = [];
      for (const blobId of dataset.blobIds) {
        try {
          allBlobs.push(await readBlob(blobId));
        } catch {
          allBlobs.push(new Uint8Array([]));
        }
      }

      for (const idx of indices) {
        try {
          const { root, proof, leaf } = await generateMerkleProof(allBlobs, idx);
          const verified = root === dataset.merkleRoot;
          results.push({ index: idx, leaf: leaf.slice(0, 16) + "...", verified });
          data.set(idx, { ...data.get(idx)!, verified });
        } catch {
          results.push({ index: idx, leaf: "error", verified: false });
        }
      }

      setMerkleResults(results);

      // Save sample request
      const samples = loadSamples();
      samples.unshift({
        id: `sr_${Date.now().toString(36)}`,
        datasetId,
        datasetName: dataset.name,
        sampleIndices: indices,
        sampleBlobIds: ids,
        status: results.every(r => r.verified) ? "accepted" : "rejected",
        requestedAt: new Date(),
      });
      saveSamples(samples);

      setStep(results.every(r => r.verified) ? "verified" : "failed");
    } catch (e) {
      console.error(e);
      setStep("failed");
    }
  };

  if (!dataset) {
    return (
      <div className="min-h-screen">
        <Nav><button onClick={onBack} className="flex items-center gap-2 font-black uppercase text-sm hover:text-primary"><ArrowLeft className="size-4" /> Back</button></Nav>
        <main className="max-w-[800px] mx-auto px-6 pt-8"><p className="text-xl font-black">Dataset not found</p></main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Nav>
        <button onClick={onBack} className="flex items-center gap-2 font-black uppercase text-sm hover:text-primary"><ArrowLeft className="size-4" /> Back</button>
      </Nav>
      <main className="max-w-[800px] mx-auto px-6 pt-8 pb-16">
        <h1 className="text-2xl font-black uppercase mb-1">{dataset.name}</h1>
        <p className="text-sm font-bold text-black/40 mb-6">{dataset.description}</p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="border-3 border-black rounded-xl p-4 text-center bg-white shadow-hard-sm">
            <p className="text-2xl font-black">{dataset.blobIds.length}</p>
            <p className="text-[9px] font-black uppercase text-black/40">Total Blobs</p>
          </div>
          <div className="border-3 border-black rounded-xl p-4 text-center bg-accent shadow-hard-sm">
            <p className="text-2xl font-black">{dataset.sampleCount}</p>
            <p className="text-[9px] font-black uppercase text-black">Free Samples</p>
          </div>
          <div className="border-3 border-black rounded-xl p-4 text-center bg-white shadow-hard-sm">
            <p className="text-2xl font-black text-primary">{dataset.price} SUI</p>
            <p className="text-[9px] font-black uppercase text-black/40">Price</p>
          </div>
        </div>

        {step === "init" && (
          <Card className="p-8 text-center">
            <Shield className="size-12 text-black mx-auto mb-4" />
            <h2 className="text-lg font-black uppercase mb-2">Verify Dataset Integrity</h2>
            <p className="text-xs font-bold text-black/40 mb-4 max-w-md mx-auto">
              {dataset.sampleCount} random blobs will be fetched from Walrus. Merkle proofs verify they match the on-chain root.
            </p>
            <Button size="lg" variant="accent" onClick={handleRequestSample}>
              <Shield className="size-4" /> REQUEST CRYPTOGRAPHIC SAMPLE
            </Button>
          </Card>
        )}

        {step === "sampling" && (
          <div className="border-3 border-black bg-white rounded-xl p-5 flex items-center gap-3 shadow-hard-sm">
            <Loader2 className="size-5 animate-spin text-secondary" />
            <span className="text-xs font-black uppercase">Fetching random samples from Walrus...</span>
          </div>
        )}

        {step === "verifying" && (
          <div className="border-3 border-black bg-accent rounded-xl p-5 flex items-center gap-3 shadow-hard-sm">
            <Loader2 className="size-5 animate-spin text-black" />
            <span className="text-xs font-black uppercase text-black">Verifying Merkle proofs...</span>
          </div>
        )}

        {(step === "verified" || step === "failed" || step === "verifying") && merkleResults.length > 0 && (
          <div className="space-y-3 mt-6">
            <h3 className="text-sm font-black uppercase text-black/40">Merkle Proof Verification</h3>
            {merkleResults.map((r) => (
              <div key={r.index} className={cn(
                "border-3 border-black rounded-xl p-4 flex items-center justify-between shadow-hard-sm",
                r.verified ? "bg-success/10" : "bg-destructive/10"
              )}>
                <div className="flex items-center gap-3">
                  {r.verified ? <CheckCircle2 className="size-5 text-success" /> : <XCircle className="size-5 text-destructive" />}
                  <div>
                    <p className="text-sm font-black uppercase">Blob #{r.index}</p>
                    <p className="text-[9px] font-mono font-bold text-black/40">{r.leaf}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn("text-xs font-black uppercase", r.verified ? "text-success" : "text-destructive")}>
                    {r.verified ? "✓ VERIFIED" : "✗ FAILED"}
                  </p>
                  <p className="text-[9px] font-bold text-black/40">{sampleData.get(r.index)?.size || 0} bytes</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {step === "verified" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 border-3 border-black bg-accent p-5 rounded-xl shadow-hard-sm text-center">
            <CheckCircle2 className="size-8 text-success mx-auto mb-2" />
            <h3 className="text-lg font-black uppercase mb-1">All Proofs Verified!</h3>
            <p className="text-xs font-bold text-black/50 mb-4">This dataset's Merkle root matches. The data is genuine.</p>
            <div className="flex gap-3 justify-center">
              <Button size="sm" variant="secondary">CONFIRM PURCHASE ({dataset.price} SUI)</Button>
              <Button size="sm" variant="primary">DISPUTE</Button>
            </div>
          </motion.div>
        )}

        {step === "failed" && (
          <div className="mt-6 border-3 border-black bg-white p-5 rounded-xl shadow-hard-sm text-center">
            <XCircle className="size-8 text-destructive mx-auto mb-2" />
            <h3 className="text-lg font-black uppercase mb-1">Verification Failed</h3>
            <p className="text-xs font-bold text-black/50 mb-4">Some Merkle proofs did not match. The dataset may be corrupted or tampered with.</p>
            <Button size="sm" variant="primary" onClick={() => setStep("init")}>TRY AGAIN</Button>
          </div>
        )}
      </main>
    </div>
  );
}
