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
                        Glimpse Of Current Ability
                    </h2>
                    <div className="space-y-4">
                        {[
                            {
                                category: "Trivia & Secret Keywords",
                                icon: <Brain className="w-5 h-5" />,
                                examples: [
                                    "Answer a trivia question (e.g., 'Who created Ethereum?')",
                                    "Say the secret password to claim (The secret is hidden from claimers)",
                                    "Creative challenges (e.g., 'Write a speech about Web3')",
                                    "Knowledge quizzes (e.g., 'What is the use of gas fee?')",
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
                                    "The number of pudgy penguin NFT Users hold must be an even number"
                                ]
                            },
                            {
                                category: "Token Holdings",
                                icon: <CheckCircle className="w-5 h-5" />,
                                examples: [
                                    "Hold > 100 USDC on Arbitrum Sepolia/Mainnet",
                                    "Own any amount of WETH on Base Sepolia/Mainnet",
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
                                    "User must have deployed at least 1 smart contract",
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
                                    <span className="bg-orange-500/20 text-orange-300 px-3 py-1 rounded-full text-xs font-bold">REAL-TIME</span>
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
                        <Shield className="w-6 h-6 text-blue-400" />
                        Discord Verification Setup
                    </h2>
                    <div className="bg-gradient-to-br from-blue-900/20 to-indigo-900/20 border border-blue-500/30 rounded-2xl p-8">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="bg-blue-500/20 p-3 rounded-xl">
                                <svg className="w-8 h-8 text-blue-400" viewBox="0 0 71 55" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z"/>
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-xl text-white mb-3">How to Use Discord Role Verification</h3>
                                <p className="text-zinc-300 text-sm leading-relaxed mb-4">
                                    To create quests that verify Discord roles or server membership, you need to add the <span className="font-bold text-blue-400">StylusLink Discord Bot</span> to your Discord server. This bot checks if users have specific roles or are members of your server.
                                </p>
                                
                                <div className="bg-black/40 border border-white/10 rounded-xl p-4 mb-4">
                                    <h4 className="font-bold text-sm text-blue-300 mb-2 flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4" />
                                        Setup Steps:
                                    </h4>
                                    <ol className="text-sm text-zinc-300 space-y-2 ml-5">
                                        <li>1. Add the bot to your Discord server using this invite link:
                                            <div className="mt-2 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 font-mono text-xs text-blue-300 break-all">
                                                <a href="https://discord.com/oauth2/authorize?client_id=1453312360411304029&permissions=2048&scope=bot" target="_blank" className="hover:text-blue-200 underline">
                                                    Click here to invite StylusLink Discord Bot
                                                </a>
                                            </div>
                                        </li>
                                        <li>2. Grant the bot <span className="font-bold text-blue-400">"Read Messages/View Channels"</span> permission</li>
                                        <li>3. Get your server's Guild ID from Discord Developer settings</li>
                                        <li>4. Create a quest with rules like: <span className="italic text-zinc-400">"User must be a member of Discord server with ID 123456789"</span> or <span className="italic text-zinc-400">"User must have the 'Verified' role in my Discord server, with server ID 123456789"</span></li>
                                    </ol>
                                </div>

                                <div className="bg-yellow-500/10 border-l-4 border-yellow-500 p-4 rounded-r-xl">
                                    <p className="text-xs text-yellow-200 flex items-start gap-2">
                                        <span className="text-yellow-400 font-bold">Note:</span>
                                        <span>The bot only needs basic read permissions. It will never post messages or access private channels. Users will authenticate via Discord OAuth when claiming quests.</span>
                                    </p>
                                </div>
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
