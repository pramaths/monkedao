"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Toaster, toast } from "sonner";
import { useDealifiProgram } from "@/components/DealifiProgramProvider";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMerchantFromDB } from '@/lib/merchant-db';
import { CandyMachineData } from '@/lib/candy-machine-data';
import { DealifiCandyMachineManager } from '@/lib/candy-machine-manager';
import useUmiStore from '@/store/useUmiStore';
import Link from "next/link";
export default function MerchantPage() {
  const [merchantName, setMerchantName] = useState("");
  const [treasuryAddress, setTreasuryAddress] = useState("");
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [myMerchant, setMyMerchant] = useState<any | null>(null);
  const [merchantPda, setMerchantPda] = useState<PublicKey | null>(null);
  const [totalDeals, setTotalDeals] = useState<number>(0);
  const [myDeals, setMyDeals] = useState<any[]>([]);
  const [myCandyMachines, setMyCandyMachines] = useState<any[]>([]);
  const [candyMachineData, setCandyMachineData] = useState<CandyMachineData[]>([]);
  const [loadingCandyMachineData, setLoadingCandyMachineData] = useState(false);
  const { publicKey } = useWallet();
  const { program } = useDealifiProgram();
  const { umi } = useUmiStore();

  useEffect(() => {
    if (publicKey && program) {
      checkMerchantAccount();
    }
  }, [publicKey, program]);

  // Fetch candy machine data when candy machines change
  useEffect(() => {
    if (myCandyMachines.length > 0) {
      fetchCandyMachineDetails();
    } else {
      setCandyMachineData([]);
    }
    // Total deals equals total candy machines
    setTotalDeals(myCandyMachines.length);
  }, [myCandyMachines]);

  const fetchCandyMachineDetails = async () => {
    if (myCandyMachines.length === 0) return;
    
    if (!umi.identity || !umi.identity.publicKey) {
      console.warn('⚠️ UMI instance has no signer identity - cannot fetch candy machine details');
      toast.error('Please connect your wallet to view candy machine details');
      return;
    }
    
    setLoadingCandyMachineData(true);
    try {
      const candyManager = new DealifiCandyMachineManager(umi);
      const statuses = await Promise.allSettled(
        myCandyMachines.map(async (cm) => {
          const status: any = await candyManager.getCandyMachineStatus(new PublicKey(cm.address));
          const guards: any = status?.guards || {};
          const nowSec = Math.floor(Date.now() / 1000);
          const nextMonthSec = Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000);

          const getUnixFromGuard = (g: any): number | null => {
            if (!g) return null;
            // Try common shapes
            // Some({ date: DateTime }) or direct { date: string | number }
            const val = (g?.value || g)?.date || (g?.date ?? null);
            if (!val) return null;
            try {
              if (typeof val === 'number') return Math.floor(val / (val > 2_000_000_000 ? 1000 : 1));
              const ms = Date.parse(String(val));
              if (!isNaN(ms)) return Math.floor(ms / 1000);
            } catch (_) {}
            return null;
          };

          const goLiveDate = getUnixFromGuard(guards?.startDate) ?? nowSec;
          const endDate = getUnixFromGuard(guards?.endDate) ?? nextMonthSec;

          return {
            address: cm.address,
            name: cm.name || 'Candy Machine Collection',
            symbol: cm.symbol || 'CM',
            itemsAvailable: status.itemsAvailable,
            itemsRedeemed: status.itemsRedeemed,
            itemsLoaded: status.itemsLoaded,
            remaining: status.remaining,
            isActive: status.isActive,
            price: 0, // Not available in status
            goLiveDate,
            endDate,
            creator: '', // Not available in status
            collection: null,
            authority: '', // Not available in status
            mintAuthority: '',
            updateAuthority: '',
            sellerFeeBasisPoints: 0,
            isMutable: false,
            retainAuthority: true,
            maxSupply: 0,
            isFullyLoaded: status.itemsLoaded >= status.itemsAvailable,
            isFullyMinted: status.itemsRedeemed >= status.itemsAvailable,
            isEnded: false,
            isLive: status.isActive,
          };
        })
      );
      
      const successfulStatuses = statuses
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value);
      
      setCandyMachineData(successfulStatuses);
    } catch (error) {
      console.error('Failed to fetch candy machine details:', error);
      toast.error('Failed to load candy machine details');
    } finally {
      setLoadingCandyMachineData(false);
    }
  };

  const checkMerchantAccount = async () => {
    if (!publicKey || !program) return;
    
    setLoading(true);
    try {
      // Derive merchant PDA
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("merchant"), publicKey.toBuffer()],
        program.programId
      );
      
      setMerchantPda(pda);

      // Try to fetch merchant account
      const merchantAccount = await program.account.merchant.fetch(pda);
      setMyMerchant(merchantAccount as any);

      // Total deals equals total candy machines (we no longer count on-chain deal accounts here)
      setMyDeals([]);

      // Fetch candy machines from MongoDB
      try {
        const merchantData = await getMerchantFromDB(publicKey.toString());
        if (merchantData) {
          setMyCandyMachines(merchantData.candyMachines);
          setTotalDeals((merchantData.candyMachines || []).length);
        } else {
          setMyCandyMachines([]);
          setTotalDeals(0);
        }
      } catch (error) {
        console.warn('Failed to fetch candy machines from database:', error);
        setMyCandyMachines([]);
        setTotalDeals(0);
      }
    } catch (error) {
      // Account doesn't exist yet - that's okay
      setMyMerchant(null);
      setTotalDeals(0);
      setMyDeals([]);
      setMyCandyMachines([]);
    } finally {
      setLoading(false);
    }
  };
  const handleCreateMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!publicKey || !program) {
      toast.error("⚠️ Please connect your wallet first!");
      return;
    }
  
    if (!merchantName.trim()) {
      toast.error("⚠️ Please enter a merchant name!");
      return;
    }

    if (!treasuryAddress.trim()) {
      toast.error("⚠️ Please enter a treasury wallet address!");
      return;
    }
  
    setCreating(true);
  
    try {
      const [merchantPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("merchant"), publicKey.toBuffer()],
        program.programId
      );
  
      // Parse treasury address
      let treasury: PublicKey;
      try {
        treasury = new PublicKey(treasuryAddress);
      } catch (e) {
        toast.error("⚠️ Invalid treasury wallet address");
        return;
      }
      const txSig = await program.methods
        .createMerchant(treasury, merchantName)
        .accountsStrict({
          authority: publicKey,
          payer: publicKey,
          merchant: merchantPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
  
      toast.success(
        <div>
          <p className="font-bold">🎉 MERCHANT CREATED!</p>
          <a
            href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:underline text-sm"
          >
            View on Explorer
          </a>
        </div>
      );
  
      setMerchantName("");
      setTreasuryAddress("");
  
      // Wait briefly and refetch
      setTimeout(() => checkMerchantAccount(), 2000);
    } catch (error: any) {
      console.error("❌ Failed to create merchant:", error);
      toast.error(`❌ Failed: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };
  

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24 flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4" style={{
            animation: "float 2s ease-in-out infinite"
          }}>
            💎
          </div>
          <p className="text-xl" style={{
            color: "#00ffff",
            textShadow: "2px 2px 0px rgba(0, 0, 0, 0.8)"
          }}>
            LOADING...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <Toaster position="bottom-right" richColors />
      
      {/* Header Section */}
      <div className="text-center mb-12">
        <h1 
          className="text-4xl md:text-5xl font-bold mb-4"
          style={{
            color: "#ffff00",
            textShadow: "3px 3px 0px #00ff00, 6px 6px 0px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 255, 0, 0.5)"
          }}
        >
          🏪 MERCHANT DASHBOARD
        </h1>
        <p 
          className="text-lg"
          style={{
            color: "#00ffff",
            textShadow: "2px 2px 0px rgba(0, 0, 0, 0.8)"
          }}
        >
          ⚡ MANAGE YOUR DEALS ON THE BLOCKCHAIN ⚡
        </p>
      </div>

      {myMerchant ? (
        // Existing Merchant View
        <div className="space-y-8">
          {/* Merchant Info Card */}
          <Card
            className="border-4"
            style={{
              background: "linear-gradient(135deg, rgba(0, 255, 100, 0.1) 0%, rgba(0, 255, 255, 0.1) 100%)",
              borderImage: "linear-gradient(45deg, #00ff00, #00ffff, #ffff00, #00ff00) 1",
              boxShadow: "0 0 30px rgba(0, 255, 100, 0.5), 0 8px 0 rgba(0, 0, 0, 0.5)"
            }}
          >
            <CardHeader>
              <CardTitle 
                className="text-3xl flex items-center gap-3"
                style={{
                  color: "#ffff00",
                  textShadow: "3px 3px 0px rgba(0, 0, 0, 0.8)"
                }}
              >
                <span className="text-4xl">🏪</span>
                {myMerchant.name}
                {myMerchant.verified && (
                  <span className="text-2xl" title="Verified Merchant">✅</span>
                )}
              </CardTitle>
              <CardDescription
                style={{
                  color: "#00ffff",
                  textShadow: "1px 1px 0px rgba(0, 0, 0, 0.8)"
                }}
              >
                {myMerchant.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div 
                  className="p-4 rounded-lg border-2 border-cyan-400"
                  style={{
                    background: "rgba(0, 0, 0, 0.5)",
                    boxShadow: "0 0 15px rgba(0, 255, 255, 0.3)"
                  }}
                >
                      <p className="text-sm text-cyan-400 mb-1">TOTAL DEALS</p>
                      <p className="text-3xl font-bold text-yellow-400">
                        {totalDeals}
                      </p>
                </div>
                <div 
                  className="p-4 rounded-lg border-2 border-green-400"
                  style={{
                    background: "rgba(0, 0, 0, 0.5)",
                    boxShadow: "0 0 15px rgba(0, 255, 100, 0.3)"
                  }}
                >
                  <p className="text-sm text-green-400 mb-1">STATUS</p>
                  <p className="text-xl font-bold text-yellow-400">
                    ✅ ACTIVE
                  </p>
                </div>
                <div 
                  className="p-4 rounded-lg border-2 border-yellow-400"
                  style={{
                    background: "rgba(0, 0, 0, 0.5)",
                    boxShadow: "0 0 15px rgba(255, 255, 0, 0.3)"
                  }}
                >
                  <p className="text-sm text-yellow-400 mb-1">MERCHANT PDA</p>
                  <p className="text-xs font-mono text-cyan-400 truncate" title={merchantPda?.toBase58()}>
                    {merchantPda?.toBase58()}...
                  </p>
                </div>
              </div>

              <div className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Link href="/candy-machine">
                    <Button 
                      className="w-full text-md py-4 border-4 border-purple-400"
                      style={{
                        background: "linear-gradient(45deg, #ff00ff, #00ffff)",
                        boxShadow: "0 0 20px rgba(255, 0, 255, 0.8), 0 8px 0 rgba(0, 0, 0, 0.5)",
                        textShadow: "2px 2px 0px rgba(0, 0, 0, 0.8)"
                      }}
                    >
                      🍭 CREATE CANDY MACHINE
                    </Button>
                  </Link>
                  
                  <Link href="/merchant/deals/create">
                    <Button 
                      className="w-full text-md py-4 border-4 border-yellow-400"
                      style={{
                        background: "linear-gradient(45deg, #00ff00, #00ffff)",
                        boxShadow: "0 0 20px rgba(0, 255, 100, 0.8), 0 8px 0 rgba(0, 0, 0, 0.5)",
                        textShadow: "2px 2px 0px rgba(0, 0, 0, 0.8)"
                      }}
                    >
                      🎯 CREATE DEAL <div className="text-xs">(Add NFT to Candy Machine)</div>
                    </Button>
                  </Link>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-400">
                    💡 First create a candy machine, then create deals that reference it
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* My Candy Machines Section */}
          <Card
            className="border-4"
            style={{
              background: "linear-gradient(135deg, rgba(255, 0, 255, 0.1) 0%, rgba(0, 255, 255, 0.1) 100%)",
              borderImage: "linear-gradient(45deg, #ff00ff, #00ffff, #ffff00, #ff00ff) 1",
              boxShadow: "0 0 30px rgba(255, 0, 255, 0.5), 0 8px 0 rgba(0, 0, 0, 0.5)"
            }}
          >
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle 
                  className="text-2xl flex items-center gap-3"
                  style={{
                    color: "#ffff00",
                    textShadow: "2px 2px 0px rgba(0, 0, 0, 0.8)"
                  }}
                >
                  🍭 MY CANDY MACHINES ({myCandyMachines.length})
                  {loadingCandyMachineData && (
                    <span className="text-sm text-cyan-400">⏳ Loading details...</span>
                  )}
                </CardTitle>
                <Button
                  onClick={fetchCandyMachineDetails}
                  disabled={loadingCandyMachineData || myCandyMachines.length === 0}
                  className="text-sm py-2 px-4 border-2 border-cyan-400"
                  style={{
                    background: loadingCandyMachineData 
                      ? "linear-gradient(45deg, #666, #888)" 
                      : "linear-gradient(45deg, rgba(0,255,255,0.1), rgba(0,255,100,0.1))",
                    color: "#00ffff",
                    textShadow: "1px 1px 0px rgba(0,0,0,0.5)"
                  }}
                >
                  {loadingCandyMachineData ? '⏳' : '🔄'} Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {myCandyMachines.length === 0 ? (
                <p className="text-center text-gray-400 py-8">
                  🚧 No candy machines created yet. Create your first one above! 🚧
                </p>
              ) : (
                <div className="space-y-6">
                  {candyMachineData.map((cmData, index) => (
                    <div 
                      key={cmData.address}
                      className="p-6 rounded-lg border-2 border-purple-400"
                      style={{
                        background: "rgba(255, 0, 255, 0.1)",
                        boxShadow: "0 0 15px rgba(255, 0, 255, 0.3)"
                      }}
                    >
                      {/* Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-white mb-1">
                            {cmData.name} ({cmData.symbol})
                          </h3>
                          <p className="text-xs text-gray-400 font-mono break-all">
                            {cmData.address}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                            cmData.isActive && cmData.isLive && !cmData.isEnded && !cmData.isFullyMinted
                              ? 'bg-green-500 text-black'
                              : cmData.isFullyMinted
                                ? 'bg-yellow-500 text-black'
                                : 'bg-red-500 text-white'
                          }`}>
                            {cmData.isFullyMinted ? 'SOLD OUT' : 
                             cmData.isEnded ? 'ENDED' :
                             cmData.isLive ? 'LIVE' : 'PENDING'}
                          </div>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-3 rounded border border-cyan-400" style={{ background: 'rgba(0,0,0,0.3)' }}>
                          <p className="text-2xl font-bold text-cyan-400">{cmData.itemsAvailable}</p>
                          <p className="text-xs text-gray-400">Total Supply</p>
                        </div>
                        <div className="text-center p-3 rounded border border-green-400" style={{ background: 'rgba(0,0,0,0.3)' }}>
                          <p className="text-2xl font-bold text-green-400">{cmData.itemsRedeemed}</p>
                          <p className="text-xs text-gray-400">Minted</p>
                        </div>
                        <div className="text-center p-3 rounded border border-yellow-400" style={{ background: 'rgba(0,0,0,0.3)' }}>
                          <p className="text-2xl font-bold text-yellow-400">{cmData.remaining}</p>
                          <p className="text-xs text-gray-400">Remaining</p>
                        </div>
                        <div className="text-center p-3 rounded border border-purple-400" style={{ background: 'rgba(0,0,0,0.3)' }}>
                          {(() => {
                            const cmDb = myCandyMachines.find((c) => c.address === cmData.address);
                            const priceSol = cmDb?.priceSol;
                            return (
                              <>
                                <p className="text-2xl font-bold text-purple-400">{typeof priceSol === 'number' ? priceSol.toFixed(2) : '—'}</p>
                                <p className="text-xs text-gray-400">Price (SOL)</p>
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-400 mb-1">📅 Go Live Date</p>
                          <p className="text-white">
                            {cmData.goLiveDate ? new Date(cmData.goLiveDate * 1000).toLocaleString() : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 mb-1">⏰ End Date</p>
                          <p className="text-white">
                            {cmData.endDate ? new Date(cmData.endDate * 1000).toLocaleString() : '—'}
                          </p>
                        </div>
                        {/* <div>
                          <p className="text-gray-400 mb-1">👤 Authority</p>
                          <p className="text-white font-mono text-xs break-all">{cmData.authority}</p>
                        </div> */}
                        <div>
                          <p className="text-gray-400 mb-1">💰 Royalty</p>
                          <p className="text-white">{(500 / 100).toFixed(2)}%</p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 pt-4 border-t border-purple-400">
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              navigator.clipboard.writeText(cmData.address);
                              toast.success("Address copied to clipboard");
                              setTimeout(() => {
                                toast.dismiss();
                              }, 2000);
                            }}
                            className="flex-1 text-sm py-2 border-2 border-cyan-400"
                            style={{
                              background: "linear-gradient(45deg, rgba(0,255,255,0.1), rgba(0,255,100,0.1))",
                              color: "#00ffff",
                              textShadow: "1px 1px 0px rgba(0,0,0,0.5)"
                            }}
                          >
                            📋 Copy Address
                          </Button>
                          {/* Removed Make Live and Manage buttons */}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Deals Section */}
          <Card
            className="border-4"
            style={{
              background: "linear-gradient(135deg, rgba(255, 255, 0, 0.1) 0%, rgba(0, 255, 255, 0.1) 100%)",
              borderImage: "linear-gradient(45deg, #ffff00, #00ffff, #00ff00, #ffff00) 1",
              boxShadow: "0 0 30px rgba(255, 255, 0, 0.5), 0 8px 0 rgba(0, 0, 0, 0.5)"
            }}
          >
            <CardHeader>
              <CardTitle 
                className="text-2xl"
                style={{
                  color: "#00ffff",
                  textShadow: "2px 2px 0px rgba(0, 0, 0, 0.8)"
                }}
              >
                📋 MY DEALS ({myDeals.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myDeals.length === 0 ? (
                <p className="text-center text-gray-400 py-8">
                  🚧 No deals created yet. Create your first deal above! 🚧
                </p>
              ) : (
                <div className="space-y-4">
                  {myDeals.map((deal, index) => (
                    <div 
                      key={deal.publicKey.toString()}
                      className="p-4 rounded-lg border-2 border-yellow-400"
                      style={{
                        background: "rgba(255, 255, 0, 0.1)",
                        boxShadow: "0 0 10px rgba(255, 255, 0, 0.3)"
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-white font-semibold">{deal.account.namePrefix || `Deal #${index + 1}`}</p>
                          <p className="text-xs text-gray-400 font-mono">{deal.publicKey.toString().slice(0, 8)}...</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-cyan-400">Price: {deal.account.priceLamports?.toNumber() / 1000000000 || 0} SOL</p>
                          <p className="text-sm text-green-400">Supply: {deal.account.itemsAvailable?.toNumber() || 0}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        // Create Merchant Form
        <div className="flex justify-center">
          <Card 
            className="w-full max-w-2xl border-4"
            style={{
              background: "linear-gradient(135deg, rgba(0, 255, 100, 0.1) 0%, rgba(0, 255, 255, 0.1) 100%)",
              borderImage: "linear-gradient(45deg, #00ff00, #00ffff, #ffff00, #00ff00) 1",
              boxShadow: "0 0 30px rgba(0, 255, 100, 0.5), 0 8px 0 rgba(0, 0, 0, 0.5)"
            }}
          >
            <CardHeader>
              <CardTitle 
                className="text-3xl text-center"
                style={{
                  color: "#ffff00",
                  textShadow: "3px 3px 0px #00ff00, 6px 6px 0px rgba(0, 0, 0, 0.5)"
                }}
              >
                🚀 BECOME A MERCHANT
              </CardTitle>
              <CardDescription 
                className="text-center text-base"
                style={{
                  color: "#00ffff",
                  textShadow: "1px 1px 0px rgba(0, 0, 0, 0.5)"
                }}
              >
                ⚡ REGISTER YOUR BUSINESS ON-CHAIN ⚡
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateMerchant} className="space-y-6">
                <div className="space-y-2">
                  <label 
                    className="text-lg font-bold"
                    style={{
                      color: "#ffff00",
                      textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)"
                    }}
                  >
                    🏪 BUSINESS NAME
                  </label>
                  <Input
                    type="text"
                    placeholder="E.g. Starbucks, Pizza Hut"
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    className="border-2 border-cyan-400 bg-black/30 text-white placeholder:text-gray-400 text-lg py-6"
                    style={{
                      boxShadow: "0 0 10px rgba(0, 255, 255, 0.3)"
                    }}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label 
                    className="text-lg font-bold"
                    style={{
                      color: "#ffff00",
                      textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)"
                    }}
                  >
                    💼 TREASURY WALLET
                  </label>
                  <Input
                    type="text"
                    placeholder="Merchant treasury public key"
                    value={treasuryAddress}
                    onChange={(e) => setTreasuryAddress(e.target.value)}
                    className="border-2 border-cyan-400 bg-black/30 text-white placeholder:text-gray-400 text-lg py-6"
                    style={{
                      boxShadow: "0 0 10px rgba(0, 255, 255, 0.3)"
                    }}
                    required
                  />
                </div>


                <Button 
                  type="submit" 
                  className="w-full text-xl py-6 border-4 border-yellow-400"
                  disabled={creating || !publicKey}
                  style={{
                    background: creating || !publicKey
                      ? "linear-gradient(45deg, #666, #888)" 
                      : "linear-gradient(45deg, #00ff00, #00ffff)",
                    boxShadow: creating || !publicKey
                      ? "none" 
                      : "0 0 20px rgba(0, 255, 100, 0.8), 0 8px 0 rgba(0, 0, 0, 0.5)",
                    textShadow: "2px 2px 0px rgba(0, 0, 0, 0.8)"
                  }}
                >
                  {!publicKey 
                    ? "🔌 CONNECT WALLET FIRST" 
                    : creating 
                      ? "⏳ CREATING..." 
                      : "🚀 CREATE MERCHANT ACCOUNT"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
