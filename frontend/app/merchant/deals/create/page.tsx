"use client";

import { useState, useEffect } from "react";
import { useUmiWallet } from "@/hooks/useUmiWallet";
import { useDealifiProgram } from "@/components/DealifiProgramProvider";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  createDealMetadata,
  createClientProgrammableNFT,
  delegateAndTransferNFTS,
} from "@/lib/nft-utils";
import { toast, Toaster } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImageGenerator } from "@/components/ImageGenerator";
import { useRouter } from "next/navigation";
import { BN } from "@coral-xyz/anchor";
import useUmiStore from "@/store/useUmiStore";
import { publicKey } from "@metaplex-foundation/umi";

const formSchema = z.object({
  dealName: z.string().min(2, "Deal name must be at least 2 characters."),
  dealDescription: z.string().min(10, "Description must be at least 10 characters."),
  discount: z.number().min(1).max(100, "Discount must be between 1-100%"),
  price: z.number().min(0, "Price must be 0 or more"),
  totalSupply: z.number().min(1, "Supply must be at least 1"),
  expiryDays: z.number().min(1, "Expiry must be at least 1 day"),
  redemptionRule: z.string().min(5, "Redemption rule must be at least 5 characters"),
  geoTag: z.string().optional(),
  category: z.string().optional(),
  imageData: z.string().min(1, "Please generate or upload an image."),
});

export default function CreateDealPage() {
  const [creating, setCreating] = useState(false);
  const [merchantPda, setMerchantPda] = useState<PublicKey | null>(null);
  const [merchantData, setMerchantData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { connected, publicKey: walletPublicKey, isUmiReady } = useUmiWallet();
  const { program } = useDealifiProgram();
  const umi = useUmiStore((state) => state.umi);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dealName: "",
      dealDescription: "",
      discount: 20,
      price: 0,
      totalSupply: 100,
      expiryDays: 30,
      redemptionRule: "",
      geoTag: "",
      category: "",
      imageData: "",
    },
  });

  useEffect(() => {
    if (walletPublicKey && program) {
      checkMerchantAccount();
    }
  }, [walletPublicKey, program]);

  const checkMerchantAccount = async () => {
    if (!walletPublicKey || !program) return;

    setLoading(true);
    try {
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("merchant"), walletPublicKey.toBuffer()],
        program.programId
      );

      setMerchantPda(pda);

      const merchant = await program.account.merchant.fetch(pda);
      setMerchantData(merchant);
    } catch (error) {
      toast.error("⚠️ You must be a registered merchant to create deals!");
      setTimeout(() => router.push("/merchant"), 2000);
    } finally {
      setLoading(false);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("🎯 Merchant onSubmit called with state:", {
      hasProgram: !!program,
      publicKey: walletPublicKey?.toString(),
      hasMerchantPda: !!merchantPda,
      hasMerchantData: !!merchantData,
      isUmiReady
    });

    if (
      !program ||
      !walletPublicKey ||
      !merchantPda ||
      !merchantData ||
      !isUmiReady
    ) {
      console.error("❌ Missing requirements:", {
        hasProgram: !!program,
        hasPublicKey: !!walletPublicKey,
        hasMerchantPda: !!merchantPda,
        hasMerchantData: !!merchantData,
        isUmiReady
      });
      toast.error("⚠️ Please connect your wallet and ensure you're a merchant!");
      return;
    }

    console.log("✅ All requirements met, starting deal creation...");
    setCreating(true);
    try {
      const {
        dealName,
        dealDescription,
        imageData,
        discount,
        price,
        totalSupply,
        expiryDays,
        redemptionRule,
        geoTag,
        category,
      } = values;

      console.log("📋 Merchant form values:", {
        dealName,
        dealDescription,
        discount,
        price,
        totalSupply,
        expiryDays,
        redemptionRule,
        geoTag,
        category,
        hasImageData: !!imageData
      });

      // 1. Create NFT metadata
      toast.info("📋 Creating NFT metadata...");
      const metadata = createDealMetadata(
        dealName,
        dealDescription,
        discount,
        category,
        geoTag
      );
      
      console.log("📄 Created merchant metadata:", metadata);
      
      // 2. Derive deal PDA
      console.log("--- DEBUGGING merchantData.totalDeals ---");
      console.log("Value:", merchantData.totalDeals);
      console.log("Type:", typeof merchantData.totalDeals);
      console.log("Is it a BN instance?", merchantData.totalDeals instanceof BN);
      
      // Convert to number and create buffer manually
      const totalDealsNumber = merchantData.totalDeals.toNumber();
      const totalDealsBuffer = Buffer.alloc(8);
      totalDealsBuffer.writeUInt32LE(totalDealsNumber, 0);

      const [dealPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("deal"), merchantPda.toBuffer(), totalDealsBuffer],
        program.programId
      );

      // 4. Derive deal authority PDA first
      const [dealAuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("deal_authority"), dealPda.toBuffer()],
        program.programId
      );

      // 5. Mint all NFTs for the deal with PDA as token owner
      toast.info(`Minting ${totalSupply} NFTs for the deal...`);
      const mints = [];
      let metadataUri = "";
      for (let i = 0; i < totalSupply; i++) {
        const nftResult = await createClientProgrammableNFT({
          metadata,
          imageData,
          sellerFeeBasisPoints: 5.5,
          tokenOwner: dealAuthorityPda, // Pass the PDA as token owner
        });
        if (i === 0) {
          metadataUri = nftResult.metadataUri;
        }
        mints.push(publicKey(nftResult.mint));
      }
      toast.success(`${totalSupply} NFTs minted successfully with PDA as owner!`);


      // 6. Create Deal on-chain
      toast.info("⛓️ Creating deal on blockchain...");
      const expiryTimestamp = Math.floor(Date.now() / 1000) + expiryDays * 86400;
      const priceInLamports = new BN(price * LAMPORTS_PER_SOL);

      const tx = await program.methods
        .createDeal(
          metadataUri,
          new BN(discount),
          priceInLamports,
          totalSupply,
          new BN(expiryTimestamp),
          redemptionRule,
          geoTag || null,
          category || null
        )
        .accountsStrict({
          merchant: merchantPda,
          deal: dealPda,
          dealAuthority: dealAuthorityPda,
          authority: walletPublicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      toast.success(
        <div>
          <p className="font-bold">🎉 DEAL CREATED!</p>
          <a
            href={`https://explorer.solana.com/tx/${tx}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:underline text-sm"
          >
            View on Explorer
          </a>
        </div>
      );

      form.reset();
      setTimeout(() => router.push("/merchant"), 2000);
    } catch (error: any) {
      console.error("Failed to create deal:", error);
      toast.error(`❌ Failed to create deal: ${error.message}`);
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24 flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div
            className="text-6xl mb-4"
            style={{
              animation: "float 2s ease-in-out infinite",
            }}
          >
            💎
          </div>
          <p
            className="text-xl"
            style={{
              color: "#00ffff",
              textShadow: "2px 2px 0px rgba(0, 0, 0, 0.8)",
            }}
          >
            LOADING...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-24 flex justify-center">
      <Toaster position="top-center" richColors />
      <Card
        className="w-full max-w-2xl border-4"
        style={{
          background:
            "linear-gradient(135deg, rgba(0, 255, 100, 0.1) 0%, rgba(0, 255, 255, 0.1) 100%)",
          borderImage:
            "linear-gradient(45deg, #00ff00, #00ffff, #ffff00, #00ff00) 1",
          boxShadow:
            "0 0 30px rgba(0, 255, 100, 0.5), 0 8px 0 rgba(0, 0, 0, 0.5)",
        }}
      >
        <CardHeader>
          <CardTitle
            className="text-3xl text-center"
            style={{
              color: "#ffff00",
              textShadow:
                "3px 3px 0px #00ff00, 6px 6px 0px rgba(0, 0, 0, 0.5)",
            }}
          >
            🎯 CREATE NEW DEAL
          </CardTitle>
          <CardDescription
            className="text-center text-base"
            style={{
              color: "#00ffff",
              textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)",
            }}
          >
            ⚡ PUBLISH A DEAL ON THE BLOCKCHAIN ⚡
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="dealName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel
                        className="text-lg"
                        style={{
                          color: "#ffff00",
                          textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)",
                        }}
                      >
                        💎 DEAL NAME
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="E.g. 50% Off Coffee"
                          {...field}
                          className="border-2 border-cyan-400 bg-black/30 text-white placeholder:text-gray-400"
                          style={{
                            boxShadow: "0 0 10px rgba(0, 255, 255, 0.3)",
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="discount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel
                        className="text-lg"
                        style={{
                          color: "#ffff00",
                          textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)",
                        }}
                      >
                        🏷️ DISCOUNT %
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="20"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value))
                          }
                          className="border-2 border-cyan-400 bg-black/30 text-white placeholder:text-gray-400"
                          style={{
                            boxShadow: "0 0 10px rgba(0, 255, 255, 0.3)",
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="dealDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel
                      className="text-lg"
                      style={{
                        color: "#ffff00",
                        textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)",
                      }}
                    >
                      📝 DESCRIPTION
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="A brief description of your deal."
                        {...field}
                        className="border-2 border-cyan-400 bg-black/30 text-white placeholder:text-gray-400"
                        style={{
                          boxShadow: "0 0 10px rgba(0, 255, 255, 0.3)",
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel
                        className="text-lg"
                        style={{
                          color: "#ffff00",
                          textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)",
                        }}
                      >
                        💰 PRICE (SOL)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value))
                          }
                          className="border-2 border-cyan-400 bg-black/30 text-white placeholder:text-gray-400"
                          style={{
                            boxShadow: "0 0 10px rgba(0, 255, 255, 0.3)",
                          }}
                        />
                      </FormControl>
                      <FormDescription
                        style={{
                          color: "#00ffff",
                          fontSize: "0.75rem",
                        }}
                      >
                        💡 Set to 0 for free deals
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="totalSupply"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel
                        className="text-lg"
                        style={{
                          color: "#ffff00",
                          textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)",
                        }}
                      >
                        📦 SUPPLY
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="100"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value))
                          }
                          className="border-2 border-cyan-400 bg-black/30 text-white placeholder:text-gray-400"
                          style={{
                            boxShadow: "0 0 10px rgba(0, 255, 255, 0.3)",
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="expiryDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel
                        className="text-lg"
                        style={{
                          color: "#ffff00",
                          textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)",
                        }}
                      >
                        ⏰ EXPIRY (DAYS)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="30"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value))
                          }
                          className="border-2 border-cyan-400 bg-black/30 text-white placeholder:text-gray-400"
                          style={{
                            boxShadow: "0 0 10px rgba(0, 255, 255, 0.3)",
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel
                        className="text-lg"
                        style={{
                          color: "#ffff00",
                          textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)",
                        }}
                      >
                        🏷️ CATEGORY
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="E.g. Coffee, Food, Travel"
                          {...field}
                          className="border-2 border-cyan-400 bg-black/30 text-white placeholder:text-gray-400"
                          style={{
                            boxShadow: "0 0 10px rgba(0, 255, 255, 0.3)",
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="redemptionRule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel
                      className="text-lg"
                      style={{
                        color: "#ffff00",
                        textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)",
                      }}
                    >
                      ✅ REDEMPTION RULES
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="E.g. Valid at all locations, Show QR code"
                        {...field}
                        className="border-2 border-cyan-400 bg-black/30 text-white placeholder:text-gray-400"
                        style={{
                          boxShadow: "0 0 10px rgba(0, 255, 255, 0.3)",
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="geoTag"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel
                      className="text-lg"
                      style={{
                        color: "#ffff00",
                        textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)",
                      }}
                    >
                      📍 LOCATION (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="E.g. San Francisco, CA"
                        {...field}
                        className="border-2 border-cyan-400 bg-black/30 text-white placeholder:text-gray-400"
                        style={{
                          boxShadow: "0 0 10px rgba(0, 255, 255, 0.3)",
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageData"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel
                      className="text-lg"
                      style={{
                        color: "#ffff00",
                        textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)",
                      }}
                    >
                      🎨 DEAL IMAGE
                    </FormLabel>
                    <FormControl>
                      <ImageGenerator onImageReady={field.onChange} />
                    </FormControl>
                    <FormDescription
                      style={{
                        color: "#00ffff",
                        textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)",
                      }}
                    >
                      🤖 Generate with AI or upload manually
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>

            <div className="px-6 pb-6">
              <Button
                type="submit"
                className="w-full text-xl py-6 border-4 border-yellow-400"
                disabled={creating}
                style={{
                  background: creating
                    ? "linear-gradient(45deg, #666, #888)"
                    : "linear-gradient(45deg, #00ff00, #00ffff)",
                  boxShadow: creating
                    ? "none"
                    : "0 0 20px rgba(0, 255, 100, 0.8), 0 8px 0 rgba(0, 0, 0, 0.5)",
                  textShadow: "2px 2px 0px rgba(0, 0, 0, 0.8)",
                }}
              >
                {creating ? "⏳ CREATING..." : "🚀 CREATE DEAL"}
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
}

