"use client";

import useUmiStore from "@/store/useUmiStore";
import { WalletAdapter } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect } from "react";

function UmiProvider({ children }: { children: React.ReactNode }) {
  const wallet = useWallet();
  const umiStore = useUmiStore();

  useEffect(() => {
    if (!wallet.publicKey) return;
    umiStore.updateSigner(wallet as unknown as WalletAdapter);
  }, [wallet, umiStore]);

  return <>{children}</>;
}

export { UmiProvider };