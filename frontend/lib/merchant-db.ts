export interface CandyMachine {
  address: string;
  itemsAvailable: number;
  itemsRedeemed: number;
  createdAt: string;
  name?: string;
  symbol?: string;
  description?: string;
  mintedRecords?: Array<{
    mint: string;
    authority: string;
    uri?: string | null;
    mintedAt: string;
  }>
  items?: Array<{ name: string; uri: string }>;
  // Guard-derived persisted fields
  priceLamports?: number;
  priceSol?: number;
  guardStartDate?: number; // unix seconds
  guardEndDate?: number;   // unix seconds
  guardDestination?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || '';

export interface Merchant {
  _id?: string;
  merchantAddress: string;
  candyMachines: CandyMachine[];
  createdAt: string;
  updatedAt: string;
}

export async function saveCandyMachineToDB(merchantAddress: string, candyMachine: CandyMachine): Promise<Merchant> {
  const response = await fetch(`${API_BASE}/api/candy-machines/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      merchantAddress,
      candyMachine
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to save candy machine to database');
  }

  const data = await response.json();
  return data.merchant;
}

export async function getMerchantFromDB(merchantAddress: string): Promise<Merchant | null> {
  const response = await fetch(`${API_BASE}/api/merchants/${merchantAddress}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Failed to fetch merchant from database');
  }

  const data = await response.json();
  return data.merchant;
}

export async function getAllMerchantsFromDB(): Promise<Merchant[]> {
  const response = await fetch(`${API_BASE}/api/merchants`);

  if (!response.ok) {
    throw new Error('Failed to fetch merchants from database');
  }

  const data = await response.json();
  return data.merchants;
}

export async function updateCandyMachineAfterMint(params: {
  candyMachineAddress: string;
  mint: string;
  authority: string;
  uri?: string | null;
}) {
  const response = await fetch(`${API_BASE}/api/candy-machines/minted`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error('Failed to update candy machine after mint');
  }

  return await response.json();
}

export async function saveCandyMachineItems(params: {
  merchantAddress: string;
  candyMachineAddress: string;
  items: Array<{ name: string; uri: string }>;
}) {
  const response = await fetch(`${API_BASE}/api/candy-machines/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    throw new Error('Failed to save candy machine items');
  }
  return await response.json();
}
