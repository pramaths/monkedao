import useUmiStore from '@/store/useUmiStore'
import { signerIdentity } from '@metaplex-foundation/umi'

const umiWithCurrentWalletAdapter = () => {
  const umi = useUmiStore.getState().umi
  const currentWallet = useUmiStore.getState().signer
  
  console.log('umiWithCurrentWalletAdapter - currentWallet:', currentWallet)
  
  if (!currentWallet) {
    throw new Error('No wallet selected. Please connect your wallet first.')
  }
  
  return umi.use(signerIdentity(currentWallet))
}
export default umiWithCurrentWalletAdapter
