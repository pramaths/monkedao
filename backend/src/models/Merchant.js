import mongoose from 'mongoose';

const MintedRecordSchema = new mongoose.Schema(
  {
    mint: { type: String, required: true },
    authority: { type: String, required: true },
    uri: { type: String },
    mintedAt: { type: String, required: true },
  },
  { _id: false }
);

const CandyMachineItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    uri: { type: String, required: true },
  },
  { _id: false }
);

const CandyMachineSchema = new mongoose.Schema(
  {
    address: { type: String, required: true },
    itemsAvailable: { type: Number, required: true },
    itemsRedeemed: { type: Number, required: true, default: 0 },
    createdAt: { type: String, required: true },
    name: { type: String },
    symbol: { type: String },
    description: { type: String },
    mintedRecords: { type: [MintedRecordSchema], default: [] },
    items: { type: [CandyMachineItemSchema], default: [] },
    updatedAt: { type: String },
  },
  { _id: false }
);

const MerchantSchema = new mongoose.Schema(
  {
    merchantAddress: { type: String, unique: true, required: true },
    candyMachines: { type: [CandyMachineSchema], default: [] },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { timestamps: false }
);

export const Merchant = mongoose.models.Merchant || mongoose.model('Merchant', MerchantSchema);


