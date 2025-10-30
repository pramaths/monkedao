import { Merchant } from '../models/Merchant.js';

export async function listMerchants(req, res) {
  try {
    const merchants = await Merchant.find({}).lean();
    res.json({ success: true, merchants });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getMerchant(req, res) {
  try {
    const { address } = req.params;
    const merchant = await Merchant.findOne({ merchantAddress: address }).lean();
    if (!merchant) return res.status(404).json({ message: 'Merchant not found' });
    res.json({ success: true, merchant });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function saveCandyMachine(req, res) {
  try {
    const { merchantAddress, candyMachine } = req.body;
    if (!merchantAddress || !candyMachine) return res.status(400).json({ message: 'Missing required fields' });

    const now = new Date().toISOString();
    const result = await Merchant.updateOne(
      { merchantAddress },
      {
        $setOnInsert: { merchantAddress, createdAt: now },
        $set: { updatedAt: now },
        $addToSet: { candyMachines: candyMachine },
      },
      { upsert: true }
    );
    const merchant = await Merchant.findOne({ merchantAddress }).lean();
    res.status(result?.upsertedId ? 201 : 200).json({ success: true, merchant });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function saveCandyMachineItems(req, res) {
  try {
    const { merchantAddress, candyMachineAddress, items } = req.body;
    if (!merchantAddress || !candyMachineAddress || !Array.isArray(items)) return res.status(400).json({ message: 'Missing required fields' });
    const now = new Date().toISOString();
    await Merchant.updateOne(
      { merchantAddress },
      { $setOnInsert: { merchantAddress, createdAt: now } },
      { upsert: true }
    );
    const resUpdate = await Merchant.updateOne(
      { merchantAddress, 'candyMachines.address': candyMachineAddress },
      { $push: { 'candyMachines.$.items': { $each: items } }, $set: { updatedAt: now } }
    );
    if (resUpdate.matchedCount === 0) return res.status(404).json({ message: 'Candy machine not found under merchant' });
    const merchant = await Merchant.findOne({ merchantAddress }).lean();
    res.json({ success: true, merchant });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function updateAfterMint(req, res) {
  try {
    const { candyMachineAddress, mint, authority, uri } = req.body;
    if (!candyMachineAddress || !mint || !authority) return res.status(400).json({ message: 'Missing required fields' });
    const now = new Date().toISOString();
    const updated = await Merchant.findOneAndUpdate(
      { 'candyMachines.address': candyMachineAddress },
      {
        $inc: { 'candyMachines.$.itemsRedeemed': 1 },
        $push: { 'candyMachines.$.mintedRecords': { mint, authority, uri: uri || null, mintedAt: now } },
        $set: { updatedAt: now },
      },
      { returnDocument: 'after' }
    );
    if (!updated) return res.status(404).json({ message: 'Candy machine not found' });
    res.json({ success: true, merchant: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Internal server error' });
  }
}


