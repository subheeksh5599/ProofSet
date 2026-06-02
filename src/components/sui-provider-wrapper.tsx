"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const SuiProvider = dynamic(
  () => import("./sui-provider").then((m) => ({ default: m.SuiProvider })),
  { ssr: false }
);

export default function SuiProviderWrapper({ children }: { children: ReactNode }) {
  return <SuiProvider>{children}</SuiProvider>;
}
