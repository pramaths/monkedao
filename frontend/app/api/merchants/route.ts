import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("dealifi");
    const merchants = await db.collection("merchants").find({}).toArray();
    return NextResponse.json({ merchants });
  } catch (error) {
    console.error("Failed to fetch merchants:", error);
    return NextResponse.json({ error: "Failed to fetch merchants" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, walletAddress } = await request.json();

    if (!name || !walletAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    const client = await clientPromise;
    const db = client.db("dealifi");

    const existingMerchant = await db.collection("merchants").findOne({ walletAddress });

    if (existingMerchant) {
      return NextResponse.json({ error: "A merchant with this wallet address already exists" }, { status: 409 });
    }

    const result = await db.collection("merchants").insertOne({ name, walletAddress, createdAt: new Date() });
    const newMerchant = await db.collection("merchants").findOne({ _id: result.insertedId });

    return NextResponse.json({ merchant: newMerchant }, { status: 201 });
  } catch (error) {
    console.error("Failed to create merchant:", error);
    return NextResponse.json({ error: "Failed to create merchant" }, { status: 500 });
  }
}
