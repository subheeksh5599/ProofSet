import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { SuiProvider } from "@/components/sui-provider";

const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-sans", weight: ["700"] });

export const metadata: Metadata = {
  title: "Stamp — Verifiable Creator Portfolio on Sui + Walrus",
  description: "Every piece of work is verifiably stored on Walrus and timestamped on Sui. Prove your work is original.",
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
