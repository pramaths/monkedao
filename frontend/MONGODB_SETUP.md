# MongoDB Setup for Dealifi

## Database Schema

### Merchants Collection
```javascript
{
  _id: ObjectId,
  merchantAddress: string,        // Solana wallet address
  candyMachines: [               // Array of candy machines
    {
      address: string,           // Candy machine public key
      itemsAvailable: number,    // Total items in collection
      itemsRedeemed: number,     // Items minted so far
      createdAt: string,         // ISO timestamp
      name?: string,             // Collection name
      symbol?: string            // Collection symbol
    }
  ],
  createdAt: string,             // ISO timestamp
  updatedAt: string              // ISO timestamp
}
```

## API Endpoints

### POST `/api/candy-machines/save`
Save a candy machine to a merchant's collection
```javascript
// Request body
{
  merchantAddress: string,
  candyMachine: {
    address: string,
    itemsAvailable: number,
    itemsRedeemed: number,
    createdAt: string,
    name?: string,
    symbol?: string
  }
}
```

### GET `/api/merchants/[address]`
Get a specific merchant and their candy machines
```javascript
// Response
{
  success: boolean,
  merchant: {
    _id: string,
    merchantAddress: string,
    candyMachines: [...],
    createdAt: string,
    updatedAt: string
  }
}
```

### GET `/api/merchants`
Get all merchants
```javascript
// Response
{
  success: boolean,
  merchants: [...]
}
```

## Environment Setup

1. Create `.env.local` file:
```bash
MONGODB_URI=mongodb://localhost:27017/dealifi
```

2. For MongoDB Atlas (cloud):
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dealifi?retryWrites=true&w=majority
```

## Usage

The system automatically saves candy machines to MongoDB when created and fetches them for display in the merchant dashboard.
