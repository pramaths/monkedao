"use client";

import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { dasApi } from "@metaplex-foundation/digital-asset-standard-api";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toaster, toast } from "sonner";

type UserAsset = {
  mint: string;
  name: string;
  image?: string;
};

type StakingMap = Record<string, { staked: boolean; updatedAt: number }>

function loadStakingState(owner: string): StakingMap {
  try {
    const raw = localStorage.getItem(`dealifi:staking:${owner}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as StakingMap;
  } catch {}
  return {};
}

function saveStakingState(owner: string, map: StakingMap) {
  try {
    localStorage.setItem(`dealifi:staking:${owner}`, JSON.stringify(map));
  } catch {}
}

export default function StakingPage() {
  const { publicKey, connected } = useWallet();
  const [assets, setAssets] = useState<UserAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const owner = useMemo(() => publicKey?.toString() || "", [publicKey]);
  const [stakingMap, setStakingMap] = useState<StakingMap>({});

  useEffect(() => {
    if (!owner) return;
    setStakingMap(loadStakingState(owner));
  }, [owner]);

  useEffect(() => {
    const load = async () => {
      if (!owner) {
        setAssets([]);
        return;
      }
      setLoading(true);
      try {
        const umiRead = createUmi('https://api.devnet.solana.com').use(dasApi());
        const res = await (umiRead as any).rpc.getAssetsByOwner({
          owner,
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
  }, [owner]);

  const toggleStake = (mint: string, nextStaked: boolean) => {
    if (!owner) return;
    const next = { ...stakingMap, [mint]: { staked: nextStaked, updatedAt: Date.now() } };
    setStakingMap(next);
    saveStakingState(owner, next);
    toast.success(nextStaked ? 'Staked locally' : 'Unstaked locally');
    setTimeout(() => toast.dismiss(), 1500);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster position="top-center" richColors />
      {!connected ? (
        <p className="text-gray-400 text-center">Connect your wallet to view your NFTs.</p>
      ) : loading ? (
        <p className="text-gray-400">Loading your NFTs...</p>
      ) : assets.length === 0 ? (
        <p className="text-gray-400">No NFTs found in your wallet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.map((a) => {
            const st = stakingMap[a.mint]?.staked === true;
            return (
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
                  <div className="flex items-center justify-between">
                    <div className={`text-xs px-2 py-1 rounded ${st ? 'bg-green-600 text-black' : 'bg-gray-600 text-white'}`}>{st ? 'Staked' : 'Unstaked'}</div>
                    {st ? (
                      <Button className="border-2 border-yellow-400" size="sm" onClick={() => toggleStake(a.mint, false)}>
                        Unstake
                      </Button>
                    ) : (
                      <Button className="border-2 border-green-400" size="sm" onClick={() => toggleStake(a.mint, true)}>
                        Stake
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}


