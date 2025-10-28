"use client";
import { useState } from "react";
import { createDealMetadata, createClientProgrammableNFT } from "@/lib/nft-utils";
import { Toaster, toast } from "sonner";
import { ImageGenerator } from "@/components/ImageGenerator";
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUmiWallet } from "@/hooks/useUmiWallet";

const formSchema = z.object({
  dealName: z.string().min(2, {
    message: "Deal name must be at least 2 characters.",
  }),
  dealDescription: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
  discount: z.number().min(1).max(100, "Discount must be between 1-100%"),
  category: z.string().optional(),
  location: z.string().optional(),
  imageData: z.string().min(1, {
    message: "Please generate or upload an image.",
  }),
});

export default function CreateDealPage() {
  const [minting, setMinting] = useState(false);
  const { connected, publicKey, isUmiReady } = useUmiWallet();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dealName: "",
      dealDescription: "",
      discount: 10,
      category: "",
      location: "",
      imageData: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("🎯 onSubmit called with wallet state:", {
      connected,
      publicKey: publicKey?.toString(),
      isUmiReady
    });

    if (!connected || !publicKey || !isUmiReady) {
      console.error("❌ Wallet not ready:", {
        connected,
        hasPublicKey: !!publicKey,
        isUmiReady
      });
      toast.error("Please connect your wallet first!");
      return;
    }

    console.log("✅ Wallet is ready, starting NFT creation...");
    setMinting(true);
    try {
      const { dealName, dealDescription, discount, category, location, imageData } = values;
      
      console.log("📋 Form values:", {
        dealName,
        dealDescription,
        discount,
        category,
        location,
        hasImageData: !!imageData
      });
      
      // Create metadata for the deal NFT
      const metadata = createDealMetadata(
        dealName,
        dealDescription,
        discount,
        category,
        location
      );

      console.log("📄 Created metadata:", metadata);

      // Create programmable NFT using client-side wallet (server uploads image/metadata)
      console.log("🚀 Calling createClientProgrammableNFT...");
      const result = await createClientProgrammableNFT({
        metadata,
        imageData,
        sellerFeeBasisPoints: 5.5, // 5.5% royalty
      });

      console.log("🎉 NFT creation result:", result);

      toast.success(
        <div>
          <p>🎉 Deal NFT minted successfully!</p>
          <p className="text-sm text-gray-600">This is a programmable NFT that supports resale with royalties.</p>
          <div className="mt-2 space-y-1">
            <a
              href={result.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline block"
            >
              View Transaction on Explorer
            </a>
            <a
              href={result.nftUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-500 hover:underline block"
            >
              View NFT on Explorer
            </a>
          </div>
        </div>
      );
      form.reset();
    } catch (error) {
      console.error("Failed to mint NFT:", error);
      toast.error(`Failed to mint deal NFT: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setMinting(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 flex justify-center">
      <Toaster position="top-center" richColors />
      <Card 
        className="w-full max-w-2xl"
        style={{
          background: "linear-gradient(135deg, rgba(0, 255, 100, 0.1) 0%, rgba(0, 255, 255, 0.1) 100%)",
          border: "4px solid",
          borderImage: "linear-gradient(45deg, #00ff00, #00ffff, #ffff00, #00ff00) 1",
          boxShadow: "0 0 30px rgba(0, 255, 100, 0.5), 0 8px 0 rgba(0, 0, 0, 0.5)"
        }}
      >
        <CardHeader>
          <CardTitle 
            className="text-3xl text-center"
            style={{
              color: "#ffff00",
              textShadow: "3px 3px 0px #00ff00, 6px 6px 0px rgba(0, 0, 0, 0.5)"
            }}
          >
            🎯 CREATE NEW DEAL
          </CardTitle>
          <CardDescription 
            className="text-center text-base"
            style={{
              color: "#00ffff",
              textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)"
            }}
          >
            ⚡ MINT A DEAL NFT FOR YOUR BUSINESS ⚡
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="dealName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel 
                      className="text-lg"
                      style={{
                        color: "#ffff00",
                        textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)"
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
                          boxShadow: "0 0 10px rgba(0, 255, 255, 0.3)"
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dealDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel 
                      className="text-lg"
                      style={{
                        color: "#ffff00",
                        textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)"
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
                          boxShadow: "0 0 10px rgba(0, 255, 255, 0.3)"
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
                        textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)"
                      }}
                    >
                      💰 DISCOUNT %
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="10" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        className="border-2 border-cyan-400 bg-black/30 text-white placeholder:text-gray-400"
                        style={{
                          boxShadow: "0 0 10px rgba(0, 255, 255, 0.3)"
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
                        textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)"
                      }}
                    >
                      🏷️ CATEGORY
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="E.g. Food, Retail, Services" 
                        {...field}
                        className="border-2 border-cyan-400 bg-black/30 text-white placeholder:text-gray-400"
                        style={{
                          boxShadow: "0 0 10px rgba(0, 255, 255, 0.3)"
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel 
                      className="text-lg"
                      style={{
                        color: "#ffff00",
                        textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)"
                      }}
                    >
                      📍 LOCATION
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="E.g. New York, Online, Any" 
                        {...field}
                        className="border-2 border-cyan-400 bg-black/30 text-white placeholder:text-gray-400"
                        style={{
                          boxShadow: "0 0 10px rgba(0, 255, 255, 0.3)"
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
                        textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)"
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
                        textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)"
                      }}
                    >
                      🤖 Generate with AI or upload manually
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full text-xl py-6 border-4 border-yellow-400" 
                disabled={minting}
                style={{
                  background: minting 
                    ? "linear-gradient(45deg, #666, #888)" 
                    : "linear-gradient(45deg, #00ff00, #00ffff)",
                  boxShadow: minting 
                    ? "none" 
                    : "0 0 20px rgba(0, 255, 100, 0.8), 0 8px 0 rgba(0, 0, 0, 0.5)",
                  textShadow: "2px 2px 0px rgba(0, 0, 0, 0.8)"
                }}
              >
                {minting ? "⏳ MINTING..." : "🚀 CREATE DEAL NFT"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
