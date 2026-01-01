'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import axios from 'axios';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';

// ICONS
import {
    ShieldCheck, Fingerprint, CheckCircle, ArrowRight,
    Smartphone, Laptop, Zap, Menu, Code2, ScanLine, Lock, Wallet, LogOut, ChevronRight
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

// COMPONENTS
import CreateDrop from '../components/CreateDrop';
import QuestCard from '../components/QuestCard';
import QuestDrawer from '../components/QuestDrawer';
import { useWallet } from '../components/WalletContext';

const API_URL = process.env.NEXT_PUBLIC_GATEKEEPER_URL || "http://localhost:4000/api";

// --- HELPER: Hex Conversion ---
function bufferToHex(buffer: ArrayBuffer): string {
    return "0x" + Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

function GatekeeperApp() {
    const searchParams = useSearchParams();
    const { width, height } = useWindowSize(); // For Confetti

    // URL Params
    const dropId = searchParams.get('id');
    const rule = searchParams.get('rule');
    const urlProof = searchParams.get('proof'); // If coming from mobile QR

    // Context
    const { account, connectWallet, disconnectWallet } = useWallet();

    // --- STATE ---
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    // CLAIM FLOW STATE
    const [claimStep, setClaimStep] = useState('loading');
    const [isClaimed, setIsClaimed] = useState(false);
    const [proofToken, setProofToken] = useState("");
    const [userAddress, setUserAddress] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [isMobile, setIsMobile] = useState(false);

    // Prevent hydration mismatch & Detect Mobile
    useEffect(() => {
        setMounted(true);
        setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    }, []);


    // --- 1. LOGIC: INITIAL CHECK & POLLING ---
    useEffect(() => {
        if (!dropId) return;

        const checkStatus = async () => {
            // Prevent hanging by using an AbortController with a timeout
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 4000);

            try {
                const res = await fetch(`${API_URL}/check-claim/${dropId}`, {
                    headers: { 'ngrok-skip-browser-warning': '1' },
                    signal: controller.signal
                });

                clearTimeout(timeout);
                const data = await res.json();

                console.log('📋 Backend response:', JSON.stringify(data));

                // Support both response shapes:
                // - { status: 'ACTIVE' }
                // - { active: true }
                let isActive = false;
                if (typeof data.active === 'boolean') {
                    isActive = data.active;
                    console.log('✅ Using data.active:', isActive);
                } else if (typeof data.status !== 'undefined') {
                    isActive = data.status === 'ACTIVE';
                    console.log('✅ Using data.status:', isActive);
                } else if (data.details && data.details.expiresAt) {
                    // Fallback: check expiresAt timestamp (stringified BigInt)
                    try {
                        const expires = Number(data.details.expiresAt);
                        isActive = Date.now() / 1000 < expires;
                        console.log('✅ Using expiresAt fallback:', isActive);
                    } catch (e) {
                        isActive = false;
                    }
                }

                console.log('🎯 Final isActive decision:', isActive);

                if (!isActive) {
                    setIsClaimed(true);
                    setClaimStep('claimed_already');
                    return;
                }

                // Mobile Handoff: If we have a proof token from QR code, skip quest
                if (urlProof && claimStep === 'loading') {
                    console.log('📱 Mobile handoff detected - skipping to biometrics');
                    setProofToken(urlProof);
                    setClaimStep('method'); // Show device selection
                    return;
                }

                // Desktop Flow: Show quest if no proof token
                if (claimStep === 'loading' && !urlProof) {
                    setClaimStep('quest');
                }

            } catch (e: any) {
                console.error('Status check error:', e?.message || e);
                // Don't hang the UI indefinitely — show the quest in offline/fallback mode
                setErrorMsg('Unable to reach Gatekeeper; showing quest (offline check).');
                if (claimStep === 'loading') setClaimStep('quest');
                clearTimeout(timeout);
            }
        };

        // Run immediately
        checkStatus();

        // Poll every 3 seconds to auto-close if it expires while they are looking at it
        const interval = setInterval(checkStatus, 3000);

        return () => clearInterval(interval);
    }, [dropId, urlProof, claimStep]);


    // --- 2. LOGIC: BIOMETRICS (The "Hard" Part) ---
    const handleBiometrics = async () => {
        setErrorMsg("");

        try {
            // 1. Hardware Check
            if (window.PublicKeyCredential) {
                const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
                if (!available) throw new Error("No Biometric Sensor Detected.");
            } else {
                throw new Error("WebAuthn not supported.");
            }

            // 2. Trigger OS Prompt (FaceID / TouchID)
            const credential = await navigator.credentials.create({
                publicKey: {
                    challenge: new Uint8Array([1, 2, 3, 4]),
                    rp: { name: "StylusLink Gatekeeper" },
                    user: {
                        id: new Uint8Array([5, 6, 7, 8]),
                        name: "courier@styluslink.com",
                        displayName: "Courier"
                    },
                    pubKeyCredParams: [{ alg: -7, type: "public-key" }],
                    timeout: 60000,
                    authenticatorSelection: {
                        authenticatorAttachment: "platform",
                        userVerification: "required"
                    }
                }
            });

            // 3. Success
            const realCredentialId = bufferToHex((credential as any).rawId);
            console.log("🧬 BIO OK:", realCredentialId);

            // Move to Wallet Input (or Auto-Submit if wallet connected)
            if (account) {
                setUserAddress(account);
                setClaimStep('processing');
                submitClaim(account);
            } else {
                setClaimStep('wallet_input');
            }

        } catch (e: any) {
            console.error(e);
            setErrorMsg(e.message || "Authentication Failed or Cancelled");
        }
    };


    // --- 3. LOGIC: SUBMISSION ---
    const submitClaim = async (addr: string) => {
        if (!ethers.isAddress(addr)) {
            setErrorMsg("Invalid Ethereum Address");
            return;
        }

        setClaimStep('processing');

        try {
            const res = await axios.post(`${API_URL}/claim`, {
                dropId,
                receiver: addr,
                proofToken: proofToken,
                biometricData: {
                    mock: true,
                    signature: "0x30440220000000000000000000000000000000000000000000000000000000000000000102200000000000000000000000000000000000000000000000000000000000000001"
                }
            }, {
                headers: { 'ngrok-skip-browser-warning': '1' }
            });

            if (res.data.success) {
                setClaimStep('success');
            } else {
                throw new Error(res.data.error || "Server rejected claim");
            }

        } catch (e: any) {
            console.error("Claim Error:", e);
            setErrorMsg(e.response?.data?.error || "Claim Transaction Failed");
            setClaimStep('wallet_input'); // Go back to let them try again
        }
    };

    if (!mounted) return <div className="bg-black min-h-screen" />;

    // =========================================================
    // 🔵 VIEW 1: CLAIM INTERFACE (The animated flow)
    // =========================================================
    if (dropId && rule) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">

                {/* Confetti on Success */}
                {claimStep === 'success' && <Confetti width={width} height={height} recycle={false} numberOfPieces={500} colors={['#6366f1', '#a855f7', '#ec4899']} />}

                {/* Ambient Background */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-black to-black"></div>
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px] transition-colors duration-1000
                ${claimStep === 'success' ? 'bg-green-500/10' : claimStep === 'failed' ? 'bg-red-500/10' : 'bg-indigo-500/10'}`}
                    />
                </div>

                <div className="relative z-10 w-full max-w-lg">

                    {/* HEADER */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-white/5 rounded-2xl border border-white/10 mb-4 shadow-xl">
                            <ShieldCheck className="w-6 h-6 text-indigo-400" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Vault Gatekeeper</h1>
                        <p className="text-zinc-500 text-sm">Secure Biometric Claim Protocol</p>
                    </div>

                    <AnimatePresence mode='wait'>
                        {claimStep === 'loading' && (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black"
                            >
                                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                                <h2 className="text-white font-bold text-lg tracking-wider animate-pulse">
                                    CONNECTING TO VAULT...
                                </h2>
                                <p className="text-zinc-500 text-xs mt-2 font-mono">Verifying Expiry & Claim Status</p>
                            </motion.div>
                        )}
                        {/* 🛑 END PASTE 🛑 */}

                        {/* 1. CLAIMED ALREADY */}
                        {isClaimed && (
                            <motion.div key="claimed" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-black/40 backdrop-blur-xl border border-white/10 p-10 rounded-3xl text-center shadow-2xl">
                                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Lock className="w-8 h-8 text-zinc-500" />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">Vault Closed</h2>
                                <p className="text-zinc-400 text-sm mb-8">This quest has already been claimed or expired.</p>
                                <a href="/" className="inline-flex px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-zinc-200 transition-colors text-sm">
                                    Create New Quest
                                </a>
                            </motion.div>
                        )}

                        {/* 2. THE QUEST CARD (Step 1) */}
                        {claimStep === 'quest' && !isClaimed && (
                            <motion.div key="quest" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <QuestCard
                                    rule={rule}
                                    dropId={dropId}
                                    onVerificationComplete={(token) => {
                                        setProofToken(token);
                                        setClaimStep('method'); // Move to Step 2
                                    }}
                                />
                            </motion.div>
                        )}

                        {/* 3. METHOD SELECTION (Mobile vs Desktop) */}
                        {claimStep === 'method' && (
                            <motion.div key="method" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
                                <div className="text-center mb-8">
                                    <h2 className="text-xl font-bold text-white">Identity Verification</h2>
                                    <p className="text-zinc-400 text-sm mt-1">Choose a device to sign the proof</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setClaimStep('qr_show')}
                                        className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-indigo-500/50 p-6 rounded-2xl flex flex-col items-center gap-4 transition-all group"
                                    >
                                        <Smartphone className="w-8 h-8 text-zinc-400 group-hover:text-indigo-400" />
                                        <span className="font-medium text-sm text-white">Mobile</span>
                                    </button>

                                    <button
                                        onClick={() => setClaimStep('bio_check')}
                                        className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-purple-500/50 p-6 rounded-2xl flex flex-col items-center gap-4 transition-all group"
                                    >
                                        <Laptop className="w-8 h-8 text-zinc-400 group-hover:text-purple-400" />
                                        <span className="font-medium text-sm text-white">This Device</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* 4. QR CODE (Mobile Handoff) */}
                        {claimStep === 'qr_show' && (
                            <motion.div key="qr" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-3xl text-center shadow-2xl">
                                <h3 className="text-lg font-bold text-white mb-6">Scan with Phone</h3>
                                <div className="bg-white p-4 rounded-2xl w-fit mx-auto mb-6 shadow-lg">
                                    <QRCodeSVG
                                        value={`${window.location.origin}/?id=${dropId}&rule=${encodeURIComponent(rule)}&proof=${proofToken}`}
                                        size={180}
                                    />
                                </div>
                                <p className="text-xs text-zinc-500 mb-6 flex items-center justify-center gap-2">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                    </span>
                                    Waiting for biometric signature...
                                </p>
                                <button onClick={() => setClaimStep('method')} className="text-xs text-zinc-400 hover:text-white">Cancel</button>
                            </motion.div>
                        )}

                        {/* 5. BIOMETRIC CHECK (The Button) */}
                        {claimStep === 'bio_check' && (
                            <motion.div key="bio" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-3xl text-center shadow-2xl">
                                <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-indigo-500/20">
                                    <Fingerprint className="w-10 h-10 text-indigo-400" />
                                </div>
                                <h2 className="text-xl font-bold text-white mb-2">Biometric Sign</h2>
                                <p className="text-zinc-400 text-sm mb-8">Scan your fingerprint or face to unlock the vault.</p>

                                {errorMsg && (
                                    <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-xs">
                                        {errorMsg}
                                    </div>
                                )}

                                <button
                                    onClick={handleBiometrics}
                                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <Fingerprint className="w-5 h-5" /> Authenticate
                                </button>
                                <button onClick={() => setClaimStep('method')} className="mt-4 text-xs text-zinc-500 hover:text-zinc-300">Back</button>
                            </motion.div>
                        )}

                        {/* 6. WALLET INPUT (If not connected) */}
                        {claimStep === 'wallet_input' && (
                            <motion.div key="wallet" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-3xl text-center shadow-2xl">
                                <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-green-500/20">
                                    <CheckCircle className="w-8 h-8 text-green-400" />
                                </div>
                                <h2 className="text-xl font-bold text-white mb-2">Identity Verified</h2>
                                <p className="text-zinc-400 text-sm mb-6">Enter destination address</p>

                                <input
                                    type="text"
                                    placeholder="0x..."
                                    value={userAddress}
                                    onChange={(e) => setUserAddress(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 p-4 rounded-xl text-center text-white font-mono text-sm mb-6 focus:border-indigo-500 outline-none transition-all"
                                />

                                <button
                                    onClick={() => submitClaim(userAddress)}
                                    disabled={!userAddress}
                                    className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
                                >
                                    Claim Assets <ArrowRight className="w-4 h-4" />
                                </button>
                            </motion.div>
                        )}

                        {/* 7. PROCESSING */}
                        {claimStep === 'processing' && (
                            <motion.div key="proc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                                <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                                <h2 className="text-lg font-bold text-white">Transferring Funds...</h2>
                                <p className="text-zinc-500 text-xs mt-2">Calling Arbitrum Stylus Contract</p>
                            </motion.div>
                        )}

                        {/* 8. SUCCESS */}
                        {claimStep === 'success' && (
                            <motion.div key="success" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-black/60 backdrop-blur-xl border border-white/10 p-10 rounded-3xl text-center shadow-2xl">
                                <div className="w-20 h-20 bg-gradient-to-tr from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-900/40">
                                    <CheckCircle className="w-10 h-10 text-white" />
                                </div>
                                <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Success!</h2>
                                <p className="text-zinc-400 text-sm mb-8">Funds have been sent to your wallet.</p>
                                <a href={`https://sepolia.arbiscan.io/address/${userAddress}`} target="_blank" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-medium text-sm bg-indigo-500/10 px-4 py-2 rounded-lg border border-indigo-500/20">
                                    View Transaction <ArrowRight className="w-3 h-3" />
                                </a>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </div>
        );
    }

    // =========================================================
    // 🟣 VIEW 2: CREATOR DASHBOARD (PRODUCTION LAYOUT)
    // =========================================================
    return (
        <div className="min-h-screen bg-black text-white relative flex flex-col font-sans selection:bg-indigo-500/30 overflow-x-hidden">

            {/* Background Ambient Orbs */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,#1e1b4b,transparent_50%)]"></div>
                <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[128px]"></div>
                <div className="absolute bottom-[10%] left-[10%] w-[400px] h-[400px] bg-indigo-900/10 rounded-full blur-[100px]"></div>
            </div>

            {/* 1. NAVBAR */}
            <nav className="relative z-50 flex items-center justify-between px-6 md:px-12 py-6 w-full max-w-7xl mx-auto">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Code2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <span className="font-bold text-lg tracking-tight block leading-none">StylusLink</span>
                        <span className="text-[10px] text-zinc-500 font-medium tracking-widest uppercase">Protocol</span>
                    </div>
                </div>

                {/* Wallet Connection */}
                <div>
                    {!account ? (
                        <button onClick={connectWallet} className="flex items-center gap-2 px-5 py-2.5 bg-white text-black font-bold text-sm rounded-full hover:bg-zinc-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                            <Wallet className="w-4 h-4" /> Connect
                        </button>
                    ) : (
                        <div className="flex items-center gap-3 pl-1 pr-1 py-1 bg-white/5 border border-white/10 rounded-full backdrop-blur-md">
                            <button onClick={disconnectWallet} className="px-4 py-1.5 bg-black/40 hover:bg-red-900/20 hover:text-red-400 rounded-full text-zinc-400 transition-colors text-xs font-medium border border-transparent hover:border-red-500/20">
                                Disconnect
                            </button>
                            <div className="flex items-center gap-2 pr-3">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                <span className="text-zinc-200 font-mono text-xs">
                                    {account.slice(0, 6)}...{account.slice(-4)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            {/* 2. MAIN CONTENT */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 md:px-6 w-full pb-20 pt-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-5xl"
                >
                    <CreateDrop />
                </motion.div>
            </main>

            {/* 3. YOUR QUESTS BUTTON (Bottom Right - Matching Style) */}
            <div className="fixed bottom-6 right-6 z-50">
                <button
                    onClick={() => setIsDrawerOpen(true)}
                    className="group flex items-center gap-3 px-5 py-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full text-white shadow-2xl hover:bg-white/10 transition-all hover:scale-105"
                >
                    <span className="text-xs font-bold tracking-wide">Your Quests</span>
                    <div className="bg-white/10 group-hover:bg-indigo-500 p-1.5 rounded-full transition-colors">
                        <Menu className="w-3 h-3" />
                    </div>
                </button>
            </div>

            <QuestDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
        </div>
    );
}

export default function Home() {
    return (
        <Suspense fallback={<div className="bg-black min-h-screen flex items-center justify-center text-zinc-600 font-sans text-sm animate-pulse">Loading StylusLink...</div>}>
            <GatekeeperApp />
        </Suspense>
    );
}