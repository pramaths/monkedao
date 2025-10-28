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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ message: 'Missing merchant address query param' }, { status: 400 });
    }

    const db = await getDatabase();
    const merchantsCollection = db.collection<Merchant>('merchants');

    const merchant = await merchantsCollection.findOne({ merchantAddress: address });

    if (!merchant) {
      return NextResponse.json({ message: 'Merchant not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      merchant
    });
  } catch (error) {
    console.error('Error fetching merchant:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
