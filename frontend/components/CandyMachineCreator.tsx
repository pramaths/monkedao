"use client";

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { DealifiCandyMachineManager, CandyMachineConfig, GuardConfig, CandyMachineStatus } from '@/lib/candy-machine-manager';
import useUmiStore from '@/store/useUmiStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ImageGenerator } from '@/components/ImageGenerator';
import { saveCandyMachineToDB, saveCandyMachineItems } from '@/lib/merchant-db';

const CandyMachineCreator: React.FC = () => {
  const { publicKey, connected, wallet } = useWallet();
  const { umi, signer, updateSigner } = useUmiStore();

  const isValidJson = (jsonString: string): boolean => {
    try {
      JSON.parse(jsonString);
      return true;
    } catch {
      return false;
    }
  };
  const [candyManager, setCandyManager] = useState<DealifiCandyMachineManager | null>(null);
  const [loading, setLoading] = useState(false);
  const [candyMachineAddress, setCandyMachineAddress] = useState<string>('');
  const [status, setStatus] = useState<CandyMachineStatus | null>(null);
  const [nftItems, setNftItems] = useState<Array<{name: string, uri: string}>>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemUri, setNewItemUri] = useState('');
  const [addingItems, setAddingItems] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [modalNftName, setModalNftName] = useState('');
  const [modalDiscount, setModalDiscount] = useState('');
  const [modalDescription, setModalDescription] = useState('');
  const [modalImageData, setModalImageData] = useState('');
  const [modalNftUri, setModalNftUri] = useState('');
  const [modalNftJson, setModalNftJson] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [creatingUri, setCreatingUri] = useState(false);
  const [modalInputMode, setModalInputMode] = useState<'form' | 'json'>('form');
  const [mintLoading, setMintLoading] = useState(false); // Add this line

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showFormModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showFormModal]);

  // Create metadata via API and add to candy machine
  const handleCreateUriAndAdd = async () => {
    if (!modalNftName.trim() || !modalDescription.trim() || !modalDiscount.trim() || !modalImageData) {
      toast.error('Please fill in all fields and generate/upload an image');
      return;
    }
    if (!candyManager || !candyMachineAddress) {
      toast.error('Candy machine not ready');
      return;
    }

    try {
      setCreatingUri(true);
      const res = await fetch('/api/createUri', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: modalImageData,
          metadata: {
            name: modalNftName,
            description: modalDescription,
            attributes: [
              { trait_type: 'Discount', value: modalDiscount }
            ]
          }
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        throw new Error(err?.error || 'Failed to create metadata');
      }
      const data = await res.json();
      const uri = data?.metadataUri as string;
      if (!uri) throw new Error('No metadataUri returned');

      await handleAddSpecificItem(modalNftName, uri);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to upload image/metadata');
    } finally {
      setCreatingUri(false);
    }
  };

  const [config, setConfig] = useState<CandyMachineConfig>({
    itemsAvailable: 1000,
    symbol: 'DEALIFI',
    sellerFeeBasisPoints: 500,
    maxSupply: 0,
    isMutable: true,
  });

  const [guards, setGuards] = useState<GuardConfig>({
    solPayment: {
      lamports: 1000000000, // 1 SOL
      destination: ''
    },
    mintLimit: {
      id: 1,
      limit: 5
    },
    startDate: {
      date: Math.floor(Date.now() / 1000)
    },
    endDate: {
      date: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000)
    }
  });

  useEffect(() => {
    if (connected && publicKey && wallet) {
      // Update Umi with the connected wallet
      updateSigner(wallet.adapter);
    }
  }, [connected, publicKey, wallet, updateSigner]);

  useEffect(() => {
    if (umi && signer) {
      const manager = new DealifiCandyMachineManager(umi);
      setCandyManager(manager);
    }
  }, [signer, umi]);

  const handleCreateCandyMachine = async () => {
    if (!candyManager || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      const result = await candyManager.createCandyMachine(config, guards);
      setCandyMachineAddress(result.candyMachine.toString());
      
      // Wait for on-chain propagation before fetching status
      try {
        const cmPk = new PublicKey(result.candyMachine.toString());
        let found = false;
        for (let i = 0; i < 10; i++) {
          try {
            await candyManager.getRawCandyMachineData(cmPk);
            found = true;
            break;
          } catch (e: any) {
            if (e?.name !== 'AccountNotFoundError') throw e;
            await new Promise((r) => setTimeout(r, 5000));
          }
        }
        if (!found) throw new Error('Candy machine account not found after retries');
      } catch (e) {
        console.warn('Propagation wait failed:', e);
      }
      
      // Fetch initial status after availability
      try {
        const candyStatus = await candyManager.getCandyMachineStatus(result.candyMachine);
        setStatus(candyStatus);
      } catch (e) {
        console.warn('Failed to fetch initial status:', e);
      }
      
      // Save candy machine to MongoDB
      try {
        const candyMachineData = {
          address: result.candyMachine.toString(),
          itemsAvailable: config.itemsAvailable,
          itemsRedeemed: 0,
          createdAt: new Date().toISOString(),
          name: config.symbol,
          symbol: config.symbol
        };
        
        await saveCandyMachineToDB(publicKey.toString(), candyMachineData);
      } catch (error) {
        console.warn('Failed to save candy machine to database:', error);
        toast.error('Candy machine created but failed to save to database');
      }
      
      toast.success('Candy machine created successfully!');
    } catch (error: any) {
      console.error('Error creating candy machine:', error);
      try {
        const logs = typeof error?.getLogs === 'function' ? await error.getLogs() : (error?.logs || null);
        if (logs) console.error('Program logs:', logs);
      } catch {}
      toast.error('Error creating candy machine: ' + (error?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Mint NFT
  const handleMintNFT = async () => {
    if (!candyManager || !publicKey || !candyMachineAddress || !signer) {
      toast.error('Please connect your wallet first');
      return;
    }

    setMintLoading(true);
    try {
      const nftMint = await candyManager.mintNFT(
        new PublicKey(candyMachineAddress),
        signer
      );
      
      // Update status after minting
      const candyStatus = await candyManager.getCandyMachineStatus(
        new PublicKey(candyMachineAddress)
      );
      setStatus(candyStatus);
      
      toast.success(`NFT minted successfully! Mint: ${nftMint.toString()}`);
    } catch (error: any) {
      console.error('Error minting NFT:', error);
      try {
        const logs = typeof error?.getLogs === 'function' ? await error.getLogs() : (error?.logs || null);
        if (logs) console.error('Program logs:', logs);
      } catch {}
      toast.error('Error minting NFT: ' + (error?.message || 'Unknown error'));
    } finally {
      setMintLoading(false);
    }
  };

  // Refresh status
  const handleRefreshStatus = async () => {
    if (!candyManager || !candyMachineAddress) return;

    try {
      const candyStatus = await candyManager.getCandyMachineStatus(
        new PublicKey(candyMachineAddress)
      );
      setStatus(candyStatus);
      toast.success('Status refreshed');
    } catch (error: any) {
      console.error('Error fetching status:', error);
      toast.error('Error fetching status: ' + error.message);
    }
  };

  // Add NFT items to candy machine
  const handleAddItems = async () => {
    if (!candyManager || !candyMachineAddress || !newItemName.trim() || !newItemUri.trim()) {
      toast.error('Please fill in both name and URI');
      return;
    }

    setAddingItems(true);
    try {
      const newItems = [{ name: newItemName, uri: newItemUri }];
      
      // Use addConfigLines to add items to the candy machine
      await candyManager.addConfigLinesAtIndex(
        new PublicKey(candyMachineAddress),
        status?.itemsLoaded || 0, // Use current itemsLoaded as index
        newItems.map(item => ({ name: item.name, uri: item.uri }))
      );
      // Persist items to DB (best-effort)
      try {
        await saveCandyMachineItems({
          merchantAddress: publicKey!.toString(),
          candyMachineAddress,
          items: newItems,
        });
      } catch (e) {
        console.warn('Failed to save items to DB:', (e as any)?.message || e);
      }
      
      setNftItems(prev => [...prev, ...newItems]);
      setNewItemName('');
      setNewItemUri('');
      
      // Refresh status to get updated itemsLoaded
      await handleRefreshStatus();
      
      toast.success('NFT item added successfully!');
    } catch (error: any) {
      console.error('Error adding items:', error);
      toast.error('Error adding items: ' + error.message);
    } finally {
      setAddingItems(false);
    }
  };

  // Add a specific item (used by the modal flow)
  const handleAddSpecificItem = async (name: string, uri: string) => {
    if (!candyManager || !candyMachineAddress || !name.trim() || !uri.trim()) {
      toast.error('Please fill in both name and URI');
      return;
    }

    setModalSubmitting(true);
    try {
      await candyManager.addConfigLinesAtIndex(
        new PublicKey(candyMachineAddress),
        status?.itemsLoaded || 0,
        [{ name, uri }]
      );
      // Persist item to DB (best-effort)
      try {
        await saveCandyMachineItems({
          merchantAddress: publicKey!.toString(),
          candyMachineAddress,
          items: [{ name, uri }],
        });
      } catch (e) {
        console.warn('Failed to save item to DB:', (e as any)?.message || e);
      }

      setNftItems(prev => [...prev, { name, uri }]);
      await handleRefreshStatus();
      toast.success('NFT item added successfully!');
      setShowFormModal(false);
      setModalNftName('');
      setModalNftUri('');
    } catch (error: any) {
      console.error('Error adding items:', error);
      toast.error('Error adding items: ' + error.message);
    } finally {
      setModalSubmitting(false);
    }
  };

  if (!connected) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24 flex justify-center items-center min-h-screen">
        <Card 
          className="w-full max-w-md border-4"
          style={{
            background: "linear-gradient(135deg, rgba(0, 255, 100, 0.1) 0%, rgba(0, 255, 255, 0.1) 100%)",
            borderImage: "linear-gradient(45deg, #00ff00, #00ffff, #ffff00, #00ff00) 1",
            boxShadow: "0 0 30px rgba(0, 255, 100, 0.5), 0 8px 0 rgba(0, 0, 0, 0.5)",
          }}
        >
          <CardHeader>
            <CardTitle 
              className="text-2xl text-center"
              style={{
                color: "#ffff00",
                textShadow: "3px 3px 0px #00ff00, 6px 6px 0px rgba(0, 0, 0, 0.5)",
              }}
            >
              🔗 CONNECT WALLET
            </CardTitle>
            <CardDescription 
              className="text-center"
              style={{
                color: "#00ffff",
                textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)",
              }}
            >
              Please connect your wallet to create and manage candy machines.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-24 space-y-8">
      <div className="text-center">
        <h1 
          className="text-4xl font-bold mb-4"
          style={{
            color: "#ffff00",
            textShadow: "3px 3px 0px #00ff00, 6px 6px 0px rgba(0, 0, 0, 0.5)",
          }}
        >
          🍭 NFT CANDY MACHINE
        </h1>
        <p 
          className="text-xl"
          style={{
            color: "#00ffff",
            textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)",
          }}
        >
          Deploy and manage your NFT collection with professional candy machine infrastructure
        </p>
      </div>
      
      <Card 
        className="border-4"
        style={{
          background: "linear-gradient(135deg, rgba(0, 255, 100, 0.1) 0%, rgba(0, 255, 255, 0.1) 100%)",
          borderImage: "linear-gradient(45deg, #00ff00, #00ffff, #ffff00, #00ff00) 1",
          boxShadow: "0 0 30px rgba(0, 255, 100, 0.5), 0 8px 0 rgba(0, 0, 0, 0.5)",
        }}
      >
        <CardHeader>
          <CardTitle 
            className="text-3xl text-center"
            style={{
              color: "#ffff00",
              textShadow: "3px 3px 0px #00ff00, 6px 6px 0px rgba(0, 0, 0, 0.5)",
            }}
          >
            🚀 DEPLOY CANDY MACHINE
          </CardTitle>
          <CardDescription 
            className="text-center text-base"
            style={{
              color: "#00ffff",
              textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)",
            }}
          >
            ⚡ CONFIGURE YOUR NFT COLLECTION AND DEPLOY TO SOLANA ⚡
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label 
                htmlFor="itemsAvailable"
                className="text-lg"
                style={{
                  color: "#ffff00",
                  textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)",
                }}
              >
                📦 COLLECTION SIZE
              </Label>
              <Input
                id="itemsAvailable"
                type="number"
                min="1"
                max="10000"
                value={config.itemsAvailable}
                onChange={(e) => setConfig(prev => ({ ...prev, itemsAvailable: parseInt(e.target.value) || 0 }))}
                placeholder="1000"
                className="border-2 border-cyan-400 bg-black/30 text-white placeholder:text-gray-400"
                style={{
                  boxShadow: "0 0 10px rgba(0, 255, 255, 0.3)",
                }}
              />
              <p 
                className="text-xs"
                style={{
                  color: "#00ffff",
                  textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)",
                }}
              >
                Total number of NFTs in your collection
              </p>
            </div>
            
            <div className="space-y-2">
              <Label 
                htmlFor="symbol"
                className="text-lg"
                style={{
                  color: "#ffff00",
                  textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)",
                }}
              >
                🏷️ COLLECTION SYMBOL
              </Label>
              <Input
                id="symbol"
                type="text"
                maxLength={10}
                value={config.symbol}
                onChange={(e) => setConfig(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                placeholder="MYNFT"
                className="border-2 border-cyan-400 bg-black/30 text-white placeholder:text-gray-400"
                style={{
                  boxShadow: "0 0 10px rgba(0, 255, 255, 0.3)",
                }}
              />
              <p 
                className="text-xs"
                style={{
                  color: "#00ffff",
                  textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)",
                }}
              >
                Short identifier for your collection (max 10 chars)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label 
                htmlFor="sellerFee"
                className="text-lg"
                style={{
                  color: "#ffff00",
                  textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)",
                }}
              >
                💰 ROYALTY FEE (%)
              </Label>
              <Input
                id="sellerFee"
                type="number"
                min="0"
                max="1000"
                step="10"
                value={config.sellerFeeBasisPoints / 100}
                onChange={(e) => setConfig(prev => ({ ...prev, sellerFeeBasisPoints: parseInt(e.target.value) * 100 }))}
                placeholder="5"
                className="border-2 border-cyan-400 bg-black/30 text-white placeholder:text-gray-400"
                style={{
                  boxShadow: "0 0 10px rgba(0, 255, 255, 0.3)",
                }}
              />
              <p 
                className="text-xs"
                style={{
                  color: "#00ffff",
                  textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)",
                }}
              >
                Creator royalty percentage (0-10%)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label 
                htmlFor="maxSupply"
                className="text-lg"
                style={{
                  color: "#ffff00",
                  textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)",
                }}
              >
                🔢 MAX SUPPLY
              </Label>
              <Input
                id="maxSupply"
                type="number"
                min="0"
                value={config.maxSupply}
                onChange={(e) => setConfig(prev => ({ ...prev, maxSupply: parseInt(e.target.value) || 0 }))}
                placeholder="0"
                className="border-2 border-cyan-400 bg-black/30 text-white placeholder:text-gray-400"
                style={{
                  boxShadow: "0 0 10px rgba(0, 255, 255, 0.3)",
                }}
              />
              <p 
                className="text-xs"
                style={{
                  color: "#00ffff",
                  textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)",
                }}
              >
                Maximum supply (0 = unlimited)
              </p>
            </div>
          </div>

          {/* Mint Configuration */}
          <div className="space-y-4">
            <h3 
              className="text-lg font-semibold"
              style={{
                color: "#ffff00",
                textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)",
              }}
            >
              ⚙️ MINT CONFIGURATION
            </h3>
            <p 
              className="text-sm"
              style={{
                color: "#00ffff",
                textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)",
              }}
            >
              Configure pricing, limits, and timing for your NFT collection
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label 
                  htmlFor="solPayment"
                  className="text-lg"
                  style={{
                    color: "#ffff00",
                    textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)",
                  }}
                >
                  💎 MINT PRICE (SOL)
                </Label>
                <Input
                  id="solPayment"
                  type="number"
                  min="0"
                  step="0.01"
                  value={(guards.solPayment?.lamports || 0) / 1000000000}
                  onChange={(e) => setGuards(prev => ({
                    ...prev,
                    solPayment: {
                      ...prev.solPayment!,
                      lamports: Math.floor(parseFloat(e.target.value) * 1000000000)
                    }
                  }))}
                  placeholder="1.0"
                  className="border-2 border-cyan-400 bg-black/30 text-white placeholder:text-gray-400"
                  style={{
                    boxShadow: "0 0 10px rgba(0, 255, 255, 0.3)",
                  }}
                />
                <p 
                  className="text-xs"
                  style={{
                    color: "#00ffff",
                    textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)",
                  }}
                >
                  Price per NFT in SOL
                </p>
              </div>
              
              <div className="space-y-2">
                <Label 
                  htmlFor="mintLimit"
                  className="text-lg"
                  style={{
                    color: "#ffff00",
                    textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)",
                  }}
                >
                  🚫 PER WALLET LIMIT
                </Label>
                <Input
                  id="mintLimit"
                  type="number"
                  min="1"
                  max="100"
                  value={guards.mintLimit?.limit || 1}
                  onChange={(e) => setGuards(prev => ({
                    ...prev,
                    mintLimit: {
                      ...prev.mintLimit!,
                      limit: parseInt(e.target.value) || 1
                    }
                  }))}
                  placeholder="5"
                  className="border-2 border-cyan-400 bg-black/30 text-white placeholder:text-gray-400"
                  style={{
                    boxShadow: "0 0 10px rgba(0, 255, 255, 0.3)",
                  }}
                />
                <p 
                  className="text-xs"
                  style={{
                    color: "#00ffff",
                    textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)",
                  }}
                >
                  Max NFTs per wallet
                </p>
              </div>
              
              <div className="space-y-2">
                <Label 
                  htmlFor="startDate"
                  className="text-lg"
                  style={{
                    color: "#ffff00",
                    textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)",
                  }}
                >
                  ⏰ MINT START TIME
                </Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={guards.startDate?.date ? new Date(guards.startDate.date * 1000).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setGuards(prev => ({
                    ...prev,
                    startDate: {
                      date: Math.floor(new Date(e.target.value).getTime() / 1000)
                    }
                  }))}
                  className="border-2 border-cyan-400 bg-black/30 text-white placeholder:text-gray-400"
                  style={{
                    boxShadow: "0 0 10px rgba(0, 255, 255, 0.3)",
                  }}
                />
                <p 
                  className="text-xs"
                  style={{
                    color: "#00ffff",
                    textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)",
                  }}
                >
                  When minting becomes available
                </p>
              </div>

              <div className="space-y-2">
                <Label 
                  htmlFor="endDate"
                  className="text-lg"
                  style={{
                    color: "#ffff00",
                    textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)",
                  }}
                >
                  ⏹️ MINT END TIME
                </Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={guards.endDate?.date ? new Date(guards.endDate.date * 1000).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setGuards(prev => ({
                    ...prev,
                    endDate: {
                      date: Math.floor(new Date(e.target.value).getTime() / 1000)
                    }
                  }))}
                  className="border-2 border-cyan-400 bg-black/30 text-white placeholder:text-gray-400"
                  style={{
                    boxShadow: "0 0 10px rgba(0, 255, 255, 0.3)",
                  }}
                />
                <p 
                  className="text-xs"
                  style={{
                    color: "#00ffff",
                    textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)",
                  }}
                >
                  When minting ends (default: +30 days)
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={handleCreateCandyMachine}
              disabled={loading || !candyManager || config.itemsAvailable <= 0 || !config.symbol}
              className="flex-1 text-xl py-6 border-4 border-yellow-400"
              style={{
                background: loading
                  ? "linear-gradient(45deg, #666, #888)"
                  : "linear-gradient(45deg, #00ff00, #00ffff)",
                boxShadow: loading
                  ? "none"
                  : "0 0 20px rgba(0, 255, 100, 0.8), 0 8px 0 rgba(0, 0, 0, 0.5)",
                textShadow: "2px 2px 0px rgba(0, 0, 0, 0.8)",
              }}
            >
              {loading ? '⏳ DEPLOYING...' : '🚀 DEPLOY CANDY MACHINE'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setConfig({
                  itemsAvailable: 1000,
                  symbol: 'MYNFT',
                  sellerFeeBasisPoints: 500,
                  maxSupply: 0,
                  isMutable: true,
                });
                setGuards({
                  solPayment: { lamports: 1000000000, destination: '' },
                  mintLimit: { id: 1, limit: 5 },
                  startDate: { date: Math.floor(Date.now() / 1000) },
                  endDate: { date: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000) }
                });
              }}
              className="text-lg py-4 border-4 border-cyan-400"
              style={{
                background: "linear-gradient(45deg, rgba(0, 255, 255, 0.1), rgba(0, 255, 100, 0.1))",
                color: "#00ffff",
                textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)",
                boxShadow: "0 0 10px rgba(0, 255, 255, 0.3), 0 4px 0 rgba(0, 0, 0, 0.3)",
              }}
            >
              🔄 RESET
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Candy Machine Status Section */}
      {candyMachineAddress && (
        <Card 
          className="border-4"
          style={{
            background: "linear-gradient(135deg, rgba(0, 255, 100, 0.1) 0%, rgba(0, 255, 255, 0.1) 100%)",
            borderImage: "linear-gradient(45deg, #00ff00, #00ffff, #ffff00, #00ff00) 1",
            boxShadow: "0 0 30px rgba(0, 255, 100, 0.5), 0 8px 0 rgba(0, 0, 0, 0.5)",
          }}
        >
          <CardHeader>
            <CardTitle 
              className="text-3xl text-center"
              style={{
                color: "#ffff00",
                textShadow: "3px 3px 0px #00ff00, 6px 6px 0px rgba(0, 0, 0, 0.5)",
              }}
            >
              📊 COLLECTION DASHBOARD
            </CardTitle>
            <CardDescription 
              className="text-center text-base"
              style={{
                color: "#00ffff",
                textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)",
              }}
            >
              ⚡ MONITOR YOUR DEPLOYED COLLECTION AND MANAGE MINTING ⚡
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label 
                className="text-lg"
                style={{
                  color: "#ffff00",
                  textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)",
                }}
              >
                🔗 COLLECTION CONTRACT ADDRESS
              </Label>
              <div className="flex gap-2">
                <Input
                  value={candyMachineAddress}
                  readOnly
                  className="bg-black/30 font-mono text-sm border-2 border-cyan-400 text-white"
                  style={{
                    boxShadow: "0 0 10px rgba(0, 255, 255, 0.3)",
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(candyMachineAddress)}
                  className="border-4 border-cyan-400"
                  style={{
                    background: "linear-gradient(45deg, rgba(0, 255, 255, 0.1), rgba(0, 255, 100, 0.1))",
                    color: "#00ffff",
                    textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)",
                    boxShadow: "0 0 10px rgba(0, 255, 255, 0.3), 0 4px 0 rgba(0, 0, 0, 0.3)",
                  }}
                >
                  📋 COPY
                </Button>
              </div>
              <p 
                className="text-xs"
                style={{
                  color: "#00ffff",
                  textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)",
                }}
              >
                Your deployed candy machine contract address
              </p>
            </div>

            {status && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">{status.itemsAvailable}</div>
                      <div className="text-sm text-muted-foreground">Total Available</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">{status.itemsRedeemed}</div>
                      <div className="text-sm text-muted-foreground">Redeemed</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600">{status.remaining}</div>
                      <div className="text-sm text-muted-foreground">Remaining</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className={`text-3xl font-bold ${status.isActive ? 'text-green-600' : 'text-red-600'}`}>
                        {status.isActive ? 'Active' : 'Inactive'}
                      </div>
                      <div className="text-sm text-muted-foreground">Status</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex gap-4">
              <Button
                onClick={handleMintNFT}
                disabled={
                  mintLoading ||
                  !status?.isActive ||
                  !candyManager ||
                  (status && status.itemsLoaded !== status.itemsAvailable)
                }
                className="flex-1 text-xl py-6 border-4 border-yellow-400"
                style={{
                  background: mintLoading
                    ? "linear-gradient(45deg, #666, #888)"
                    : "linear-gradient(45deg, #00ff00, #00ffff)",
                  boxShadow: mintLoading
                    ? "none"
                    : "0 0 20px rgba(0, 255, 100, 0.8), 0 8px 0 rgba(0, 0, 0, 0.5)",
                  textShadow: "2px 2px 0px rgba(0, 0, 0, 0.8)",
                }}
              >
                {mintLoading ? '⏳ MINTING NFT...' : '🎯 MINT NFT'}
              </Button>

              {status && status.itemsLoaded !== status.itemsAvailable && (
                <div className="flex-1 text-sm text-red-400 self-center">
                  Load {Math.max(0, (status.itemsAvailable - status.itemsLoaded))} more item(s) before minting.
                </div>
              )}
              
              <Button
                onClick={handleRefreshStatus}
                variant="outline"
                className="flex-1 text-lg py-4 border-4 border-cyan-400"
                style={{
                  background: "linear-gradient(45deg, rgba(0, 255, 255, 0.1), rgba(0, 255, 100, 0.1))",
                  color: "#00ffff",
                  textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)",
                  boxShadow: "0 0 10px rgba(0, 255, 255, 0.3), 0 4px 0 rgba(0, 0, 0, 0.3)",
                }}
              >
                🔄 REFRESH DATA
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal: Add via Form */}
      {showFormModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto" 
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowFormModal(false);
            }
          }}
        >
          <div className="w-full max-w-2xl mx-4 my-8 modal-content">
            <Card 
              className="border-4"
              style={{
                background: "linear-gradient(135deg, rgba(0, 0, 0, 0.85) 0%, rgba(0, 255, 255, 0.08) 100%)",
                borderImage: "linear-gradient(45deg, #ff00ff, #00ffff, #ffff00, #ff00ff) 1",
                boxShadow: "0 0 30px rgba(255, 0, 255, 0.5), 0 8px 0 rgba(0, 0, 0, 0.5)",
              }}
            >
              <CardHeader>
                <CardTitle 
                  className="text-2xl text-center"
                  style={{
                    color: "#ffff00",
                    textShadow: "3px 3px 0px #00ff00, 6px 6px 0px rgba(0, 0, 0, 0.5)",
                  }}
                >
                  🎨 ADD NFT VIA FORM
                </CardTitle>
                <CardDescription 
                  className="text-center text-base"
                  style={{
                    color: "#00ffff",
                    textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)",
                  }}
                >
                  Upload NFTs by generating image and metadata, or paste full JSON
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label 
                    className="text-lg"
                    style={{ color: '#ffff00', textShadow: '2px 2px 0px rgba(0,0,0,0.5)' }}
                  >
                    🏷️ DEAL / NFT NAME
                  </Label>
                  <Input
                    type="text"
                    placeholder="My Deal NFT #1"
                    value={modalNftName}
                    onChange={(e) => setModalNftName(e.target.value)}
                    className="border-2 border-purple-400 bg-black/30 text-white placeholder:text-gray-400"
                    style={{ boxShadow: '0 0 10px rgba(255,0,255,0.3)' }}
                  />
                </div>

                {/* Deal fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label 
                      className="text-lg"
                      style={{ color: '#ffff00', textShadow: '2px 2px 0px rgba(0,0,0,0.5)' }}
                    >
                      💸 DISCOUNT
                    </Label>
                    <Input
                      type="text"
                      placeholder="e.g., 20% OFF"
                      value={modalDiscount}
                      onChange={(e) => setModalDiscount(e.target.value)}
                      className="border-2 border-purple-400 bg-black/30 text-white placeholder:text-gray-400"
                      style={{ boxShadow: '0 0 10px rgba(255,0,255,0.3)' }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label 
                      className="text-lg"
                      style={{ color: '#ffff00', textShadow: '2px 2px 0px rgba(0,0,0,0.5)' }}
                    >
                      📝 DESCRIPTION
                    </Label>
                    <Input
                      type="text"
                      placeholder="Short description"
                      value={modalDescription}
                      onChange={(e) => setModalDescription(e.target.value)}
                      className="border-2 border-purple-400 bg-black/30 text-white placeholder:text-gray-400"
                      style={{ boxShadow: '0 0 10px rgba(255,0,255,0.3)' }}
                    />
                  </div>
                </div>

                {/* Input Mode Toggle */}
                <div className="space-y-2">
                  <Label 
                    className="text-lg"
                    style={{ color: '#ffff00', textShadow: '2px 2px 0px rgba(0,0,0,0.5)' }}
                  >
                    📝 INPUT MODE
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      variant={modalInputMode === 'form' ? 'default' : 'outline'}
                      onClick={() => setModalInputMode('form')}
                      className="flex-1"
                      style={{
                        background: modalInputMode === 'form' 
                          ? 'linear-gradient(45deg, #ff00ff, #00ffff)' 
                          : 'rgba(0,0,0,0.3)',
                        border: '2px solid #ff00ff',
                        color: '#ffff00',
                        textShadow: '1px 1px 0px rgba(0,0,0,0.5)'
                      }}
                    >
                      🧩 FORM MODE
                    </Button>
                    <Button
                      variant={modalInputMode === 'json' ? 'default' : 'outline'}
                      onClick={() => setModalInputMode('json')}
                      className="flex-1"
                      style={{
                        background: modalInputMode === 'json' 
                          ? 'linear-gradient(45deg, #ff00ff, #00ffff)' 
                          : 'rgba(0,0,0,0.3)',
                        border: '2px solid #ff00ff',
                        color: '#ffff00',
                        textShadow: '1px 1px 0px rgba(0,0,0,0.5)'
                      }}
                    >
                      📄 JSON MODE
                    </Button>
                  </div>
                </div>

                {modalInputMode === 'form' ? (
                  <>
                    <div className="space-y-2">
                      <Label 
                        className="text-lg"
                        style={{ color: '#ffff00', textShadow: '2px 2px 0px rgba(0,0,0,0.5)' }}
                      >
                        🎨 IMAGE (AI OR MANUAL)
                      </Label>
                      <div className="p-3 rounded-lg border-2 border-cyan-400 max-h-64 overflow-auto" style={{ background: 'rgba(0,0,0,0.4)' }}>
                        <ImageGenerator onImageReady={(uri) => setModalImageData(uri)} />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label 
                      className="text-lg"
                      style={{ color: '#ffff00', textShadow: '2px 2px 0px rgba(0,0,0,0.5)' }}
                    >
                      📄 JSON METADATA
                    </Label>
                    <textarea
                      placeholder='{"name": "My NFT", "description": "A cool NFT", "image": "https://...", "attributes": [...]}'
                      value={modalNftJson}
                      onChange={(e) => setModalNftJson(e.target.value)}
                      className="w-full h-32 border-2 border-purple-400 bg-black/30 text-white placeholder:text-gray-400 p-3 rounded resize-none"
                      style={{ 
                        boxShadow: '0 0 10px rgba(255,0,255,0.3)',
                        fontFamily: 'monospace'
                      }}
                    />
                    <div className="flex justify-between items-center">
                      <p 
                        className="text-xs"
                        style={{
                          color: "#00ffff",
                          textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)",
                        }}
                      >
                        Enter complete JSON metadata for your NFT
                      </p>
                      {modalNftJson && (
                        <span 
                          className="text-xs px-2 py-1 rounded"
                          style={{
                            color: isValidJson(modalNftJson) ? "#00ff00" : "#ff0000",
                            background: "rgba(0,0,0,0.3)",
                            textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)",
                          }}
                        >
                          {isValidJson(modalNftJson) ? "✓ Valid JSON" : "✗ Invalid JSON"}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  {modalInputMode === 'form' ? (
                    <Button
                      onClick={handleCreateUriAndAdd}
                      disabled={
                        creatingUri || 
                        !modalNftName.trim() || 
                        !modalDescription.trim() || 
                        !modalDiscount.trim() ||
                        !modalImageData
                      }
                      className="flex-1 text-lg py-4 border-4 border-purple-400"
                      style={{
                        background: creatingUri ? 'linear-gradient(45deg,#666,#888)' : 'linear-gradient(45deg,#ff00ff,#00ffff)',
                        boxShadow: creatingUri ? 'none' : '0 0 20px rgba(255,0,255,0.8), 0 8px 0 rgba(0,0,0,0.5)',
                        textShadow: '2px 2px 0px rgba(0,0,0,0.8)'
                      }}
                    >
                      {creatingUri ? '⏳ CREATING URI...' : '🚀 CREATE METADATA & ADD'}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleAddSpecificItem(modalNftName, modalNftJson)}
                      disabled={modalSubmitting || !modalNftName.trim() || !modalNftJson.trim() || !isValidJson(modalNftJson)}
                      className="flex-1 text-lg py-4 border-4 border-purple-400"
                      style={{
                        background: modalSubmitting ? 'linear-gradient(45deg,#666,#888)' : 'linear-gradient(45deg,#ff00ff,#00ffff)',
                        boxShadow: modalSubmitting ? 'none' : '0 0 20px rgba(255,0,255,0.8), 0 8px 0 rgba(0,0,0,0.5)',
                        textShadow: '2px 2px 0px rgba(0,0,0,0.8)'
                      }}
                    >
                      {modalSubmitting ? '⏳ ADDING...' : '🎯 ADD NFT TO CANDY MACHINE'}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowFormModal(false);
                      setModalNftName('');
                      setModalDiscount('');
                      setModalDescription('');
                      setModalImageData('');
                      setModalNftUri('');
                      setModalNftJson('');
                      setModalInputMode('form');
                    }}
                    className="text-lg py-4 border-4 border-cyan-400"
                    style={{
                      background: 'linear-gradient(45deg, rgba(0,255,255,0.1), rgba(0,255,100,0.1))',
                      color: '#00ffff',
                      textShadow: '1px 1px 0px rgba(0,0,0,0.5)',
                      boxShadow: '0 0 10px rgba(0,255,255,0.3), 0 4px 0 rgba(0,0,0,0.3)'
                    }}
                  >
                    ✖ CLOSE
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Add NFT Items Section */}
      {candyMachineAddress && (
        <Card 
          className="border-4"
          style={{
            background: "linear-gradient(135deg, rgba(255, 0, 255, 0.1) 0%, rgba(0, 255, 255, 0.1) 100%)",
            borderImage: "linear-gradient(45deg, #ff00ff, #00ffff, #ffff00, #ff00ff) 1",
            boxShadow: "0 0 30px rgba(255, 0, 255, 0.5), 0 8px 0 rgba(0, 0, 0, 0.5)",
          }}
        >
          <CardHeader>
            <CardTitle 
              className="text-3xl text-center"
              style={{
                color: "#ffff00",
                textShadow: "3px 3px 0px #00ff00, 6px 6px 0px rgba(0, 0, 0, 0.5)",
              }}
            >
              🎨 ADD NFT ITEMS
            </CardTitle>
            <CardDescription 
              className="text-center text-base"
              style={{
                color: "#00ffff",
                textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)",
              }}
            >
              ⚡ ADD INDIVIDUAL NFT ITEMS TO YOUR CANDY MACHINE ⚡
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label 
                  htmlFor="itemName"
                  className="text-lg"
                  style={{
                    color: "#ffff00",
                    textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)",
                  }}
                >
                  🏷️ NFT NAME
                </Label>
                <Input
                  id="itemName"
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="My NFT #1"
                  className="border-2 border-purple-400 bg-black/30 text-white placeholder:text-gray-400"
                  style={{
                    boxShadow: "0 0 10px rgba(255, 0, 255, 0.3)",
                  }}
                />
                <p 
                  className="text-xs"
                  style={{
                    color: "#00ffff",
                    textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)",
                  }}
                >
                  Name for this specific NFT
                </p>
              </div>
              
              <div className="space-y-2">
                <Label 
                  htmlFor="itemUri"
                  className="text-lg"
                  style={{
                    color: "#ffff00",
                    textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)",
                  }}
                >
                  🔗 METADATA URI
                </Label>
                <Input
                  id="itemUri"
                  type="text"
                  value={newItemUri}
                  onChange={(e) => setNewItemUri(e.target.value)}
                  placeholder="https://example.com/nft1.json"
                  className="border-2 border-purple-400 bg-black/30 text-white placeholder:text-gray-400"
                  style={{
                    boxShadow: "0 0 10px rgba(255, 0, 255, 0.3)",
                  }}
                />
                <p 
                  className="text-xs"
                  style={{
                    color: "#00ffff",
                    textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)",
                  }}
                >
                  JSON metadata URI for this NFT
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={handleAddItems}
                disabled={addingItems || !newItemName.trim() || !newItemUri.trim()}
                className="flex-1 text-xl py-6 border-4 border-purple-400"
                style={{
                  background: addingItems
                    ? "linear-gradient(45deg, #666, #888)"
                    : "linear-gradient(45deg, #ff00ff, #00ffff)",
                  boxShadow: addingItems
                    ? "none"
                    : "0 0 20px rgba(255, 0, 255, 0.8), 0 8px 0 rgba(0, 0, 0, 0.5)",
                  textShadow: "2px 2px 0px rgba(0, 0, 0, 0.8)",
                }}
              >
                {addingItems ? '⏳ ADDING ITEM...' : '🎨 ADD NFT ITEM'}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setModalNftName('');
                  setModalDiscount('');
                  setModalDescription('');
                  setModalImageData('');
                  setModalNftUri('');
                  setModalNftJson('');
                  setModalInputMode('form');
                  setShowFormModal(true);
                }}
                className="flex-1 text-lg py-4 border-4 border-cyan-400"
                style={{
                  background: "linear-gradient(45deg, rgba(0, 255, 255, 0.1), rgba(0, 255, 100, 0.1))",
                  color: "#00ffff",
                  textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)",
                  boxShadow: "0 0 10px rgba(0, 255, 255, 0.3), 0 4px 0 rgba(0, 0, 0, 0.3)",
                }}
              >
                🧩 ADD VIA FORM (AI OR MANUAL)
              </Button>
            </div>

            {/* Display added items */}
            {nftItems.length > 0 && (
              <div className="space-y-4">
                <h3 
                  className="text-lg font-semibold"
                  style={{
                    color: "#ffff00",
                    textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)",
                  }}
                >
                  📋 ADDED ITEMS ({nftItems.length})
                </h3>
                <div className="space-y-2">
                  {nftItems.map((item, index) => (
                    <div 
                      key={index}
                      className="p-3 rounded-lg border-2 border-purple-400"
                      style={{
                        background: "rgba(255, 0, 255, 0.1)",
                        boxShadow: "0 0 10px rgba(255, 0, 255, 0.3)",
                      }}
                    >
                      <div className="flex justify-between items-center gap-2">
                        <div className="min-w-0">
                          <div className="text-white font-semibold truncate max-w-[220px]" title={item.name}>{item.name}</div>
                          <div className="text-xs text-gray-400 font-mono truncate max-w-[220px]" title={item.uri}>{item.uri}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(item.uri);
                              toast.success('URI copied to clipboard');
                            }}
                            className="border-2 border-cyan-400 text-xs px-2 py-1"
                            style={{
                              background: "linear-gradient(45deg, rgba(0,255,255,0.1), rgba(0,255,100,0.1))",
                              color: "#00ffff",
                              textShadow: "1px 1px 0px rgba(0,0,0,0.5)"
                            }}
                          >
                            📋 Copy
                          </Button>
                          <a
                            href={item.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs underline text-purple-300"
                          >
                            Open
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CandyMachineCreator;
