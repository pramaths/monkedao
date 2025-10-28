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

export async function saveCandyMachineToDB(merchantAddress: string, candyMachine: CandyMachine): Promise<Merchant> {
  const response = await fetch('/api/candy-machines/save', {
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
  const response = await fetch(`/api/merchants/${merchantAddress}`);

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
  const response = await fetch('/api/merchants');

  if (!response.ok) {
    throw new Error('Failed to fetch merchants from database');
  }

  const data = await response.json();
  return data.merchants;
}
