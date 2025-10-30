import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { DealifiCandyMachineManager, CandyMachineConfig, GuardConfig, CandyMachineStatus } from '@/lib/candy-machine-manager';
import useUmiStore from '@/store/useUmiStore';

export const useCandyMachine = () => {
  const { publicKey, connected } = useWallet();
  const { umi, signer } = useUmiStore();
  const [candyManager, setCandyManager] = useState<DealifiCandyMachineManager | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize candy manager when wallet connects and signer is available
  useEffect(() => {
    if (connected && publicKey && signer && umi) {
      const manager = new DealifiCandyMachineManager(umi);
      setCandyManager(manager);
      setError(null);
    } else {
      setCandyManager(null);
    }
  }, [connected, publicKey, signer, umi]);

  const createCandyMachine = async (config: CandyMachineConfig, guards?: GuardConfig) => {
    if (!candyManager) {
      throw new Error('Candy manager not initialized');
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await candyManager.createCandyMachine(config, guards);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const mintNFT = async (candyMachineAddress: string) => {
    if (!candyManager || !signer) {
      throw new Error('Candy manager or signer not available');
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await candyManager.mintNFT(candyMachineAddress, signer);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getCandyMachineStatus = async (candyMachineAddress: string): Promise<CandyMachineStatus> => {
    if (!candyManager) {
      throw new Error('Candy manager not initialized');
    }

    try {
      const status = await candyManager.getCandyMachineStatus(candyMachineAddress);
      return status;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return {
    candyManager,
    loading,
    error,
    isReady: !!candyManager && connected,
    createCandyMachine,
    mintNFT,
    getCandyMachineStatus,
  };
};
