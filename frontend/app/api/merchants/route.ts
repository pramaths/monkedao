import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { Merchant } from '../candy-machines/save/route';

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const merchantsCollection = db.collection<Merchant>('merchants');

    const merchants = await merchantsCollection.find({}).toArray();

    return NextResponse.json({
      success: true,
      merchants
    });
  } catch (error) {
    console.error('Error fetching merchants:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}