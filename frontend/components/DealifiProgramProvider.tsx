"use client";

import { AnchorProvider, Program, setProvider } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { ReactNode, createContext, useContext, useMemo } from "react";
import IDL from "@/lib/dealifi_idl.json";
import { DealifiCandy } from "@/lib/dealifi-program";
type DealifiProgramContextType = {
  program: Program<DealifiCandy> | null;
  provider: AnchorProvider | null;
};

const DealifiProgramContext = createContext<DealifiProgramContextType>({
  program: null,
  provider: null,
});

export const useDealifiProgram = (): DealifiProgramContextType => useContext(DealifiProgramContext);

export const DealifiProgramProvider = ({ children }: { children: ReactNode }) => {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const value = useMemo(() => {
    if (!wallet) {
      return { program: null, provider: null };
    }

    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    setProvider(provider);

    const program = new Program<DealifiCandy>(IDL as DealifiCandy, provider);

    return { program, provider };
  }, [connection, wallet]);

  return (
    <DealifiProgramContext.Provider value={value}>
      {children}
    </DealifiProgramContext.Provider>
  );
};

