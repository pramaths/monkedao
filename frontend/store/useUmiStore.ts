import {
  Signer,
  Umi,
  createNoopSigner,
  createNullSigner,
  publicKey,
  signerIdentity,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { createSignerFromWalletAdapter } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { mplCandyMachine } from "@metaplex-foundation/mpl-candy-machine";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { WalletAdapter } from "@solana/wallet-adapter-base";
import { create } from "zustand";
import { umi } from "@/lib/umi"; // Import the singleton Umi instance

interface UmiState {
  umi: Umi;
  signer: Signer | undefined;
  updateSigner: (signer: WalletAdapter) => void;
}

const useUmiStore = create<UmiState>()((set, get) => {
  return {
    umi, // Use the singleton Umi instance
    signer: undefined,
    updateSigner: (signer) => {
      const currentSigner = get().signer;
      const newSigner = createSignerFromWalletAdapter(signer);

      if (
        !currentSigner ||
        currentSigner.publicKey.toString() !== newSigner.publicKey.toString()
      ) {
        // Create a proper signer object with publicKey as a direct property
        const properSigner = {
          publicKey: newSigner.publicKey, // Direct property, not getter
          signMessage: newSigner.signMessage,
          signTransaction: newSigner.signTransaction,
          signAllTransactions: newSigner.signAllTransactions,
        };
        
        // Update the singleton Umi instance with the proper signer identity
        umi.use(signerIdentity(properSigner));
        
        set(() => ({ signer: properSigner }));
      }
    },
  };
});

export default useUmiStore;