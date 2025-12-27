'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import { X, Clock, AlertTriangle, CheckCircle, RefreshCcw, Trash2, ExternalLink, ArrowRight } from 'lucide-react';
import { useWallet } from './WalletContext';

const CONTRACT_ADDRESS = "0x56cc9af512f046ceff9e24ed8fe50fccf840b701";

interface QuestDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuestDrawer({ isOpen, onClose }: QuestDrawerProps) {
  const { signer } = useWallet();
  const [quests, setQuests] = useState<any[]>([]);
  const [selectedQuest, setSelectedQuest] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // --- 1. LOAD & CALCULATE STATUS ---
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('my_quests');
      if (saved) {
        const parsed = JSON.parse(saved).sort((a: any, b: any) => b.createdAt - a.createdAt);
        setQuests(parsed);
      }
    }
  }, [isOpen]);

  // --- 2. RECLAIM LOGIC ---
  const handleReclaim = async (dropId: string) => {
    if (!signer) return alert("Please connect wallet");
    setLoading(true);
    try {
        const abi = ["function reclaimDrop(uint256 drop_id) external"];
        const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
        
        const tx = await contract.reclaimDrop(dropId);
        await tx.wait();

        // Update UI
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

  // --- 3. HELPER: Time Remaining ---
  const getTimeStatus = (expiry: number) => {
     const now = Math.floor(Date.now() / 1000); // seconds
     const diff = expiry - now;

     if (diff <= 0) return { label: "Expired", color: "text-red-400", isExpired: true };
     
     const days = Math.floor(diff / 86400);
     const hours = Math.floor((diff % 86400) / 3600);
     
     if (days > 0) return { label: `${days}d ${hours}h remaining`, color: "text-zinc-400", isExpired: false };
     return { label: `${hours}h remaining`, color: "text-orange-400", isExpired: false };
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Drawer Panel */}
          <motion.div 
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} 
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-zinc-950 border-l border-zinc-800 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
                <h2 className="text-xl font-bold text-white">Your Quests</h2>
                <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white">
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                
                {selectedQuest ? (
                    // --- DETAIL VIEW ---
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <button onClick={() => setSelectedQuest(null)} className="text-sm text-zinc-500 hover:text-white flex items-center gap-2">
                            ← Back to list
                        </button>

                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-2xl font-bold text-white">{selectedQuest.amount} ETH</h3>
                                    <p className="text-xs text-zinc-500 font-mono">ID: {selectedQuest.id}</p>
                                </div>
                                {selectedQuest.status === 'reclaimed' ? (
                                    <span className="px-3 py-1 bg-red-900/30 text-red-400 text-xs font-bold rounded-full">Reclaimed</span>
                                ) : (
                                    <span className="px-3 py-1 bg-green-900/30 text-green-400 text-xs font-bold rounded-full">Active</span>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 bg-black rounded-xl border border-zinc-800">
                                    <p className="text-zinc-500 text-xs uppercase font-bold mb-1">Rule</p>
                                    <p className="text-zinc-300 text-sm">{selectedQuest.rule}</p>
                                </div>

                                <div className="flex justify-between items-center p-3 bg-black rounded-xl border border-zinc-800">
                                    <span className="text-zinc-500 text-xs uppercase font-bold">Status</span>
                                    <span className={`text-sm font-medium ${getTimeStatus(selectedQuest.expiresAt).color}`}>
                                        {getTimeStatus(selectedQuest.expiresAt).label}
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="mt-6 space-y-3">
                                <a 
                                    href={`${window.location.origin}/?id=${selectedQuest.id}&rule=${encodeURIComponent(selectedQuest.rule)}&type=${selectedQuest.type || 'auto'}`}
                                    target="_blank" 
                                    className="flex items-center justify-center gap-2 w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all"
                                >
                                    <ExternalLink className="w-4 h-4" /> View Public Page
                                </a>

                                {/* Show Reclaim button if Expired OR User wants to cancel */}
                                {selectedQuest.status !== 'reclaimed' && (
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
                            return (
                                <div 
                                    key={q.id} 
                                    onClick={() => setSelectedQuest(q)}
                                    className="group bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-4 rounded-xl cursor-pointer transition-all"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-white">{q.amount} ETH</span>
                                            {q.type === 'KNOWLEDGE' && <span className="text-[10px] bg-purple-900/30 text-purple-400 px-1.5 py-0.5 rounded">Trivia</span>}
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                                    </div>
                                    <p className="text-zinc-400 text-xs line-clamp-1 mb-2">{q.rule}</p>
                                    <div className="flex items-center gap-2 text-[10px]">
                                        <Clock className="w-3 h-3 text-zinc-600" />
                                        <span className={timeStatus.color}>{timeStatus.label}</span>
                                    </div>
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