'use client';
import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './WalletContext';

const CONTRACT_ADDRESS = "0x56cc9af512f046ceff9e24ed8fe50fccf840b701";

export default function MyQuests() {
  const { signer } = useWallet();
  const [quests, setQuests] = useState<any[]>([]);
  const [reclaimingId, setReclaimingId] = useState<string | null>(null);

  // Load from Local Storage on Mount
  useEffect(() => {
    const saved = localStorage.getItem('my_quests');
    if (saved) {
        setQuests(JSON.parse(saved));
    }
  }, []);

  const handleReclaim = async (dropId: string) => {
    if (!signer) return alert("Connect Wallet first");
    setReclaimingId(dropId);

    try {
        const abi = ["function reclaimDrop(uint256 drop_id) external"];
        const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
        
        console.log(`Reclaiming Drop ${dropId}...`);
        const tx = await contract.reclaimDrop(dropId);
        await tx.wait();
        
        alert("Funds Reclaimed Successfully!");
        
        // Remove from list or mark as reclaimed
        const updated = quests.map(q => q.id === dropId ? {...q, status: 'reclaimed'} : q);
        setQuests(updated);
        localStorage.setItem('my_quests', JSON.stringify(updated));

    } catch (e: any) {
        console.error(e);
        alert("Reclaim Failed: " + (e.reason || e.message));
    } finally {
        setReclaimingId(null);
    }
  };

  if (quests.length === 0) {
    return <div className="text-center text-zinc-500 py-10">No quests created yet.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 mt-8">
      <h3 className="text-xl font-bold text-white mb-4">Your Active Quests</h3>
      {quests.map((quest) => {
        const isExpired = Date.now() / 1000 > quest.expiresAt;
        const timeLeft = Math.max(0, quest.expiresAt - (Date.now() / 1000));
        const daysLeft = Math.ceil(timeLeft / (60 * 60 * 24));

        return (
          <div key={quest.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col gap-4">
            <div className="flex justify-between items-start">
                <div>
                    <span className="bg-purple-900/30 text-purple-400 text-xs px-2 py-1 rounded-md font-bold uppercase">
                        {quest.amount} ETH
                    </span>
                    <p className="text-zinc-300 mt-2 font-mono text-sm line-clamp-2">
                        "{quest.rule}"
                    </p>
                </div>
                <div className="text-right">
                    <p className={`text-xs font-bold ${isExpired ? 'text-green-400' : 'text-orange-400'}`}>
                        {isExpired ? "EXPIRED" : `${daysLeft} DAYS LEFT`}
                    </p>
                </div>
            </div>

            <div className="flex gap-3 mt-2">
                 <button 
                    onClick={() => {
                        const link = `${window.location.origin}/?id=${quest.id}&rule=${encodeURIComponent(quest.rule)}`;
                        navigator.clipboard.writeText(link); 
                        alert("Link Copied!");
                    }}
                    className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors"
                 >
                    Copy Link
                 </button>

                 <button 
                    onClick={() => handleReclaim(quest.id)}
                    disabled={!isExpired || quest.status === 'reclaimed' || reclaimingId === quest.id}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                        !isExpired 
                        ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' 
                        : 'bg-red-500 hover:bg-red-400 text-white'
                    }`}
                 >
                    {reclaimingId === quest.id ? "Reclaiming..." : isExpired ? "Reclaim Funds" : "Locked"}
                 </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}