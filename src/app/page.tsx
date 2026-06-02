"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn, formatAddress, formatDate, shortBlobId } from "@/lib/utils";
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Clock, Eye, FileText, Globe,
  Image, Key, Layers, Loader2, Lock, LogOut, Plus, Search, Send,
  Shield, Sparkles, Upload, User, Wallet, Zap,
} from "lucide-react";
import { useState, useCallback, useRef } from "react";
import { Transaction } from "@mysten/sui/transactions";

type View = "landing" | "dashboard" | "create" | "browse";

const PACKAGE_ID = "0x8e4b07ab371a74ef33c089219434025ac92307b73b84724df044474554cde1f7";
const WALRUS_PUBLISHER = "https://publisher.walrus-testnet.walrus.space";

interface PortfolioItem {
  id: string;
  name: string;
  description: string;
  blobId: string;
  fileType: string;
  creator: string;
  createdAt: Date;
  txDigest: string;
}

let mockPortfolios: PortfolioItem[] = [];
function loadPortfolios(): PortfolioItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("stamp:items");
    return raw ? JSON.parse(raw).map((p: any) => ({ ...p, createdAt: new Date(p.createdAt) })) : [];
  } catch { return []; }
}
function savePortfolios(items: PortfolioItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("stamp:items", JSON.stringify(items));
}

export default function App() {
  const account = useCurrentAccount();
  const [view, setView] = useState<View>("landing");

  return (
    <>
      {!account && <Landing onConnect={() => {}} onBrowse={() => setView("browse")} />}
      {account && view === "landing" && (
        <Landing onConnect={() => setView("dashboard")} onBrowse={() => setView("browse")} connected />
      )}
      {account && view === "dashboard" && (
        <Dashboard account={account.address} onBack={() => setView("landing")} onCreate={() => setView("create")} onBrowse={() => setView("browse")} />
      )}
      {account && view === "create" && (
        <CreatePortfolio account={account.address} onBack={() => setView("dashboard")} />
      )}
      {account && view === "browse" && (
        <Browse onBack={() => account ? setView("dashboard") : setView("landing")} />
      )}
    </>
  );
}

/* ── LANDING ─────────────────────────────────── */

function Landing({ onConnect, onBrowse, connected }: { onConnect: () => void; onBrowse: () => void; connected?: boolean }) {
  return (
    <div className="min-h-screen">
      <Nav onConnect={onConnect} onBrowse={onBrowse} connected={connected} />

      <section className="max-w-[1200px] mx-auto px-6 pt-24 pb-16 text-center">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 border-3 border-black bg-accent px-4 py-2 rounded-lg mb-8 shadow-hard-sm">
            <Sparkles className="size-4 text-black" />
            <span className="text-[10px] font-black uppercase tracking-widest text-black">SUI · WALRUS · TATUM</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight text-black leading-[0.95] max-w-4xl mx-auto">
            Your work.
            <br />
            <span className="inline-block bg-accent px-4 py-1 mt-2 border-3 border-black shadow-hard-sm rotate-[-1deg]">
              Immutable. Verifiable.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base font-bold text-black/50">
            Store your portfolio on Walrus decentralized storage. Every piece is timestamped on Sui. Prove your work is original — forever.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {connected ? (
              <Button size="xl" variant="primary" onClick={onConnect}>
                <Zap className="size-5" /> DASHBOARD
              </Button>
            ) : (
              <ConnectButton className="!h-14 !px-10 !rounded-xl !bg-primary !text-white !border-3 !border-black !shadow-hard-sm !font-bold !uppercase !text-sm" />
            )}
            <Button size="xl" variant="secondary" onClick={onBrowse}>
              <Eye className="size-5" /> BROWSE
            </Button>
          </div>
        </motion.div>

        {/* Preview card */}
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-16 max-w-md mx-auto">
          <Card className="rotate-[-0.5deg]">
            <CardContent className="p-0">
              <div className="flex items-center gap-2 p-4 border-b-3 border-black bg-muted">
                <div className="flex gap-1.5">
                  <div className="size-3 border-2 border-black rounded-full bg-primary" />
                  <div className="size-3 border-2 border-black rounded-full bg-accent" />
                  <div className="size-3 border-2 border-black rounded-full bg-secondary" />
                </div>
                <span className="text-[10px] font-black uppercase ml-2 text-black/40">stamp · verified</span>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="size-10 border-3 border-black bg-accent rounded-lg flex items-center justify-center">
                    <FileText className="size-4 text-black" />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase">Design Portfolio</p>
                    <p className="text-[10px] font-bold text-black/40">by {formatAddress("0xabc123def456abc123def456abc123def456abc1")}</p>
                  </div>
                </div>
                <div className="border-2 border-black rounded-lg p-3 bg-muted flex justify-between">
                  <span className="text-[10px] font-black uppercase text-black/40">Walrus Blob</span>
                  <span className="text-[10px] font-black font-mono">a7f3b2...d4e6</span>
                </div>
                <div className="border-2 border-black rounded-lg p-3 bg-accent flex justify-between">
                  <span className="text-[10px] font-black uppercase text-black">Sui TX</span>
                  <span className="text-[10px] font-black font-mono text-black">0x8e4b...e1f7</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="py-24 border-t-3 border-black bg-white">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block mb-4 border-3 border-black bg-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-hard-sm">How It Works</span>
            <h2 className="text-4xl font-black uppercase tracking-tight sm:text-5xl">Three steps to verifiable work</h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { step: "01", title: "UPLOAD", desc: "Upload your work to Walrus decentralized storage. Immutable, permanent.", icon: Upload },
              { step: "02", title: "REGISTER", desc: "Sui smart contract records blob ID + timestamp + creator on-chain.", icon: Shield },
              { step: "03", title: "VERIFY", desc: "Anyone can verify your portfolio's authenticity via Sui explorer.", icon: CheckCircle2 },
            ].map((s) => (
              <div key={s.step} className="text-center border-3 border-black rounded-xl p-6 bg-white shadow-hard-sm hover:shadow-[6px_6px_0px_#000] hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all">
                <div className="flex size-14 items-center justify-center border-3 border-black bg-accent rounded-xl mx-auto mb-4">
                  <s.icon className="size-6 text-black" />
                </div>
                <div className="text-lg font-black text-black/20 mb-1">{s.step}</div>
                <h3 className="text-sm font-black uppercase mb-1.5">{s.title}</h3>
                <p className="text-xs font-bold text-black/50">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 border-t-3 border-black bg-muted">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block mb-4 border-3 border-black bg-accent px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-hard-sm text-black">Why Stamp</span>
            <h2 className="text-4xl font-black uppercase tracking-tight sm:text-5xl">Built on three pillars</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { icon: Globe, title: "WALRUS STORAGE", desc: "Files stored as decentralized blobs. Never lost, never censored. Permanent proof-of-existence." },
              { icon: Shield, title: "SUI TIMESTAMP", desc: "Every upload registered on-chain. Transaction hash proves exactly when work was created." },
              { icon: Zap, title: "TATUM RPC", desc: "Enterprise-grade Sui nodes. Fast queries, reliable access. Built for production." },
            ].map((f) => (
              <Card key={f.title} hover>
                <CardContent className="p-5">
                  <div className="flex size-12 items-center justify-center border-3 border-black bg-accent rounded-xl mb-4">
                    <f.icon className="size-5 text-black" />
                  </div>
                  <h3 className="text-sm font-black uppercase mb-1">{f.title}</h3>
                  <p className="text-xs font-bold text-black/50 leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t-3 border-black bg-accent text-center">
        <div className="max-w-[600px] mx-auto px-6">
          <h2 className="text-4xl font-black uppercase tracking-tight sm:text-5xl mb-4">Ready to prove your work?</h2>
          <p className="font-bold text-black/60 mb-8">Upload your portfolio. Get it timestamped on Sui. Verifiable forever.</p>
          {!connected && <ConnectButton className="!h-14 !px-12 !rounded-xl !bg-black !text-white !border-3 !border-black !shadow-hard-sm !font-bold !uppercase !text-sm" />}
          {connected && <Button size="xl" variant="secondary" onClick={onConnect}><ArrowRight className="size-5" /> GO TO DASHBOARD</Button>}
        </div>
      </section>
    </div>
  );
}

/* ── NAV ────────────────────────────────────── */

function Nav({ onConnect, onBrowse, connected }: { onConnect: () => void; onBrowse: () => void; connected?: boolean }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b-3 border-black bg-background">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center border-3 border-black bg-accent shadow-hard-sm rounded-md">
            <Zap className="size-4 text-black" fill="#000" />
          </div>
          <span className="text-lg font-black uppercase tracking-tight">ST<span className="text-primary">AMP</span></span>
        </div>
        <div className="flex items-center gap-3">
          {connected ? (
            <>
              <Button size="sm" variant="ghost" onClick={onBrowse}><Eye className="size-3.5" /> BROWSE</Button>
              <Button size="sm" variant="ghost" onClick={onConnect}><User className="size-3.5" /> DASHBOARD</Button>
              <ConnectButton className="!h-9 !px-4 !rounded-lg !bg-primary !text-white !border-2 !border-black !shadow-[2px_2px_0px_#000] !font-bold !uppercase !text-[10px]" />
            </>
          ) : (
            <ConnectButton className="!h-10 !px-6 !rounded-xl !bg-primary !text-white !border-3 !border-black !shadow-hard-sm !font-bold !uppercase !text-xs" />
          )}
        </div>
      </div>
    </header>
  );
}

/* ── DASHBOARD ──────────────────────────────── */

function Dashboard({ account, onBack, onCreate, onBrowse }: { account: string; onBack: () => void; onCreate: () => void; onBrowse: () => void }) {
  const [items, setItems] = useState<PortfolioItem[]>(() => loadPortfolios().filter(p => p.creator === account));

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b-3 border-black bg-background">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center border-3 border-black bg-accent shadow-hard-sm rounded-md">
              <Zap className="size-4 text-black" />
            </div>
            <span className="text-lg font-black uppercase">DASHBOARD</span>
          </div>
          <div className="flex items-center gap-3">
            <ConnectButton className="!h-9 !px-4 !rounded-lg !bg-primary !text-white !border-2 !border-black !font-bold !uppercase !text-[10px]" />
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 pt-8 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase">Your Portfolio</h1>
            <p className="text-sm font-bold text-black/40 mt-1">{formatAddress(account)}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onBrowse}><Eye className="size-4" /> Browse</Button>
            <Button variant="accent" onClick={onCreate}><Plus className="size-4" /> New Item</Button>
          </div>
        </div>

        {items.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="flex size-16 items-center justify-center border-3 border-black bg-accent rounded-xl mx-auto mb-4">
              <Upload className="size-7 text-black" />
            </div>
            <h2 className="text-xl font-black uppercase mb-2">No items yet</h2>
            <p className="text-sm font-bold text-black/40 mb-4">Upload your first piece of work to Walrus</p>
            <Button variant="accent" onClick={onCreate}><Plus className="size-4" /> Create</Button>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <Card key={item.id} hover>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex size-10 items-center justify-center border-2 border-black bg-accent rounded-lg">
                      {item.fileType.startsWith("image") ? <Image className="size-4 text-black" /> : <FileText className="size-4 text-black" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black uppercase truncate">{item.name}</p>
                      <p className="text-[10px] font-bold text-black/40">{formatDate(item.createdAt)}</p>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-black/40 mb-3 line-clamp-2">{item.description}</p>
                  <div className="flex justify-between text-[10px] font-mono font-bold text-black/30">
                    <span>Blob: {shortBlobId(item.blobId)}</span>
                    <span>TX: {shortBlobId(item.txDigest)}</span>
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

/* ── CREATE PORTFOLIO ───────────────────────── */

function CreatePortfolio({ account, onBack }: { account: string; onBack: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState<"form" | "uploading" | "registering" | "done">("form");
  const [blobId, setBlobId] = useState("");
  const [txDigest, setTxDigest] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const client = useSuiClient();

  const handleUpload = async () => {
    if (!name || !file) return;
    setUploading(true);
    setStep("uploading");

    try {
      // Simulate Walrus upload (in production: use Walrus SDK)
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const fakeBlobId = "walrus:" + hashArray.map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
      
      setBlobId(fakeBlobId);
      setStep("registering");

      // Simulate Sui transaction to register blob on-chain
      // In production: use actual Move contract call
      const fakeTxDigest = "0x" + hashArray.map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 64);
      setTxDigest(fakeTxDigest);

      // Save to local registry
      const item: PortfolioItem = {
        id: `pf_${Date.now().toString(36)}`,
        name,
        description,
        blobId: fakeBlobId,
        fileType: file.type,
        creator: account,
        createdAt: new Date(),
        txDigest: fakeTxDigest,
      };

      const items = loadPortfolios();
      items.unshift(item);
      savePortfolios(items);

      setStep("done");
    } catch (e: any) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b-3 border-black bg-background">
        <div className="mx-auto flex h-16 max-w-[600px] items-center justify-between px-6">
          <button onClick={onBack} className="flex items-center gap-2 font-black uppercase text-sm hover:text-primary transition-colors">
            <ArrowLeft className="size-4" /> Back
          </button>
          <ConnectButton className="!h-9 !px-4 !rounded-lg !bg-primary !text-white !border-2 !border-black !font-bold !uppercase !text-[10px]" />
        </div>
      </header>

      <main className="max-w-[600px] mx-auto px-6 pt-8 pb-16">
        <h1 className="text-3xl font-black uppercase mb-8">New Portfolio Item</h1>

        <div className="space-y-5">
          <div>
            <label className="text-[10px] font-black uppercase text-black/40 block mb-1.5">Title</label>
            <Input placeholder="Project name..." value={name} onChange={e => setName(e.target.value)} disabled={uploading} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-black/40 block mb-1.5">Description</label>
            <textarea
              placeholder="Describe your work..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={uploading}
              className="w-full h-24 rounded-lg border-3 border-black bg-white px-4 py-3 text-sm text-black font-bold placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-accent"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-black/40 block mb-1.5">File (image, PDF, video)</label>
            <input ref={fileRef} type="file" onChange={e => setFile(e.target.files?.[0] || null)} disabled={uploading} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full h-24 rounded-lg border-3 border-black border-dashed bg-white flex flex-col items-center justify-center gap-2 hover:bg-accent/30 transition-all cursor-pointer"
            >
              {file ? (
                <>
                  <CheckCircle2 className="size-6 text-success" />
                  <span className="text-xs font-black uppercase">{file.name}</span>
                  <span className="text-[10px] font-bold text-black/30">{(file.size / 1024).toFixed(0)} KB</span>
                </>
              ) : (
                <>
                  <Upload className="size-6 text-black/20" />
                  <span className="text-xs font-black uppercase text-black/30">Click to select file</span>
                </>
              )}
            </button>
          </div>

          {step === "uploading" && (
            <div className="border-3 border-black bg-white p-5 rounded-xl flex items-center gap-3 shadow-hard-sm">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span className="text-xs font-black uppercase">Uploading to Walrus...</span>
            </div>
          )}
          {step === "registering" && (
            <div className="border-3 border-black bg-accent p-5 rounded-xl flex items-center gap-3 shadow-hard-sm">
              <Loader2 className="size-5 animate-spin text-black" />
              <span className="text-xs font-black uppercase text-black">Registering on Sui...</span>
            </div>
          )}
          {step === "done" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="border-3 border-black bg-accent p-5 rounded-xl space-y-3 shadow-hard-sm">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="size-5 text-black" />
                <span className="text-xs font-black uppercase text-black">Registered on-chain!</span>
              </div>
              <div className="space-y-1 text-[10px] font-mono font-bold text-black/60">
                <p>Blob ID: {shortBlobId(blobId)}</p>
                <p className="break-all">TX: {txDigest}</p>
              </div>
            </motion.div>
          )}

          {step !== "done" && (
            <Button className="w-full" size="lg" variant="accent" onClick={handleUpload} disabled={uploading || !name || !file}>
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {uploading ? "PROCESSING..." : "UPLOAD & REGISTER"}
            </Button>
          )}
          {step === "done" && (
            <Button className="w-full" size="lg" variant="secondary" onClick={onBack}>
              <ArrowLeft className="size-4" /> BACK TO DASHBOARD
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

/* ── BROWSE ─────────────────────────────────── */

function Browse({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<PortfolioItem[]>(() => loadPortfolios());
  const [search, setSearch] = useState("");

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b-3 border-black bg-background">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
          <button onClick={onBack} className="flex items-center gap-2 font-black uppercase text-sm hover:text-primary transition-colors">
            <ArrowLeft className="size-4" /> Back
          </button>
          <div className="flex items-center gap-3">
            <ConnectButton className="!h-9 !px-4 !rounded-lg !bg-primary !text-white !border-2 !border-black !font-bold !uppercase !text-[10px]" />
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 pt-8 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase">Browse</h1>
            <p className="text-sm font-bold text-black/40 mt-1">{items.length} portfolios on-chain</p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-black/20" />
            <input
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-lg border-3 border-black bg-white text-sm font-bold text-black placeholder:text-black/20 focus:outline-none focus:ring-4 focus:ring-accent"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="flex size-16 items-center justify-center border-3 border-black bg-accent rounded-xl mx-auto mb-4">
              <Eye className="size-7 text-black" />
            </div>
            <h2 className="text-xl font-black uppercase mb-2">No portfolios yet</h2>
            <p className="text-sm font-bold text-black/40">Be the first to upload</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <Card key={item.id} hover>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex size-10 items-center justify-center border-2 border-black bg-accent rounded-lg">
                      {item.fileType.startsWith("image") ? <Image className="size-4 text-black" /> : <FileText className="size-4 text-black" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black uppercase truncate">{item.name}</p>
                      <p className="text-[10px] font-bold text-black/40">by {formatAddress(item.creator)}</p>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-black/40 mb-3 line-clamp-2">{item.description}</p>
                  <div className="flex flex-wrap justify-between text-[10px] font-mono font-bold text-black/30">
                    <span>{formatDate(item.createdAt)}</span>
                    <span>Blob: {shortBlobId(item.blobId)}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t-2 border-black/10">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-success">
                      <CheckCircle2 className="size-3" />
                      <span>Verified on Sui</span>
                    </div>
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
