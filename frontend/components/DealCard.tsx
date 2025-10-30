"use client";

import Image from "next/image";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Tag, Clock } from "lucide-react";

type DealCardProps = {
  title: string;
  merchant: string;
  imageUrl: string;
  price?: string;
  expiry?: string;
  info?: string;
  onClick?: () => void;
};

const DealCard = ({
  title,
  merchant,
  price,
  expiry,
  info,
  imageUrl,
  onClick,
}: DealCardProps) => {
  return (
    <Card 
      className="w-full max-w-sm overflow-hidden hover:scale-105 transition-transform duration-150"
      style={{
        background: "linear-gradient(135deg, rgba(0, 255, 100, 0.1) 0%, rgba(0, 255, 255, 0.1) 100%)",
        border: "4px solid",
        borderImage: "linear-gradient(45deg, #00ff00, #00ffff, #ffff00, #00ff00) 1",
        boxShadow: "0 0 20px rgba(0, 255, 100, 0.3), 0 8px 0 rgba(0, 0, 0, 0.5)",
        imageRendering: "pixelated"
      }}
    >
      <CardHeader className="p-0">
        <div className="relative h-56 overflow-hidden">
          {info ? (
            <div
              className="absolute top-2 right-2 z-20 rounded-full px-2 py-1 text-xs font-semibold"
              style={{
                background: "rgba(0,0,0,0.6)",
                border: "1px solid #00ffff",
                color: "#00ffff",
              }}
              title={info}
            >
              i
            </div>
          ) : null}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "linear-gradient(45deg, rgba(0, 255, 100, 0.2), rgba(0, 255, 255, 0.2))",
            zIndex: 1,
            pointerEvents: "none"
          }} />
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover"
            style={{ imageRendering: "pixelated" }}
          />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <CardTitle 
          className="mb-2 text-xl"
          style={{
            color: "#ffff00",
            textShadow: "2px 2px 0px #00ff00, 4px 4px 0px rgba(0, 0, 0, 0.5)"
          }}
        >
          {title}
        </CardTitle>
        <p 
          className="text-sm mb-4"
          style={{
            color: "#00ffff",
            textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)"
          }}
        >
          🏪 {merchant}
        </p>
        <div className="flex flex-col gap-3">
          {typeof price !== 'undefined' && price !== '' ? (
            <div className="flex items-center gap-2 px-3 py-2" style={{
              background: "rgba(0, 255, 100, 0.2)",
              border: "2px solid #00ff00",
              boxShadow: "0 0 10px rgba(0, 255, 100, 0.5)"
            }}>
              <Tag className="h-5 w-5" style={{ color: "#ffff00" }} />
              <span className="text-lg font-bold" style={{
                color: "#ffff00",
                textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)"
              }}>
                {price}
              </span>
            </div>
          ) : null}
          {typeof expiry !== 'undefined' && expiry !== '' ? (
            <div className="flex items-center gap-2 px-3 py-2" style={{
              background: "rgba(0, 255, 255, 0.2)",
              border: "2px solid #00ffff",
              boxShadow: "0 0 10px rgba(0, 255, 255, 0.5)"
            }}>
              <Clock className="h-5 w-5" style={{ color: "#00ffff" }} />
              <span className="text-xs" style={{
                color: "#00ffff",
                textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)"
              }}>
                ⏰ {expiry}
              </span>
            </div>
          ) : null}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full text-lg py-6 border-4 border-yellow-400"
          style={{
            background: "linear-gradient(45deg, #00ff00, #00ffff)",
            boxShadow: "0 0 15px rgba(0, 255, 100, 0.8), 0 6px 0 rgba(0, 0, 0, 0.5)",
            textShadow: "2px 2px 0px rgba(0, 0, 0, 0.8)",
            transition: "transform 0.1s"
          }}
          onClick={onClick}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = "translateY(3px)";
            e.currentTarget.style.boxShadow = "0 0 15px rgba(0, 255, 100, 0.8), 0 3px 0 rgba(0, 0, 0, 0.5)";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 0 15px rgba(0, 255, 100, 0.8), 0 6px 0 rgba(0, 0, 0, 0.5)";
          }}
        >
          🎯 VIEW DEAL
        </Button>
      </CardFooter>
    </Card>
  );
};

export default DealCard;
