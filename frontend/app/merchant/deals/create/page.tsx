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
import useUmiStore from "@/store/useUmiStore";
import { saveCandyMachineItems } from "@/lib/merchant-db";

const formSchema = z.object({
  candyMachineAddress: z.string().min(1, "Please select a candy machine."),
  nftName: z.string().min(1, "NFT name is required."),
  discount: z.string().min(1, "Discount is required."),
  description: z.string().min(1, "Description is required."),
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
      candyMachineAddress: "",
      nftName: "",
      discount: "",
      description: "",
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
    if (!isUmiReady) {
      toast.error("⚠️ Please connect your wallet!");
      return;
    }

    setCreating(true);
    try {
      const {
        candyMachineAddress,
        nftName,
        discount,
        description,
        imageData,
      } = values;

      // 1. Validate candy machine address
      let candyMachinePubkey;
      try {
        candyMachinePubkey = new PublicKey(candyMachineAddress);
      } catch (error) {
        throw new Error("Invalid candy machine address format");
      }

      // 2. Create metadata URI using createUri API
      toast.info("🎨 Creating NFT metadata...");
      
      const res = await fetch('/api/createUri', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: imageData,
          metadata: {
            name: nftName,
            description: description,
            attributes: [
              { trait_type: 'Discount', value: discount }
            ]
          }
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        throw new Error(err?.error || 'Failed to create metadata');
      }

      const data = await res.json();
      const metadataUri = data?.metadataUri as string;
      if (!metadataUri) throw new Error('No metadataUri returned');

      // 3. Add NFT to candy machine using addConfigLines
      toast.info("🍭 Adding NFT to candy machine...");
      
      const { DealifiCandyMachineManager } = await import("@/lib/candy-machine-manager");
      const candyManager = new DealifiCandyMachineManager(umi);
      
      await candyManager.addConfigLinesAtIndex(
        candyMachinePubkey,
        0, // Add at index 0, or use itemsLoaded if available
        [{ name: nftName, uri: metadataUri }]
      );

      // 4. Persist the item to MongoDB (best-effort)
      try {
        await saveCandyMachineItems({
          merchantAddress: walletPublicKey!.toString(),
          candyMachineAddress: candyMachineAddress,
          items: [{ name: nftName, uri: metadataUri }],
        });
      } catch (e: any) {
        console.warn('Failed to save item to DB:', e?.message || e);
      }
      
      toast.success(
        <div>
          <p className="font-bold">🎉 NFT ADDED TO CANDY MACHINE!</p>
          <p className="text-sm">Metadata URI: {metadataUri}</p>
        </div>
      );

      form.reset();
      setTimeout(() => router.push("/merchant"), 2000);
    } catch (error: any) {
      console.error("Failed to add NFT:", error);
      toast.error(`❌ Failed to add NFT: ${error.message}`);
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
            🎨 ADD NFT TO CANDY MACHINE
          </CardTitle>
          <CardDescription
            className="text-center text-base"
            style={{
              color: "#00ffff",
              textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)",
            }}
          >
            ⚡ UPLOAD IMAGE, CREATE METADATA, AND ADD TO YOUR COLLECTION ⚡
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <CardContent className="space-y-6">
              {/* Candy Machine Selection */}
              <FormField
                control={form.control}
                name="candyMachineAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel
                      className="text-lg"
                      style={{
                        color: "#ffff00",
                        textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)",
                      }}
                    >
                      🍭 CANDY MACHINE ADDRESS
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your candy machine public key"
                        {...field}
                        className="border-2 border-purple-400 bg-black/30 text-white placeholder:text-gray-400"
                        style={{
                          boxShadow: "0 0 10px rgba(255, 0, 255, 0.3)",
                        }}
                      />
                    </FormControl>
                    <FormDescription
                      style={{
                        color: "#00ffff",
                        textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)",
                      }}
                    >
                      🔗 Paste the candy machine address from your deployed collection
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* NFT Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="nftName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel
                        className="text-lg"
                        style={{
                          color: "#ffff00",
                          textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)",
                        }}
                      >
                        🏷️ NFT NAME
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="My Deal NFT #1"
                          {...field}
                          className="border-2 border-purple-400 bg-black/30 text-white placeholder:text-gray-400"
                          style={{
                            boxShadow: "0 0 10px rgba(255, 0, 255, 0.3)",
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
                        💸 DISCOUNT
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 20% OFF"
                          {...field}
                          className="border-2 border-purple-400 bg-black/30 text-white placeholder:text-gray-400"
                          style={{
                            boxShadow: "0 0 10px rgba(255, 0, 255, 0.3)",
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
                name="description"
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
                        placeholder="A brief description of your NFT deal"
                        {...field}
                        className="border-2 border-purple-400 bg-black/30 text-white placeholder:text-gray-400"
                        style={{
                          boxShadow: "0 0 10px rgba(255, 0, 255, 0.3)",
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
                      🎨 NFT IMAGE
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
                {creating ? "⏳ ADDING NFT..." : "🚀 ADD NFT TO CANDY MACHINE"}
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
}

