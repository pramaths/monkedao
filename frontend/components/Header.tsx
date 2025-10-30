"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";
import { Button } from "./ui/button";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b-4 border-b-green-500 backdrop-blur-md" style={{
      background: "linear-gradient(135deg, rgba(0, 26, 13, 0.95) 0%, rgba(10, 46, 28, 0.95) 100%)",
      boxShadow: "0 0 20px rgba(0, 255, 100, 0.5), 0 4px 0 rgba(0, 0, 0, 0.5)"
    }}>
      <div className="container mx-auto p-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3 group">
          <span className="text-3xl" style={{
            color: "#00ffff",
            textShadow: "3px 3px 0px #00ff00, 6px 6px 0px rgba(0, 0, 0, 0.5)",
            animation: "float 3s ease-in-out infinite"
          }}>
            💎
          </span>
          <span className="text-2xl font-bold tracking-wider" style={{
            background: "linear-gradient(45deg, #00ff00, #00ffff, #ffff00, #00ff00)",
            backgroundSize: "200% 200%",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "gradientShift 3s ease infinite",
            textShadow: "none"
          }}>
            DEALIFI
          </span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/merchant">
            <Button 
              variant="outline" 
              className="border-4 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black transition-all duration-150"
              style={{
                boxShadow: "0 0 10px rgba(0, 255, 255, 0.5), 0 4px 0 rgba(0, 0, 0, 0.3)",
                textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)"
              }}
            >
              🏪 MERCHANTS
            </Button>
          </Link>
          <Link href="/candy-machine">
            <Button 
              variant="outline" 
              className="border-4 border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-black transition-all duration-150"
              style={{
                boxShadow: "0 0 10px rgba(147, 51, 234, 0.5), 0 4px 0 rgba(0, 0, 0, 0.3)",
                textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)"
              }}
            >
              🍭 CANDY MACHINE
            </Button>
          </Link>
          <Link href="/transfer">
            <Button 
              variant="outline"
              className="h-8 px-3 py-1 text-xs border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black transition-all duration-150"
              style={{
                boxShadow: "0 0 8px rgba(255, 255, 0, 0.5)",
                textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)"
              }}
            >
              ↗ Transfer
            </Button>
          </Link>
          <div className="wallet-button-pixel">
            <WalletMultiButton />
          </div>
        </nav>
      </div>
    </header>
  );
}
