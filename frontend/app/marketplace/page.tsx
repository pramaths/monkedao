"use client";

import { NFTMarketplace } from "@/components/NFTMarketplace";

export default function MarketplacePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
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
        
        <NFTMarketplace />
        
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
