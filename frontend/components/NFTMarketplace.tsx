"use client";

import { useState, useEffect } from "react";
import useUmiStore from "@/store/useUmiStore";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { 
  transferDealNFT, 
  createMarketplaceListing, 
  executeMarketplaceSale,
  checkNFTOwnership,
  type MarketplaceListing 
} from "@/lib/nft-utils";
import { PublicKey } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast, Toaster } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const transferSchema = z.object({
  mintAddress: z.string().min(1, "Mint address is required"),
  recipientAddress: z.string().min(1, "Recipient address is required"),
});

const listingSchema = z.object({
  mintAddress: z.string().min(1, "Mint address is required"),
  price: z.number().min(0.001, "Price must be at least 0.001 SOL"),
});

export function NFTMarketplace() {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [userNFTs, setUserNFTs] = useState<string[]>([]);
  
  const { umi } = useUmiStore();
  const { publicKey } = useWallet();
  const { connection } = useConnection();

  const transferForm = useForm<z.infer<typeof transferSchema>>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      mintAddress: "",
      recipientAddress: "",
    },
  });

  const listingForm = useForm<z.infer<typeof listingSchema>>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      mintAddress: "",
      price: 0.1,
    },
  });

  // Load user's NFTs (simplified - in real app, you'd query on-chain)
  useEffect(() => {
    if (publicKey && connection) {
      loadUserNFTs();
    }
  }, [publicKey, connection]);

  const loadUserNFTs = async () => {
    // This is a simplified version - in a real app, you'd query the blockchain
    // for all NFTs owned by the user
    setUserNFTs([]);
  };

  const handleTransfer = async (values: z.infer<typeof transferSchema>) => {
    if (!umi || !publicKey) {
      toast.error("Please connect your wallet");
      return;
    }

    setLoading(true);
    try {
      const { mintAddress, recipientAddress } = values;
      
      // Verify ownership
      const isOwner = await checkNFTOwnership(
        connection!,
        new PublicKey(mintAddress),
        publicKey
      );

      if (!isOwner) {
        toast.error("You don't own this NFT");
        return;
      }

      // Transfer NFT
      await transferDealNFT({
        umi,
        mintAddress: new PublicKey(mintAddress) as any,
        fromOwner: publicKey as any,
        toOwner: new PublicKey(recipientAddress) as any,
        isProgrammable: true,
      });

      toast.success("NFT transferred successfully!");
      transferForm.reset();
      loadUserNFTs();
    } catch (error) {
      console.error("Transfer failed:", error);
      toast.error("Transfer failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateListing = async (values: z.infer<typeof listingSchema>) => {
    if (!umi || !publicKey) {
      toast.error("Please connect your wallet");
      return;
    }

    setLoading(true);
    try {
      const { mintAddress, price } = values;
      
      // Verify ownership
      const isOwner = await checkNFTOwnership(
        connection!,
        new PublicKey(mintAddress),
        publicKey
      );

      if (!isOwner) {
        toast.error("You don't own this NFT");
        return;
      }

      // Create listing
      const listing = await createMarketplaceListing(
        umi,
        new PublicKey(mintAddress) as any,
        price
      );

      setListings(prev => [...prev, listing]);
      toast.success("NFT listed for sale!");
      listingForm.reset();
    } catch (error) {
      console.error("Listing creation failed:", error);
      toast.error("Failed to create listing. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNFT = async (listing: MarketplaceListing) => {
    if (!umi || !publicKey) {
      toast.error("Please connect your wallet");
      return;
    }

    setLoading(true);
    try {
      await executeMarketplaceSale(umi, listing, publicKey as any);
      
      setListings(prev => prev.filter(l => l.mint !== listing.mint));
      toast.success("NFT purchased successfully!");
    } catch (error) {
      console.error("Purchase failed:", error);
      toast.error("Purchase failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster position="top-center" richColors />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Transfer NFT */}
        <Card className="border-2 border-cyan-400 bg-black/30">
          <CardHeader>
            <CardTitle className="text-2xl text-cyan-400">🔄 Transfer NFT</CardTitle>
            <CardDescription className="text-gray-300">
              Transfer your NFT to another wallet address
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...transferForm}>
              <form onSubmit={transferForm.handleSubmit(handleTransfer)} className="space-y-4">
                <FormField
                  control={transferForm.control}
                  name="mintAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">NFT Mint Address</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter NFT mint address"
                          {...field}
                          className="bg-black/50 border-cyan-400 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={transferForm.control}
                  name="recipientAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Recipient Address</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter recipient wallet address"
                          {...field}
                          className="bg-black/50 border-cyan-400 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-cyan-600 hover:bg-cyan-700"
                >
                  {loading ? "Transferring..." : "Transfer NFT"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* List NFT for Sale */}
        <Card className="border-2 border-green-400 bg-black/30">
          <CardHeader>
            <CardTitle className="text-2xl text-green-400">💰 List for Sale</CardTitle>
            <CardDescription className="text-gray-300">
              List your NFT on the marketplace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...listingForm}>
              <form onSubmit={listingForm.handleSubmit(handleCreateListing)} className="space-y-4">
                <FormField
                  control={listingForm.control}
                  name="mintAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">NFT Mint Address</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter NFT mint address"
                          {...field}
                          className="bg-black/50 border-green-400 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={listingForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Price (SOL)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.001"
                          placeholder="0.1"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          className="bg-black/50 border-green-400 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {loading ? "Creating Listing..." : "List for Sale"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Marketplace Listings */}
      <div className="mt-8">
        <Card className="border-2 border-yellow-400 bg-black/30">
          <CardHeader>
            <CardTitle className="text-2xl text-yellow-400">🏪 Marketplace</CardTitle>
            <CardDescription className="text-gray-300">
              Browse and buy NFTs from other users
            </CardDescription>
          </CardHeader>
          <CardContent>
            {listings.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No NFTs listed for sale yet</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {listings.map((listing, index) => (
                  <Card key={index} className="bg-black/50 border-yellow-400">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <p className="text-sm text-gray-400">
                          Mint: {listing.mint.toString().slice(0, 8)}...
                        </p>
                        <p className="text-lg font-bold text-yellow-400">
                          {listing.price} SOL
                        </p>
                        <Button 
                          onClick={() => handleBuyNFT(listing)}
                          disabled={loading}
                          className="w-full bg-yellow-600 hover:bg-yellow-700"
                        >
                          Buy NFT
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
