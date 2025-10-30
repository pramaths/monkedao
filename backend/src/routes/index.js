import { Router } from 'express';
import {
  listMerchants,
  getMerchant,
  saveCandyMachine,
  saveCandyMachineItems,
  updateAfterMint,
} from '../controllers/merchantController.js';

const router = Router();

router.get('/merchants', listMerchants);
router.get('/merchants/:address', getMerchant);
router.post('/candy-machines/save', saveCandyMachine);
router.post('/candy-machines/items', saveCandyMachineItems);
router.post('/candy-machines/minted', updateAfterMint);

export default router;


