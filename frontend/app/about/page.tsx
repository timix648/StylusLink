'use client';

import { motion } from 'framer-motion';
import { Code2, Shield, Zap, Fingerprint, Globe, Wallet, CheckCircle, ArrowLeft, Target, Layers, TrendingUp, Lock, Brain } from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-black text-white relative overflow-x-hidden">
         
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,#1e1b4b,transparent_50%)]"></div>
                <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[128px]"></div>
                <div className="absolute bottom-[10%] left-[10%] w-[400px] h-[400px] bg-indigo-900/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
  
                <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                </Link>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-16"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <img
                            src="/op1.jpg"
                            alt="StylusLink"
                            className="w-12 h-12 rounded-xl object-cover shadow-lg shadow-indigo-500/20"
                        />
                        <div>
                            <h1 className="font-bold text-3xl tracking-tight">StylusLink Protocol (Testnet)</h1>
                            <p className="text-zinc-500 text-sm">AI-Powered Quest Gating on Arbitrum Stylus</p>
                        </div>
                    </div>
                </motion.div>

                <section className="mb-16">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                        <Target className="w-6 h-6 text-indigo-400" />
                        What is StylusLink?
                    </h2>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
                        <p className="text-zinc-300 mb-4 leading-relaxed">
                            StylusLink is a decentralized quest protocol that combines <span className="text-indigo-400 font-semibold">AI-powered verification</span>, <span className="text-purple-400 font-semibold">biometric authentication</span>, and <span className="text-pink-400 font-semibold">smart contract automation</span> on Arbitrum Stylus.
                        </p>
                        <p className="text-zinc-300 mb-4 leading-relaxed">
                            Creators can gate ETH rewards behind <strong>natural language rules</strong> verified by Gemini AI — no manual checks, no central authority. The protocol ensures trust through cryptographic proofs and on-chain transparency.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
                                <Shield className="w-6 h-6 text-indigo-400 mb-2" />
                                <h3 className="font-bold text-sm mb-1">AI Gatekeeper</h3>
                                <p className="text-xs text-zinc-400">Gemini AI verifies wallet conditions automatically</p>
                            </div>
                            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                                <Fingerprint className="w-6 h-6 text-purple-400 mb-2" />
                                <h3 className="font-bold text-sm mb-1">WebAuthn Proof</h3>
                                <p className="text-xs text-zinc-400">FaceID/TouchID for sybil-resistant claims</p>
                            </div>
                            <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-4">
                                <Lock className="w-6 h-6 text-pink-400 mb-2" />
                                <h3 className="font-bold text-sm mb-1">Stylus Vault</h3>
                                <p className="text-xs text-zinc-400">Rust smart contract with auto-reclaim</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mb-16">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                        <Layers className="w-6 h-6 text-purple-400" />
                        Examples Of Current Ability
                    </h2>
                    <div className="space-y-4">
                        {[
                            {
                                category: "Trivia & Secret Keywords",
                                icon: <Brain className="w-5 h-5" />,
                                examples: [
                                    "Answer a trivia question (e.g., 'Who created Ethereum?')",
                                    "Say the secret password to claim (hidden from claimers)",
                                    "Creative challenges (e.g., 'Write a haiku about Web3')",
                                    "Knowledge quizzes (e.g., 'What is the gas limit?')",
                                    "Keyword verification without revealing the answer"
                                ]
                            },
                            {
                                category: "Wallet Financial Stats",
                                icon: <Wallet className="w-5 h-5" />,
                                examples: [
                                    "Native balance > 0.5 ETH across all Sepolia chains",
                                    "Total gas spent > 0.1 ETH (Etherscan history)",
                                    "Wallet age > 180 days",
                                    "Has sent a transaction worth > 1 ETH",
                                    "Nonce is an even number (quirky challenges)"
                                ]
                            },
                            {
                                category: "Token Holdings",
                                icon: <CheckCircle className="w-5 h-5" />,
                                examples: [
                                    "Hold > 100 USDC on Arbitrum Sepolia",
                                    "Own any amount of WETH on Base Sepolia",
                                    "Have LINK tokens across any supported chain",
                                    "Token balance > $50 equivalent"
                                ]
                            },
                            {
                                category: "NFT Ownership",
                                icon: <Globe className="w-5 h-5" />,
                                examples: [
                                    "Must own a Pudgy Penguin (collection detection)",
                                    "Hold an ENS domain",
                                    "Own any NFT from contract 0x...",
                                    "Have a Galxe OAT badge"
                                ]
                            },
                            {
                                category: "Activity & Behavior",
                                icon: <Zap className="w-5 h-5" />,
                                examples: [
                                    "Deployed at least 1 smart contract",
                                    "Inactive for > 30 days (last tx check)",
                                    "Transaction count < 10 (new wallet)",
                                    "Is NOT a smart contract wallet"
                                ]
                            },
                            {
                                category: "Advanced Conditions",
                                icon: <Shield className="w-5 h-5" />,
                                examples: [
                                    "Multi-chain balance sum (e.g., Sepolia ETH across 5 chains)",
                                    "Token holdings + NFT ownership combined",
                                    "Wallet age AND transaction count requirements",
                                    "Geographic location proof (GPS verification)",
                                    "Discord role verification (OAuth integration)"
                                ]
                            }
                        ].map((mode, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="text-indigo-400">{mode.icon}</div>
                                    <h3 className="font-bold text-lg">{mode.category}</h3>
                                </div>
                                <ul className="space-y-2">
                                    {mode.examples.map((ex, j) => (
                                        <li key={j} className="text-sm text-zinc-400 flex items-start gap-2">
                                            <span className="text-indigo-500 mt-0.5">•</span>
                                            <span>{ex}</span>
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        ))}
                    </div>
                </section>

                <section className="mb-16">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                        <Code2 className="w-6 h-6 text-green-400" />
                        Real Quest Examples
                    </h2>
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/30 rounded-2xl p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <span className="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-bold">BEGINNER</span>
                                    <h3 className="font-bold text-xl mt-3">First-Time User Reward</h3>
                                </div>
                                <span className="text-2xl font-bold text-white">0.01 ETH</span>
                            </div>
                            <p className="text-zinc-300 mb-4 font-mono text-sm bg-black/30 p-4 rounded-lg border border-white/5">
                                "Wallet must have less than 10 transactions and be created within the last 30 days"
                            </p>
                            <div className="flex gap-2 flex-wrap">
                                <span className="text-xs bg-white/5 px-2 py-1 rounded">Transaction Count</span>
                                <span className="text-xs bg-white/5 px-2 py-1 rounded">Wallet Age</span>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-2xl p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-xs font-bold">INTERMEDIATE</span>
                                    <h3 className="font-bold text-xl mt-3">Testnet Power User</h3>
                                </div>
                                <span className="text-2xl font-bold text-white">0.05 ETH</span>
                            </div>
                            <p className="text-zinc-300 mb-4 font-mono text-sm bg-black/30 p-4 rounded-lg border border-white/5">
                                "Total Sepolia ETH balance across Arbitrum Sepolia, Base Sepolia, and Optimism Sepolia must be greater than 0.3 ETH"
                            </p>
                            <div className="flex gap-2 flex-wrap">
                                <span className="text-xs bg-white/5 px-2 py-1 rounded">Multi-Chain</span>
                                <span className="text-xs bg-white/5 px-2 py-1 rounded">Balance Sum</span>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-500/30 rounded-2xl p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-xs font-bold">ADVANCED</span>
                                    <h3 className="font-bold text-xl mt-3">OG DeFi Degen</h3>
                                </div>
                                <span className="text-2xl font-bold text-white">0.1 ETH</span>
                            </div>
                            <p className="text-zinc-300 mb-4 font-mono text-sm bg-black/30 p-4 rounded-lg border border-white/5">
                                "Must have spent more than 0.5 ETH in gas fees, hold a Pudgy Penguin NFT, and have USDC balance greater than 100"
                            </p>
                            <div className="flex gap-2 flex-wrap">
                                <span className="text-xs bg-white/5 px-2 py-1 rounded">Gas History</span>
                                <span className="text-xs bg-white/5 px-2 py-1 rounded">NFT Ownership</span>
                                <span className="text-xs bg-white/5 px-2 py-1 rounded">Token Balance</span>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-orange-900/20 to-red-900/20 border border-orange-500/30 rounded-2xl p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <span className="bg-orange-500/20 text-orange-300 px-3 py-1 rounded-full text-xs font-bold">EXPERIMENTAL</span>
                                    <h3 className="font-bold text-xl mt-3">Location-Based Drop</h3>
                                </div>
                                <span className="text-2xl font-bold text-white">0.02 ETH</span>
                            </div>
                            <p className="text-zinc-300 mb-4 font-mono text-sm bg-black/30 p-4 rounded-lg border border-white/5">
                                "Must be physically located within 1km of Times Square, New York (GPS coordinates: 40.758, -73.985)"
                            </p>
                            <div className="flex gap-2 flex-wrap">
                                <span className="text-xs bg-white/5 px-2 py-1 rounded">Geolocation</span>
                                <span className="text-xs bg-white/5 px-2 py-1 rounded">Mobile Biometric</span>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-pink-900/20 to-violet-900/20 border border-pink-500/30 rounded-2xl p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <span className="bg-pink-500/20 text-pink-300 px-3 py-1 rounded-full text-xs font-bold">TRIVIA</span>
                                    <h3 className="font-bold text-xl mt-3">Secret Keyword Challenge</h3>
                                </div>
                                <span className="text-2xl font-bold text-white">0.015 ETH</span>
                            </div>
                            <p className="text-zinc-300 mb-4 font-mono text-sm bg-black/30 p-4 rounded-lg border border-white/5">
                                "User must enter the secret keyword to claim" (keyword hidden from claimers)
                            </p>
                            <div className="flex gap-2 flex-wrap">
                                <span className="text-xs bg-white/5 px-2 py-1 rounded">Secret Password</span>
                                <span className="text-xs bg-white/5 px-2 py-1 rounded">AI Verified</span>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mb-16">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                        <TrendingUp className="w-6 h-6 text-yellow-400" />
                        Roadmap
                    </h2>
                    <div className="space-y-4">
                        <div className="bg-green-500/10 border-l-4 border-green-500 p-6 rounded-r-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="w-5 h-5 text-green-400" />
                                <h3 className="font-bold">Phase 1: MVP (Current)</h3>
                            </div>
                            <ul className="text-sm text-zinc-400 space-y-1 ml-7">
                                <li>• AI-powered quest verification</li>
                                <li>• Biometric authentication (WebAuthn)</li>
                                <li>• Multi-chain balance checks (5 Sepolia testnets + 5 Mainnets)</li>
                                <li>• NFT & token gating</li>
                                <li>• Quest creator dashboard</li>
                            </ul>
                        </div>

                        <div className="bg-yellow-500/10 border-l-4 border-yellow-500 p-6 rounded-r-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap className="w-5 h-5 text-yellow-400" />
                                <h3 className="font-bold">Phase 2: Mainnet Launch (Q1 2026)</h3>
                            </div>
                            <ul className="text-sm text-zinc-400 space-y-1 ml-7">
                                <li>• Deploy to Arbitrum One mainnet</li>
                                <li>• Support 10+ EVM chains (Including Solana Ecosystem)</li>
                                <li>• Enhanced social verification (Twitter, Discord, GitHub, Youtube)</li>
                                <li>• Quest templates & marketplace</li>
                                <li>• Analytics dashboard for creators</li>
                            </ul>
                        </div>

                        <div className="bg-indigo-500/10 border-l-4 border-indigo-500 p-6 rounded-r-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <Globe className="w-5 h-5 text-indigo-400" />
                                <h3 className="font-bold">Phase 3: Ecosystem Growth (Q2-Q3 2026)</h3>
                            </div>
                            <ul className="text-sm text-zinc-400 space-y-1 ml-7">
                                <li>• Recurring quest automation (e.g., daily check-ins)</li>
                                <li>• Team-based quests (multi-sig claims)</li>
                                <li>• Reputation system & leaderboards</li>
                                <li>• SDK for dApp integration</li>
                            </ul>
                        </div>

                        <div className="bg-purple-500/10 border-l-4 border-purple-500 p-6 rounded-r-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <Shield className="w-5 h-5 text-purple-400" />
                                <h3 className="font-bold">Phase 4: Advanced Features (Q4 2026)</h3>
                            </div>
                            <ul className="text-sm text-zinc-400 space-y-1 ml-7">
                                <li>• Zero-knowledge proof integration for privacy</li>
                                <li>• Cross-protocol composability (Uniswap, Aave, etc.)</li>
                                <li>• AI-generated quest suggestions</li>
                                <li>• Enterprise tier with white-label solutions</li>
                                <li>• Mobile app (iOS/Android)</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <section className="mb-16">
                    <h2 className="text-2xl font-bold mb-6">Tech Stack</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { name: "Arbitrum Stylus", desc: "Rust Smart Contracts" },
                            { name: "Gemini AI", desc: "AI Verification" },
                            { name: "Next.js 16", desc: "Frontend Framework" },
                            { name: "Ethers v6", desc: "Web3 Library" },
                            { name: "RainbowKit", desc: "Wallet Connect" },
                            { name: "WebAuthn", desc: "Biometric Auth" },
                            { name: "Framer Motion", desc: "Animations" },
                            { name: "TailwindCSS", desc: "Styling" }
                        ].map((tech, i) => (
                            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                                <h4 className="font-bold text-sm mb-1">{tech.name}</h4>
                                <p className="text-xs text-zinc-500">{tech.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-center">
                    <h2 className="text-2xl font-bold mb-3">Ready to Create Your First Quest?</h2>
                    <p className="text-indigo-100 mb-6">Start gating rewards with AI-powered verification in minutes</p>
                    <Link href="/" className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-zinc-200 transition-colors">
                        Launch App
                        <ArrowLeft className="w-4 h-4 rotate-180" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
