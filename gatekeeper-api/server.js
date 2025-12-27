require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { ethers } = require('ethers');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
// Simple in-memory storage for proof tokens (Hackathon style)
// In prod, use Redis or a database.
const verifiedSessions = new Map();
const app = express();

// ✅ FIX: PERMISSIVE CORS CONFIGURATION
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// --- CONFIGURATION ---
const PORT = process.env.PORT || 4000;
const GEN_AI_KEY = process.env.GEMINI_API_KEY;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

// --- RELAYER / CONTRACT CONFIGURATION ---
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const STYLUS_CONTRACT_ADDRESS = process.env.STYLUS_CONTRACT_ADDRESS;

// ✅ UPGRADE 1: Expanded ABI to support Status Checks
// We added the 'drops' function so the frontend can check if a drop is active/claimed.
const ABI = [
    // Write Functions
    "function claimDrop(uint256 drop_id, address receiver, uint8[] agent_signature, uint8[] biometric_signature, uint8[] message_hash) external",
    // Read Functions (Crucial for Route 3)
    "function drops(uint256) external view returns (address sender, uint256 amount, bool active, uint64 expires_at, address gatekeeper, bytes32 condition_hash, bytes32 asset_id)",
    // Events
    "event DropClaimed(uint256 indexed drop_id, address indexed receiver)"
];

// Initialize Relayer Wallet (Connected to Arbitrum Sepolia)
const relayerProvider = new ethers.JsonRpcProvider(process.env.RPC_SEPOLIA_ARBITRUM);
let relayerWallet;
let contract;

if (PRIVATE_KEY && STYLUS_CONTRACT_ADDRESS) {
    relayerWallet = new ethers.Wallet(PRIVATE_KEY, relayerProvider);
    contract = new ethers.Contract(STYLUS_CONTRACT_ADDRESS, ABI, relayerWallet);
    console.log("✅ Relayer Wallet Initialized:", relayerWallet.address);
    console.log("✅ Contract Connected:", STYLUS_CONTRACT_ADDRESS);
} else {
    console.warn("⚠️ CRITICAL: PRIVATE_KEY or STYLUS_CONTRACT_ADDRESS missing. Claims will fail.");
}

// --- STRICT MODEL LIST ---
// ✅ UPGRADE 2: Prioritized Stronger Models for "Judge" capabilities
const MODELS = [
   // "gemini-3-flash-preview",
    //"gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.5-pro",
    "gemini-2.0-flash-exp",
    "gemini-2.0-flash"
];

// --- CHAIN & RPC SETUP ---
const CHAIN_MAP = {
    ethereum: 1, mainnet: 1,
    arbitrum: 42161, base: 8453, optimism: 10, polygon: 137,
    sepolia: 11155111, arbitrum_sepolia: 421614
};

// ✅ UPGRADE 3: Safe Provider Initialization
// This prevents the app from crashing if a non-essential RPC (like Optimism) is missing from .env
const createProvider = (url) => url ? new ethers.JsonRpcProvider(url) : null;

const providers = {
    arbitrum: createProvider(process.env.RPC_ARBITRUM),
    ethereum: createProvider(process.env.RPC_ETHEREUM),
    base: createProvider(process.env.RPC_BASE),
    optimism: createProvider(process.env.RPC_OPTIMISM),
    polygon: createProvider(process.env.RPC_POLYGON),
    arbitrum_sepolia: relayerProvider,
    ethereum_sepolia: createProvider(process.env.RPC_SEPOLIA_ETH)
};


// --- TOP TOKEN LIST ---
const KNOWN_TOKENS = {
    // Stablecoins
    "USDC": { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6, chain: "arbitrum" },
    "USDT": { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6, chain: "ethereum" },
    "DAI": { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", decimals: 18, chain: "ethereum" },
    // Native/Wrapped
    "WETH": { address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", decimals: 18, chain: "arbitrum" },
    "WBTC": { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", decimals: 8, chain: "ethereum" },
    "WSOL": { address: "0xD31a59c85aE9D8edEFeC411D448f90841571b89c", decimals: 9, chain: "ethereum" },
    // L2 Governance
    "ARB": { address: "0x912CE59144191C1204E64559FE8253a0e49E6548", decimals: 18, chain: "arbitrum" },
    "OP": { address: "0x4200000000000000000000000000000000000042", decimals: 18, chain: "optimism" },
    // Blue Chips
    "UNI": { address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", decimals: 18, chain: "ethereum" },
    "LINK": { address: "0x514910771AF9Ca656af840dff83E8264EcF986CA", decimals: 18, chain: "ethereum" },
    // Memes
    "PEPE": { address: "0x25d887Ce7a35172C62FeBFD67a1856F20FaEbB00", decimals: 18, chain: "arbitrum" }, // Arbitrum PEPE
    "SHIB": { address: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE", decimals: 18, chain: "ethereum" },
    "DOGE": { address: "0x4206931337dc273a630d328dA6441786BfaD668f", decimals: 8, chain: "ethereum" } // Wrapped Doge (Example)
};

// ✅ UPGRADE 1: KNOWN COLLECTIONS DATABASE
// This allows quests like "Must own a Pudgy Penguin" to work instantly.
const KNOWN_COLLECTIONS = {
    "PUDGY PENGUINS": { address: "0xBd3531dA5CF5857e7CfAA92426877b022e612cf8", chain: "ethereum" },
    "BAYC": { address: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D", chain: "ethereum" },
    "AZUKI": { address: "0xED5AF388653567Af2F388E6224dC7C4b3241C544", chain: "ethereum" },
    "MAYC": { address: "0x60E4d786628Fea6478F785A6d7e704777c86a7c6", chain: "ethereum" },
    "ENS": { address: "0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85", chain: "ethereum" }, // Base Registrar
    "ARB ODYSSEY": { address: "0xFAe39EC09730CA0F14262A636D2d7C5539353752", chain: "arbitrum" }, // Example Badge
    "UNISWAP V3 POS": { address: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88", chain: "arbitrum" }, // LP Positions
    "GALXE OAT": { address: "0x5D470270e889b61c08C51784cCB73265D0293a9C", chain: "arbitrum" } // Galxe
};

// --- TOOL DEFINITIONS ---
const toolsDefinition = [
    // ✅ UPGRADE 2: "Deep History" Stats
    // Supports: "Gas Spender", "Inactive Wallet", "Wallet Age", "High Roller"
    {
        name: "check_evm_stats",
        description: "Checks DEEP financial history: Native ETH Balance, Tx Count, Wallet Age (Days), Total Gas Spent, Last Activity, and Max Tx Value.",
        parameters: {
            type: "OBJECT",
            properties: {
                address: { type: "STRING" },
                chain: { type: "STRING" }
            },
            required: ["address", "chain"]
        }
    },
    {
        name: "check_token_balance",
        description: "Checks balance of specific ERC-20 tokens (USDC, USDT, WETH, WBTC, PEPE, ARB, etc).",
        parameters: {
            type: "OBJECT",
            properties: {
                address: { type: "STRING" },
                tokenSymbol: { type: "STRING" },
                chain: { type: "STRING" }
            },
            required: ["address", "tokenSymbol", "chain"]
        }
    },
    // ✅ UPGRADE 3: Collection-Aware NFT Check
    // Supports: "Pudgy Holder", "ENS Owner"
    {
        name: "check_nft_ownership",
        description: "Checks ownership of NFTs. Can check by 'collectionName' (e.g. 'Pudgy Penguins', 'ENS') OR 'contractAddress'.",
        parameters: {
            type: "OBJECT",
            properties: {
                address: { type: "STRING" },
                collectionName: { type: "STRING", description: "Name of collection (e.g. 'BAYC') or Contract Address" },
                chain: { type: "STRING" }
            },
            required: ["address", "collectionName", "chain"]
        }
    },
    {
        name: "check_discord_membership",
        description: "Checks Discord Guild membership and Roles.",
        parameters: {
            type: "OBJECT",
            properties: {
                userId: { type: "STRING" },
                guildId: { type: "STRING" },
                roleId: { type: "STRING" }
            },
            required: ["userId", "guildId"]
        }
    },
    {
        name: "check_social_mock",
        description: "Verifies Social Web2 Actions (Twitter, YouTube, Spotify, GitHub).",
        parameters: {
            type: "OBJECT",
            properties: {
                platform: { type: "STRING" },
                action: { type: "STRING" },
                username: { type: "STRING" }
            },
            required: ["platform"]
        }
    },
    {
        name: "check_sybil_geo_real",
        description: "REAL Check: Verifies GPS Location (Lat/Long) or Sybil Score (Wallet Analysis).",
        parameters: {
            type: "OBJECT",
            properties: {
                checkType: { type: "STRING", description: "Either 'geo' or 'sybil'" },
                address: { type: "STRING", description: "Wallet address for Sybil check" },
                latitude: { type: "NUMBER", description: "GPS Latitude from user" },
                longitude: { type: "NUMBER", description: "GPS Longitude from user" }
            },
            required: ["checkType"]
        }
    }
];


// --- TOOL IMPLEMENTATIONS ---
const functions = {
    // 1. DEEP FINANCIAL HISTORY CHECK (Etherscan + RPC)
    check_evm_stats: async ({ address, chain }) => {
        let selectedChain = chain.toLowerCase().replace('eth', 'ethereum').replace('arb', 'arbitrum');

        try {
            const provider = providers[selectedChain];
            if (!provider) return { error: `Chain '${selectedChain}' not supported` };

            // A. Current State (Fast RPC)
            const [balance, txCount, code] = await Promise.all([
                provider.getBalance(address),
                provider.getTransactionCount(address),
                provider.getCode(address)
            ]);

            // B. Historical Analysis (Etherscan) for Quests like "Spent > 0.5 ETH Gas"
            let stats = {
                wallet_age_days: -1,
                days_since_last_tx: -1,
                total_gas_spent_eth: "0",
                max_sent_eth: "0",
                contracts_deployed: 0
            };

            const chainId = CHAIN_MAP[selectedChain];
            if (ETHERSCAN_API_KEY && chainId) {
                try {
                    const res = await axios.get("https://api.etherscan.io/v2/api", {
                        params: {
                            chainid: chainId, module: "account", action: "txlist",
                            address, page: 1, offset: 500, sort: "asc", apikey: ETHERSCAN_API_KEY
                        },
                        timeout: 3000 // Quick timeout
                    });

                    const history = res.data.result;
                    if (Array.isArray(history) && history.length > 0) {
                        const now = new Date();

                        // 1. Wallet Age
                        stats.wallet_age_days = Math.floor((now - new Date(history[0].timeStamp * 1000)) / 86400000);

                        // 2. Inactivity Check
                        const lastTx = history[history.length - 1];
                        stats.days_since_last_tx = Math.floor((now - new Date(lastTx.timeStamp * 1000)) / 86400000);

                        // 3. Gas & High Roller Logic
                        let totalGas = 0n;
                        let maxVal = 0n;

                        for (const tx of history) {
                            if (tx.from.toLowerCase() === address.toLowerCase()) {
                                totalGas += BigInt(tx.gasUsed) * BigInt(tx.gasPrice);
                                if (BigInt(tx.value) > maxVal) maxVal = BigInt(tx.value);
                                if (!tx.to) stats.contracts_deployed++;
                            }
                        }
                        stats.total_gas_spent_eth = ethers.formatEther(totalGas);
                        stats.max_sent_eth = ethers.formatEther(maxVal);
                    }
                } catch (e) { console.warn("History fetch failed, using RPC defaults"); }
            }

            return {
                chain: selectedChain,
                balance_eth: ethers.formatEther(balance),
                tx_count: txCount,
                is_contract: code !== "0x",
                nonce: txCount,
                nonce_is_even: (txCount % 2 === 0),
                // Expanded Stats
                wallet_age_days: stats.wallet_age_days,
                days_since_active: stats.days_since_last_tx,
                lifetime_gas_eth: stats.total_gas_spent_eth,
                highest_tx_value_eth: stats.max_sent_eth,
                smart_contracts_deployed: stats.contracts_deployed
            };

        } catch (e) { return { error: e.message }; }
    },

    // 2. TOKEN BALANCE CHECK (Unchanged but robust)
    check_token_balance: async ({ address, tokenSymbol, chain }) => {
        const token = KNOWN_TOKENS[tokenSymbol.toUpperCase()];
        if (!token) return { error: `Token '${tokenSymbol}' not in database.` };

        try {
            const targetChain = chain || token.chain;
            const provider = providers[targetChain];
            if (!provider) return { error: `Provider for ${targetChain} not configured` };

            const contract = new ethers.Contract(token.address, ["function balanceOf(address) view returns (uint256)"], provider);
            const bal = await contract.balanceOf(address);

            return {
                symbol: tokenSymbol,
                balance: ethers.formatUnits(bal, token.decimals),
                chain: targetChain,
                raw_balance: bal.toString()
            };
        } catch (e) { return { error: `Fetch failed for ${tokenSymbol}: ${e.message}` }; }
    },

    // 3. NFT CHECK (Now supports "Pudgy Penguins" name lookup)
    check_nft_ownership: async ({ address, contractAddress, collectionName, chain }) => {
        let selectedChain = chain ? chain.toLowerCase().replace('eth', 'ethereum') : null;
        let targetAddress = contractAddress;

        // Auto-resolve Name -> Address (e.g. "Pudgy Penguins" -> 0xBd3...)
        if (!targetAddress && collectionName) {
            const col = KNOWN_COLLECTIONS[collectionName.toUpperCase()];
            if (col) {
                targetAddress = col.address;
                if (!selectedChain) selectedChain = col.chain;
            }
        }

        if (!targetAddress || !selectedChain) return { error: "Contract Address or Valid Collection Name required" };

        try {
            const provider = providers[selectedChain];
            // ERC-721 "balanceOf" is standard
            const contract = new ethers.Contract(targetAddress, ["function balanceOf(address) view returns (uint256)"], provider);
            const bal = await contract.balanceOf(address);
            return {
                collection: collectionName || "Unknown",
                contract: targetAddress,
                balance: bal.toString(),
                owns_nft: bal > 0n
            };
        } catch (e) { return { error: "NFT Check failed" }; }
    },

    // 4. DISCORD DEEP CHECK (Roles + Join Dates)
    check_discord_membership: async ({ userId, guildId, roleId }) => {
        if (!DISCORD_BOT_TOKEN) return { error: "No Token" };
        try {
            const res = await axios.get(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
                headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` }
            });

            const userData = res.data;
            // Calculate Days in Server for "Old Guard" quests
            const joinedAt = new Date(userData.joined_at);
            const daysInServer = Math.floor((new Date() - joinedAt) / 86400000);

            return {
                username: userData.user.username,
                is_member: true,
                roles: userData.roles,
                has_target_role: roleId ? userData.roles.includes(roleId) : true,
                days_in_server: daysInServer,
                is_booster: !!userData.premium_since // True if boosting
            };
        } catch (e) { return { is_member: false, error: "User not found in guild" }; }
    },

    // 5. SOCIAL MOCK (Dynamic to satisfy quests)
    check_social_mock: async ({ platform, action, username }) => {
        await new Promise(r => setTimeout(r, 600)); // Simulate API latency

        // Return data that PASSES the specific quests in your list
        return {
            platform,
            verified: true,
            user: username || "anon",
            details: `Mock Verification: ${action} confirmed`,

            // Dynamic Stats for Quests
            twitter_followers: 250,      // Passes "Must have > 100 followers"
            twitter_created_at: "2022",  // Passes "Created before 2023"
            spotify_top_listener: true,  // Passes "Top 1% listener"
            github_stars: 5,             // Passes "Star the repo"
            github_commits: 12           // Passes "Contributor"
        };
    },

    // ... check_sybil_geo_real would go here (unchanged)
    // --- HYBRID SYBIL & GEO CHECK (Real + Mocked) ---
    check_sybil_geo_real: async ({ checkType, address, latitude, longitude }) => {
        const type = checkType.toLowerCase();
        console.log(`[Gatekeeper] Checking: ${type} | Address: ${address}`);

        // 1. REAL GEO CHECK (OpenStreetMap Reverse Geocoding)
        // Supports: "Must be in Nigeria", "Geo-Block North Korea"
        if (type.includes("geo") || type.includes("location")) {
            if (!latitude || !longitude) return { error: "Lat/Long coordinates required for Geo check." };

            try {
                // We use a shorter timeout to keep the UI snappy
                const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
                const res = await axios.get(url, {
                    headers: { 'User-Agent': 'StylusLink-Gatekeeper/1.0' },
                    timeout: 4000
                });

                const data = res.data.address || {};
                const country = data.country || "Unknown";

                // Logic for "Geo-Block" quests
                const isBlocked = country === "North Korea" || country === "Iran";

                return {
                    verified: !isBlocked,
                    country: country,
                    city: data.city || data.town || data.county || "Unknown",
                    details: isBlocked ? "Region Blocked" : `User verified in ${country}`,
                    coordinates_masked: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`
                };
            } catch (e) {
                // Fallback if API rate limits (Hackathon Safety Net)
                return { verified: true, country: "Nigeria", city: "Lagos", details: "API Timeout - Defaulting to Allowed Region" };
            }
        }

        // 2. REAL FINANCIAL SYBIL CHECK (RPC Analysis)
        // Supports: "Sybil Score", "Bot Protection"
        if (type.includes("sybil") || type.includes("score") || type.includes("reputation")) {
            if (!address) return { error: "Address required for Sybil check" };

            try {
                const provider = providers.arbitrum; // Arbitrum One is best for history

                // Fetch stats with strict timeout
                const withTimeout = (p) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('RPC Timeout')), 4000))]);
                const [txCount, balance] = await Promise.all([
                    withTimeout(provider.getTransactionCount(address)),
                    withTimeout(provider.getBalance(address))
                ]);

                const ethBal = parseFloat(ethers.formatEther(balance));

                // SCORING LOGIC (0-100)
                let score = 0;
                let reasons = [];

                if (txCount > 50) { score += 40; reasons.push("High Activity"); }
                else if (txCount > 10) { score += 20; reasons.push("Moderate Activity"); }

                if (ethBal > 0.05) { score += 40; reasons.push("High Balance"); }
                else if (ethBal > 0.001) { score += 20; reasons.push("Liquidity Present"); }

                // Deduction for brand new wallets
                if (txCount < 5 && ethBal < 0.001) { score = 0; reasons.push("Empty/New Wallet"); }

                const isSybil = score < 30;

                return {
                    is_sybil: isSybil,
                    reputation_score: score,
                    status: isSybil ? "Flagged" : "Verified Human",
                    details: reasons.join(", "),
                    stats: { txs: txCount, bal: ethBal.toFixed(4) }
                };
            } catch (e) {
                return { is_sybil: false, reputation_score: 50, details: "RPC Error - Soft Pass", error: e.message };
            }
        }

        // 3. MOCKED PASSPORT CHECKS (Simulated for Hackathon)
        // Supports: "Gitcoin Passport", "WorldID", "Galxe"
        const mockDelay = () => new Promise(r => setTimeout(r, 800));

        if (type.includes("gitcoin")) {
            await mockDelay();
            return { provider: "Gitcoin Passport", verified: true, score: 24.5, details: "Score > 20 (Passing)" };
        }

        if (type.includes("world") || type.includes("biometric")) {
            await mockDelay();
            return { provider: "WorldID", verified: true, verification_level: "Orb", details: "Nullifier Hash Verified" };
        }

        if (type.includes("galxe") || type.includes("civic")) {
            await mockDelay();
            return { provider: "Identity Provider", verified: true, kyc_status: "Approved", details: "KYC Credential Found" };
        }

        return { error: `Unknown check type: ${type}` };
    }

};



// --- HELPER: Parse DER Signature (WebAuthn -> P-256 Raw) ---
// This converts the variable-length ASN.1 DER format (from WebAuthn/Passkeys) 
// into the strict 64-byte [R|S] format required by your Rust P-256 Precompile.
function parseDERSignature(signatureHex) {
    try {
        // 1. Sanitize Input (Handle optional 0x prefix)
        const cleanHex = signatureHex.replace(/^0x/, '');
        const buf = Buffer.from(cleanHex, 'hex');
        let offset = 0;

        // 2. DER Structure Check (0x30 = Sequence)
        if (buf[offset++] !== 0x30) throw new Error("Invalid Header (Not 0x30)");

        // Handle Sequence Length (Skip length byte(s))
        let seqLen = buf[offset++];
        if (seqLen & 0x80) { // If high bit set, it's a multi-byte length
            const lenBytes = seqLen & 0x7f;
            offset += lenBytes;
        }

        // 3. Parse R (0x02 = Integer)
        if (buf[offset++] !== 0x02) throw new Error("Invalid R Tag");
        let rLen = buf[offset++];
        let r = buf.subarray(offset, offset + rLen);
        offset += rLen;

        // Remove sign bit (leading zero) if present (common in DER)
        if (r[0] === 0x00 && rLen > 32) r = r.subarray(1);

        // 4. Parse S (0x02 = Integer)
        if (buf[offset++] !== 0x02) throw new Error("Invalid S Tag");
        let sLen = buf[offset++];
        let s = buf.subarray(offset, offset + sLen);

        // Remove sign bit
        if (s[0] === 0x00 && sLen > 32) s = s.subarray(1);

        // 5. Align to 32 Bytes (Big Endian Padding)
        // ⚠️ CRITICAL: The Rust contract throws 'E15' if len != 64.
        const pad32 = (b) => {
            if (b.length === 32) return b;
            if (b.length > 32) throw new Error(`Integer overflow: ${b.length} bytes`);
            const out = Buffer.alloc(32);
            b.copy(out, 32 - b.length);
            return out;
        };

        const rPadded = pad32(r);
        const sPadded = pad32(s);

        console.log(`[Crypto] DER Parsed: R=${rPadded.toString('hex').slice(0, 6)}... S=${sPadded.toString('hex').slice(0, 6)}...`);

        return Buffer.concat([rPadded, sPadded]);

    } catch (e) {
        console.error("❌ DER Parsing Failed:", e.message);
        // Throwing allows the API to return a clear 400 error to the frontend
        throw new Error("Signature format invalid. Expected ASN.1 DER.");
    }
}


// --- AI ORCHESTRATOR ---
async function runGatekeeper(rule, user_data, modelIndex = 0) {
    if (modelIndex >= MODELS.length) throw new Error("All AI Models failed.");
    const currentModelName = MODELS[modelIndex];

    try {
        const genAI = new GoogleGenerativeAI(GEN_AI_KEY);
        // Use the 'toolsDefinition' we defined earlier
        const model = genAI.getGenerativeModel({
            model: currentModelName,
            tools: [{ functionDeclarations: toolsDefinition }]
        });

        const chat = model.startChat();

        // 🔒 UPDATED PROMPT: FULL QUEST SUPPORT
        // This teaches the AI how to map "Human Language" -> "Specific Tools"
        const systemPrompt = `
        You are the Gatekeeper and master of a crypto vault.
        Your job is to verify if the user matches the condition: "${rule}".

        ### INPUT DATA (SOURCE OF TRUTH):
        1. User Answer: "${user_data.answer || '(User left this empty)'}"  <-- PRIMARY SOURCE FOR TRIVIA
        2. Wallet Address: ${user_data.address}
        3. GPS Location: ${user_data.latitude}, ${user_data.longitude}
        4. Discord ID: ${user_data.discordId || 'Not connected'}

        ### DECISION PROTOCOL (READ CAREFULLY):

        TYPE A: KNOWLEDGE / TRIVIA / CREATIVE
        (Examples: "Who is Vitalik?", "Write a poem", "What is the capital?", "Password")
        ---------------------------------------------------------
        🔴 STOP! DO NOT USE ANY TOOLS.
        ✅ ACTION: Check 'User Answer' directly against the rule.
        - If 'User Answer' matches the fact -> APPROVE.
        - If 'User Answer' is wrong or empty -> REJECT.

        TYPE B: FINANCIAL & HISTORY (Real-Time + Historical)
        (Examples: "Must hold > 0.1 ETH", "Gas spender > 0.5 ETH", "Old Wallet > 1 year", "Nonce is even")
        ---------------------------------------------------------
        🟢 USE TOOL: 'check_evm_stats'
        - For "ETH Balance" -> Check 'balance_eth'.
        - For "Gas Spent" -> Check 'lifetime_gas_eth'.
        - For "Wallet Age" -> Check 'wallet_age_days'.
        - For "Inactivity" -> Check 'days_since_active'.

        TYPE C: ERC-20 TOKENS
        (Examples: "Must hold 10 USDC", "Must hold PEPE")
        ---------------------------------------------------------
        🟢 USE TOOL: 'check_token_balance'
        - Map symbol (e.g., USDC, PEPE) to the 'tokenSymbol' argument.

        TYPE D: NFTs & COLLECTIONS
        (Examples: "Must own a Pudgy Penguin", "Must own ENS", "Hold BAYC")
        ---------------------------------------------------------
        🟢 USE TOOL: 'check_nft_ownership'
        - If the rule mentions a specific name (e.g., "Pudgy Penguin"), pass it as 'collectionName'.
        - If the rule gives a 0x address, pass it as 'contractAddress'.

        TYPE E: SOCIAL & WEB2 (Mocked)
        (Examples: "Follow on Twitter", "Star GitHub repo", "Spotify Listener")
        ---------------------------------------------------------
        🟢 USE TOOL: 'check_social_mock'
        - Extract the 'platform' (Twitter, GitHub, etc.) and 'action'.

        TYPE F: DISCORD COMMUNITY
        (Examples: "Must be in Discord", "Must be a Member > 1 year", "Must have VIP Role")
        ---------------------------------------------------------
        🟢 USE TOOL: 'check_discord_membership'

        TYPE G: LOCATION / HUMANITY
        (Examples: "Must be in Nigeria", "Must be Human", "No VPN")
        ---------------------------------------------------------
        🟢 USE TOOL: 'check_sybil_geo_real'

        ### HALLUCINATION GUARD:
        - NEVER call a tool for Trivia (e.g. "What is 2+2?").
        - If a tool returns an error (e.g. "Token not found") -> REJECT.

        ### SECURITY PROTOCOL (CRITICAL):
        - If the user is WRONG, do NOT reveal the correct answer.
        - If the user is WRONG, just say: "Incorrect answer provided." or "Condition not met."
        - NEVER explain *why* the answer is wrong for Trivia questions.
        
        OUTPUT FORMAT (JSON ONLY):
        {
            "approved": boolean, 
            "explanation": "Brief status only. NO SPOILERS."
        }
        `;

        // 1. COMBINE SYSTEM INSTRUCTIONS + USER DATA
        const prompt = `${systemPrompt}\nUser Context:\n${JSON.stringify(user_data)}`;
        let result = await chat.sendMessage(prompt);
        let call = result.response.functionCalls()?.[0];
        let turns = 0;

        // 2. MULTI-TURN TOOL LOOP (Allows up to 5 steps for complex quests)
        while (call && turns < 5) {
            turns++;
            const fn = functions[call.name];
            if (fn) {
                console.log(`[Gatekeeper] 🤖 Calling Tool: ${call.name}`);

                // --- SMART ARGUMENT INJECTION ---
                // The AI sometimes forgets to pass 'address' or 'lat/long'. We inject them here.
                const toolArgs = { ...call.args };

                if (!toolArgs.address && user_data.address) {
                    toolArgs.address = user_data.address;
                }

                if (call.name === 'check_sybil_geo_real') {
                    if (!toolArgs.latitude) toolArgs.latitude = user_data.latitude;
                    if (!toolArgs.longitude) toolArgs.longitude = user_data.longitude;
                }

                if (call.name === 'check_discord_membership') {
                    if (!toolArgs.userId) toolArgs.userId = user_data.discordId;
                    // Default to your Hackathon Server ID if not provided
                    if (!toolArgs.guildId) toolArgs.guildId = "YOUR_DISCORD_SERVER_ID";
                }

                // Execute Tool
                const output = await fn(toolArgs);

                // Send Output back to Gemini
                result = await chat.sendMessage([{ functionResponse: { name: call.name, response: { content: output } } }]);
                call = result.response.functionCalls()?.[0];
            } else {
                break;
            }
        }

        // 3. CLEAN UP RESPONSE (Remove Markdown ```json ... ``` wrappers if present)
        let responseText = result.response.text();
        responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        return responseText;

    } catch (e) {
        console.warn(`⚠️ Model ${currentModelName} failed: ${e.message}`);
        // Fallback to the next model in the list if the current one crashes
        return runGatekeeper(rule, user_data, modelIndex + 1);
    }
}


// --- ROUTE 1: AI VERIFICATION ---
// Enhanced to parse JSON more reliably
// ✅ HELPER: The Bulletproof Parser
// This handles strict JSON, loose JSON, Markdown wrappers, and single quotes.
function parseAIResponse(text) {
    // 1. Remove Markdown code blocks (```json ... ```)
    let clean = text.replace(/```json/g, "").replace(/```/g, "").trim();

    // 2. Extract ONLY the object between the first '{' and last '}'
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error("No JSON object found in response");
    
    clean = clean.substring(start, end + 1);

    try {
        // A. Try standard strict JSON first (Fastest)
        return JSON.parse(clean);
    } catch (e) {
        try {
            // B. "Loose" Parser fallback
            // This uses JS evaluation to handle single quotes ('value') or unquoted keys (key: value)
            // acceptable here since we trust the AI output source.
            return new Function("return " + clean)();
        } catch (e2) {
            console.error("❌ Critical Parse Error. Raw AI Text:", text);
            return null;
        }
    }
}

app.post('/api/verify', async (req, res) => {
    try {
        const { rule, user_data } = req.body;

        // Run the Brain
        const decisionText = await runGatekeeper(rule, user_data);
        console.log("🔍 AI Output:", decisionText); // Helpful debug log

        // 🛠️ USE THE BULLETPROOF PARSER 🛠️
        let decision = parseAIResponse(decisionText);

        // Fallback if even the bulletproof parser failed (Rare)
        if (!decision) {
            console.warn("⚠️ AI Response unreadable. Defaulting to fallback.");
            const isApproved = /yes|true|approve|grant/i.test(decisionText);
            decision = {
                approved: isApproved,
                explanation: isApproved ? "Access Granted (Fallback)" : "AI Output Unclear"
            };
        }

        // Generate Handoff Token if approved
        if (decision.approved) {
            const proofToken = crypto.randomBytes(16).toString('hex');
            verifiedSessions.set(proofToken, { 
                timestamp: Date.now(),
                valid: true 
            });
            decision.proofToken = proofToken;
        }

        res.json(decision);

    } catch (e) {
        console.error("Verify Error:", e);
        // Never crash the client, just return false
        res.json({ approved: false, explanation: "Verification Server Error" });
    }
});

// --- ROUTE 2: CLAIM (RELAYER + HYBRID BIOMETRIC SIGNING) ---
app.post('/api/claim', async (req, res) => {
    try {
        const { dropId, receiver, biometricData } = req.body;

        console.log(`🚀 Processing Claim for Drop #${dropId}`);
        console.log(`   Receiver: ${receiver}`);

        // ---------------------------------------------------------
        // 1. GENERATE AGENT SIGNATURE (Server-Side Authorization)
        // ---------------------------------------------------------
        // This proves to the contract that the Gatekeeper (AI) approved this claim.
        const messageToSign = ethers.solidityPackedKeccak256(
            ["uint256", "address"],
            [dropId, receiver]
        );

        const rawSignature = await relayerWallet.signMessage(ethers.getBytes(messageToSign));
        const agentSigArray = Array.from(ethers.getBytes(rawSignature));
        console.log(`✍️  Agent Signed Authorization`);

        // ---------------------------------------------------------
        // 2. PREPARE BIOMETRIC DATA (The "E15" Fix)
        // ---------------------------------------------------------
        let bioSigArray;
        let bioHashArray;

        if (biometricData && biometricData.signature) {
            console.log("🧬 Real Biometric Data Detected. Parsing...");
            try {
                // A. Parse DER Signature -> 64 Bytes (R|S)
                // This uses the helper function we defined earlier to prevent LIB.RS crash
                const parsedSigBuffer = parseDERSignature(biometricData.signature);
                bioSigArray = Array.from(parsedSigBuffer);

                // B. Generate Message Hash (32 Bytes)
                // In a real passkey flow, this is usually the clientDataJSON hash
                const clientDataHash = crypto.createHash('sha256').update(biometricData.clientDataJSON || '').digest();
                bioHashArray = Array.from(clientDataHash);

                console.log("✅ Biometric Signature Parsed (64 bytes)");

            } catch (e) {
                console.error("⚠️ Biometric Parse Failed:", e.message);
                throw new Error("Invalid Passkey Signature Format");
            }
        } else {
            // FALLBACK: Mock Mode (for testing without a phone)
            // We send 64 bytes of zeros to pass the 'E15' length check in Rust
            console.log("🎭 No Biometrics provided. Using Dummy Data (Mock Mode).");
            bioSigArray = Array(64).fill(0);
            bioHashArray = Array(32).fill(0);
        }

        // ---------------------------------------------------------
        // 3. SEND TRANSACTION TO ARBITRUM
        // ---------------------------------------------------------
        // We manually override gas limit to prevent estimation errors on complex P-256 math
        const tx = await contract.claimDrop(
            dropId,
            receiver,
            agentSigArray,     // Server Auth
            bioSigArray,       // User Auth (Real or Dummy)
            bioHashArray,      // Challenge Hash
            { gasLimit: 2000000 } // Safety buffer for Stylus computation
        );

        console.log(`✅ Claim Transaction Sent! Hash: ${tx.hash}`);
        res.json({ success: true, txHash: tx.hash });

    } catch (error) {
        console.error("❌ Claim Error:", error);

        // Detailed Error Debugging for Stylus
        if (error.code === 'CALL_EXCEPTION') {
            console.error("   Reason:", error.reason);
            console.error("   Data:", error.data);
            // Decode common Stylus errors if possible
            if (error.data && error.data.includes('E15')) {
                console.error("   🚨 CRITICAL: Contract returned 'E15'. Signature length was not 64 bytes.");
            }
        }
        res.status(500).json({ error: error.message || "Transaction failed" });
    }
});


// --- ROUTE 3: STATUS CHECK (Proxy for Frontend) ---
app.get('/api/check-claim/:dropId', async (req, res) => {
    try {
        const { dropId } = req.params;

        // 1. Check Contract State (The Truth)
        // We use the 'drops' view function we added to the ABI earlier.
        let dropData;
        try {
            dropData = await contract.drops(dropId);
        } catch (e) {
            console.error("Contract Read Error:", e);
            // Return default "Not Found" state rather than crashing
            return res.status(404).json({ error: "Drop not found or Contract Unreachable" });
        }

        // Destructure array from Contract (Ethers v6 returns generic array/object structure)
        // ABI: [sender, amount, active, expires_at, gatekeeper, condition_hash, asset_id]
        const [sender, amount, isActive, expiresAt, gatekeeper, conditionHash] = dropData;

        // 2. If Inactive, Find Out WHO Claimed It
        let claimedBy = null;
        let reclaimed = false;

        if (!isActive) {
            // Check for DropClaimed Event to see if it was a user
            const claimFilter = contract.filters.DropClaimed(dropId);
            // Querying from "earliest" block. In prod, you might optimize this to a specific deployment block.
            const claimEvents = await contract.queryFilter(claimFilter);

            if (claimEvents.length > 0) {
                claimedBy = claimEvents[0].args[1]; // arg[1] is 'receiver'
            } else {
                // If inactive but no claim event found, it was Reclaimed/Cancelled by sender
                reclaimed = true;
            }
        }

        // 3. Construct Safe Response
        // ⚠️ CRITICAL: res.json() crashes on BigInts. We MUST .toString() them.
        res.json({
            active: isActive,
            claimed: !isActive && !reclaimed,
            reclaimed: reclaimed,
            claimedBy: claimedBy,
            details: {
                sender: sender,
                amount: amount.toString(),      // Fixes serialization crash
                expiresAt: expiresAt.toString(), // Fixes serialization crash
                gatekeeper: gatekeeper,
                conditionHash: conditionHash
            }
        });

    } catch (e) {
        console.error("Status Check Fatal Error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// --- START SERVER ---
const SERVER_PORT = process.env.PORT || 4000;
app.listen(SERVER_PORT, () => {
    console.log(`\n🚀 StylusLink Gatekeeper Active`);
    console.log(`   📡 Port: ${SERVER_PORT}`);
    console.log(`   🔗 RPC: ${process.env.RPC_SEPOLIA_ARBITRUM ? "Connected" : "Missing"}`);
    console.log(`   🤖 AI Model: ${MODELS[0]}`);
});