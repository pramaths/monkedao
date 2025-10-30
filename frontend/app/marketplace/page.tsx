"use client";
import { useEffect, useMemo, useState } from "react";
import { getAllMerchantsFromDB } from "@/lib/merchant-db";
import { useWallet } from "@solana/wallet-adapter-react";
import useUmiStore from "@/store/useUmiStore";
import { DealifiCandyMachineManager } from "@/lib/candy-machine-manager";
import { PublicKey } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast, Toaster } from "sonner";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { dasApi } from "@metaplex-foundation/digital-asset-standard-api";
import { fetchCandyMachine } from "@metaplex-foundation/mpl-candy-machine";

export default function MarketplacePage() {
  const [loading, setLoading] = useState(false);
  const [candyMachines, setCandyMachines] = useState<Array<{
    address: string;
    merchantAddress: string;
    itemsAvailable: number;
    itemsRedeemed: number;
    collectionMint?: string;
    assets?: any[];
  }>>([]);
  const { umi, signer } = useUmiStore();
  const { connected } = useWallet();

  useEffect(() => {
    loadAllCandyMachines();
  }, []);

  const loadAllCandyMachines = async () => {
    setLoading(true);
    try {
      const merchants = await getAllMerchantsFromDB();
      const flat = merchants.flatMap((m) => (m.candyMachines || []).map((cm) => ({
        address: cm.address,
        merchantAddress: m.merchantAddress,
        itemsAvailable: cm.itemsAvailable,
        itemsRedeemed: cm.itemsRedeemed,
      })));

      // Fetch collection mint + DAS assets per candy machine
      const umiRead = createUmi('https://api.devnet.solana.com').use(dasApi());
      const enrichedAll = await Promise.all(flat.map(async (cm) => {
        try {
          const cmPk = new PublicKey(cm.address);
          const onChain = await fetchCandyMachine(umiRead as any, cmPk as any);
          const collectionMint = onChain.collectionMint as any as string;
          let assets: any[] = [];
          try {
            const byCollection = await (umiRead as any).rpc.getAssetsByGroup({
              groupKey: 'collection',
              groupValue: collectionMint,
              limit: 20,
            });
            assets = byCollection.items || [];
          } catch (_) {}
          return { ...cm, collectionMint, assets };
        } catch (_) {
          return { ...cm };
        }
      }));

      // Filter out sold-out candy machines (no remaining)
      const filtered = enrichedAll.filter((cm) => (cm.itemsAvailable - cm.itemsRedeemed) > 0);
      setCandyMachines(filtered);
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to load candy machines');
    } finally {
      setLoading(false);
    }
  };

  const handleMint = async (address: string) => {
    if (!umi || !signer) {
      toast.error('Connect wallet to mint');
      return;
    }
    try {
      const manager = new DealifiCandyMachineManager(umi);
      await manager.mintNFT(new PublicKey(address), signer);
      toast.success('Minted!');
      // Refresh list to update redeemed counts
      loadAllCandyMachines();
    } catch (e: any) {
      console.error('Mint failed:', e);
      toast.error(`Mint failed: ${e?.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        <Toaster position="top-center" richColors />
        <div className="text-center mb-8">
          <h1 
            className="text-5xl font-bold mb-4"
            style={{
              background: "linear-gradient(45deg, #00ff00, #00ffff, #ffff00)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: "0 0 30px rgba(0, 255, 255, 0.5)"
            }}
          >
            🏪 DEALIFI MARKETPLACE
          </h1>
          <p className="text-xl text-gray-300 mb-2">
            Trade, Transfer & Resell Your Deal NFTs
          </p>
          <p className="text-sm text-gray-400">
            Programmable NFTs with built-in royalty enforcement
          </p>
        </div>

        {/* Candy Machines from DB */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-cyan-400 mb-4">🍭 All Candy Machines</h2>
          {loading ? (
            <p className="text-gray-400">Loading...</p>
          ) : candyMachines.length === 0 ? (
            <p className="text-gray-400">No candy machines found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {candyMachines.map((cm) => (
                <Card key={cm.address} className="border-2 border-cyan-400 bg-black/30">
                  <CardHeader>
                    <CardTitle className="text-cyan-400 text-lg break-all">{cm.address}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-300 mb-2">
                      <div>Merchant: <span className="font-mono">{cm.merchantAddress.slice(0,6)}...{cm.merchantAddress.slice(-6)}</span></div>
                      <div>Supply: {cm.itemsRedeemed} / {cm.itemsAvailable}</div>
                    </div>
                    {cm.assets && cm.assets.length > 0 && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          {cm.assets.slice(0,3).map((a, i) => (
                            <img key={i} src={a.content?.links?.image || ''} alt={a.content?.metadata?.name || ''} className="w-full h-24 object-cover rounded" />
                          ))}
                        </div>
                        <div className="text-xs text-gray-400 break-all">
                          {cm.assets[0]?.content?.json_uri}
                        </div>
                      </div>
                    )}
                    <div className="pt-4">
                      <Button onClick={() => handleMint(cm.address)} className="w-full border-2 border-yellow-400">
                        🎯 Mint
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        {/* Removed extra marketplace module; keeping page focused on DB-driven candy machines */}
        
        <div className="mt-12 text-center">
          <div className="bg-black/50 border-2 border-cyan-400 rounded-lg p-6 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
              🚀 Why Programmable NFTs?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-green-400">💰 Royalty Enforcement</h3>
                <p className="text-gray-300 text-sm">
                  Automatic royalty payments to creators on every resale, enforced by the blockchain.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-blue-400">🔒 Transfer Rules</h3>
                <p className="text-gray-300 text-sm">
                  Set custom rules for who can transfer NFTs and under what conditions.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-purple-400">🛡️ Future-Proof</h3>
                <p className="text-gray-300 text-sm">
                  Built on the latest Solana NFT standards for maximum compatibility.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
