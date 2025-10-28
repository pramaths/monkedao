# MonkeDAO - NFT Deal Platform

A Solana-based platform where merchants can create NFT deals and users can stake NFTs for rewards.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Metaplex      │    │   Anchor        │
│   (Next.js)     │    │   Candy Machine │    │   Program       │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Solana Blockchain                            │
└─────────────────────────────────────────────────────────────────┘
```

## How Components Work Together

### 1. **Frontend (Next.js)**
- **Purpose**: User interface for merchants and users
- **Key Features**:
  - Merchant dashboard for creating deals
  - NFT marketplace for browsing deals
  - Wallet connection (Phantom, Solflare, etc.)
  - Candy machine integration UI

### 2. **Metaplex Candy Machine**
- **Purpose**: Handles NFT minting and collection management
- **Responsibilities**:
  - Creates and manages NFT collections
  - Handles minting transactions
  - Manages NFT metadata and images
  - Provides candy machine configuration

### 3. **Anchor Program (`dealifi-candy`)**
- **Purpose**: Custom Solana program for deal management and NFT staking
- **Key Functions**:
  - `create_merchant()` - Register merchants
  - `create_deal()` - Create deals linked to candy machines
  - `stake_nft()` - Stake NFTs for rewards
  - `unstake_nft()` - Unstake NFTs
  - `record_sale()` - Track sales analytics

## Complete Flow

```
1. Merchant Setup:
   Frontend → Anchor Program → create_merchant()

2. Deal Creation:
   Frontend → Metaplex → Create Candy Machine
   Frontend → Anchor Program → create_deal(candy_machine_pubkey)

3. User Interaction:
   User → Frontend → Metaplex → Mint NFT
   User → Frontend → Anchor Program → stake_nft()

4. Rewards & Analytics:
   Anchor Program → Track staking rewards
   Anchor Program → record_sale() for analytics
```

## Key Design Decisions

- **Separation of Concerns**: Metaplex handles NFT minting, Anchor handles business logic
- **No Duplication**: Anchor program doesn't duplicate candy machine state
- **Simple Integration**: Frontend connects to both systems independently
- **Staking Focus**: Anchor program specializes in NFT staking mechanics

## Development

### Frontend
```bash
cd frontend
yarn install
yarn dev
```

### Anchor Program
```bash
cd dealifi-candy
anchor build
anchor test
```

## Repository Structure
```
monkedao/
├── frontend/          # Next.js application
├── dealifi-candy/     # Anchor Solana program
├── .gitignore        # Global gitignore
└── README.md         # This file
```
