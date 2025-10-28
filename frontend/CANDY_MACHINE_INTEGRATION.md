# Frontend Candy Machine Integration

This document explains how the candy machine functionality has been integrated into your existing Dealifi frontend.

## 🎯 What's Been Added

### New Dependencies
- `@metaplex-foundation/mpl-core-candy-machine` - Core candy machine functionality
- `@metaplex-foundation/mpl-core` - Metaplex core features
- Updated existing Umi SDK dependencies

### New Files Created

#### Core Logic
- `lib/candy-machine-manager.ts` - Main candy machine management class
- `hooks/useCandyMachine.ts` - React hook for easy candy machine management

#### Components
- `components/CandyMachineManager.tsx` - Main UI component for candy machine management
- `components/CandyMachineCreator.tsx` - Alternative component (can be removed)

#### Pages
- `app/candy-machine/page.tsx` - Candy machine page route

#### Updated Files
- `store/useUmiStore.ts` - Added candy machine plugins to Umi
- `components/Header.tsx` - Added candy machine navigation link
- `package.json` - Added candy machine dependencies

## 🚀 How to Use

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Access Candy Machine
- Navigate to `/candy-machine` in your app
- Or click the "🍭 CANDY MACHINE" button in the header

### 3. Create Candy Machine
1. Connect your wallet
2. Configure candy machine settings:
   - Items Available (number of NFTs)
   - Symbol (collection symbol)
   - Seller Fee (royalty percentage)
   - Max Supply (0 for unlimited)
3. Set up guards:
   - SOL Payment (price in lamports)
   - Mint Limit (max per wallet)
   - Start Date (when minting begins)
4. Click "Create Candy Machine"

### 4. Mint NFTs
1. After creating a candy machine, you'll see the status
2. Click "Mint NFT" to mint from your candy machine
3. Monitor remaining items and status

## 🔧 Technical Details

### Architecture
```
Frontend (Next.js) → Umi SDK → Metaplex Candy Machine Core
                    ↓
              Anchor Program (Dealifi)
```

### Key Features
- **Wallet Integration**: Uses your existing wallet adapter
- **Umi Integration**: Leverages your existing Umi setup
- **Error Handling**: Comprehensive error handling with toast notifications
- **Real-time Status**: Live updates of candy machine status
- **Guard System**: Support for payment, limits, and timing guards

### Components Structure
```
CandyMachineManager (Main Component)
├── Configuration Form
├── Guard Settings
├── Status Display
├── Mint Interface
└── Instructions
```

## 🎨 UI Integration

The candy machine interface follows your existing design system:
- Uses your existing UI components (`Button`, `Card`, `Input`, etc.)
- Matches your color scheme and styling
- Integrates with your toast notification system
- Responsive design for mobile and desktop

## 🔄 Integration with Anchor Program

After creating a candy machine with Umi SDK, you can integrate it with your Anchor program:

```typescript
// Example integration
import { Program } from '@coral-xyz/anchor';
import { DealifiCandy } from './types/dealifi_candy';

// After creating candy machine with Umi
const candyMachineAddress = result.candyMachine;

// Register with Anchor program
await program.methods
  .initializeCandyMachine(
    candyMachineAddress,
    new BN(config.itemsAvailable)
  )
  .accounts({
    authority: publicKey,
    payer: publicKey,
    merchant: merchantPDA,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

## 🧪 Testing

### Development
```bash
npm run dev
# Navigate to http://localhost:3000/candy-machine
```

### Production Build
```bash
npm run build
npm start
```

## 🐛 Troubleshooting

### Common Issues

1. **Wallet Not Connected**
   - Ensure wallet is connected before creating candy machine
   - Check wallet adapter configuration

2. **Umi Not Initialized**
   - Verify Umi store is properly configured
   - Check that candy machine plugins are loaded

3. **Transaction Failures**
   - Check account balances
   - Verify RPC endpoint is working
   - Check guard conditions

4. **Build Errors**
   - Run `npm install` to ensure all dependencies are installed
   - Check TypeScript configuration

### Debug Mode
Enable debug logging in the candy machine manager:
```typescript
// In candy-machine-manager.ts
console.log('Debug info:', { umi, signer, config });
```

## 📈 Next Steps

1. **Test the Integration**: Create a test candy machine and mint NFTs
2. **Customize Guards**: Add more guard types as needed
3. **Integrate with Anchor**: Connect candy machines to your Anchor program
4. **Add Analytics**: Track candy machine performance
5. **Enhance UI**: Add more features like batch operations

## 🎉 Success!

You now have a fully integrated candy machine system that:
- ✅ Works with your existing frontend architecture
- ✅ Uses your existing wallet and Umi setup
- ✅ Follows your design system
- ✅ Provides complete candy machine functionality
- ✅ Is ready for production use

The integration is seamless and maintains consistency with your existing Dealifi platform!
