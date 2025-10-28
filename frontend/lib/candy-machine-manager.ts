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
} from '@metaplex-foundation/umi';
import {
  mplCandyMachine,
  create,
  fetchCandyMachine,
  addConfigLines,
  mintV2,
  safeFetchCandyGuard,
  safeFetchMintCounterFromSeeds,
  route,
  getMerkleRoot,
  getMerkleProof,
  DefaultGuardSetMintArgs,
  Creator,
  ConfigLineSettings,
  ConfigLine,
  createCandyMachineV2,
} from '@metaplex-foundation/mpl-candy-machine';
import {
  mplTokenMetadata,
  createNft,
  TokenStandard,
  fetchMetadata,
  findMetadataPda,
} from '@metaplex-foundation/mpl-token-metadata';
import { umi } from '@/lib/umi'; // Import the singleton Umi instance

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
  allowList?: string[];
}

export interface CandyMachineStatus {
  itemsAvailable: number;
  itemsRedeemed: number;
  remaining: number;
  isActive: boolean;
  guards: any;
}

export class DealifiCandyMachineManager {
  private umi: Umi;

  constructor(umiInstance?: Umi) {
    // Use provided Umi instance or fall back to singleton
    this.umi = umiInstance || umi;
    // Ensure the Umi instance has a valid identity
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

      // Step 2: Create candy machine
      const candyMachine = await this.createCandyMachineInternal(config, collection);
      console.log('CandyMachine:', candyMachine.publicKey.toString());

      // Optional: Insert items and configure guards using helper methods

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
        uri: 'https://arweave.net/placeholder-collection-metadata',
        sellerFeeBasisPoints: percentAmount(5, 2), // 5% = 500 basis points
        creators: [
          {
            address: this.umi.identity.publicKey,
            verified: true,
            share: 100,
          },
        ],
        isCollection: true,
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
    collection: any
  ) {
    const candyMachine = generateSigner(this.umi);

    try {
      // Compute safe lengths to satisfy Candy Machine Core constraints
      const prefixName = `${config.symbol} #`;
      const prefixUri = 'https://arweave.net/';
      // Program limits: name <= 32, uri <= 200
      const maxNameLen = 32;
      const maxUriLen = 200;

      if (prefixName.length > maxNameLen) {
        throw new Error(`Prefix name '${prefixName}' exceeds ${maxNameLen} chars. Use a shorter symbol.`);
      }
      if (prefixUri.length > maxUriLen) {
        throw new Error(`Prefix URI '${prefixUri}' exceeds ${maxUriLen} chars.`);
      }

      const transactionBuilder = await create(this.umi, {
        candyMachine,
        collectionMint: collection.publicKey,
        payer: this.umi.identity,
        collectionUpdateAuthority: this.umi.identity,
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
          // nameLength is the max suffix length; ensure it's non-negative
          nameLength: Math.max(0, maxNameLen - prefixName.length), 
          prefixUri,
          // uriLength is the max suffix length; ensure it's non-negative
          uriLength: Math.max(0, maxUriLen - prefixUri.length),
          isSequential: false,
        }),
        hiddenSettings: none(),
      });

      const result = await transactionBuilder.sendAndConfirm(this.umi);
      
      console.log('CandyMachine:', candyMachine.publicKey.toString());

      // Verify the candy machine was created using a retry mechanism
      // Small delay to allow RPC propagation
      await new Promise((r) => setTimeout(r, 8000));
      const createdCandyMachine = await this.fetchCandyMachineWithRetry(
        candyMachine.publicKey
      );

      return candyMachine;
    } catch (error) {
      throw error;
    }
  }

  private async addInitialConfigLines(
    candyMachineAddress: any,
    config: CandyMachineConfig
  ) {
    const configLines: ConfigLine[] = [];

    // Add sample config lines with suffixes only
    // Keep suffixes small to fit within (nameLength, uriLength)
    for (let i = 0; i < Math.min(10, config.itemsAvailable); i++) {
      const nameSuffix = (i + 1).toString();
      const uriSuffix = `n${i + 1}.json`;

      // Validate sizes against our configured limits: name<=32, uri<=200 with prefixes
      if (nameSuffix.length > 32) {
        throw new Error(`Config line name suffix too long at index ${i}`);
      }
      if (uriSuffix.length > 200) {
        throw new Error(`Config line URI suffix too long at index ${i}`);
      }

      configLines.push({
        name: nameSuffix,
        uri: uriSuffix,
      });
    }

    try {
      const candyMachine = await this.fetchCandyMachineWithRetry(
        candyMachineAddress
      );

      await addConfigLines(this.umi, {
        candyMachine: candyMachineAddress,
        index: candyMachine.itemsLoaded, // Use itemsLoaded as the starting index
        configLines,
      }).sendAndConfirm(this.umi);
    } catch (error) {
      throw new Error(
        `Config lines addition failed: ${(error as any).message}.`
      );
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

  private async setupGuards(candyMachineAddress: any, guards: GuardConfig) {
    console.log('Setting up guards:', guards);
  }

  async mintNFT(candyMachineAddress: any, userWallet: Signer) {
    try {
      console.log('🎯 Starting NFT mint...');

      const candyMachine = await fetchCandyMachine(this.umi, candyMachineAddress);
      console.log('📊 Candy machine data:', {
        itemsAvailable: candyMachine.data.itemsAvailable,
        itemsRedeemed: candyMachine.itemsRedeemed,
        remaining:
          candyMachine.data.itemsAvailable - candyMachine.itemsRedeemed,
      });

      if (candyMachine.itemsRedeemed >= candyMachine.data.itemsAvailable) {
        throw new Error('Candy machine is empty');
      }

      const candyGuard = await safeFetchCandyGuard(
        this.umi,
        candyMachine.mintAuthority
      );

      await this.validateGuardConditions(candyGuard, userWallet);
      await this.executeGuardRoutes(candyMachine, candyGuard, userWallet);
      const mintArgs = await this.buildMintArgs(candyGuard, userWallet);
      const nftMint = generateSigner(this.umi);

      try {
        await mintV2(this.umi, {
          candyMachine: candyMachineAddress,
          nftMint,
          collectionMint: candyMachine.collectionMint,
          collectionUpdateAuthority: this.umi.identity.publicKey,
          payer: userWallet,
          mintArgs,
        }).sendAndConfirm(this.umi);

        console.log('✅ NFT minted successfully:', nftMint.publicKey);
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

  private async validateGuardConditions(candyGuard: any, userWallet: Signer) {
    if (!candyGuard) return;

    const startDate = unwrapOption(candyGuard.guards?.startDate);
    if (
      startDate &&
      typeof startDate === 'object' &&
      'date' in startDate &&
      typeof startDate.date === 'number'
    ) {
      const slot = await this.umi.rpc.getSlot();
      const solanaTime = await this.umi.rpc.getBlockTime(slot);

      if (solanaTime && solanaTime < startDate.date) {
        throw new Error('Minting has not started yet');
      }
    }
  }

  private async executeGuardRoutes(
    candyMachine: any,
    candyGuard: any,
    userWallet: Signer
  ) {
    const allowList = unwrapOption(candyGuard.guards?.allowList);
    if (allowList && Array.isArray(allowList)) {
      if (!(await this.checkAllowListProof(candyMachine, candyGuard, userWallet, allowList))) {
        await route(this.umi, {
          guard: 'allowList',
          candyMachine: candyMachine.publicKey,
          candyGuard: candyGuard.publicKey,
          group: 'default',
          routeArgs: {
            path: 'proof',
            merkleRoot: getMerkleRoot(allowList),
            merkleProof: getMerkleProof(allowList, userWallet.publicKey),
          },
        }).sendAndConfirm(this.umi);
      }
    }
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

    const solPayment = unwrapOption(candyGuard?.guards?.solPayment);
    if (
      solPayment &&
      typeof solPayment === 'object' &&
      'destination' in solPayment &&
      typeof solPayment.destination === 'string'
    ) {
      mintArgs.solPayment = some({
        destination: publicKey(solPayment.destination),
      });
    }

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
}
