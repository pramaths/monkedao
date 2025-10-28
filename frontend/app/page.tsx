"use client";

import DealCard from "@/components/DealCard";
import { Button } from "@/components/ui/button";

// Mock data for deals with corrected image URLs
const deals = [
  {
    title: "20% off Starbucks",
    merchant: "Starbucks",
    price: "0.1 SOL",
    expiry: "2025-12-31",
    imageUrl: "/images/starbucks.png",
  },
  {
    title: "Flight to Goa",
    merchant: "Skyscanner",
    price: "0.5 SOL",
    expiry: "2025-11-30",
    imageUrl: "/images/flight.png",
  },
  {
    title: "50% off Pizza",
    merchant: "Pizza Hut",
    price: "0.2 SOL",
    expiry: "2025-12-15",
    imageUrl: "/images/pizza.png",
  },
];

export default function Home() {
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
          ⭐ FEATURED DEALS ⭐
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {deals.map((deal, index) => (
            <div key={index} style={{
              animation: `float ${3 + index * 0.5}s ease-in-out infinite`
            }}>
              <DealCard {...deal} />
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
