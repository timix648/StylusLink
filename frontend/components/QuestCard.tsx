'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useWallet } from './WalletContext';
import { BiometricPad } from './tools/BiometricPad'; 
import { Loader2, Brain, Wallet, ShieldCheck, Send, MapPin } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_GATEKEEPER_URL || "https://probable-eureka-5gqr7qv9wx75c75r7-4000.app.github.dev/api";

interface QuestCardProps {
  rule: string;
  dropId: string;
  onVerificationComplete?: (token: string) => void;
}

export default function QuestCard({ rule, dropId, onVerificationComplete }: QuestCardProps) {
  const searchParams = useSearchParams();
  const questType = searchParams.get('type') || 'auto'; 
  const { account, connectWallet } = useWallet();
  
  // ✅ FIX 1: Detect Mode based on URL or Rule content
  const isWalletMode = questType === 'wallet' || rule.toLowerCase().includes('eth') || rule.toLowerCase().includes('balance');

  // State
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<{ approved: boolean; explanation: string; proofToken?: string } | null>(null);
  const [step, setStep] = useState<'intro' | 'processing' | 'biometric' | 'success'>('intro');
  
  // ✅ FIX 2: Store Real Location Data
  const [geo, setGeo] = useState({ lat: 0, lng: 0 });

  // --- EFFECT: GET USER LOCATION ---
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGeo({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          console.log("📍 Location captured for Gatekeeper");
        },
        (error) => console.warn("Location access denied:", error)
      );
    }
  }, []);

  // --- LOGIC ---
  const performVerify = useCallback(async (answerText: string) => {
    if (!account) return;
    setIsLoading(true);
    setStep('processing'); 

    try {
      // ✅ Payload now includes REAL Location and Wallet Info
      const payload = {
        rule,
        user_data: {
          address: account,
          answer: answerText || "WALLET_CHECK", // If wallet mode, send a flag
          latitude: geo.lat, 
          longitude: geo.lng,
          browser: navigator.userAgent
        }
      };

      const res = await fetch(`${API_URL}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      setResponse(data);
      setIsLoading(false);

      if (data.approved) {
        if (onVerificationComplete && data.proofToken) {
            setTimeout(() => {
                onVerificationComplete(data.proofToken);
            }, 1500);
            return; 
        }
        setStep('biometric');
      } else {
        setStep('intro');
      }

    } catch (e) {
      console.error("Verification error:", e);
      setIsLoading(false);
      setStep('intro');
    }
  }, [account, rule, onVerificationComplete, geo]); 

  // --- UI RENDERING ---

  return (
    <div className="w-full max-w-md mx-auto relative">
      <AnimatePresence mode='wait'>
        
        {/* VIEW 1: INTRO / INPUT */}
        {step === 'intro' && (
          <motion.div 
            key="intro"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl relative overflow-hidden"
          >
             <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
             
             {/* Header */}
             <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700">
                    {isWalletMode ? <Wallet className="w-7 h-7 text-blue-400" /> : <Brain className="w-7 h-7 text-purple-400" />}
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">
                        {isWalletMode ? "Wallet Check" : "Security Check"}
                    </h2>
                    <p className="text-zinc-500 text-xs flex items-center gap-1">
                       {geo.lat !== 0 ? <MapPin className="w-3 h-3 text-green-500" /> : null}
                       AI Verification Required
                    </p>
                </div>
             </div>

             {/* The Challenge */}
             <div className="bg-black/50 p-4 rounded-xl border border-zinc-800 mb-6">
                <p className="text-zinc-300 text-sm font-mono leading-relaxed">
                   {rule || "System: Verify humanity to proceed."}
                </p>
             </div>

             {/* Feedback Message */}
             {response && !response.approved && (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-xs flex items-center gap-2">
                        <ShieldCheck className="w-3 h-3" /> 
                        {response.explanation || "Access Denied"}
                    </p>
                 </motion.div>
             )}

             {/* ✅ FIX 3: CONDITIONAL RENDERING (Wallet vs Chat) */}
             {!account ? (
                 <button 
                    onClick={connectWallet}
                    className="w-full py-4 bg-zinc-100 hover:bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                 >
                    <Wallet className="w-5 h-5" /> Connect Wallet
                 </button>
             ) : isWalletMode ? (
                 // --- WALLET MODE UI ---
                 <div className="space-y-3">
                    <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-xl text-center">
                        <p className="text-blue-200 text-sm">Wallet Connected</p>
                        <p className="text-xs text-blue-400 font-mono truncate px-4">{account}</p>
                    </div>
                    <button 
                        onClick={() => performVerify("WALLET_CHECK")}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
                    >
                        Verify Balance & Claim
                    </button>
                 </div>
             ) : (
                 // --- TRIVIA MODE UI ---
                 <div className="space-y-3">
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your answer..."
                        className="w-full bg-zinc-800/50 border border-zinc-700 text-white p-4 rounded-xl focus:border-purple-500 outline-none transition-all"
                        onKeyDown={(e) => e.key === 'Enter' && performVerify(input)}
                    />
                    <button 
                        onClick={() => performVerify(input)}
                        disabled={!input}
                        className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-900/20"
                    >
                        Verify Answer <Send className="w-4 h-4" />
                    </button>
                 </div>
             )}
          </motion.div>
        )}

        {/* VIEW 2: PROCESSING */}
        {step === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}
            className="bg-zinc-900 border border-zinc-800 p-12 rounded-3xl text-center min-h-[400px] flex flex-col items-center justify-center"
          >
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full animate-pulse" />
                <Loader2 className="w-16 h-16 text-purple-500 animate-spin relative z-10" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
                {isWalletMode ? "Checking Assets..." : "Analyzing..."}
            </h3>
            <p className="text-zinc-500 text-sm">
                {geo.lat !== 0 ? "Verifying location & data..." : "Gatekeeper is evaluating..."}
            </p>
            
            <div className="w-full max-w-[200px] h-1 bg-zinc-800 mt-8 rounded-full overflow-hidden">
                <motion.div 
                    initial={{ width: "0%" }} 
                    animate={{ width: "100%" }} 
                    transition={{ duration: 2, ease: "easeInOut" }}
                    className="h-full bg-purple-500" 
                />
            </div>
          </motion.div>
        )}

        {/* VIEW 3: BIOMETRIC (Legacy Fallback) */}
        {step === 'biometric' && (
          <motion.div
             key="biometric"
             initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }}
             className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl text-center"
          >
             <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-400 px-4 py-1.5 rounded-full text-xs font-bold mb-6 border border-green-500/20">
                <ShieldCheck className="w-3 h-3" /> Approved
             </div>
             
             <h3 className="text-xl font-bold text-white mb-2">Final Step</h3>
             <p className="text-zinc-500 text-sm mb-8">Sign with your passkey to claim assets.</p>

             <BiometricPad 
                dropId={dropId} 
                challenge="auth" 
                receiverAddress={account!} 
                onSuccess={() => setStep('success')} 
             />
          </motion.div>
        )}

        {/* VIEW 4: SUCCESS */}
        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-purple-600 to-blue-600 p-10 rounded-3xl text-center shadow-2xl text-white"
          >
            <div className="w-20 h-20 bg-white/20 rounded-full mx-auto flex items-center justify-center mb-6 backdrop-blur-sm">
                 <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Claimed!</h1>
            <p className="opacity-90 text-sm">Funds have been sent to your wallet.</p>
            <a href="/" className="mt-8 inline-block bg-white text-purple-600 px-6 py-3 rounded-xl font-bold hover:bg-zinc-100 transition-colors">
                Back to Home
            </a>
          </motion.div>
        )}A

      </AnimatePresence>
    </div>
  );
}