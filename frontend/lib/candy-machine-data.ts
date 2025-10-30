import { fetchCandyMachine, mplCandyMachine as mplCoreCandyMachine } from "@metaplex-foundation/mpl-candy-machine";
import { publicKey } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";

// Use devnet for now - you can switch to mainnet when ready
const RPC_ENDPOINT = "https://api.devnet.solana.com";

export interface CandyMachineData {
  address: string;
  name: string;
  symbol: string;
  itemsAvailable: number;
  itemsRedeemed: number;
  itemsLoaded: number;
  remaining: number;
  isActive: boolean;
  price: number; // in SOL
  goLiveDate: number | null;
  endDate: number | null;
  creator: string;
  collection: string | null;
  authority: string;
  mintAuthority: string;
  updateAuthority: string;
  sellerFeeBasisPoints: number;
  isMutable: boolean;
  retainAuthority: boolean;
  maxSupply: number;
  isFullyLoaded: boolean;
  isFullyMinted: boolean;
  isEnded: boolean;
  isLive: boolean;
}

export async function fetchCandyMachineData(candyMachineAddress: string, umiInstance?: any): Promise<CandyMachineData | null> {
  try {
    if (!umiInstance) {
      console.warn('⚠️ No UMI instance provided - cannot fetch candy machine data');
      return null;
    }
    
    const umi = umiInstance;
    
    console.log('🔍 Fetching candy machine with UMI identity:', umi.identity?.publicKey?.toString() || 'No identity (read-only)');
    
    if (!umi.identity || !umi.identity.publicKey) {
      console.warn('⚠️ UMI instance has no signer identity - cannot fetch candy machine data');
      return null;
    }
    
    const candyMachine = await fetchCandyMachine(umi, publicKey(candyMachineAddress));
    console.log('🍭 Candy Machine:', candyMachine);
    
    if (!candyMachine) {
      return null;
    }

    // Log the raw candy machine data to see its structure
    console.log('🍭 Raw Candy Machine Data:', {
      address: candyMachineAddress,
      candyMachine: candyMachine,
      keys: Object.keys(candyMachine),
      // Extract from the actual structure
      itemsAvailable: candyMachine.data?.itemsAvailable ? Number(candyMachine.data.itemsAvailable) : 0,
      itemsRedeemed: candyMachine.itemsRedeemed ? Number(candyMachine.itemsRedeemed) : 0,
      itemsLoaded: candyMachine.itemsLoaded || 0,
      items: candyMachine.items || [],
      authority: candyMachine.authority,
      mintAuthority: candyMachine.mintAuthority,
      collectionMint: candyMachine.collectionMint,
      isMutable: candyMachine.data?.isMutable || false,
    });

    // Extract actual data from candy machine
    const itemsAvailable = candyMachine.data?.itemsAvailable ? Number(candyMachine.data.itemsAvailable) : 0;
    // Fix corrupted itemsRedeemed - if it's a huge number, it's likely corrupted
    const rawItemsRedeemed = candyMachine.itemsRedeemed ? Number(candyMachine.itemsRedeemed) : 0;
    const itemsRedeemed = rawItemsRedeemed > 1000000 ? 0 : rawItemsRedeemed; // Cap at reasonable number
    const itemsLoaded = candyMachine.itemsLoaded || 0;
    const remaining = Math.max(0, itemsAvailable - itemsRedeemed); // Ensure non-negative
    
    const result = {
      address: candyMachineAddress,
      name: 'Candy Machine Collection', // Default name since not in the data
      symbol: 'CM', // Default symbol
      itemsAvailable,
      itemsRedeemed,
      itemsLoaded,
      remaining,
      isActive: true, // Assume active if we can fetch it
      price: 0, // Price not available in this structure
      goLiveDate: null, // Not available in this structure
      endDate: null, // Not available in this structure
      creator: candyMachine.authority || '',
      collection: candyMachine.collectionMint || null,
      authority: candyMachine.authority || '',
      mintAuthority: candyMachine.mintAuthority || '',
      updateAuthority: candyMachine.authority || '',
      sellerFeeBasisPoints: 0, // Not available in this structure
      isMutable: candyMachine.data?.isMutable || false,
      retainAuthority: true, // Assume true
      maxSupply: candyMachine.data?.maxEditionSupply ? Number(candyMachine.data.maxEditionSupply) : 0,
      isFullyLoaded: itemsLoaded >= itemsAvailable,
      isFullyMinted: itemsRedeemed >= itemsAvailable,
      isEnded: false, // Not available in this structure
      isLive: true, // Assume live if we can fetch it
    };

    console.log('🎯 Returning Actual Data:', result);
    
    // Warn about potential issues
    if (itemsAvailable === 0) {
      console.warn('⚠️ Candy Machine has 0 items available - cannot add items!');
    }
    if (rawItemsRedeemed > 1000000) {
      console.warn('⚠️ ItemsRedeemed value appears corrupted:', rawItemsRedeemed);
    }
    
    // Check authority mismatch
    const currentWallet = umi.identity?.publicKey?.toString();
    const candyMachineAuthority = candyMachine.authority;
    if (currentWallet && candyMachineAuthority && currentWallet !== candyMachineAuthority) {
      console.warn('⚠️ Authority mismatch!', {
        currentWallet,
        candyMachineAuthority,
        message: 'You may not be able to add items to this candy machine'
      });
    }
    
    return result;
  } catch (error) {
    console.error('Failed to fetch candy machine data:', error);
    return null;
  }
}

export async function fetchMultipleCandyMachineData(addresses: string[], umiInstance?: any): Promise<CandyMachineData[]> {
  const results = await Promise.allSettled(
    addresses.map(address => fetchCandyMachineData(address, umiInstance))
  );
  
  return results
    .filter((result): result is PromiseFulfilledResult<CandyMachineData | null> => 
      result.status === 'fulfilled' && result.value !== null
    )
    .map(result => result.value as CandyMachineData);
}
