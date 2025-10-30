// import { publicKey } from '@metaplex-foundation/umi';
// import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
// import { dasApi } from '@metaplex-foundation/digital-asset-standard-api';

// const RPC_ENDPOINT = "https://api.devnet.solana.com";

// export interface AssetInfo {
//   id: string;
//   name: string;
//   symbol?: string;
//   interface: string;
//   owner: string;
//   authority?: string;
//   collection?: string;
//   verified: boolean;
//   supply?: {
//     print_max_supply?: number;
//     print_current_supply?: number;
//   };
//   royalty?: {
//     basis_points?: number;
//   };
//   created_at: string;
//   content?: {
//     metadata?: {
//       name?: string;
//       symbol?: string;
//       description?: string;
//       image?: string;
//     };
//   };
// }

// export interface CandyMachineAssets {
//   collections: AssetInfo[];
//   nfts: AssetInfo[];
//   totalAssets: number;
// }

// export async function getAssetsByAuthority(authorityAddress: string): Promise<CandyMachineAssets> {
//   try {
//     const umi = createUmi(RPC_ENDPOINT).use(dasApi());
    
//     console.log('🔍 Fetching assets for authority:', authorityAddress);
    
//     // Get assets by owner
//     const result = await umi.rpc.getAssetsByOwner({
//       ownerAddress: publicKey(authorityAddress),
//       limit: 50,
//     });
    
//     const allAssets = result.items || [];
    
//     const uniqueAssets = allAssets.filter((asset, index, self) => 
//       index === self.findIndex(a => a.id === asset.id)
//     );
    
//     // Categorize assets
//     const collections = uniqueAssets.filter(asset => 
//       asset.interface === 'ProgrammableNonFungibleV1' && 
//       (asset.content?.metadata?.name?.includes('Collection') || 
//        asset.content?.metadata?.name?.includes('Candy Machine'))
//     );
    
//     const nfts = uniqueAssets.filter(asset => 
//       asset.interface === 'ProgrammableNonFungibleV1' && 
//       !collections.includes(asset)
//     );
    
//     return {
//       collections: collections.map(asset => ({
//         id: asset.id,
//         name: asset.content?.metadata?.name || 'Unnamed Collection',
//         symbol: asset.content?.metadata?.symbol,
//         interface: asset.interface,
//         owner: asset.ownership?.owner || '',
//         authority: asset.ownership?.authority,
//         verified: asset.ownership?.verified || false,
//         supply: asset.supply,
//         royalty: asset.royalty,
//         created_at: asset.created_at,
//         content: asset.content,
//       })),
//       nfts: nfts.map(asset => ({
//         id: asset.id,
//         name: asset.content?.metadata?.name || 'Unnamed NFT',
//         symbol: asset.content?.metadata?.symbol,
//         interface: asset.interface,
//         owner: asset.ownership?.owner || '',
//         authority: asset.ownership?.authority,
//         collection: asset.grouping?.group_value,
//         verified: asset.ownership?.verified || false,
//         supply: asset.supply,
//         royalty: asset.royalty,
//         created_at: asset.created_at,
//         content: asset.content,
//       })),
//       totalAssets: uniqueAssets.length,
//     };
    
//   } catch (error) {
//     console.error('Failed to fetch assets:', error);
//     return {
//       collections: [],
//       nfts: [],
//       totalAssets: 0,
//     };
//   }
// }

// export async function getRecentAssets(authorityAddress: string, hours: number = 24): Promise<AssetInfo[]> {
//   try {
//     const assets = await getAssetsByAuthority(authorityAddress);
//     const allAssets = [...assets.collections, ...assets.nfts];
    
//     const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
//     return allAssets.filter(asset => 
//       new Date(asset.created_at) > cutoffTime
//     ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
//   } catch (error) {
//     console.error('Failed to fetch recent assets:', error);
//     return [];
//   }
// }

// export async function trackNewlyCreatedAssets(
//   authorityAddress: string, 
//   beforeAssets: CandyMachineAssets
// ): Promise<{
//   newCollections: AssetInfo[];
//   newNfts: AssetInfo[];
//   totalNew: number;
// }> {
//   try {
//     const currentAssets = await getAssetsByAuthority(authorityAddress);
    
//     // Find new collections
//     const newCollections = currentAssets.collections.filter(current => 
//       !beforeAssets.collections.some(before => before.id === current.id)
//     );
    
//     // Find new NFTs
//     const newNfts = currentAssets.nfts.filter(current => 
//       !beforeAssets.nfts.some(before => before.id === current.id)
//     );
    
//     return {
//       newCollections,
//       newNfts,
//       totalNew: newCollections.length + newNfts.length,
//     };
    
//   } catch (error) {
//     console.error('Failed to track new assets:', error);
//     return {
//       newCollections: [],
//       newNfts: [],
//       totalNew: 0,
//     };
//   }
// }
