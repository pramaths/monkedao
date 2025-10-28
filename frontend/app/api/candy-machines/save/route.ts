import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export interface CandyMachine {
  address: string;
  itemsAvailable: number;
  itemsRedeemed: number;
  createdAt: string;
  name?: string;
  symbol?: string;
}

export interface Merchant {
  _id?: string;
  merchantAddress: string;
  candyMachines: CandyMachine[];
  createdAt: string;
  updatedAt: string;
}

export async function POST(request: NextRequest) {
  try {
    const { merchantAddress, candyMachine } = await request.json();

    if (!merchantAddress || !candyMachine) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDatabase();
    const merchantsCollection = db.collection<Merchant>('merchants');

    // Check if merchant exists
    const existingMerchant = await merchantsCollection.findOne({ merchantAddress });

    if (existingMerchant) {
      // Update existing merchant - add candy machine to array
      const updatedMerchant = await merchantsCollection.findOneAndUpdate(
        { merchantAddress },
        {
          $push: { candyMachines: candyMachine },
          $set: { updatedAt: new Date().toISOString() }
        },
        { returnDocument: 'after' }
      );

      return NextResponse.json({
        success: true,
        merchant: updatedMerchant || existingMerchant
      });
    } else {
      // Create new merchant
      const newMerchant: Merchant = {
        merchantAddress,
        candyMachines: [candyMachine],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await merchantsCollection.insertOne(newMerchant);
      
      return NextResponse.json({
        success: true,
        merchant: { ...newMerchant, _id: result.insertedId }
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Error saving candy machine:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
