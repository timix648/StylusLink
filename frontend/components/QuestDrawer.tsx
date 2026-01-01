'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import { X, Clock, RefreshCcw, Trash2, ExternalLink, ArrowRight, Trophy, Loader2 } from 'lucide-react';
import { useWallet } from './WalletContext';

const CONTRACT_ADDRESS = "0x56cc9af512f046ceff9e24ed8fe50fccf840b701";
const API_URL = process.env.NEXT_PUBLIC_GATEKEEPER_URL || "http://localhost:4000/api";

interface QuestDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuestDrawer({ isOpen, onClose }: QuestDrawerProps) {
  const { signer } = useWallet();
  const [quests, setQuests] = useState<any[]>([]);
  const [selectedQuest, setSelectedQuest] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // --- 1. LOAD & SYNC STATUS ---
  useEffect(() => {
    if (isOpen) {
      loadAndSyncQuests();
    }
  }, [isOpen]);

  const loadAndSyncQuests = async () => {
      setSyncing(true);
      const saved = localStorage.getItem('my_quests');
      if (!saved) { setSyncing(false); return; }

      let parsed = JSON.parse(saved);

      // Check API for updates on Active quests
      const updatedQuests = await Promise.all(parsed.map(async (q: any) => {
          // If already reclaimed or known claimed, skip fetch to save bandwidth
          if (q.status === 'reclaimed') return q;
          
          try {
              const res = await fetch(`${API_URL}/check-claim/${q.id}`, {
                  headers: { 'ngrok-skip-browser-warning': '1' }
              });
              const data = await res.json();
              
              if (data.reclaimed) return { ...q, status: 'reclaimed' };
              if (data.claimed) return { ...q, status: 'claimed', claimedBy: data.claimedBy };
              
              return q; // Still active
          } catch (e) {
              return q;
          }
      }));

      // Sort: Active first, then Claimed, then Reclaimed/Expired
      updatedQuests.sort((a, b) => b.createdAt - a.createdAt);
      
      setQuests(updatedQuests);
      localStorage.setItem('my_quests', JSON.stringify(updatedQuests));
      setSyncing(false);
  };

  // --- 2. RECLAIM LOGIC ---
  const handleReclaim = async (dropId: string) => {
    if (!signer) return alert("Please connect wallet");
    setLoading(true);
    try {
        const abi = ["function reclaimDrop(uint256 drop_id) external"];
        const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
        
        const tx = await contract.reclaimDrop(dropId);
        await tx.wait();

        const updated = quests.map(q => q.id === dropId ? { ...q, status: 'reclaimed' } : q);
        setQuests(updated);
        localStorage.setItem('my_quests', JSON.stringify(updated));
        setSelectedQuest(null);
        alert("Funds Reclaimed Successfully");
    } catch (e: any) {
        alert("Reclaim Failed: " + (e.reason || e.message));
    } finally {
        setLoading(false);
    }
  };

  const getTimeStatus = (expiry: number) => {
     const now = Math.floor(Date.now() / 1000);
     const diff = expiry - now;
     if (diff <= 0) return { label: "Expired", color: "text-red-400", isExpired: true };
     const days = Math.floor(diff / 86400);
     const hours = Math.floor((diff % 86400) / 3600);
     if (days > 0) return { label: `${days}d ${hours}h left`, color: "text-zinc-400", isExpired: false };
     return { label: `${hours}h left`, color: "text-orange-400", isExpired: false };
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
          />

          <motion.div 
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} 
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-zinc-950 border-l border-zinc-800 z-50 flex flex-col shadow-2xl"
          >
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-white">Your Quests</h2>
                    {syncing && <Loader2 className="w-4 h-4 animate-spin text-purple-500" />}
                </div>
                <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white">
                    <X className="w-6 h-6" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                {selectedQuest ? (
                    // --- DETAIL VIEW ---
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <button onClick={() => setSelectedQuest(null)} className="text-sm text-zinc-500 hover:text-white flex items-center gap-2">
                            ← Back to list
                        </button>

                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden">
                            {/* Visual Status Indicator */}
                            {selectedQuest.status === 'claimed' && (
                                <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
                            )}

                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-2xl font-bold text-white">{selectedQuest.amount} ETH</h3>
                                    <p className="text-xs text-zinc-500 font-mono">ID: {selectedQuest.id}</p>
                                </div>
                                {selectedQuest.status === 'reclaimed' ? (
                                    <span className="px-3 py-1 bg-red-900/30 text-red-400 text-xs font-bold rounded-full">Reclaimed</span>
                                ) : selectedQuest.status === 'claimed' ? (
                                    <span className="px-3 py-1 bg-blue-900/30 text-blue-400 text-xs font-bold rounded-full flex items-center gap-1">
                                        <Trophy className="w-3 h-3" /> Won
                                    </span>
                                ) : (
                                    <span className="px-3 py-1 bg-green-900/30 text-green-400 text-xs font-bold rounded-full">Active</span>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 bg-black rounded-xl border border-zinc-800">
                                    <p className="text-zinc-500 text-xs uppercase font-bold mb-1">Rule</p>
                                    <p className="text-zinc-300 text-sm">{selectedQuest.rule}</p>
                                </div>

                                {selectedQuest.claimedBy && (
                                    <div className="p-3 bg-blue-900/10 border border-blue-500/30 rounded-xl">
                                        <p className="text-blue-400 text-xs uppercase font-bold mb-1">Winner</p>
                                        <p className="text-zinc-300 font-mono text-xs break-all">{selectedQuest.claimedBy}</p>
                                    </div>
                                )}

                                <div className="flex justify-between items-center p-3 bg-black rounded-xl border border-zinc-800">
                                    <span className="text-zinc-500 text-xs uppercase font-bold">Status</span>
                                    <span className={`text-sm font-medium ${getTimeStatus(selectedQuest.expiresAt).color}`}>
                                        {getTimeStatus(selectedQuest.expiresAt).label}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-6 space-y-3">
                                <a 
                                    href={`${window.location.origin}/?id=${selectedQuest.id}&rule=${encodeURIComponent(selectedQuest.rule)}&type=${selectedQuest.type || 'auto'}`}
                                    target="_blank" 
                                    className="flex items-center justify-center gap-2 w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all"
                                >
                                    <ExternalLink className="w-4 h-4" /> View Public Page
                                </a>

                                {selectedQuest.status !== 'reclaimed' && selectedQuest.status !== 'claimed' && (
                                    <button 
                                        onClick={() => handleReclaim(selectedQuest.id)}
                                        disabled={loading}
                                        className="flex items-center justify-center gap-2 w-full py-3 border border-red-500/30 text-red-400 hover:bg-red-900/20 rounded-xl font-bold transition-all"
                                    >
                                        {loading ? <RefreshCcw className="animate-spin w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                                        Reclaim Funds
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    // --- LIST VIEW ---
                    <div className="space-y-3">
                        {quests.map((q) => {
                            const timeStatus = getTimeStatus(q.expiresAt);
                            // 🟣 PURPLE/BLUE GLOW IF CLAIMED 🟣
                            const isClaimed = q.status === 'claimed';
                            
                            return (
                                <div 
                                    key={q.id} 
                                    onClick={() => setSelectedQuest(q)}
                                    className={`group relative p-4 rounded-xl cursor-pointer transition-all border 
                                        ${isClaimed 
                                            ? 'bg-zinc-900/80 border-blue-500/50 hover:bg-blue-900/10' 
                                            : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700'
                                        }`}
                                >
                                    {isClaimed && <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]" />}
                                    
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`font-bold ${isClaimed ? 'text-blue-400' : 'text-white'}`}>{q.amount} ETH</span>
                                            {q.type && <span className="text-[9px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded uppercase">{q.type}</span>}
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                                    </div>
                                    <p className="text-zinc-400 text-xs line-clamp-1 mb-2">{q.rule}</p>
                                    
                                    {isClaimed ? (
                                        <p className="text-[10px] text-blue-400 font-mono">Won by: {q.claimedBy?.slice(0,6)}...</p>
                                    ) : (
                                        <div className="flex items-center gap-2 text-[10px]">
                                            <Clock className="w-3 h-3 text-zinc-600" />
                                            <span className={timeStatus.color}>{timeStatus.label}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {quests.length === 0 && <p className="text-center text-zinc-500 mt-10">No quests yet.</p>}
                    </div>
                )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}