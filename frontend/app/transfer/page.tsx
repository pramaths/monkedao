"use client";

import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import useUmiStore from "@/store/useUmiStore";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { dasApi } from "@metaplex-foundation/digital-asset-standard-api";
import { publicKey } from "@metaplex-foundation/umi";
import { transferV1, TokenStandard } from "@metaplex-foundation/mpl-token-metadata";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Toaster, toast } from "sonner";

type UserAsset = {
  mint: string;
  name: string;
  image?: string;
};

export default function TransferPage() {
  const { publicKey: walletPk, connected, wallet } = useWallet();
  const { umi, updateSigner } = useUmiStore();
  const [assets, setAssets] = useState<UserAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedMint, setSelectedMint] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    if (connected && wallet) {
      updateSigner(wallet.adapter);
    }
  }, [connected, wallet, updateSigner]);

  useEffect(() => {
    const load = async () => {
      if (!walletPk) {
        setAssets([]);
        return;
      }
      setLoading(true);
      try {
        const umiRead = createUmi('https://api.devnet.solana.com').use(dasApi());
        const res = await (umiRead as any).rpc.getAssetsByOwner({
          owner: walletPk.toString(),
          sortBy: { sortBy: 'recent_action', sortDirection: 'desc' },
          page: 1,
          limit: 50,
        });
        const items = (res?.items || []).map((a: any) => ({
          mint: a.id,
          name: a?.content?.metadata?.name || 'NFT',
          image: a?.content?.links?.image,
        }));
        setAssets(items);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load your NFTs');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [walletPk]);

  const openTransferModal = (mint: string) => {
    setSelectedMint(mint);
    setDestination("");
    setShowModal(true);
  };

  const handleTransfer = async () => {
    if (!connected || !umi) {
      toast.error('Connect wallet to transfer');
      return;
    }
    if (!selectedMint || !destination) {
      toast.error('Enter a destination address');
      return;
    }
    setTransferring(true);
    try {
      await transferV1(umi as any, {
        mint: publicKey(selectedMint),
        authority: (umi as any).identity,
        tokenOwner: (umi as any).identity.publicKey,
        destinationOwner: publicKey(destination),
        tokenStandard: TokenStandard.NonFungible,
      }).sendAndConfirm(umi as any);

      toast.success('NFT transferred');
      setShowModal(false);
      // refresh list
      if (walletPk) {
        const umiRead = createUmi('https://api.devnet.solana.com').use(dasApi());
        const res = await (umiRead as any).rpc.getAssetsByOwner({ owner: walletPk.toString(), page: 1, limit: 50 });
        const items = (res?.items || []).map((a: any) => ({
          mint: a.id,
          name: a?.content?.metadata?.name || 'NFT',
          image: a?.content?.links?.image,
        }));
        setAssets(items);
      }
    } catch (e: any) {
      console.error('Transfer failed:', e);
      toast.error(e?.message || 'Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster position="bottom-right" richColors />
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold" style={{ color: '#00ffff', textShadow: '2px 2px 0px #00ff00' }}>
          🔄 Transfer Your NFTs
        </h1>
        <p className="text-sm text-gray-400">Select an NFT you own and transfer to a new owner</p>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading your NFTs...</p>
      ) : assets.length === 0 ? (
        <p className="text-gray-400">No NFTs found in your wallet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.map((a) => (
            <Card key={a.mint} className="border-2 border-cyan-400 bg-black/30 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-cyan-400 text-lg break-words">{a.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative w-full h-56 mb-3">
                  {a.image ? (
                    <Image src={a.image} alt={a.name} fill className="object-cover rounded" />
                  ) : (
                    <div className="w-full h-full bg-gray-800 rounded" />
                  )}
                </div>
                <div className="text-xs text-gray-400 break-all mb-3">{a.mint}</div>
                <Button className="w-full border-2 border-yellow-400" onClick={() => openTransferModal(a.mint)}>
                  Transfer
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="w-full max-w-md mx-4">
            <Card className="border-2 border-yellow-400 bg-black/80">
              <CardHeader>
                <CardTitle className="text-yellow-400">Transfer NFT</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Mint</div>
                    <div className="font-mono text-xs break-all text-gray-300">{selectedMint}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-300 mb-1">Destination Owner (pubkey)</div>
                    <Input 
                      placeholder="Enter recipient wallet address"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="bg-black/50 border-cyan-400 text-white"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button 
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      disabled={transferring}
                      onClick={handleTransfer}
                    >
                      {transferring ? 'Transferring...' : 'Confirm Transfer'}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 border-cyan-400"
                      onClick={() => setShowModal(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}


