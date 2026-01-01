'use client';
import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './WalletContext';
import { ExternalLink, CheckCircle } from 'lucide-react';

const CONTRACT_ADDRESS = "0x56cc9af512f046ceff9e24ed8fe50fccf840b701";
const API_URL = process.env.NEXT_PUBLIC_GATEKEEPER_URL || "http://localhost:4000/api";

export default function MyQuests() {
  const { signer } = useWallet();
  const [quests, setQuests] = useState<any[]>([]);
  const [reclaimingId, setReclaimingId] = useState<string | null>(null);
  const [claimStatusMap, setClaimStatusMap] = useState<Record<string, any>>({});

  // Load from Local Storage on Mount
  useEffect(() => {
    const saved = localStorage.getItem('my_quests');
    if (saved) {
        const parsed = JSON.parse(saved);
        setQuests(parsed);
        // Check claim status for all quests
        parsed.forEach((quest: any) => checkClaimStatus(quest.id));
    }
  }, []);

  const checkClaimStatus = async (dropId: string) => {
    try {
      const res = await fetch(`${API_URL}/check-claim/${dropId}`, {
        headers: { 'ngrok-skip-browser-warning': '1' }
      });
      const data = await res.json();
      setClaimStatusMap(prev => ({
        ...prev,
        [dropId]: data
      }));
    } catch (e) {
      console.warn('Failed to check claim status for', dropId);
    }
  };

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
        const claimStatus = claimStatusMap[quest.id];
        const isClaimed = claimStatus && !claimStatus.active;

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
                    {isClaimed ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <p className="text-xs font-bold text-green-400">CLAIMED</p>
                      </div>
                    ) : (
                      <p className={`text-xs font-bold ${isExpired ? 'text-orange-400' : 'text-orange-400'}`}>
                        {isExpired ? "EXPIRED" : `${daysLeft} DAYS LEFT`}
                      </p>
                    )}
                </div>
            </div>

            {/* Show Claim Details if Claimed */}
            {isClaimed && claimStatus && (
              <div className="bg-green-500/5 border border-green-500/20 p-3 rounded-lg">
                <p className="text-xs text-green-400 mb-2 font-bold">✓ Quest Completed</p>
                {claimStatus.claimedBy && (
                  <p className="text-xs text-zinc-400 mb-2">
                    <span className="font-bold">Claimed by:</span>{' '}
                    <a
                      href={`https://sepolia.arbiscan.io/address/${claimStatus.claimedBy}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:text-blue-300 font-mono break-all"
                    >
                      {claimStatus.claimedBy.slice(0, 8)}...{claimStatus.claimedBy.slice(-6)}
                    </a>
                  </p>
                )}
                {claimStatus.details?.expiresAt && (
                  <p className="text-xs text-zinc-400 mb-2">
                    <span className="font-bold">Claimed on:</span> {new Date(parseInt(claimStatus.details.expiresAt) * 1000).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

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