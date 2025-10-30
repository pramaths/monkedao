import { NextRequest, NextResponse } from "next/server";
import { 
  createGenericFile,
  generateSigner,
  signerIdentity,
  percentAmount,
  sol,
  createSignerFromKeypair
} from "@metaplex-foundation/umi";
import { 
  createProgrammableNft,
  mplTokenMetadata
} from "@metaplex-foundation/mpl-token-metadata";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { base58 } from "@metaplex-foundation/umi/serializers";
export async function POST(request: NextRequest) {
  try {
    const { imageData, metadata } = await request.json();

    const umi = createUmi("https://api.devnet.solana.com")
      .use(
        irysUploader({
          address: "https://devnet.irys.xyz",
        })
      );

    // Use the provided private key for server-side upload only
    const privateKeyArray = [78,225,37,69,10,25,93,64,37,100,212,124,220,93,210,128,247,122,31,202,159,206,200,161,101,200,136,72,9,231,97,242,22,17,69,71,22,208,35,16,72,64,145,222,147,202,252,201,130,178,231,141,59,225,173,111,219,27,117,100,253,155,253,116];
    const keypair = {
      publicKey: new Uint8Array(privateKeyArray.slice(32)),
      secretKey: new Uint8Array(privateKeyArray)
    };
    
    const signer = createSignerFromKeypair(umi, keypair as any);
    umi.use(signerIdentity(signer));
    // Airdrop SOL for testing (devnet only)


    // ** Upload an image to Arweave **
    const imageBlob = await (await fetch(imageData)).blob();
    const imageBytes = new Uint8Array(await imageBlob.arrayBuffer());
    
    const umiImageFile = createGenericFile(imageBytes, "deal-image.png", {
      tags: [{ name: "Content-Type", value: imageBlob.type }],
    });

    console.log("Uploading image...");
    const imageUri = await umi.uploader.upload([umiImageFile]).catch((err) => {
      throw new Error(err);
    });

    // ** Upload metadata to Arweave **
    const baseAttributes = Array.isArray(metadata.attributes) ? metadata.attributes : [];
    const updatedMetadata = {
      name: metadata.name,
      description: metadata.description,
      image: imageUri[0],
      external_url: "https://dealifi.com",
      // Ensure a redeemed flag is present for downstream logic
      attributes: [
        ...baseAttributes,
        { trait_type: "redeemed", value: "false" },
      ],
      properties: {
        files: [
          {
            uri: imageUri[0],
            type: imageBlob.type,
          },
        ],
        category: "image",
      },
    };

    console.log("Uploading metadata...");
    const metadataUri = await umi.uploader.uploadJson(updatedMetadata).catch((err) => {
      throw new Error(`Failed to upload metadata: ${err}`);
    });
    console.log("Metadata uploaded successfully");
    console.log("Metadata URI:", metadataUri);
    return NextResponse.json({
      success: true,
      imageUrl: imageUri[0],
      imageType: imageBlob.type,
      metadataUri: metadataUri,
      metadata: updatedMetadata
    });

  } catch (error) {
    console.error("Failed to upload image and metadata:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
