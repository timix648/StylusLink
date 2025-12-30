'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useWallet } from './WalletContext';
import {
    Loader2, Brain, Wallet, ShieldCheck, MapPin,
    Smartphone, Laptop, Globe, CheckCircle, Lock, ArrowRight, ScanLine
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { BiometricPad } from './tools/BiometricPad';

const API_URL = process.env.NEXT_PUBLIC_GATEKEEPER_URL || "https://probable-eureka-5gqr7qv9wx75c75r7-4000.app.github.dev/api";

interface QuestCardProps {
    rule: string;
    dropId: string;
    onVerificationComplete?: (token: string) => void;
}

// 🧠 MODE DETECTOR
function getQuestMode(rule: string, typeParam: string | null) {
    const r = rule.toLowerCase();
    if (r.includes('discord') || r.includes('twitter') || r.includes('follow') || r.includes('follows') || r.includes('followers') || r.includes('youtube') || r.includes('role') || r.includes('username') || r.includes('handle')) {
        return 'TRIVIA';
    }
    if (r.includes('location') || r.includes('Location') || r.includes('gps') || r.includes('is in') || r.includes('should be in') || r.includes('must be in') || r.includes('country') || r.includes('geographical') || r.includes('region') || r.includes('city') || typeParam === 'geo') return 'GEO';
    if (typeParam === 'wallet' || r.includes('eth') || r.includes('should have') || r.includes('must hold') || r.includes('must have') || r.includes('hold') || r.includes('tokens') || r.includes('token') || r.includes('wallet') || r.includes('eth') || r.includes('ETH') || r.includes('network') || r.includes('balance')) return 'WALLET';
    return 'TRIVIA';
}

export default function QuestCard({ rule, dropId, onVerificationComplete }: QuestCardProps) {
    const searchParams = useSearchParams();
    const questType = searchParams.get('type');
    const modeParam = searchParams.get('mode');

    // 🚨 FIX: Destructure disconnectWallet
    const { account, connectWallet, disconnectWallet } = useWallet();
    const currentMode = getQuestMode(rule, questType);

    // --- STATE MACHINE ---
    const [viewState, setViewState] = useState<'intro' | 'checking' | 'success_logic' | 'method_select' | 'scanning_qr' | 'biometric_pad' | 'completed' | 'mobile_geo_landing'>('intro');

    const [input, setInput] = useState('');
    const [proofToken, setProofToken] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [hasBioHardware, setHasBioHardware] = useState(false);

    // 1. Check for Biometric Hardware on Mount
    useEffect(() => {
        if (window.PublicKeyCredential) {
            PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
                .then(setHasBioHardware)
                .catch(() => setHasBioHardware(false));
        }
    }, []);

    // 2. 🚨 PRIVACY FIX: NUCLEAR DISCONNECT ON MOUNT
    // This clears the persistence flag immediately so the Context cannot auto-reconnect.
    useEffect(() => {
        disconnectWallet();
        if (typeof window !== 'undefined') {
            localStorage.removeItem('isWalletConnected');
        }
    }, []); // Runs once on mount

    // 3. 🚨 CRITICAL FIX: FORCE WALLET SELECTION
    // This uses 'wallet_requestPermissions' to override MetaMask's caching.
    const handleForceConnect = async () => {
        // 1. Clear internal state first
        disconnectWallet();
        if (typeof window !== 'undefined') localStorage.removeItem('isWalletConnected');

        if (typeof window !== 'undefined' && (window as any).ethereum) {
            try {
                // 2. FORCE METAMASK TO REVOKE PERMISSIONS & SHOW SELECTION SCREEN
                await (window as any).ethereum.request({
                    method: "wallet_requestPermissions",
                    params: [{ eth_accounts: {} }]
                });

                // 3. Now that permissions are reset, connect normally
                await connectWallet();
            } catch (e) {
                console.log("Wallet selection cancelled");
            }
        } else {
            // Fallback for non-MetaMask environments
            connectWallet();
        }
    };

    // 🚨 FIX: Intercept Mobile Geo Mode
    useEffect(() => {
        if (modeParam === 'geo_verify') {
            setViewState('mobile_geo_landing');
        }
    }, [modeParam]);

    // Poll for Mobile Completion
    useEffect(() => {
        if (viewState !== 'scanning_qr') return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`${API_URL}/check-claim/${dropId}`);
                const data = await res.json();
                if (data.claimed) {
                    setViewState('completed');
                    clearInterval(interval);
                }
            } catch (e) { console.error(e); }
        }, 2000);

        return () => clearInterval(interval);
    }, [viewState, dropId]);


    // MAIN LOGIC VERIFICATION
    const performVerify = useCallback(async (overrideInput?: string, overrideGeo?: { lat: number, lng: number }) => {
        setViewState('checking');
        setErrorMsg('');

        try {
            let payloadInput = overrideInput || input;
            let geoData = overrideGeo || { lat: 0, lng: 0 };

            // GEO MODE: FORCE GPS IF NOT PROVIDED
            if (currentMode === 'GEO' && !overrideGeo) {
                try {
                    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject);
                    });
                    geoData = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                } catch (e) {
                    setErrorMsg("Location Access Denied.");
                    setViewState('intro');
                    return;
                }
            }

            // API CALL
            const res = await fetch(`${API_URL}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rule, dropId,
                    user_data: {
                        address: account || "0x0000000000000000000000000000000000000000",
                        answer: payloadInput || "CHECK_CONDITION",
                        latitude: geoData.lat,
                        longitude: geoData.lng
                    }
                })
            });

            const data = await res.json();

            if (data.approved) {
                setProofToken(data.proofToken);
                if (onVerificationComplete) onVerificationComplete(data.proofToken);
                setViewState('success_logic');
                // Short delay before showing success state
                setTimeout(() => setViewState('method_select'), 1500);
            } else {
                setErrorMsg(data.explanation || "Incorrect. Try again.");
                setViewState(modeParam === 'geo_verify' ? 'mobile_geo_landing' : 'intro');
            }

        } catch (e) {
            console.error(e);
            setErrorMsg("Verification Server Error");
            setViewState('intro');
        }
    }, [account, rule, dropId, input, currentMode, onVerificationComplete, modeParam]);


    // --- RENDER HELPERS ---
    const headerIcon = {
        'TRIVIA': <Brain className="w-5 h-5 text-purple-400" />,
        'WALLET': <Wallet className="w-5 h-5 text-blue-400" />,
        'GEO': <MapPin className="w-5 h-5 text-green-400" />
    }[currentMode];

    const headerTitle = {
        'TRIVIA': 'Knowledge Check',
        'WALLET': 'Asset Verification',
        'GEO': 'Location Proof'
    }[currentMode];


    return (
        <div className="w-full max-w-md mx-auto relative perspective-1000">
            <AnimatePresence mode='wait'>

                {/* --- MAIN CARD --- */}
                <motion.div
                    key="card"
                    initial={{ opacity: 0, y: 20, rotateX: 10 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="bg-white/5 border border-white/10 p-8 rounded-3xl shadow-2xl relative overflow-hidden backdrop-blur-2xl"
                >
                    {/* Background Glow */}
                    <div className={`absolute -top-20 -right-20 w-60 h-60 rounded-full blur-[100px] pointer-events-none transition-colors duration-500
                ${viewState === 'completed' ? 'bg-green-500/20' :
                            viewState === 'scanning_qr' ? 'bg-blue-500/20' :
                                'bg-purple-500/10'}`}
                    />

                    {/* HEADER */}
                    <div className="flex items-center gap-4 mb-6 relative z-10 border-b border-white/5 pb-4">
                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/5 shadow-inner">
                            {viewState === 'completed' ? <CheckCircle className="w-5 h-5 text-green-500" /> : headerIcon}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">{headerTitle}</h2>
                            <p className="text-zinc-400 text-xs flex items-center gap-1">
                                {viewState === 'completed' ? "Vault Unlocked" : "Verification Required"}
                            </p>
                        </div>
                    </div>

                    {/* THE RULE */}
                    {viewState !== 'completed' && (
                        <div className="bg-black/20 p-4 rounded-xl border border-white/5 mb-6 font-sans text-sm text-zinc-300 leading-relaxed backdrop-blur-sm">
                            {rule}
                        </div>
                    )}

                    {/* ERROR BANNER */}
                    {errorMsg && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mb-4 overflow-hidden">
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-red-400" />
                                <span className="text-red-300 text-xs font-bold">{errorMsg}</span>
                            </div>
                        </motion.div>
                    )}


                    {/* =====================================================================================
                 STATE: INTRO (The Entry Point) 
                ===================================================================================== */}
                    {viewState === 'intro' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

                            {/* TRIVIA INPUT */}
                            {currentMode === 'TRIVIA' && (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Enter answer..."
                                        className="flex-1 bg-black/20 border border-white/5 text-white p-4 rounded-xl outline-none focus:border-purple-500/50 transition-all placeholder:text-zinc-600 focus:bg-black/40"
                                        onKeyDown={(e) => e.key === 'Enter' && performVerify()}
                                    />
                                    <button onClick={() => performVerify()} disabled={!input} className="px-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:scale-105 text-white rounded-xl transition-all shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:hover:scale-100">
                                        <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            )}

                            {/* WALLET CONNECT (UPDATED FOR PRIVACY) */}
                            {currentMode === 'WALLET' && (
                                !account ? (
                                    // 🚨 FIX: Using handleForceConnect instead of connectWallet
                                    <button onClick={handleForceConnect} className="w-full py-4 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-all hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                                        <Wallet className="w-5 h-5" /> Connect to Verify
                                    </button>
                                ) : (
                                    <div className="space-y-3">
                                        <button onClick={() => performVerify()} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all">
                                            <ScanLine className="w-5 h-5" /> Scan {account.slice(0, 6)}...{account.slice(-4)}
                                        </button>

                                        {/* 🚨 FIX: Using handleForceConnect here too */}
                                        <button onClick={handleForceConnect} className="w-full text-xs text-zinc-500 hover:text-white transition-colors underline decoration-zinc-700">
                                            Use different wallet
                                        </button>
                                    </div>
                                )
                            )}

                            {/* GEO SPLIT START */}
                            {currentMode === 'GEO' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setViewState('scanning_qr')}
                                        className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-green-500/50 p-4 rounded-2xl flex flex-col items-center gap-2 transition-all group backdrop-blur-sm"
                                    >
                                        <Smartphone className="w-6 h-6 text-zinc-400 group-hover:text-green-400 transition-colors" />
                                        <span className="text-xs font-bold text-zinc-300">Via Mobile</span>
                                    </button>

                                    <button
                                        onClick={() => performVerify()}
                                        className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-green-500/50 p-4 rounded-2xl flex flex-col items-center gap-2 transition-all group backdrop-blur-sm"
                                    >
                                        <Laptop className="w-6 h-6 text-zinc-400 group-hover:text-green-400 transition-colors" />
                                        <span className="text-xs font-bold text-zinc-300">This Device</span>
                                    </button>
                                </div>
                            )}

                        </motion.div>
                    )}

                    {/* =====================================================================================
                 STATE: MOBILE GEO LANDING
                ===================================================================================== */}
                    {viewState === 'mobile_geo_landing' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-6">
                            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border border-green-500/20">
                                <MapPin className="w-10 h-10 text-green-400" />
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">Location Required</h3>
                                <p className="text-zinc-400 text-sm">Please click below to prove you are physically at the required location.</p>
                            </div>

                            <button
                                onClick={() => performVerify()}
                                className="w-full py-5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-900/20 flex items-center justify-center gap-3 transition-all active:scale-95"
                            >
                                <MapPin className="w-5 h-5" />
                                Prove Location
                            </button>

                            <p className="text-xs text-zinc-600">This will ask for GPS permission.</p>
                        </motion.div>
                    )}


                    {/* =====================================================================================
                 STATE: LOADING 
                ===================================================================================== */}
                    {viewState === 'checking' && (
                        <div className="flex flex-col items-center justify-center py-10">
                            <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
                            <p className="text-zinc-400 text-sm animate-pulse">Consulting Gatekeeper AI...</p>
                        </div>
                    )}


                    {/* =====================================================================================
                 STATE: SUCCESS LOGIC (Transition)
                ===================================================================================== */}
                    {viewState === 'success_logic' && (
                        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-6">
                            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
                                <CheckCircle className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Requirement Met</h3>
                            <p className="text-zinc-400 text-sm mt-2">Proceeding to biometric lock...</p>
                        </motion.div>
                    )}


                    {/* =====================================================================================
                 STATE: METHOD SELECTION
                ===================================================================================== */}
                    {viewState === 'method_select' && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                            <div className="text-center mb-6">
                                <div className="w-12 h-12 bg-pink-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Lock className="w-6 h-6 text-pink-500" />
                                </div>
                                <h3 className="text-lg font-bold text-white">Unlock Vault</h3>
                                <p className="text-zinc-500 text-xs">Final Step: Biometric Verification</p>
                            </div>

                            <div className="flex gap-3">
                                {/* OPTION A: MOBILE (QR) */}
                                <button
                                    onClick={() => setViewState('scanning_qr')}
                                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-pink-500/50 p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all group"
                                >
                                    <Smartphone className="w-6 h-6 text-zinc-400 group-hover:text-pink-400" />
                                    <span className="text-sm font-bold text-white">Mobile App</span>
                                    <span className="text-[10px] text-green-500 font-mono tracking-wider">RECOMMENDED</span>
                                </button>

                                {/* OPTION B: DESKTOP (Bio) */}
                                <button
                                    onClick={() => setViewState('biometric_pad')}
                                    disabled={!hasBioHardware}
                                    className={`flex-1 border p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all 
                                ${hasBioHardware
                                            ? 'bg-white/5 hover:bg-white/10 border-white/5 hover:border-pink-500/50 cursor-pointer group'
                                            : 'bg-black/20 border-transparent opacity-50 cursor-not-allowed'
                                        }`}
                                >
                                    <Laptop className={`w-6 h-6 ${hasBioHardware ? 'text-zinc-400 group-hover:text-pink-400' : 'text-zinc-600'}`} />
                                    <span className="text-sm font-bold text-white">This Device</span>
                                    {!hasBioHardware && <span className="text-[10px] text-red-400 font-mono tracking-wider">NO SENSOR</span>}
                                </button>
                            </div>
                        </motion.div>
                    )}


                    {/* =====================================================================================
                 STATE: SCANNING QR
                ===================================================================================== */}
                    {viewState === 'scanning_qr' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                            <h3 className="text-lg font-bold text-white mb-2">Scan to Complete</h3>

                            <div className="bg-white p-3 rounded-2xl w-fit mx-auto mb-4 shadow-xl">
                                <QRCodeSVG
                                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/?id=${dropId}&rule=${encodeURIComponent(rule)}&mode=${currentMode === 'GEO' ? 'geo_verify' : 'bio_verify'}&proof=${proofToken || ''}`}
                                    size={180}
                                />
                            </div>

                            <p className="text-zinc-500 text-xs animate-pulse mb-4">
                                Waiting for mobile confirmation...
                            </p>

                            <button onClick={() => setViewState(currentMode === 'GEO' ? 'intro' : 'method_select')} className="text-xs text-zinc-400 hover:text-white underline">
                                Back to options
                            </button>
                        </motion.div>
                    )}


                    {/* =====================================================================================
                 STATE: BIOMETRIC PAD
                ===================================================================================== */}
                    {viewState === 'biometric_pad' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            {proofToken ? (
                                <BiometricPad
                                    dropId={dropId}
                                    challenge={proofToken}
                                    receiverAddress={account || ""}
                                    onSuccess={() => setViewState('completed')}
                                />
                            ) : (
                                <div className="text-center text-red-400">Error: Missing Proof Token</div>
                            )}
                            <button onClick={() => setViewState('method_select')} className="w-full mt-4 text-xs text-zinc-500 hover:text-white transition-colors">
                                Cancel
                            </button>
                        </motion.div>
                    )}


                    {/* =====================================================================================
                 STATE: COMPLETED
                ===================================================================================== */}
                    {viewState === 'completed' && (
                        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-8">
                            <div className="w-24 h-24 bg-gradient-to-tr from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30 animate-pulse">
                                <CheckCircle className="w-12 h-12 text-white" />
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-2">Claimed!</h2>
                            <p className="text-zinc-400 text-sm mb-6">Funds have been transferred to your wallet.</p>

                            <a
                                href={`https://sepolia.arbiscan.io/address/${account}`}
                                target="_blank"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl font-bold transition-all"
                            >
                                <Globe className="w-4 h-4" /> View on Arbiscan
                            </a>
                        </motion.div>
                    )}

                </motion.div>
            </AnimatePresence>
        </div>
    );
}