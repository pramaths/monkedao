"use client";

import DealCard from "@/components/DealCard";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { getAllMerchantsFromDB } from "@/lib/merchant-db";
import { useRouter } from "next/navigation";

type CardData = {
  title: string;
  merchant: string;
  imageUrl: string;
  price?: string;
  expiry?: string;
  info?: string;
  address: string;
};

export default function Home() {
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const merchants = await getAllMerchantsFromDB();
        const allCards: CardData[] = [];

        for (const m of merchants) {
          const merchantLabel = shortenAddress(m.merchantAddress);
          for (const cm of (m.candyMachines || [])) {
            // Choose one representative URI per candy machine
            const uri = cm?.items?.[0]?.uri || cm?.mintedRecords?.find(r => !!r.uri)?.uri || null;
            if (!uri) continue;

            let meta: any = null;
            try {
              const res = await fetch(uri);
              if (res.ok) meta = await res.json();
            } catch (_) {}

            const title = meta?.name || cm?.name || "Deal";
            const imageUrl = meta?.image || "/images/starbucks.png";
            const price = extractAttribute(meta, ["price", "Price", "solPrice", "amount"])?.toString();
            const expiry = extractAttribute(meta, ["expiry", "expiryDate", "valid_till", "validTill"])?.toString();
            const info = "You might receive one of the NFTs from this candy machine.";

            allCards.push({ title, merchant: merchantLabel, imageUrl, price: price ? `${price}` : undefined, expiry, info, address: cm.address });
          }
        }

        setCards(allCards);
      } catch (e) {
        setCards([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  function extractAttribute(meta: any, keys: string[]): string | number | undefined {
    if (!meta) return undefined;
    // direct field
    for (const k of keys) {
      if (typeof meta[k] !== "undefined" && meta[k] !== null) return meta[k];
    }
    // search attributes array
    const attrs = Array.isArray(meta?.attributes) ? meta.attributes : [];
    for (const key of keys) {
      const found = attrs.find((a: any) =>
        (a?.trait_type || a?.traitType || a?.trait || a?.key) === key
      );
      if (found) return found?.value;
    }
    return undefined;
  }

  function shortenAddress(addr: string): string {
    if (!addr) return "";
    return addr.length > 10 ? `${addr.slice(0, 4)}...${addr.slice(-4)}` : addr;
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <section className="text-center my-8 relative">
        <div className="mb-4 inline-block" style={{
          animation: "float 4s ease-in-out infinite"
        }}>
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight mb-4 leading-tight" style={{
            color: "#00ffff",
            textShadow: "3px 3px 0px #00ff00, 6px 6px 0px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 255, 255, 0.5)"
          }}>
            THE FUTURE OF DEALS IS HERE
          </h1>
        </div>
        
        <div className="relative inline-block">
          <p className="text-sm md:text-base px-4 py-2 inline-block" style={{
            background: "rgba(0, 255, 255, 0.1)",
            border: "3px solid #00ffff",
            boxShadow: "0 0 15px rgba(0, 255, 255, 0.5), inset 0 0 15px rgba(0, 255, 255, 0.1)",
            color: "#00ffff",
            textShadow: "2px 2px 0px rgba(0, 0, 0, 0.8)"
          }}>
            🎮 DISCOVER • OWN • TRADE DEALS AS NFTs 🎮
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center" style={{
          color: "#ffff00",
          textShadow: "3px 3px 0px #00ff00, 6px 6px 0px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 255, 0, 0.5)"
        }}>
          ⭐ CANDY MACHINE DEALS ⭐
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {(loading ? Array.from({ length: 3 }) : cards).map((deal: any, index: number) => (
            <div key={index} style={{
              animation: `float ${3 + index * 0.5}s ease-in-out infinite`
            }}>
              {loading ? (
                <div className="w-full max-w-sm h-[360px] border-4 border-dashed border-cyan-400 animate-pulse" />
              ) : (
                <DealCard {...deal} onClick={() => router.push(`/candy-machine/${deal.address}`)} />
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="text-center my-12 space-y-4">
        <div className="space-x-4">
          <Button 
            size="lg" 
            className="text-base px-8 py-5 border-4 border-yellow-400"
            style={{
              background: "linear-gradient(45deg, #00ff00, #00ffff)",
              boxShadow: "0 0 20px rgba(0, 255, 100, 0.8), 0 8px 0 rgba(0, 0, 0, 0.5)",
              textShadow: "2px 2px 0px rgba(0, 0, 0, 0.8)",
              transition: "transform 0.1s"
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "translateY(4px)";
              e.currentTarget.style.boxShadow = "0 0 20px rgba(0, 255, 100, 0.8), 0 4px 0 rgba(0, 0, 0, 0.5)";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 0 20px rgba(0, 255, 100, 0.8), 0 8px 0 rgba(0, 0, 0, 0.5)";
            }}
          >
            🚀 EXPLORE MORE DEALS
          </Button>
        </div>
        
        <div className="space-x-4">
          <Button 
            size="lg" 
            className="text-base px-8 py-5 border-4 border-purple-400"
            style={{
              background: "linear-gradient(45deg, #ff00ff, #00ffff)",
              boxShadow: "0 0 20px rgba(255, 0, 255, 0.8), 0 8px 0 rgba(0, 0, 0, 0.5)",
              textShadow: "2px 2px 0px rgba(0, 0, 0, 0.8)",
              transition: "transform 0.1s"
            }}
            onClick={() => window.location.href = '/merchant'}
          >
            🏪 MERCHANT DASHBOARD
          </Button>
        </div>
      </section>
    </main>
  );
}
