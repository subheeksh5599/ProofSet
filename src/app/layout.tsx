import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import dynamic from "next/dynamic";
import "./globals.css";

const SuiProvider = dynamic(() => import("@/components/sui-provider").then(m => ({ default: m.SuiProvider })), {
  ssr: false,
});

const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-sans", weight: ["700"] });

export const metadata: Metadata = {
  title: "ProofSet — Verifiable AI Dataset Marketplace on Sui + Walrus",
  description: "Sellers upload datasets to Walrus. Buyers verify cryptographic Merkle proofs before paying. No trust.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${grotesk.variable} h-full antialiased`}>
      <body className="min-h-full bg-background">
        <SuiProvider>{children}</SuiProvider>
      </body>
    </html>
  );
}
