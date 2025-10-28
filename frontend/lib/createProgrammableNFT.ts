import { generateSigner, percentAmount, publicKey } from '@metaplex-foundation/umi'
import { createProgrammableNft } from '@metaplex-foundation/mpl-token-metadata'
import { PublicKey } from '@solana/web3.js'
import umiWithCurrentWalletAdapter from './umi/umiWithCurrentWalletAdapter'
import sendAndConfirmWalletAdapter from './umi/sendAndConfirmWithWalletAdapter'

interface CreateProgrammableNFTOptions {
  name: string
  uri: string
  sellerFeeBasisPoints?: number
  tokenOwner?: PublicKey // Optional token owner parameter
}

const createProgrammableNFTWithWallet = async ({
  name,
  uri,
  sellerFeeBasisPoints = 5.5,
  tokenOwner,
}: CreateProgrammableNFTOptions) => {
  console.log("🎨 createProgrammableNFTWithWallet called with:", {
    name,
    uri,
    sellerFeeBasisPoints
  });

  try {
    // Import Umi from `umiWithCurrentWalletAdapter`.
    console.log("🔗 Getting UMI instance with current wallet...");
    const umi = umiWithCurrentWalletAdapter()
    console.log("✅ UMI instance created successfully");

    // Generate a new mint signer
    console.log("🔑 Generating new mint signer...");
    const mint = generateSigner(umi)
    console.log("✅ Mint signer generated:", mint.publicKey.toString());

    // Create a transactionBuilder using the `createProgrammableNft` function
    console.log("📝 Creating programmable NFT transaction...");
    const tx = createProgrammableNft(umi, {
      mint,
      name,
      tokenOwner: tokenOwner ? publicKey(tokenOwner.toString()) : umi.identity.publicKey,
      uri,
      sellerFeeBasisPoints: percentAmount(sellerFeeBasisPoints),
    })
    console.log("✅ Transaction builder created");

    // Use the sendAndConfirmWithWalletAdapter method to send the transaction.
    console.log("📡 Sending transaction to blockchain...");
    const res = await sendAndConfirmWalletAdapter(tx)
    console.log("✅ Transaction confirmed:", {
      signature: res.signature,
      confirmation: res.confirmation
    });

    return {
      mint: mint.publicKey.toString(),
      signature: res.signature,
      confirmation: res.confirmation,
    }
  } catch (error) {
    console.error("❌ Error in createProgrammableNFTWithWallet:", error);
    throw error;
  }
}

export default createProgrammableNFTWithWallet
