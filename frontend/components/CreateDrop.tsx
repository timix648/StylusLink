'use client';
import { useState } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './WalletContext';
import { 
    Brain, Wallet, UserCheck, AlertCircle, Check, Copy, Loader2, Link as LinkIcon, Zap,
    Github, Twitter, MessageCircle, Info, ChevronUp, ChevronDown 
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const CONTRACT_ADDRESS = "0x56cc9af512f046ceff9e24ed8fe50fccf840b701";
const RELAYER_ADDRESS = "0x23482038d27934F69FC28753C255769e57803D90";

type QuestType = 'KNOWLEDGE' | 'ONCHAIN' | 'IDENTITY';

export default function CreateDrop() {
  const { account, signer } = useWallet();

  // State
  const [amount, setAmount] = useState('0.001');
  const [rule, setRule] = useState('');
  const [questType, setQuestType] = useState<QuestType>('KNOWLEDGE');
  const [duration, setDuration] = useState('604800'); // 7 Days
  const [generatedLink, setGeneratedLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const saveQuestToHistory = (id: string, rule: string, ethAmount: string, expiry: number) => {
    const newQuest = {
      id, rule, amount: ethAmount, type: questType,
      expiresAt: expiry, createdAt: Date.now(), status: 'active', claimedBy: null
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
    if (!signer || !account) return alert("Please Connect Wallet");
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
        let linkType = 'input'; 
        if (questType === 'KNOWLEDGE') linkType = 'input';
        else if (questType === 'IDENTITY') linkType = 'geo';
        else if (questType === 'ONCHAIN') linkType = 'wallet';
        
        const r = rule.toLowerCase();
        if (r.includes('location') || r.includes('gps')) linkType = 'geo';

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

  return (
    <div className="w-full relative font-sans">
 
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="bg-black/40 backdrop-blur-2xl border border-white/10 p-6 md:p-8 rounded-3xl shadow-2xl relative z-10 overflow-hidden">

        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
            <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
                    Create Vault <Zap className="w-5 h-5 text-indigo-400 fill-indigo-400" />
                </h2>
                <p className="text-zinc-400 text-xs md:text-sm mt-1">Deploy an AI-Gated Smart Contract on Arbitrum Stylus</p>
            </div>
        </div>

        {generatedLink ? (
          //SUCCESS VIEW
          <motion.div initial={{opacity:0, scale: 0.98}} animate={{opacity:1, scale:1}} className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-green-500 to-emerald-600 rounded-full mx-auto flex items-center justify-center mb-5 shadow-lg shadow-green-500/20">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Vault Deployed Successfully</h3>
            <p className="text-zinc-400 text-sm mb-6 max-w-md mx-auto">Funds are locked. The AI Gatekeeper is active. Biometric verification enabled.</p>
            
            <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center gap-3 max-w-xl mx-auto mb-6">
              <div className="p-2 bg-white/10 rounded-lg">
                 <LinkIcon className="w-4 h-4 text-zinc-300" />
              </div>
              <div className="flex-1 overflow-hidden text-left">
                 <p className="text-zinc-500 text-[10px] font-bold uppercase mb-0.5">Quest Link</p>
                 <p className="text-white font-medium text-sm truncate">{generatedLink}</p>
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(generatedLink); setCopied(true); setTimeout(()=>setCopied(false), 2000); }}
                className="px-4 py-2 bg-white hover:bg-zinc-200 text-black rounded-lg text-sm font-bold transition-all shadow-lg"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <button onClick={() => { setGeneratedLink(''); setRule(''); }} className="text-zinc-500 hover:text-white text-sm transition-colors">Create Another Quest</button>
          </motion.div>
        ) : (
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
            
            <div className="md:col-span-5 space-y-5">
 
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1.5 block">Reward (ETH)</label>
                        <div className="relative">
                            <input
                                type="number"
                                min="0"
                                step="0.001"
                                value={amount}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    setAmount(isNaN(val) || val < 0 ? '0' : e.target.value);
                                }}
                                className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white text-lg font-medium focus:border-indigo-500 focus:bg-white/10 outline-none transition-all"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">ETH</span>
                        </div>
                    </div>
                    <div>
                        <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1.5 block">Duration</label>
                        <select
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 p-3.5 rounded-xl text-white text-sm font-medium focus:border-indigo-500 focus:bg-white/10 outline-none transition-all cursor-pointer appearance-none"
                        >
                            <option value="3600" className="bg-zinc-900">1 Hour</option>
                            <option value="86400" className="bg-zinc-900">24 Hours</option>
                            <option value="604800" className="bg-zinc-900">7 Days</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-2 block">Verification Mode</label>
                    <div className="space-y-2">
                        {[
                            { id: 'KNOWLEDGE', icon: Brain, label: 'Knowledge', desc: 'Trivia or Secret Password' },
                            { id: 'ONCHAIN', icon: Wallet, label: 'On-Chain Asset', desc: 'Token or NFT Ownership' },
                            { id: 'IDENTITY', icon: UserCheck, label: 'Identity / Geo', desc: 'Location or Sybil Score' }
                        ].map((type) => (
                            <button
                                key={type.id}
                                onClick={() => setQuestType(type.id as QuestType)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                                    questType === type.id 
                                    ? 'bg-indigo-500/20 border-indigo-500/50 text-white shadow-lg shadow-indigo-500/10' 
                                    : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10 hover:border-white/10'
                                }`}
                            >
                                <div className={`p-2 rounded-lg ${questType === type.id ? 'bg-indigo-500 text-white' : 'bg-white/10 text-zinc-500'}`}>
                                    <type.icon className="w-4 h-4" />
                                </div>
                                <div>
                                    <span className="block text-xs font-bold tracking-wide">{type.label}</span>
                                    <span className="block text-[10px] opacity-70">{type.desc}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="md:col-span-7 flex flex-col h-full">
                <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1.5 block">
                    Natural Language Prompt
                </label>
                <div className="flex-1 relative group">
                    <textarea
                        value={rule}
                        onChange={(e) => setRule(e.target.value)}
                        placeholder={
                            questType === 'KNOWLEDGE' ? "e.g. 'The user must answer: What is the capital of France?'" :
                            questType === 'ONCHAIN' ? "e.g. 'User must own at least 0.1 ETH and a Pudgy Penguin NFT.'" :
                            "e.g. 'User must be physically located in Lagos, Nigeria.'"
                        }
                        className="w-full h-full min-h-[140px] bg-white/5 border border-white/10 p-4 rounded-xl text-white text-base focus:border-indigo-500 focus:bg-white/10 outline-none resize-none transition-all placeholder:text-zinc-600 leading-relaxed"
                    />
                    <div className="absolute bottom-3 right-3 text-[10px] text-zinc-500 bg-black/40 backdrop-blur px-2 py-0.5 rounded-full border border-white/5">
                        Powered by Gemini AI
                    </div>
                </div>

                {errorMessage && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <p className="text-red-300 text-xs">{errorMessage}</p>
                    </div>
                )}

                <button
                    onClick={handleCreate}
                    disabled={loading || !account}
                    className={`w-full mt-4 py-4 rounded-xl font-bold text-sm tracking-wide transition-all shadow-xl flex items-center justify-center gap-2 ${
                        loading || !account
                        ? 'bg-white/5 text-zinc-500 cursor-not-allowed border border-white/5'
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-900/20'
                    }`}
                >
                    {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <><Zap className="w-4 h-4 fill-white/20" /> DEPLOY VAULT</>}
                </button>
            </div>

          </div>
        )}
      </div>

      <div className="fixed bottom-6 left-6 z-50 flex flex-col-reverse items-start gap-3">
 
        <button 
            onClick={() => setShowAbout(!showAbout)}
            className="group flex items-center gap-2 px-4 py-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full text-white shadow-2xl hover:bg-white/10 transition-all hover:scale-105"
        >
           <span className="text-xs font-bold tracking-wide">About</span>
           {showAbout ? <ChevronDown className="w-3 h-3 text-zinc-400" /> : <ChevronUp className="w-3 h-3 text-zinc-400" />}
        </button>

        <AnimatePresence>
            {showAbout && (
                <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.9 }} 
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    className="flex flex-col gap-2 mb-1"
                >
                    <a href="https://github.com/timix648/StylusLink" target="_blank" className="flex items-center gap-3 px-4 py-2.5 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-all text-xs font-medium w-40">
                        <Github className="w-4 h-4" /> GitHub
                    </a>
                    <a href="https://x.com/0xGenZero" target="_blank" className="flex items-center gap-3 px-4 py-2.5 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-all text-xs font-medium w-40">
                        <Twitter className="w-4 h-4" /> Twitter / X
                    </a>
                    <a href="https://t.me/oxgenzero" target="_blank" className="flex items-center gap-3 px-4 py-2.5 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-all text-xs font-medium w-40">
                        <MessageCircle className="w-4 h-4" /> Telegram
                    </a>
                    <Link href="/about" className="flex items-center gap-3 px-4 py-2.5 bg-indigo-900/80 backdrop-blur-xl border border-indigo-500/30 rounded-xl text-indigo-200 hover:text-white hover:bg-indigo-900 transition-all text-xs font-medium w-40">
                        <Info className="w-4 h-4" /> About Project
                    </Link>
                </motion.div>
            )}
        </AnimatePresence>
      </div>

    </div>
  );
}