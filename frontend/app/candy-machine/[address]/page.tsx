"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAllMerchantsFromDB } from "@/lib/merchant-db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { dasApi } from "@metaplex-foundation/digital-asset-standard-api";
import { fetchCandyMachine } from "@metaplex-foundation/mpl-candy-machine";
import { PublicKey } from "@solana/web3.js";

type ItemMeta = {
  name: string;
  image: string;
  description?: string;
  attributes?: Array<{ trait_type?: string; value?: any }>;
  uri?: string;
};

export default function CandyMachineDetailPage() {
  const params = useParams<{ address: string }>();
  const router = useRouter();
  const address = decodeURIComponent(params.address);
  const [items, setItems] = useState<ItemMeta[]>([]);
  const [merchant, setMerchant] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [supply, setSupply] = useState<{ redeemed: number; available: number } | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const merchants = await getAllMerchantsFromDB();
        const found = merchants.flatMap(m => (m.candyMachines || []).map(cm => ({ m, cm }))).find(x => x.cm.address === address);
        if (found) {
          setMerchant(found.m.merchantAddress);
          setSupply({ redeemed: found.cm.itemsRedeemed, available: found.cm.itemsAvailable });
          const uris = (found.cm.items || []).map(i => i.uri);
          let metas: ItemMeta[] = [];
          for (const uri of uris) {
            try {
              const res = await fetch(uri);
              if (res.ok) {
                const meta = await res.json();
                metas.push({
                  name: meta?.name || "Item",
                  image: meta?.image || "",
                  description: meta?.description,
                  attributes: meta?.attributes,
                  uri,
                });
              }
            } catch (_) {}
          }

          // If DB doesn't have items, fallback to DAS collection query
          if (metas.length === 0) {
            try {
              const umi = createUmi('https://api.devnet.solana.com').use(dasApi());
              const cmPk = new PublicKey(address);
              const onChain = await fetchCandyMachine(umi as any, cmPk as any);
              const collectionMint = onChain.collectionMint as any as string;
              const byCollection = await (umi as any).rpc.getAssetsByGroup({
                groupKey: 'collection',
                groupValue: collectionMint,
                limit: 50,
              });
              const assets = byCollection.items || [];
              metas = assets.map((a: any) => ({
                name: a?.content?.metadata?.name || "Item",
                image: a?.content?.links?.image || "",
                description: a?.content?.metadata?.description,
                attributes: a?.content?.metadata?.attributes,
                uri: a?.content?.json_uri,
              }));
            } catch (_) {}
          }

          setItems(metas);
        }
      } finally {
        setLoading(false);
      }
    };
    if (address) load();
  }, [address]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="outline" onClick={() => router.back()}>
          ← Back
        </Button>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold" style={{ color: '#00ffff', textShadow: '2px 2px 0px #00ff00' }}>
          Candy Machine: <span className="font-mono break-all">{address}</span>
        </h1>
        <p className="text-sm text-gray-300">Merchant: {merchant ? `${merchant.slice(0,6)}...${merchant.slice(-6)}` : '—'}</p>
        {supply && (
          <p className="text-sm text-gray-300">Supply: {supply.redeemed} / {supply.available}</p>
        )}
      </div>

      <div className="mb-6">
        <div className="bg-black/40 border-2 border-yellow-400 rounded p-3 text-yellow-300 text-sm">
          You might receive one of the NFTs from this candy machine. Minting is available on the Marketplace page.
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading items...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-400">No items found for this candy machine.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((it, idx) => (
            <Card key={idx} className="border-2 border-cyan-400 bg-black/30 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-cyan-400 text-lg break-words">{it.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative w-full h-56 mb-3">
                  {it.image ? (
                    <Image src={it.image} alt={it.name} fill className="object-cover rounded" />
                  ) : (
                    <div className="w-full h-full bg-gray-800 rounded" />
                  )}
                </div>
                {it.description && (
                  <p className="text-sm text-gray-300 mb-2 line-clamp-3">{it.description}</p>
                )}
                {it.attributes && Array.isArray(it.attributes) && it.attributes.length > 0 && (
                  <div className="text-xs text-gray-400 space-y-1">
                    {it.attributes.slice(0, 5).map((a, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{a?.trait_type || ''}</span>
                        <span className="font-mono">{String(a?.value ?? '')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-8 text-center">
        <Button className="border-2 border-yellow-400" onClick={() => router.push('/marketplace')}>
          Go to Marketplace to Mint
        </Button>
      </div>
    </div>
  );
}


