"use client";
import React from "react";
import { AppProps } from "next/app";
import { ThemeProvider } from "next-themes";
import  WalletContextProvider from "./WalletContextProvider";
import { DealifiProgramProvider } from "./DealifiProgramProvider";
import { UmiProvider } from "@/components/UmiProvider";

function GlobalProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark">
      <WalletContextProvider>
        <UmiProvider>
          <DealifiProgramProvider>
            {children}
          </DealifiProgramProvider>
        </UmiProvider>
      </WalletContextProvider>
    </ThemeProvider>
  );
}

export default GlobalProviders;