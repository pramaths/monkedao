import { useWallet } from '@solana/wallet-adapter-react'
import useUmiStore from '@/store/useUmiStore'

export const useUmiWallet = () => {
  const wallet = useWallet()
  const signer = useUmiStore((state) => state.signer)
  
  return {
    ...wallet,
    umiSigner: signer,
    isUmiReady: !!signer && wallet.connected,
  }
}
