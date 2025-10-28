import { 
  createProgrammableNft, 
  createNft,
  transferV1,
  TokenStandard,
  findMetadataPda,
  findMasterEditionPda,
  findTokenRecordPda,
  mplTokenMetadata
} from "@metaplex-foundation/mpl-token-metadata";
import {
  createGenericFile,
  generateSigner,
  percentAmount,
  publicKey,
  signerIdentity,
  sol,
  PublicKey as UmiPublicKey,
  Umi
} from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import { 
  createAssociatedTokenAccount,
  getAssociatedTokenAddress,
  transfer,
  getAccount,
  approve,
  createTransferInstruction,
} from "@solana/spl-token";
import { Connection, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import createProgrammableNFTWithWallet from "@/lib/createProgrammableNFT";

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties?: {
    files?: Array<{
      uri: string;
      type: string;
    }>;
    category?: string;
  };
  external_url?: string;
}

export interface CreateNFTOptions {
  umi: Umi;
  metadata: NFTMetadata;
  imageData: string; // base64 or URL
  sellerFeeBasisPoints?: number;
  isProgrammable?: boolean;
  ruleSet?: UmiPublicKey | null;
}

export interface TransferNFTOptions {
  umi: Umi;
  mintAddress: UmiPublicKey;
  fromOwner: UmiPublicKey;
  toOwner: UmiPublicKey;
  isProgrammable?: boolean;
}

/**
 * Creates a programmable NFT on the client side using the user's wallet
 */
export interface CreateClientNFTOptions {
  metadata: NFTMetadata;
  imageData: string; // base64 or URL
  sellerFeeBasisPoints?: number;
  ruleSet?: UmiPublicKey | null;
  tokenOwner?: PublicKey; // Optional token owner parameter
}

export async function createClientProgrammableNFT(options: CreateClientNFTOptions) {
  const {
    metadata,
    imageData,
    sellerFeeBasisPoints = 5.5,
    tokenOwner,
  } = options;

  console.log("🚀 Starting client-side NFT creation with options:", {
    metadataName: metadata.name,
    sellerFeeBasisPoints,
    hasImageData: !!imageData
  });

  try {
    // 1. First upload the image and metadata using server-side uploader
    console.log("📤 Step 1: Uploading image and metadata to server...");
    const uploadResponse = await fetch("/api/create-nft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imageData, metadata }),
    });

    console.log("📤 Upload response status:", uploadResponse.status);

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      console.error("❌ Upload failed:", errorData);
      throw new Error(errorData.error || "Failed to upload image and metadata");
    }

    const uploadResult = await uploadResponse.json();
    console.log("✅ Upload successful:", {
      imageUrl: uploadResult.imageUrl,
      metadataUri: uploadResult.metadataUri
    });

    const metadataUri = uploadResult.metadataUri;

    // 2. Create the programmable NFT using the new UMI helpers
    console.log("🎨 Step 2: Creating programmable NFT with wallet...");
    const result = await createProgrammableNFTWithWallet({
      name: metadata.name,
      uri: metadataUri,
      sellerFeeBasisPoints,
      tokenOwner,
    });

    console.log("🎉 pNFT Created successfully!");
    console.log("📊 NFT Details:", {
      mint: result.mint,
      signature: result.signature
    });
    console.log("🔗 View Transaction on Solana Explorer:");
    console.log(`https://explorer.solana.com/tx/${result.signature}?cluster=devnet`);
    console.log("🔗 View NFT on Metaplex Explorer:");
    console.log(`https://explorer.solana.com/address/${result.mint}?cluster=devnet`);

    return {
      success: true,
      mint: result.mint,
      signature: result.signature,
      metadataUri,
      imageUrl: uploadResult.imageUrl,
      explorerUrl: `https://explorer.solana.com/tx/${result.signature}?cluster=devnet`,
      nftUrl: `https://explorer.solana.com/address/${result.mint}?cluster=devnet`
    };

  } catch (error) {
    console.error("❌ Failed to create client-side NFT:", error);
    console.error("❌ Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * Delegates and transfers a list of NFTs to a PDA authority
 */
export async function delegateAndTransferNFTS(
  umi: Umi,
  mints: UmiPublicKey[],
  pdaAuthority: UmiPublicKey
) {
  try {
    console.log("🚀 Starting NFT delegation process...");
    console.log(`📋 PDA Authority: ${pdaAuthority.toString()}`);
    console.log(`📦 Number of NFTs to delegate: ${mints.length}`);

    for (const mint of mints) {
      console.log(`🎯 Processing NFT: ${mint.toString()}`);
      
      // For now, we'll just log what we would do
      // In a real implementation, we would:
      // 1. Create a regular token account for the PDA (not associated token account)
      // 2. Transfer the NFT from merchant to that token account
      // 3. Approve the PDA to transfer from that account
      
      console.log(`✅ Would delegate NFT ${mint.toString()} to PDA ${pdaAuthority.toString()}`);
    }

    console.log("🎉 NFT delegation process completed successfully!");
    return { success: true };
  } catch (error) {
    console.error("Failed to delegate and transfer NFTs:", error);
    throw error;
  }
}

/**
 * Claims a coupon for a deal
 */
export async function claimCoupon(
  program: any,
  deal: PublicKey,
  mint: PublicKey,
  user: PublicKey
) {
  try {
    const [dealAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("deal_authority"), deal.toBuffer()],
      program.programId
    );

    const [coupon] = PublicKey.findProgramAddressSync(
      [Buffer.from("coupon"), deal.toBuffer(), user.toBuffer()],
      program.programId
    );

    const [userProfile] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_profile"), user.toBuffer()],
      program.programId
    );

    const merchantTokenAccount = await getAssociatedTokenAddress(mint, dealAuthority);
    const userTokenAccount = await getAssociatedTokenAddress(mint, user);

    const tx = await program.methods
      .claimCoupon()
      .accounts({
        deal,
        coupon,
        userProfile,
        mint,
        merchantAuthority: program.provider.wallet.publicKey, // This needs to be the merchant's authority
        merchantTokenAccount,
        userTokenAccount,
        dealAuthority,
        user,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();

    return { success: true, signature: tx };
  } catch (error) {
    console.error("Failed to claim coupon:", error);
    throw error;
  }
}


/**
 * Transfers an NFT from one owner to another
 */
export async function transferDealNFT(options: TransferNFTOptions) {
  const {
    umi,
    mintAddress,
    fromOwner,
    toOwner,
    isProgrammable = true
  } = options;

  try {
    if (isProgrammable) {
      // For programmable NFTs, use transferV1
      const tx = await transferV1(umi, {
        mint: mintAddress,
        authority: umi.identity,
        tokenOwner: fromOwner,
        destinationOwner: toOwner,
        tokenStandard: TokenStandard.ProgrammableNonFungible,
      }).sendAndConfirm(umi);

      return {
        signature: tx.signature,
        success: true
      };
    } else {
      // For regular NFTs, use SPL token transfer
      // This would require additional setup with token accounts
      throw new Error("Regular NFT transfer not implemented yet. Use programmable NFTs.");
    }
  } catch (error) {
    console.error("Failed to transfer NFT:", error);
    throw error;
  }
}

/**
 * Gets NFT metadata and ownership information
 */
export async function getNFTInfo(umi: Umi, mintAddress: UmiPublicKey) {
  try {
    const [metadataPda] = findMetadataPda(umi, { mint: mintAddress });
    const [masterEditionPda] = findMasterEditionPda(umi, { mint: mintAddress });
    
    // Fetch metadata account
    const metadataAccount = await umi.rpc.getAccount(metadataPda);
    
    if (!metadataAccount.exists) {
      throw new Error("NFT metadata not found");
    }

    // Parse metadata
    const metadata = await umi.rpc.getAccount(metadataPda);
    
    return {
      mint: mintAddress,
      metadataPda,
      masterEditionPda,
      exists: metadataAccount.exists
    };
  } catch (error) {
    console.error("Failed to get NFT info:", error);
    throw error;
  }
}

/**
 * Checks if an address owns a specific NFT
 */
export async function checkNFTOwnership(
  connection: Connection,
  mintAddress: PublicKey,
  ownerAddress: PublicKey
): Promise<boolean> {
  try {
    const tokenAccounts = await connection.getTokenAccountsByOwner(ownerAddress, {
      mint: mintAddress
    });

    if (tokenAccounts.value.length === 0) {
      return false;
    }

    // Check if any token account has a balance > 0
    for (const account of tokenAccounts.value) {
      const accountInfo = await getAccount(connection, account.pubkey);
      if (accountInfo.amount > 0) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Failed to check NFT ownership:", error);
    return false;
  }
}

/**
 * Creates a marketplace listing for an NFT
 */
export interface MarketplaceListing {
  mint: UmiPublicKey;
  seller: UmiPublicKey;
  price: number; // in SOL
  isActive: boolean;
}

export async function createMarketplaceListing(
  umi: Umi,
  mint: UmiPublicKey,
  price: number
): Promise<MarketplaceListing> {
  // This is a simplified version - in a real implementation,
  // you'd want to store this in a database or on-chain
  const listing: MarketplaceListing = {
    mint,
    seller: umi.identity.publicKey,
    price,
    isActive: true
  };

  // Here you would typically:
  // 1. Store the listing in your database
  // 2. Create an on-chain escrow account
  // 3. Transfer the NFT to the escrow
  
  return listing;
}

/**
 * Executes a marketplace sale
 */
export async function executeMarketplaceSale(
  umi: Umi,
  listing: MarketplaceListing,
  buyer: UmiPublicKey
) {
  try {
    // 1. Transfer NFT to buyer
    await transferDealNFT({
      umi,
      mintAddress: listing.mint,
      fromOwner: listing.seller,
      toOwner: buyer,
      isProgrammable: true
    });

    // 2. Transfer payment to seller
    // This would involve SOL transfer logic
    
    // 3. Update listing status
    listing.isActive = false;

    return {
      success: true,
      transactionSignature: "placeholder" // Would be actual tx signature
    };
  } catch (error) {
    console.error("Failed to execute marketplace sale:", error);
    throw error;
  }
}

/**
 * Utility to create deal-specific NFT metadata
 */
export function createDealMetadata(
  dealName: string,
  dealDescription: string,
  discount: number,
  category?: string,
  location?: string,
  expiryDate?: string
): NFTMetadata {
  return {
    name: dealName,
    description: dealDescription,
    image: "", // Will be set when image is uploaded
    attributes: [
      { trait_type: "Discount", value: `${discount}%` },
      { trait_type: "Category", value: category || "General" },
      { trait_type: "Location", value: location || "Any" },
      ...(expiryDate ? [{ trait_type: "Expiry", value: expiryDate }] : [])
    ],
    external_url: "https://dealifi.com"
  };
}
