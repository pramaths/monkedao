import {
  generateSigner,
  publicKey,
  some,
  none,
  unwrapOption,
  percentAmount,
  Signer,
  Umi,
  publicKey as umiPublicKey,
  sol,
  dateTime,
} from '@metaplex-foundation/umi';
import {
  create,
  fetchCandyMachine,
  addConfigLines,
  mintV2,
  safeFetchCandyGuard,
  route,
  getMerkleRoot,
  getMerkleProof,
  DefaultGuardSetMintArgs,
  ConfigLineSettings,
  ConfigLine,
} from '@metaplex-foundation/mpl-candy-machine';
import {
  createNft,
  TokenStandard,
  fetchMetadata,
  findMetadataPda,
} from '@metaplex-foundation/mpl-token-metadata';
import { umi } from '@/lib/umi';
import { transactionBuilder } from '@metaplex-foundation/umi';
import { setComputeUnitLimit, setComputeUnitPrice } from '@metaplex-foundation/mpl-toolbox';
import { updateCandyMachineAfterMint } from '@/lib/merchant-db';

// Types for our candy machine setup
export interface CandyMachineConfig {
  itemsAvailable: number;
  symbol: string;
  sellerFeeBasisPoints: number;
  maxSupply: number;
  isMutable: boolean;
  configLineSettings?: ConfigLineSettings;
  hiddenSettings?: any;
}

export interface GuardConfig {
  solPayment?: {
    lamports: number;
    destination: string;
  };
  mintLimit?: {
    id: number;
    limit: number;
  };
  startDate?: {
    date: number;
  };
  endDate?: {
    date: number;
  };
  allowList?: string[];
}

export interface CandyMachineStatus {
  itemsAvailable: number;
  itemsRedeemed: number;
  remaining: number;
  isActive: boolean;
  itemsLoaded: number;
  guards: any;
}

export class DealifiCandyMachineManager {
  private umi: Umi;

  constructor(umiInstance?: Umi) {
    this.umi = umiInstance || umi;
    if (!this.umi.identity || !this.umi.identity.publicKey) {
      throw new Error('Umi instance does not have a valid identity. Please ensure your wallet is connected.');
    }
  }

  async createCandyMachine(config: CandyMachineConfig, guards?: GuardConfig) {
    try {

      // Step 1: Create collection NFT
      const collection = await this.createCollection(config.symbol);
      console.log('Collection:', collection.publicKey.toString());

      // Derive the metadata PDA from the mint and retry fetch to handle RPC propagation
      const [metadataPda] = findMetadataPda(this.umi, { mint: collection.publicKey });
      let metadataFetched = false;
      for (let i = 0; i < 5; i++) {
        try {
          await fetchMetadata(this.umi, metadataPda);
          metadataFetched = true;
          break;
        } catch (e: any) {
          if (e.name !== 'AccountNotFoundError' || i === 4) throw e;
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
      if (!metadataFetched) {
        throw new Error('Failed to confirm collection metadata after retries.');
      }

      console.log('Metadata PDA found:', metadataPda.toString());

      // Step 2: Create candy machine
      const candyMachine = await this.createCandyMachineInternal(config, collection, guards);
      console.log('CandyMachine:', candyMachine.publicKey.toString());

      return {
        candyMachine: candyMachine.publicKey,
        collection: collection.publicKey,
        success: true,
      };
    } catch (error) {
      throw error;
    }
  }

  private async createCollection(symbol: string) {
    const collectionMint = generateSigner(this.umi);

    try {
      // Validate wallet and account info
      const account = await this.umi.rpc.getAccount(this.umi.identity.publicKey);
      if (!account.exists) {
        throw new Error('Wallet account does not exist on Solana network');
      }

      // Create the NFT with explicit payer configuration
      const transactionBuilder = createNft(this.umi, {
        mint: collectionMint,
        authority: this.umi.identity,
        name: `${symbol} Collection`,
        symbol: symbol,
        uri: 'https://devnet.irys.xyz/2ncwSrZHdzrsjh85Pmko1YM9jDUNLiVzRiXR6cZ2wGHh',
        sellerFeeBasisPoints: percentAmount(5, 2), // 5% = 500 basis points
        creators: [
          {
            address: this.umi.identity.publicKey,
            verified: true,
            share: 100,
          },
        ],
        isCollection: true,
        collectionDetails: {
          __kind: 'V1',
          size: 0,
        },
      });

      await transactionBuilder.sendAndConfirm(this.umi, {send: { skipPreflight: true}});
  
      // Return both the publicKey and the update authority to ensure consistency
      return {
        publicKey: collectionMint.publicKey,
        updateAuthority: this.umi.identity.publicKey,
      };
    } catch (error) {
      throw new Error(
        `Collection creation failed: ${(error as any).message}. Check console for detailed logs.`
      );
    }
  }

  private async createCandyMachineInternal(
    config: CandyMachineConfig,
    collection: any,
    guards?: GuardConfig
  ) {
    // Ensure we have a valid identity
    if (!this.umi.identity || !this.umi.identity.publicKey) {
      throw new Error('No valid identity found. Please ensure your wallet is connected.');
    }

    const candyMachine = generateSigner(this.umi);

    try {
      const prefixName = `${config.symbol} #`;
      const prefixUri = '';
      const maxNameLen = 32;
      const maxUriLen = 200;

      if (prefixName.length > maxNameLen) {
        throw new Error(`Prefix name '${prefixName}' exceeds ${maxNameLen} chars. Use a shorter symbol.`);
      }
      if (prefixUri.length > maxUriLen) {
        throw new Error(`Prefix URI '${prefixUri}' exceeds ${maxUriLen} chars.`);
      }

      // Build guards from provided config
      const guardConfig: any = {};
      if (guards?.solPayment) {
        const dest = (guards.solPayment.destination && guards.solPayment.destination.trim().length > 0)
          ? guards.solPayment.destination
          : this.umi.identity.publicKey?.toString();
        if (!dest) throw new Error('No valid identity found for destination');
        guardConfig.solPayment = some({
          lamports: sol((guards.solPayment.lamports || 0) / 1_000_000_000),
          destination: publicKey(dest),
        });
      }
      if (guards?.startDate?.date) {
        guardConfig.startDate = some({
          date: dateTime(new Date(guards.startDate.date * 1000).toISOString()),
        });
      }
      if (guards?.endDate?.date) {
        guardConfig.endDate = some({
          date: dateTime(new Date(guards.endDate.date * 1000).toISOString()),
        });
      }
      console.log('🛡️ Setting up guards:', guardConfig);
      const guardsToUse = Object.keys(guardConfig).length > 0 ? guardConfig : undefined;

      const transactionBuilder = await create(this.umi, {
        candyMachine,
        collectionMint: collection.publicKey,
        authority: this.umi.identity.publicKey,
        payer: this.umi.identity,
        collectionUpdateAuthority: this.umi.identity.publicKey,
        tokenStandard: TokenStandard.NonFungible,
        sellerFeeBasisPoints: percentAmount(5, 2),
        itemsAvailable: config.itemsAvailable,
        creators: [
          {
            address: this.umi.identity.publicKey,
            verified: true,
            percentageShare: 100,
          },
        ],
        configLineSettings: some({
          prefixName,
          nameLength: Math.max(0, maxNameLen - prefixName.length), 
          prefixUri,
          uriLength: Math.max(0, maxUriLen - prefixUri.length),
          isSequential: false,
        }),
        hiddenSettings: none(),
        ...(guardsToUse && { guards: guardsToUse }),
      });

      const result = await transactionBuilder.sendAndConfirm(this.umi);
      
      console.log('CandyMachine:', candyMachine.publicKey.toString());
      return candyMachine;
    } catch (error) {
      try {
        // Attempt to surface program logs if available
        const anyErr: any = error as any;
        const logs = typeof anyErr?.getLogs === 'function' ? await anyErr.getLogs() : anyErr?.logs;
        if (logs) console.error('Program logs:', logs);
      } catch {}
      throw error;
    }
  }

  // Helper: append config lines to the end
  async appendConfigLines(candyMachineAddress: any, lines: ConfigLine[]) {
    const candyMachine = await this.fetchCandyMachineWithRetry(candyMachineAddress);
    await addConfigLines(this.umi, {
      candyMachine: candyMachineAddress,
      index: candyMachine.itemsLoaded,
      configLines: lines,
    }).sendAndConfirm(this.umi);
  }

  // Helper: add config lines starting at a given index
  async addConfigLinesAtIndex(candyMachineAddress: any, index: number, lines: ConfigLine[]) {
    await addConfigLines(this.umi, {
      candyMachine: candyMachineAddress,
      index,
      configLines: lines,
    }).sendAndConfirm(this.umi);
  }

  // Helper: update a single config line at an index
  async updateConfigLineAtIndex(candyMachineAddress: any, index: number, line: ConfigLine) {
    await this.addConfigLinesAtIndex(candyMachineAddress, index, [line]);
  }

  async mintNFT(candyMachineAddress: any, userWallet: Signer) {
    try {
      console.log('🎯 Starting NFT mint...');

      const candyMachine = await fetchCandyMachine(this.umi, candyMachineAddress);
      console.log('📊 Candy machine data:', {
        itemsAvailable: candyMachine.data.itemsAvailable,
        itemsRedeemed: candyMachine.itemsRedeemed,
        itemsLoaded: candyMachine.itemsLoaded,
        remaining:
          candyMachine.data.itemsAvailable - candyMachine.itemsRedeemed,
      });

      // Validate candy machine state
      if (candyMachine.itemsRedeemed >= candyMachine.data.itemsAvailable) {
        throw new Error('Candy machine is empty');
      }

      if (candyMachine.itemsLoaded === 0) {
        throw new Error('Candy machine has no items loaded. Please add items first.');
      }

      if (candyMachine.itemsLoaded < Number(candyMachine.itemsRedeemed) + 1) {
        throw new Error('Not enough items loaded to mint. Please add more items.');
      }

      // Candy Machine v3 requires all config lines to be fully loaded before first mint
      if (Number(candyMachine.itemsLoaded) !== Number(candyMachine.data.itemsAvailable)) {
        throw new Error(
          `Candy machine must be fully loaded before minting. Loaded ${candyMachine.itemsLoaded} / ${candyMachine.data.itemsAvailable}.`
        );
      }

      const candyGuard = await safeFetchCandyGuard(
        this.umi,
        candyMachine.mintAuthority
      );

      console.log('🛡️ Candy guard data:', candyGuard);

      const mintArgs = await this.buildMintArgs(candyGuard, userWallet);
      
      console.log('🎯 Mint args:', mintArgs);
      const nftMint = generateSigner(this.umi);

      try {
        // For public minting, use the candy machine as the collection update authority
        const collectionUpdateAuthority = candyMachine.authority;
        
        console.log('🔑 Collection update authority (candy machine):', collectionUpdateAuthority);
        console.log('👤 Current wallet:', userWallet.publicKey);
        console.log('🏭 Candy machine address:', candyMachineAddress);
        
        const { signature } = await transactionBuilder()
          .add(setComputeUnitLimit(this.umi, { units: 1_200_000 }))
          .add(setComputeUnitPrice(this.umi, { microLamports: 1_000 }))
          .add(
            mintV2(this.umi, {
              candyMachine: candyMachineAddress,
              nftMint,
              collectionMint: candyMachine.collectionMint,
              collectionUpdateAuthority: collectionUpdateAuthority,
              payer: userWallet,
              mintArgs,
              tokenStandard: candyMachine.tokenStandard,
            })
          )
          .sendAndConfirm(this.umi);

        console.log('✅ NFT minted successfully:', nftMint.publicKey);

        // Try to fetch metadata URI for DB update
        let mintedUri: string | null = null;
        try {
          const [metadataPda] = findMetadataPda(this.umi, { mint: nftMint.publicKey });
          const metadata = await fetchMetadata(this.umi, metadataPda);
          // @ts-ignore - metadata data may include uri depending on version
          mintedUri = (metadata as any)?.data?.uri || null;
        } catch (_) {}

        // Persist minted record to DB (best-effort)
        try {
          await updateCandyMachineAfterMint({
            candyMachineAddress: candyMachineAddress.toString(),
            mint: nftMint.publicKey.toString(),
            authority: userWallet.publicKey.toString(),
            uri: mintedUri,
          });
        } catch (e) {
          console.warn('⚠️ Failed to update DB after mint:', (e as any)?.message || e);
        }

        return nftMint.publicKey;
      } catch (error) {
        console.error('❌ Error minting NFT:', error);
        throw new Error(`NFT minting failed: ${(error as any).message}.`);
      }
    } catch (error) {
      console.error('❌ Error minting NFT:', error);
      throw error;
    }
  }

  private async fetchCandyMachineWithRetry(
    publicKey: any,
    retries = 10,
    delay = 3000
  ): Promise<any> {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(
          `[Attempt ${i + 1}/${retries}] Fetching candy machine...`
        );
        const candyMachine = await fetchCandyMachine(this.umi, publicKey);
        console.log('✅ Found candy machine account!');
        return candyMachine;
      } catch (error: any) {
        if (error.name === 'AccountNotFoundError' && i < retries - 1) {
          console.log(`Account not found, retrying in ${delay / 1000}s...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        console.error(`Failed to fetch candy machine: ${error.message}`);
        throw error;
      }
    }
    throw new Error('Failed to fetch candy machine after multiple retries.');
  }

  private async checkAllowListProof(
    candyMachine: any,
    candyGuard: any,
    userWallet: Signer,
    allowList: string[]
  ) {
    return false;
  }

  private async buildMintArgs(
    candyGuard: any,
    userWallet: Signer
  ): Promise<Partial<DefaultGuardSetMintArgs>> {
    const mintArgs: Partial<DefaultGuardSetMintArgs> = {};

    console.log('🔍 Available guards:', Object.keys(candyGuard?.guards || {}));

    // Handle SOL payment guard - match the documentation structure
    const solPayment = unwrapOption(candyGuard?.guards?.solPayment);
    if (
      solPayment &&
      typeof solPayment === 'object' &&
      'destination' in solPayment &&
      typeof solPayment.destination === 'string'
    ) {
      console.log('💰 SOL Payment guard found:', solPayment);
      // According to docs: mintArgs should have solPayment: some({ destination: ... })
      mintArgs.solPayment = some({
        destination: publicKey(solPayment.destination),
      });
    }

    console.log('🎯 Final mint args:', mintArgs);
    return mintArgs;
  }

  async getCandyMachineStatus(
    candyMachineAddress: any
  ): Promise<CandyMachineStatus> {
    try {
      const candyMachine = await fetchCandyMachine(this.umi, candyMachineAddress);
      const candyGuard = await safeFetchCandyGuard(
        this.umi,
        candyMachine.mintAuthority
      );

      return {
        itemsAvailable: Number(candyMachine.data.itemsAvailable),
        itemsRedeemed: Number(candyMachine.itemsRedeemed),
        itemsLoaded: candyMachine.itemsLoaded || 0,
        remaining:
          Number(candyMachine.data.itemsAvailable) -
          Number(candyMachine.itemsRedeemed),
        isActive:
          candyMachine.itemsRedeemed < candyMachine.data.itemsAvailable,
        guards: candyGuard?.guards || null,
      };
    } catch (error) {
      console.error('Error fetching candy machine status:', error);
      throw error;
    }
  }

  async getRawCandyMachineData(candyMachineAddress: any) {
    try {
      return await this.fetchCandyMachineWithRetry(candyMachineAddress);
    } catch (error) {
      console.error('Error fetching raw candy machine data:', error);
      throw error;
    }
  }

  async updateCandyMachineGuards(candyMachineAddress: any, guards: GuardConfig) {
    try {
      // Ensure we have a valid identity
      if (!this.umi.identity || !this.umi.identity.publicKey) {
        throw new Error('No valid identity found. Please ensure your wallet is connected.');
      }

      const candyMachine = await fetchCandyMachine(this.umi, candyMachineAddress);
      
      // Build guards from provided config
      const guardConfig: any = {};
      if (guards?.solPayment) {
        const dest = (guards.solPayment.destination && guards.solPayment.destination.trim().length > 0)
          ? guards.solPayment.destination
          : this.umi.identity.publicKey?.toString();
        if (!dest) throw new Error('No valid identity found for destination');
        guardConfig.solPayment = some({
          lamports: sol((guards.solPayment.lamports || 0) / 1_000_000_000),
          destination: publicKey(dest),
        });
      }
      if (guards?.startDate?.date) {
        guardConfig.startDate = some({
          date: dateTime(new Date(guards.startDate.date * 1000).toISOString()),
        });
      }
      if (guards?.endDate?.date) {
        guardConfig.endDate = some({
          date: dateTime(new Date(guards.endDate.date * 1000).toISOString()),
        });
      }

      console.log('🛡️ Updating guards (SOL payment + start date only):', guardConfig);

      // Use the route instruction to update guards
      const transactionBuilder = await route(this.umi, {
        candyMachine: candyMachineAddress,
        guard: 'default',
        routeArgs: guardConfig,
      });

      const { signature } = await transactionBuilder.sendAndConfirm(this.umi);
      console.log('✅ Guards updated successfully:', signature);
      
      return signature;
    } catch (error) {
      console.error('Error updating candy machine guards:', error);
      throw error;
    }
  }

  async checkCandyMachineHealth(candyMachineAddress: any) {
    try {
      const candyMachine = await fetchCandyMachine(this.umi, candyMachineAddress);
      const candyGuard = await safeFetchCandyGuard(this.umi, candyMachine.mintAuthority);
      
      const health = {
        itemsAvailable: Number(candyMachine.data.itemsAvailable),
        itemsRedeemed: Number(candyMachine.itemsRedeemed),
        itemsLoaded: candyMachine.itemsLoaded || 0,
        remaining: Number(candyMachine.data.itemsAvailable) - Number(candyMachine.itemsRedeemed),
        hasItems: (candyMachine.itemsLoaded || 0) > 0,
        hasGuards: !!candyGuard,
        isLive: true, // Will be determined by guard conditions
        issues: [] as string[],
        guards: Object.keys(candyGuard?.guards || {}),
        authority: candyMachine.authority,
        currentWallet: this.umi.identity?.publicKey?.toString() || null,
        canMint: true // Anyone can mint from public candy machines
      };

      // Check for issues
      if (health.itemsLoaded === 0) {
        health.issues.push('No items loaded - candy machine needs items to be added');
      }
      
      if (health.remaining <= 0) {
        health.issues.push('No remaining items to mint');
      }
      
      if (!health.hasGuards) {
        health.issues.push('No guards configured - may cause minting issues');
      }

      console.log('🏥 Candy machine health check:', health);
      return health;
    } catch (error) {
      console.error('Error checking candy machine health:', error);
      throw error;
    }
  }
}