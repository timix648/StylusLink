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

const API_URL = process.env.NEXT_PUBLIC_GATEKEEPER_URL || "http://localhost:4000/api";

interface QuestCardProps {
    rule: string;
    dropId: string;
    onVerificationComplete?: (token: string) => void;
}

function getQuestMode(rule: string, typeParam: string | null) {
    const r = rule.toLowerCase();
    if (r.includes('discord') || r.includes('twitter') || r.includes('follow') || r.includes('follows') || r.includes('followers') || r.includes('youtube') || r.includes('role') || r.includes('username') || r.includes('handle')) {
        return 'TRIVIA';
    }
    if (r.includes('location') || r.includes('Location') || r.includes('gps') || r.includes('is in') || r.includes('should be in') || r.includes('must be in') || r.includes('country') || r.includes('geographical') || r.includes('region') || r.includes('vpn') || r.includes('city') || typeParam === 'geo') return 'GEO';
    if (typeParam === 'wallet' || r.includes('eth') || r.includes('should have') || r.includes('must hold') || r.includes('must have') || r.includes('hold') || r.includes('tokens') || r.includes('token') || r.includes('wallet') || r.includes('eth') || r.includes('ETH') || r.includes('network') || r.includes('balance')) return 'WALLET';
    return 'TRIVIA';
}

// Sanitize rule to hide secret keywords/passwords from claimers
function sanitizeRuleForDisplay(rule: string): string {
    const r = rule.toLowerCase();
    
    // Patterns that indicate a secret keyword/password quest
    const secretPatterns = [
        /(?:say|enter|type|input|write|provide)\s+(?:the\s+)?(?:word|keyword |key word |should say|password|phrase|secret|code)\s*['""]?(\w+)['""]?/gi,
        /(?:secret|password|keyword|code)\s+(?:is\s+)?['""]?(\w+)['""]?/gi,
        /['""](\w+)['""]?\s+(?:is\s+)?(?:the\s+)?(?:secret|password|keyword|code)/gi,
        /must\s+(?:say|enter|type)\s+['""]?(\w+)['""]?/gi,
    ];
    
    // Check if this looks like a secret keyword quest
    const isSecretQuest = secretPatterns.some(pattern => pattern.test(rule));
    
    if (isSecretQuest) {
        // Replace the secret word with [HIDDEN]
        let sanitized = rule;
        
        // Replace quoted strings that appear after secret-related words
        sanitized = sanitized.replace(/(['""'])([^'""]+)\1/g, (match, quote, content) => {
            // If the content looks like a secret keyword (not a common phrase)
            if (content.length < 50 && !/\s{2,}/.test(content)) {
                return `${quote}[HIDDEN]${quote}`;
            }
            return match;
        });
        
        // Replace patterns like "say the word happy" -> "say the word [HIDDEN]"
        sanitized = sanitized.replace(
            /(say|enter|type|input|write|provide)\s+(the\s+)?(word|keyword|password|phrase|secret|code)\s+(\w+)/gi,
            '$1 $2$3 [HIDDEN]'
        );
        
        // Replace "password is xyz" -> "password is [HIDDEN]"
        sanitized = sanitized.replace(
            /(secret|password|keyword|code)\s+(is\s+)?(\w+)/gi,
            (match, prefix, is, word) => {
                // Don't hide common words that might be part of the phrase
                const commonWords = ['the', 'a', 'to', 'be', 'able', 'required', 'needed'];
                if (commonWords.includes(word.toLowerCase())) {
                    return match;
                }
                return `${prefix} ${is || ''}[HIDDEN]`;
            }
        );
        
        return sanitized;
    }
    
    // For trivia questions, show a hint instead of the full question if it contains the answer
    if (r.includes('answer') && (r.includes('is') || r.includes('='))) {
        return "Answer the question correctly to claim this reward.";
    }
    
    return rule;
}

export default function QuestCard({ rule, dropId, onVerificationComplete }: QuestCardProps) {
    const searchParams = useSearchParams();
    const questType = searchParams.get('type');
    const modeParam = searchParams.get('mode');
    const { account, connectWallet, disconnectWallet } = useWallet();
    const currentMode = getQuestMode(rule, questType);

    // STATE MACHINE
    const [viewState, setViewState] = useState<'intro' | 'checking' | 'success_logic' | 'method_select' | 'scanning_qr' | 'biometric_pad' | 'completed' | 'mobile_geo_landing'>('intro');

    const [discordUser, setDiscordUser] = useState<{ id: string, username: string } | null>(null);
    const [input, setInput] = useState('');
    const [proofToken, setProofToken] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [hasBioHardware, setHasBioHardware] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.PublicKeyCredential) {
            PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
                .then(setHasBioHardware)
                .catch(() => setHasBioHardware(false));
        }
    }, []);

    useEffect(() => {
        if (disconnectWallet) disconnectWallet();
        if (typeof window !== 'undefined') {
            localStorage.removeItem('isWalletConnected');
        }
    }, []); // Runs once on mount

    const handleDiscordLogin = () => {
        const width = 500, height = 700;
        const left = (window.innerWidth - width) / 2;
        const top = (window.innerHeight - height) / 2;

        const popup = window.open(
            `${API_URL}/auth/discord`,
            'Discord Login',
            `width=${width},height=${height},top=${top},left=${left}`
        );

        const messageHandler = (event: MessageEvent) => {
            if (event.data?.type === 'DISCORD_CONNECTED') {
                setDiscordUser(event.data.user);
                setInput("CONNECTED_VIA_OAUTH");
                window.removeEventListener('message', messageHandler);
            }
        };

        window.addEventListener('message', messageHandler);
    };

    const handleForceConnect = async () => {
        if (disconnectWallet) disconnectWallet();
        if (typeof window !== 'undefined') localStorage.removeItem('isWalletConnected');

        if (typeof window !== 'undefined' && (window as any).ethereum) {
            try {
                await (window as any).ethereum.request({
                    method: "wallet_requestPermissions",
                    params: [{ eth_accounts: {} }]
                });

                await connectWallet();
            } catch (e) {
                console.log("Wallet selection cancelled");
            }
        } else {
            connectWallet();
        }
    };

    useEffect(() => {
        if (modeParam === 'geo_verify') {
            setViewState('mobile_geo_landing');
        }
    }, [modeParam]);

    useEffect(() => {
        if (viewState !== 'scanning_qr') return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`${API_URL}/check-claim/${dropId}`, {
                    headers: { 'ngrok-skip-browser-warning': '1' }
                });
                const data = await res.json();
                if (data.claimed) {
                    setViewState('completed');
                    clearInterval(interval);
                }
            } catch (e) { console.error(e); }
        }, 2000);

        return () => clearInterval(interval);
    }, [viewState, dropId]);

    const performVerify = useCallback(async (overrideInput?: string, overrideGeo?: { lat: number, lng: number }) => {
        setViewState('checking');
        setErrorMsg('');

        try {
            let payloadInput = overrideInput || input;
            let geoData = overrideGeo || { lat: 0, lng: 0 };
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

            const res = await fetch(`${API_URL}/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': '1'
                },
                body: JSON.stringify({
                    rule, dropId,
                    user_data: {
                        address: account || "0x0000000000000000000000000000000000000000",
                        answer: payloadInput || "CHECK_CONDITION",
                        discordId: discordUser ? discordUser.id : undefined,
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
    }, [account, rule, dropId, input, currentMode, onVerificationComplete, modeParam, discordUser]);

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

                <motion.div
                    key="card"
                    initial={{ opacity: 0, y: 20, rotateX: 10 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="bg-white/5 border border-white/10 p-8 rounded-3xl shadow-2xl relative overflow-hidden backdrop-blur-2xl"
                >
                    <div className={`absolute -top-20 -right-20 w-60 h-60 rounded-full blur-[100px] pointer-events-none transition-colors duration-500
                ${viewState === 'completed' ? 'bg-green-500/20' :
                            viewState === 'scanning_qr' ? 'bg-blue-500/20' :
                                'bg-purple-500/10'}`}
                    />

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

                    {viewState !== 'completed' && (
                        <div className="bg-black/20 p-4 rounded-xl border border-white/5 mb-6 font-sans text-sm text-zinc-300 leading-relaxed backdrop-blur-sm">
                            {sanitizeRuleForDisplay(rule)}
                        </div>
                    )}

                    {errorMsg && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mb-4 overflow-hidden">
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-red-400" />
                                <span className="text-red-300 text-xs font-bold">{errorMsg}</span>
                            </div>
                        </motion.div>
                    )}

                    {viewState === 'intro' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

                            {currentMode === 'TRIVIA' && (
                                <div className="space-y-4">

                                    {rule.toLowerCase().includes('discord') ? (
                                        <div className="flex flex-col gap-3">
                                            {!discordUser ? (
                                                <button
                                                    onClick={handleDiscordLogin}
                                                    className="w-full py-4 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
                                                >
                                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 127 96"><path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.11,77.11,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22c.63-23.28-1.24-45.66-18.9-72.15ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" /></svg>
                                                    Connect Discord
                                                </button>
                                            ) : (
                                                <div className="bg-[#5865F2]/20 border border-[#5865F2]/50 p-4 rounded-xl flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                                        <span className="text-white font-bold">{discordUser.username}</span>
                                                    </div>
                                                    <span className="text-[#5865F2] text-xs font-mono">ID: {discordUser.id}</span>
                                                </div>
                                            )}

                                            <button
                                                onClick={() => performVerify()}
                                                disabled={!discordUser}
                                                className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${!discordUser ? 'bg-white/5 text-zinc-600 cursor-not-allowed' : 'bg-white text-black hover:scale-[1.02]'
                                                    }`}
                                            >
                                                Verify Membership <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>

                                    ) : (

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
                                </div>
                            )}

                            {currentMode === 'WALLET' && (
                                !account ? (
                                    <button onClick={handleForceConnect} className="w-full py-4 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-all hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                                        <Wallet className="w-5 h-5" /> Connect to Verify
                                    </button>
                                ) : (
                                    <div className="space-y-3">
                                        <button onClick={() => performVerify()} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all">
                                            <ScanLine className="w-5 h-5" /> Scan {account.slice(0, 6)}...{account.slice(-4)}
                                        </button>
                                        <button onClick={handleForceConnect} className="w-full text-xs text-zinc-500 hover:text-white transition-colors underline decoration-zinc-700">
                                            Use different wallet
                                        </button>
                                    </div>
                                )
                            )}

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

                    {viewState === 'checking' && (
                        <div className="flex flex-col items-center justify-center py-10">
                            <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
                            <p className="text-zinc-400 text-sm animate-pulse">Consulting Gatekeeper AI...</p>
                        </div>
                    )}


                    {viewState === 'success_logic' && (
                        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-6">
                            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
                                <CheckCircle className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Requirement Met</h3>
                            <p className="text-zinc-400 text-sm mt-2">Proceeding to biometric lock...</p>
                        </motion.div>
                    )}


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

                                <button
                                    onClick={() => setViewState('scanning_qr')}
                                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-pink-500/50 p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all group"
                                >
                                    <Smartphone className="w-6 h-6 text-zinc-400 group-hover:text-pink-400" />
                                    <span className="text-sm font-bold text-white">Mobile App</span>
                                    <span className="text-[10px] text-green-500 font-mono tracking-wider">RECOMMENDED</span>
                                </button>


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
        </div >
    );
}