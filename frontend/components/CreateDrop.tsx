'use client';
import { useState } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './WalletContext';
import { Brain, Wallet, UserCheck, AlertCircle, Check, Copy, Loader2 } from 'lucide-react';

// --- CONFIGURATION ---
const CONTRACT_ADDRESS = "0x56cc9af512f046ceff9e24ed8fe50fccf840b701";
const RELAYER_ADDRESS = "0x23482038d27934F69FC28753C255769e57803D90";

type QuestType = 'KNOWLEDGE' | 'ONCHAIN' | 'IDENTITY';

export default function CreateDrop() {
  const { account, signer, connectWallet } = useWallet();

  // State
  const [amount, setAmount] = useState('0.001');
  const [rule, setRule] = useState('');
  const [questType, setQuestType] = useState<QuestType>('KNOWLEDGE');
  const [duration, setDuration] = useState('604800'); // 7 Days
  const [generatedLink, setGeneratedLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);

  // --- HELPER: Save to Local Storage ---
  const saveQuestToHistory = (id: string, rule: string, ethAmount: string, expiry: number) => {
    const newQuest = {
      id,
      rule,
      amount: ethAmount,
      type: questType,
      expiresAt: expiry,
      createdAt: Date.now(),
      status: 'active'
    };
    const existing = JSON.parse(localStorage.getItem('my_quests') || '[]');
    localStorage.setItem('my_quests', JSON.stringify([newQuest, ...existing]));
  };

  const generateP256Keys = async () => {
    const keyPair = await window.crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]
    );
    const jwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);

    const toHex = (str: string) => {
      const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
      const pad = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
      const binary = atob(pad);
      let hex = '0x';
      for (let i = 0; i < binary.length; i++) hex += binary.charCodeAt(i).toString(16).padStart(2, '0');
      return hex;
    };
    return { pubKeyX: toHex(jwk.x!), pubKeyY: toHex(jwk.y!) };
  };

  const handleCreate = async () => {
    if (!signer || !account) return;
    if (!rule) return alert("Please enter a rule");
    
    setLoading(true);
    setErrorMessage('');

    try {
        const dropId = ethers.toBigInt(ethers.randomBytes(32)); 
        const keys = await generateP256Keys(); 
        const expiresAt = BigInt(Math.floor(Date.now() / 1000) + parseInt(duration));

        const pubX_Array = Array.from(ethers.getBytes(keys.pubKeyX));
        const pubY_Array = Array.from(ethers.getBytes(keys.pubKeyY));

        const abi = [
            "function createDrop(uint256 drop_id, uint8[] pub_x, uint8[] pub_y, address gatekeeper, uint64 expires_at) external payable"
        ];
        
        const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);

        const tx = await contract.createDrop(
            dropId, 
            pubX_Array, 
            pubY_Array, 
            ethers.getAddress(RELAYER_ADDRESS), 
            expiresAt, 
            { 
                value: ethers.parseEther(amount),
                gasLimit: 8000000 
            }
        );
        
        await tx.wait();

        // 🚨 ADDED: '?type=' to the URL
        const linkType = questType === 'KNOWLEDGE' ? 'input' : 'auto';
        const link = `${window.location.origin}/?id=${dropId.toString()}&type=${linkType}&rule=${encodeURIComponent(rule)}`;
        
        setGeneratedLink(link);
        saveQuestToHistory(dropId.toString(), rule, amount, Number(expiresAt));

    } catch (e: any) {
        console.error("FULL ERROR LOG:", e);
        setErrorMessage(e.reason || "Transaction Failed");
    } finally {
        setLoading(false);
    }
  };

  const resetForm = () => {
    setGeneratedLink('');
    setAmount('0.001');
    setErrorMessage('');
    setRule('');
  };

  const getPlaceholder = () => {
    switch (questType) {
        case 'KNOWLEDGE': return "e.g. 'The user must answer: What is the capital of France?'";
        case 'ONCHAIN': return "e.g. 'User must own at least 0.1 ETH and a Pudgy Penguin.'";
        case 'IDENTITY': return "e.g. 'User must be a verified human in Lagos.'";
    }
  };

  // --- RENDERING (Your Original Zinc/Dark Design) ---
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-lg mx-auto mt-10 shadow-2xl">
      <h2 className="text-3xl font-bold text-white mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
        Create AI Quest
      </h2>

      {generatedLink ? (
        <div className="bg-green-900/20 border border-green-500/50 p-6 rounded-2xl text-center animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-green-500 rounded-full mx-auto flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-black" />
          </div>
          <p className="text-green-400 font-bold text-lg mb-2">Vault Created!</p>
          <div className="bg-black p-4 rounded-xl border border-zinc-700 break-all text-xs text-zinc-400 font-mono mb-4">
            {generatedLink}
          </div>
          <div className="space-y-3">
            <button
              onClick={() => { navigator.clipboard.writeText(generatedLink); setCopied(true); setTimeout(()=>setCopied(false), 2000); }}
              className="w-full py-3 bg-green-500 hover:bg-green-400 text-black rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy Magic Link"}
            </button>
            <button
              onClick={resetForm}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all"
            >
              Create Another Quest
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">

          <div className="grid grid-cols-2 gap-4">
            {/* Amount Input */}
            <div>
              <label className="text-zinc-400 text-sm font-medium ml-1">Reward (ETH)</label>
              <div className="relative mt-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-black border border-zinc-700 p-4 rounded-xl text-white text-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Duration Selector */}
            <div>
              <label className="text-zinc-400 text-sm font-medium ml-1">Duration</label>
              <div className="relative mt-2">
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full bg-black border border-zinc-700 p-4 rounded-xl text-white text-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="3600">1 Hour</option>
                  <option value="86400">24 Hours</option>
                  <option value="604800">1 Week</option>
                </select>
                <div className="absolute right-4 top-5 pointer-events-none text-zinc-500">▼</div>
              </div>
            </div>
          </div>

          {/* NEW: Quest Type Selector */}
          <div>
            <label className="text-zinc-400 text-sm font-medium ml-1">Condition Type</label>
            <div className="grid grid-cols-3 gap-3 mt-2">
                {[
                    { id: 'KNOWLEDGE', icon: Brain, label: 'Trivia' },
                    { id: 'ONCHAIN', icon: Wallet, label: 'Wallet' },
                    { id: 'IDENTITY', icon: UserCheck, label: 'Bio' }
                ].map((type) => (
                    <button
                        key={type.id}
                        onClick={() => setQuestType(type.id as QuestType)}
                        className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                            questType === type.id 
                            ? 'bg-purple-900/20 border-purple-500 text-purple-400' 
                            : 'bg-black border-zinc-700 text-zinc-500 hover:border-zinc-600'
                        }`}
                    >
                        <type.icon className="w-5 h-5" />
                        <span className="text-xs font-bold">{type.label}</span>
                    </button>
                ))}
            </div>
          </div>

          {/* Rule Input */}
          <div>
            <label className="text-zinc-400 text-sm font-medium ml-1">The Quest Rule</label>
            <textarea
              value={rule}
              onChange={(e) => setRule(e.target.value)}
              placeholder={getPlaceholder()}
              className="w-full mt-2 bg-black border border-zinc-700 p-4 rounded-xl text-white h-32 focus:ring-2 focus:ring-purple-500 outline-none resize-none transition-all"
            />
          </div>

          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-400 text-sm mt-0.5 leading-snug">{errorMessage}</p>
            </div>
          )}

          {!account ? (
            <button
              onClick={connectWallet}
              className="w-full py-4 bg-zinc-100 hover:bg-white text-black rounded-xl font-bold transition-all"
            >
              Connect Wallet to Start
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={loading}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2 ${loading
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:scale-[1.02] text-white'
                }`}
            >
              {loading ? <Loader2 className="animate-spin" /> : "Create Quest Drop 🚀"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}