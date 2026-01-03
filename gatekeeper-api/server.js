require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { ethers } = require('ethers');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
const verifiedSessions = new Map();
const app = express();
const ALLOWED_ORIGINS = [
    'https://stylus-link.vercel.app',
    'http://localhost:3001',
    'http://localhost:3000'
];

app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (!origin || origin.includes('vercel.app') || origin.includes('localhost')) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
});

app.use(express.json());

const PORT = process.env.PORT || 4000;
// Load multiple Gemini API keys (fallback system)
const GEN_AI_KEYS = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3
].filter(key => key && key.trim() !== ''); // Filter out empty keys

console.log(`[Gatekeeper] Loaded ${GEN_AI_KEYS.length} Gemini API key(s)`);

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const STYLUS_CONTRACT_ADDRESS = process.env.STYLUS_CONTRACT_ADDRESS;
const ABI = [
    "function claimDrop(uint256 drop_id, address receiver, uint8[] agent_signature, uint8[] biometric_signature, uint8[] message_hash) external",
    "function drops(uint256) external view returns (address sender, uint256 amount, bool active, uint64 expires_at, address gatekeeper, bytes signer_pub_key_x, bytes signer_pub_key_y)",
    "event DropClaimed(uint256 indexed drop_id, address indexed receiver)"
];

const relayerProvider = new ethers.JsonRpcProvider(process.env.RPC_SEPOLIA_ARBITRUM);
let relayerWallet;
let contract;

if (PRIVATE_KEY && STYLUS_CONTRACT_ADDRESS) {
    relayerWallet = new ethers.Wallet(PRIVATE_KEY, relayerProvider);
    contract = new ethers.Contract(STYLUS_CONTRACT_ADDRESS, ABI, relayerWallet);
    console.log("Relayer Wallet Initialized:", relayerWallet.address);
    console.log("Contract Connected:", STYLUS_CONTRACT_ADDRESS);
} else {
    console.warn("CRITICAL: PRIVATE_KEY or STYLUS_CONTRACT_ADDRESS missing. Claims will fail.");
}

const MODELS = [
   "gemini-2.0-flash",
   "gemini-2.0-flash-exp",
   "gemini-2.5-flash-lite",
   "gemini-2.5-flash",
   "gemini-3-flash-preview"

];

const CHAIN_MAP = {
    ethereum: 1, mainnet: 1,
    arbitrum: 42161, base: 8453, optimism: 10, polygon: 137,
    sepolia: 11155111, arbitrum_sepolia: 421614
};

const createProvider = (url) => url ? new ethers.JsonRpcProvider(url) : null;

const providers = {
    ethereum: createProvider(process.env.RPC_ETHEREUM),
    ethereum_sepolia: createProvider(process.env.RPC_SEPOLIA_ETH),

    arbitrum: createProvider(process.env.RPC_ARBITRUM),
    arbitrum_sepolia: createProvider(process.env.RPC_SEPOLIA_ARBITRUM),
    //arbitrum_sepolia: relayerProvider, // Already connected via relayer

    base: createProvider(process.env.RPC_BASE),
    base_sepolia: createProvider(process.env.RPC_SEPOLIA_BASE), 

    optimism: createProvider(process.env.RPC_OPTIMISM),
    optimism_sepolia: createProvider(process.env.RPC_SEPOLIA_OPTIMISM),

    polygon: createProvider(process.env.RPC_POLYGON),
    polygon_amoy: createProvider(process.env.RPC_AMOY_POLYGON)
};


const KNOWN_TOKENS = {
    "USDC": {
        decimals: 6, chain: "arbitrum",
        address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        addresses: {
            arbitrum: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
            arbitrum_sepolia: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
            base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            base_sepolia: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
            optimism: "0x0b2C630C530732FEa45460Cd35C474f865234e9A",
            optimism_sepolia: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
            polygon: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
            polygon_amoy: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
            ethereum: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            ethereum_sepolia: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
        }
    },
    "USDT": {
        decimals: 6, chain: "ethereum",
        address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        addresses: {
            ethereum_sepolia: "0x7169d38820dfd117c3fa1f22a697dba58d90ba06",
            arbitrum_sepolia: "0x30fa2fbe15c1eadfbef28c188b7b8dbd3c1ff2eb",
            base_sepolia: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
            optimism_sepolia: "0xB9467B24117FD79D56F396ADC3cCDB695D905ae4",
            polygon_amoy: "0x28c02587ecb9e4b6ca3dd4d73f5567069ae01601"
        }
    },
    "DAI": {
        decimals: 18, chain: "ethereum",
        address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
        addresses: {
            ethereum_sepolia: "0x776b6fc2ed15d6bb5fc32e0c89de68683118c62a",
            arbitrum_sepolia: "0xb62E7317d620FB112E147FeA8132c877B62e2490",
            base_sepolia: "0x50c5725949a6f0c72e6c4a641f24049a917db0cb",
            optimism_sepolia: "0x68194a729c2450ad26072b3d33adacbcef39d574",
            polygon_amoy: "0x2ef1c802355c500a3493f2db8cb9c24af12c42b0"
        }
    },
    "EURC": {
        decimals: 6, chain: "ethereum",
        address: "0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c", 
        addresses: {
            ethereum_sepolia: "0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4",
            base_sepolia: "0x808456652fdb597867f38412077A9182d42431c8"
        }
    },
    "GHO": {
        decimals: 18, chain: "ethereum",
        address: "0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f",
        addresses: { ethereum_sepolia: "0xc4bF5CbDaBE595361438F8c6a187bDc330539c60" }
    },
    "LUSD": {
        decimals: 18, chain: "optimism",
        addresses: { optimism_sepolia: "0xdec90295c5243450974da3868f70691535492822" }
    },
    "WETH": {
        decimals: 18, chain: "arbitrum",
        address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
        addresses: {
            arbitrum: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
            arbitrum_sepolia: "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73",
            base: "0x4200000000000000000000000000000000000006",
            base_sepolia: "0x4200000000000000000000000000000000000006",
            optimism: "0x4200000000000000000000000000000000000006",
            optimism_sepolia: "0x4200000000000000000000000000000000000006",
            polygon_amoy: "0x700dDE29De87ed2c01c27C896dc8Badb4f671302",
            ethereum_sepolia: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14"
        },
        "WBTC": {
            decimals: 8, chain: "ethereum",
            address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
            addresses: {
                ethereum_sepolia: "0x92f3b59a79bff5dc60c0d59ea13a44d082b2bdfc",
                arbitrum_sepolia: "0x7de5bffc5370d93b974b67bab4492a9e13b8b3c1",
                base_sepolia: "0x0555E30da8f98308EdB960aa94C0Db47230d2B9c",
                optimism_sepolia: "0x8E9066978411d3106886e33e9d486F5831E47C2d",
                polygon_amoy: "0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf"
            }
        },
        "CBETH": {
            decimals: 18, chain: "base",
            addresses: { base_sepolia: "0x2ae3f1ec7f1f5012cfeab0185bfc7aa3cf0dec22" }
        },

        "LINK": {
            decimals: 18, chain: "ethereum",
            address: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
            addresses: {
                ethereum_sepolia: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
                arbitrum_sepolia: "0xb1D4538B4571d411F07960EF2838Ce337FE1E80E",
                base_sepolia: "0xa8c6da47368db76b8c272ff3a738f4e22b8c4917",
                optimism_sepolia: "0xE4aB69C077896252FAFBD49EFD26B5D171A32410",
                polygon_amoy: "0x0Fd9e8d3aF1aaee056EB9e802c3A762a667b1904"
            }
        },
        "UNI": {
            decimals: 18, chain: "ethereum",
            address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
            addresses: {
                ethereum_sepolia: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
                arbitrum_sepolia: "0xfa7f8980b0f1e64a2062791cc3b0871572f1f7f0",
                base_sepolia: "0x74f4b0101a7b9704ad59843a11778af91e7942aa",
                optimism_sepolia: "0x64582136a88d1c949b67bb69fcb33c6073254245",
                polygon_amoy: "0x401906cbfB0db46545c49986145Eb5373763ec77"
            }
        },
        "AAVE": {
            decimals: 18, chain: "ethereum",
            address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
            addresses: {
                ethereum_sepolia: "0x5bb220afc6e2e008cb2302a83536a019ed245aa2",
                arbitrum_sepolia: "0xba5ddd1f9d7f570dc94a51479a000e3bce967196",
                base_sepolia: "0x4e65fe4dba92790696d040ac24aa414708f5c0ab",
                polygon_amoy: "0x4BDf0193aF01dF6b6Ff14A97eECE42071575d706"
            }
        },
        "COMP": {
            decimals: 18, chain: "ethereum",
            addresses: { base_sepolia: "0x03ebb3f62ff52dcf4fecf2de91875c0fd3a7ab6a" }
        },

        "ARB": {
            address: "0x912CE59144191C1204E64559FE8253a0e49E6548", chain: "arbitrum", decimals: 18,
            addresses: { arbitrum_sepolia: "0xc275B23C035a9d4EC8867b47f55427E0bDCe14cB" }
        },
        "OP": {
            address: "0x4200000000000000000000000000000000000042", chain: "optimism", decimals: 18,
            addresses: { optimism_sepolia: "0x4ba3a5ab2ec0c9c45f153374fbcb05a1526c4a01" }
        },
        "GMX": {
            decimals: 18, chain: "arbitrum",
            addresses: { arbitrum_sepolia: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a" }
        },
        "RDNT": {
            decimals: 18, chain: "arbitrum",
            addresses: { arbitrum_sepolia: "0xb1f77a877d46696f9fe88ef6a274969a3004dee4" }
        },
        "SNX": {
            decimals: 18, chain: "optimism",
            addresses: { optimism_sepolia: "0x8700daec35af8ff88c16bdf0418774cb3d7599b4" }
        },
        "VELO": {
            decimals: 18, chain: "optimism",
            addresses: { optimism_sepolia: "0x9560e827af36c94d2ac33a39bce1fe78631088db" }
        },
        "POL": {
            decimals: 18, chain: "polygon",
            addresses: { polygon_amoy: "0x0000000000000000000000000000000000001010" }
        },
        "CRV": {
            decimals: 18, chain: "ethereum",
            addresses: { polygon_amoy: "0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0" }
        },
        "QUICK": {
            decimals: 18, chain: "polygon",
            addresses: { polygon_amoy: "0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582" }
        },

        "PEPE": { address: "0x25d887Ce7a35172C62FeBFD67a1856F20FaEbB00", decimals: 18, chain: "arbitrum" },
        "SHIB": { address: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE", decimals: 18, chain: "ethereum" }
    }
};

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

const toolsDefinition = [

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
    {
        name: "check_nft_ownership",
        description: "Checks ownership of NFTs. For KNOWN collections (Pudgy Penguins, BAYC, ENS, etc.), ONLY provide 'collectionName' - the system automatically uses the correct mainnet chain. For custom/unknown NFTs, provide both 'contractAddress' and 'chain'.",
        parameters: {
            type: "OBJECT",
            properties: {
                address: { type: "STRING", description: "User's wallet address to check" },
                collectionName: { type: "STRING", description: "Name of known collection (e.g. 'BAYC', 'Pudgy Penguins'). Do NOT provide 'chain' if using this." },
                contractAddress: { type: "STRING", description: "Contract address for custom NFTs (requires 'chain' parameter)" },
                chain: { type: "STRING", description: "Only use with 'contractAddress' OR if rule explicitly mentions a testnet (e.g., 'on Sepolia')" }
            },
            required: ["address"]
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
    },
    {
        name: "check_time_timezone",
        description: "Checks current local time and date for a specific location using GPS coordinates or city name. Use this for time-based requirements like 'after 7:50PM', 'before midnight', 'between 9AM-5PM', or verifying timezone for specific cities like Abuja.",
        parameters: {
            type: "OBJECT",
            properties: {
                latitude: { type: "NUMBER", description: "GPS Latitude from user" },
                longitude: { type: "NUMBER", description: "GPS Longitude from user" },
                cityName: { type: "STRING", description: "City name (e.g., 'Lagos') - optional if lat/long provided" }
            },
            required: []
        }
    }
];

function resolveChainAlias(input) {
    if (!input) return 'ethereum'; // Default to Mainnet if empty
    const s = input.toLowerCase();

    if (s.includes('sepolia') || s.includes('testnet')) {
        if (s.includes('arb')) return 'arbitrum_sepolia';
        if (s.includes('op') || s.includes('optimism')) return 'optimism_sepolia';
        if (s.includes('base')) return 'base_sepolia';
        if (s.includes('poly') || s.includes('matic')) return 'polygon_amoy';
        return 'ethereum_sepolia';
    }

    if (s.includes('arb')) return 'arbitrum';
    if (s.includes('op') || s.includes('optimism')) return 'optimism';
    if (s.includes('base')) return 'base';
    if (s.includes('poly') || s.includes('matic')) return 'polygon';
    if (s.includes('bsc') || s.includes('binance')) return 'bsc';
    return 'ethereum';
}


const functions = {
    check_evm_stats: async ({ address, chain }) => {
        const selectedChain = resolveChainAlias(chain);

        try {
            const provider = providers[selectedChain];
            if (!provider) return { error: `Chain '${selectedChain}' not supported` };
            const [balance, txCount, code] = await Promise.all([
                provider.getBalance(address),
                provider.getTransactionCount(address),
                provider.getCode(address)
            ]);

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
                wallet_age_days: stats.wallet_age_days,
                days_since_active: stats.days_since_last_tx,
                lifetime_gas_eth: stats.total_gas_spent_eth,
                highest_tx_value_eth: stats.max_sent_eth,
                smart_contracts_deployed: stats.contracts_deployed
            };

        } catch (e) { return { error: e.message }; }
    },

    check_token_balance: async ({ address, tokenSymbol, chain }) => {
        if (tokenSymbol.toUpperCase() === 'ETH' || tokenSymbol.toUpperCase() === 'WETH') {
            const stats = await functions.check_evm_stats({ address, chain });
            return { symbol: "ETH", balance: stats.balance_eth, chain: stats.chain, raw_data: stats };
        }

        const token = KNOWN_TOKENS[tokenSymbol.toUpperCase()];
        if (!token) return { error: `Token '${tokenSymbol}' not in database.` };

        try {
            const targetChain = chain ? resolveChainAlias(chain) : token.chain;

            let targetAddress = token.address; // Default

            if (token.addresses && token.addresses[targetChain]) {
                targetAddress = token.addresses[targetChain];
            }
            else if (targetChain !== token.chain) {
                return { error: "Token Not Supported on Chain", details: `No contract for ${tokenSymbol} on ${targetChain}.` };
            }

            const provider = providers[targetChain];
            if (!provider) return { error: `Provider for ${targetChain} not configured` };

            // Safety Check
            const code = await provider.getCode(targetAddress);
            if (code === "0x") return { error: "Contract not found", details: `No contract at ${targetAddress} on ${targetChain}` };

            const contract = new ethers.Contract(targetAddress, ["function balanceOf(address) view returns (uint256)"], provider);
            const bal = await contract.balanceOf(address);

            return {
                symbol: tokenSymbol,
                balance: ethers.formatUnits(bal, token.decimals),
                chain: targetChain,
                contract: targetAddress
            };
        } catch (e) { return { error: `Fetch failed for ${tokenSymbol}: ${e.message}` }; }
    },

    check_nft_ownership: async ({ address, contractAddress, collectionName, chain }) => {

        let selectedChain = null;
        let targetAddress = null;

        if (collectionName) {
            const col = KNOWN_COLLECTIONS[collectionName.toUpperCase()];
            if (col) {
                targetAddress = col.address;
                selectedChain = resolveChainAlias(col.chain);
                console.log(`[NFT Check] Known collection "${collectionName}" found - using ${selectedChain} (mainnet) with address ${targetAddress}`);
            } else {
                selectedChain = chain ? resolveChainAlias(chain) : null;
                targetAddress = contractAddress;
                console.log(`[NFT Check] Unknown collection "${collectionName}" - using provided chain: ${selectedChain || 'none'}`);
            }
        } else {
            targetAddress = contractAddress;
            selectedChain = chain ? resolveChainAlias(chain) : null;
        }

        if (!targetAddress || !selectedChain) {
            return { 
                error: "Contract Address or Valid Collection Name required",
                note: "For known collections (Pudgy Penguins, BAYC, etc.), only provide collectionName. For custom NFTs, provide contractAddress + chain."
            };
        }

        try {
            const provider = providers[selectedChain];
            if (!provider) {
                console.warn(`[NFT Check] Provider for ${selectedChain} not configured. Assuming user does NOT own NFT.`);
                return {
                    collection: collectionName || "Unknown",
                    contract: targetAddress,
                    balance: "0",
                    owns_nft: false,
                    chain: selectedChain,
                    note: "Provider not configured - assuming no NFT ownership"
                };
            }

            const contract = new ethers.Contract(targetAddress, ["function balanceOf(address) view returns (uint256)"], provider);
            const bal = await contract.balanceOf(address);

            return {
                collection: collectionName || "Unknown",
                contract: targetAddress,
                balance: bal.toString(),
                owns_nft: bal > 0n,
                chain: selectedChain
            };
        } catch (e) {
            console.error(`[NFT Check] Error checking ${collectionName} on ${selectedChain}:`, e.message);
            return { 
                collection: collectionName || "Unknown",
                contract: targetAddress,
                balance: "0",
                owns_nft: false,
                chain: selectedChain,
                error: "NFT Check failed - assuming no ownership",
                details: e.message 
            };
        }
    },

    check_discord_membership: async ({ userId, guildId, roleId }) => {
        if (!DISCORD_BOT_TOKEN) return { error: "No Token" };
        try {
            const res = await axios.get(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
                headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` }
            });

            const userData = res.data;
            const joinedAt = new Date(userData.joined_at);
            const daysInServer = Math.floor((new Date() - joinedAt) / 86400000);

            return {
                username: userData.user.username,
                is_member: true,
                roles: userData.roles,
                has_target_role: roleId ? userData.roles.includes(roleId) : true,
                days_in_server: daysInServer,
                is_booster: !!userData.premium_since
            };
        } catch (e) { return { is_member: false, error: "User not found in guild" }; }
    },

    check_social_mock: async ({ platform, action, username }) => {
        await new Promise(r => setTimeout(r, 600));

        return {
            platform,
            verified: true,
            user: username || "anon",
            details: `Mock Verification: ${action} confirmed`,
            twitter_followers: 250,      
            twitter_created_at: "2022",  
            spotify_top_listener: true,  
            github_stars: 5,            
            github_commits: 12           
        };
    },

    check_sybil_geo_real: async ({ checkType, address, latitude, longitude }) => {
        const type = checkType.toLowerCase();
        console.log(`[Gatekeeper] Checking: ${type} | Address: ${address}`);

        if (type.includes("geo") || type.includes("location")) {
            if (!latitude || !longitude) return { error: "Lat/Long coordinates required for Geo check." };

            try {
                const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
                const res = await axios.get(url, {
                    headers: { 'User-Agent': 'StylusLink-Gatekeeper/1.0' },
                    timeout: 4000
                });

                const data = res.data.address || {};
                const country = data.country || "Unknown";
                const isBlocked = country === "North Korea" || country === "Iran";

                return {
                    verified: !isBlocked,
                    country: country,
                    city: data.city || data.town || data.county || "Unknown",
                    details: isBlocked ? "Region Blocked" : `User verified in ${country}`,
                    coordinates_masked: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`
                };
            } catch (e) {
                // Fallback if API rate limits
                return { verified: true, country: "Nigeria", city: "Lagos", details: "API Timeout - Defaulting to Allowed Region" };
            }
        }

        if (type.includes("sybil") || type.includes("score") || type.includes("reputation")) {
            if (!address) return { error: "Address required for Sybil check" };

            try {
                const provider = providers.arbitrum;
                const withTimeout = (p) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('RPC Timeout')), 4000))]);
                const [txCount, balance] = await Promise.all([
                    withTimeout(provider.getTransactionCount(address)),
                    withTimeout(provider.getBalance(address))
                ]);

                const ethBal = parseFloat(ethers.formatEther(balance));
                let score = 0;
                let reasons = [];

                if (txCount > 50) { score += 40; reasons.push("High Activity"); }
                else if (txCount > 10) { score += 20; reasons.push("Moderate Activity"); }

                if (ethBal > 0.05) { score += 40; reasons.push("High Balance"); }
                else if (ethBal > 0.001) { score += 20; reasons.push("Liquidity Present"); }

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
    },

    check_time_timezone: async ({ latitude, longitude, cityName }) => {
        console.log(`[Gatekeeper] Checking Time & Timezone | Lat: ${latitude}, Lon: ${longitude}, City: ${cityName}`);

        const COUNTRY_TIMEZONE_MAP = {
            'Nigeria': { offset: 1, name: 'WAT', fullName: 'West Africa Time' },
            'Ghana': { offset: 0, name: 'GMT', fullName: 'Greenwich Mean Time' },
            'South Africa': { offset: 2, name: 'SAST', fullName: 'South Africa Standard Time' },
            'Kenya': { offset: 3, name: 'EAT', fullName: 'East Africa Time' },
            'Egypt': { offset: 2, name: 'EET', fullName: 'Eastern European Time' },
            'Morocco': { offset: 1, name: 'WEST', fullName: 'Western European Summer Time' },
            'United Kingdom': { offset: 0, name: 'GMT', fullName: 'Greenwich Mean Time' },
            'United States': { offset: -5, name: 'EST', fullName: 'Eastern Standard Time' }, 
            'India': { offset: 5.5, name: 'IST', fullName: 'India Standard Time' },
            'China': { offset: 8, name: 'CST', fullName: 'China Standard Time' },
            'Japan': { offset: 9, name: 'JST', fullName: 'Japan Standard Time' },
            'Australia': { offset: 10, name: 'AEST', fullName: 'Australian Eastern Standard Time' },
            'Indonesia': { offset: 7, name: 'WIB', fullName: 'Western Indonesia Time' }, 
            'Brazil': { offset: -3, name: 'BRT', fullName: 'Brasília Time' },
            'Mexico': { offset: -6, name: 'CST', fullName: 'Central Standard Time' }, 
            'Philippines': { offset: 8, name: 'PST', fullName: 'Philippine Standard Time' },
            'Turkey': { offset: 3, name: 'TRT', fullName: 'Turkey Time' },
            'Thailand': { offset: 7, name: 'ICT', fullName: 'Indochina Time' },
            'Vietnam': { offset: 7, name: 'ICT', fullName: 'Indochina Time' }
        };
        
        try {
            let lat = latitude;
            let lon = longitude;
            
            // If no coordinates but city name provided, geocode it first
            if (!lat && !lon && cityName) {
                const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}`;
                const geoRes = await axios.get(geocodeUrl, {
                    headers: { 'User-Agent': 'StylusLink-Gatekeeper/1.0' },
                    timeout: 4000
                });
                
                if (geoRes.data && geoRes.data[0]) {
                    lat = parseFloat(geoRes.data[0].lat);
                    lon = parseFloat(geoRes.data[0].lon);
                    console.log(`[Geocoded] ${cityName} -> Lat: ${lat}, Lon: ${lon}`);
                } else {
                    return { error: `Could not find coordinates for city: ${cityName}` };
                }
            }
            
            if (!lat || !lon) {
                return { error: "Latitude and Longitude required for time check" };
            }
            
            // Get location info first (needed for fallback timezone detection)
            const locationUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
            const locationRes = await axios.get(locationUrl, { 
                headers: { 'User-Agent': 'StylusLink-Gatekeeper/1.0' },
                timeout: 4000 
            }).catch(e => null);
            
            let locationData = {};
            let country = null;
            
            if (locationRes && locationRes.data) {
                const addr = locationRes.data.address || {};
                country = addr.country;
                locationData = {
                    city: addr.city || addr.town || addr.village || "Unknown",
                    state: addr.state || addr.province || "",
                    country: country || "Unknown",
                    display_name: locationRes.data.display_name
                };
            }
            
            let timeData = {};
            let apiSuccess = false;
            
            if (!apiSuccess) {
                try {
                    const worldTimeUrl = `http://worldtimeapi.org/api/timezone/Etc/UTC`;
                    const worldTimeRes = await axios.get(worldTimeUrl, { timeout: 3000 });
                    
                    if (worldTimeRes && worldTimeRes.data) {
                        // We have UTC time, now need to determine local offset
                        let utcOffset = 0;
                        let timezoneName = 'UTC';
                        let tzSource = 'geographic_calculation';
                        
                        // Use country-based timezone if available
                        if (country && COUNTRY_TIMEZONE_MAP[country]) {
                            const tzInfo = COUNTRY_TIMEZONE_MAP[country];
                            utcOffset = tzInfo.offset;
                            timezoneName = tzInfo.name;
                            tzSource = 'country_mapping';
                            console.log(`[Timezone] Using ${country} mapping: ${timezoneName} (UTC${utcOffset >= 0 ? '+' : ''}${utcOffset})`);
                        } else {
                            if (lat >= 3 && lat <= 14 && lon >= 3 && lon <= 15) {
                                utcOffset = 1;
                                timezoneName = 'WAT';
                                tzSource = 'geographic_region';
                            } else if (lat >= -5 && lat <= 5 && lon >= -20 && lon <= 20) {
                                // Central Africa
                                if (lon < 7) {
                                    utcOffset = 0; // GMT
                                    timezoneName = 'GMT';
                                } else {
                                    utcOffset = 1; // WAT
                                    timezoneName = 'WAT';
                                }
                                tzSource = 'geographic_region';
                            } else {
                                // Fallback to longitude-based (15° per hour)
                                utcOffset = Math.round(lon / 15);
                                timezoneName = `UTC${utcOffset >= 0 ? '+' : ''}${utcOffset}`;
                                tzSource = 'longitude_estimate';
                            }
                        }
                        
                        const utcTime = new Date(worldTimeRes.data.datetime);
                        const localTime = new Date(utcTime.getTime() + utcOffset * 60 * 60 * 1000);
                        
                        timeData = {
                            timezone: timezoneName,
                            current_time: localTime.toISOString(),
                            current_date: localTime.toISOString().split('T')[0],
                            utc_offset: `UTC${utcOffset >= 0 ? '+' : ''}${utcOffset}`,
                            is_dst: false,
                            timezone_source: tzSource
                        };
                        apiSuccess = true;
                        console.log(`[WorldTimeAPI] Success!`);
                    }
                } catch (worldTimeErr) {
                    console.log(`[WorldTimeAPI] Failed: ${worldTimeErr.message}`);
                }
            }

            if (!apiSuccess) {
                try {
                    const timezoneUrl = `https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lon}`;
                    const timezoneRes = await axios.get(timezoneUrl, { timeout: 3000 });
                    
                    if (timezoneRes && timezoneRes.data) {
                        const data = timezoneRes.data;
                        timeData = {
                            timezone: data.timeZone,
                            current_time: data.currentLocalTime,
                            current_date: data.currentUtcOffset?.seconds ? new Date(Date.now() + data.currentUtcOffset.seconds * 1000).toISOString().split('T')[0] : null,
                            utc_offset: data.currentUtcOffset?.label || data.currentUtcOffset,
                            is_dst: data.dstActive || false,
                            timezone_source: 'timeapi.io'
                        };
                        apiSuccess = true;
                        console.log(`[TimeAPI.io] Success!`);
                    }
                } catch (timeApiErr) {
                    console.log(`[TimeAPI.io] Failed: ${timeApiErr.message}`);
                }
            }
            
            if (!apiSuccess) {
                try {
                    const timezoneDbUrl = `http://api.timezonedb.com/v2.1/get-time-zone?key=demo&format=json&by=position&lat=${lat}&lng=${lon}`;
                    const tzDbRes = await axios.get(timezoneDbUrl, { timeout: 3000 });
                    
                    if (tzDbRes && tzDbRes.data && tzDbRes.data.status === 'OK') {
                        const data = tzDbRes.data;
                        const utcOffset = data.gmtOffset / 3600; // Convert seconds to hours
                        timeData = {
                            timezone: data.abbreviation || data.zoneName,
                            current_time: new Date(data.timestamp * 1000).toISOString(),
                            current_date: data.formatted.split(' ')[0],
                            utc_offset: `UTC${utcOffset >= 0 ? '+' : ''}${utcOffset}`,
                            is_dst: data.dst === "1",
                            timezone_source: 'timezonedb.com'
                        };
                        apiSuccess = true;
                        console.log(`[TimezoneDB] Success!`);
                    }
                } catch (tzDbErr) {
                    console.log(`[TimezoneDB] Failed: ${tzDbErr.message}`);
                }
            }

            if (!apiSuccess) {
                try {
                    const geoNamesUrl = `http://api.geonames.org/timezoneJSON?lat=${lat}&lng=${lon}&username=demo`;
                    const geoNamesRes = await axios.get(geoNamesUrl, { timeout: 3000 });
                    
                    if (geoNamesRes && geoNamesRes.data && geoNamesRes.data.time) {
                        const data = geoNamesRes.data;
                        const utcOffset = data.rawOffset + (data.dstOffset || 0);
                        timeData = {
                            timezone: data.timezoneId || 'Unknown',
                            current_time: data.time,
                            current_date: data.time.split(' ')[0],
                            utc_offset: `UTC${utcOffset >= 0 ? '+' : ''}${utcOffset}`,
                            is_dst: (data.dstOffset || 0) !== 0,
                            timezone_source: 'geonames.org'
                        };
                        apiSuccess = true;
                        console.log(`[GeoNames] Success!`);
                    }
                } catch (geoNamesErr) {
                    console.log(`[GeoNames] Failed: ${geoNamesErr.message}`);
                }
            }
            
            if (!apiSuccess) {
                try {
                    const worldClockUrl = `http://worldclockapi.com/api/json/utc/now`;
                    const worldClockRes = await axios.get(worldClockUrl, { timeout: 3000 });
                    
                    if (worldClockRes && worldClockRes.data && worldClockRes.data.currentDateTime) {
                        let utcOffset = 0;
                        let timezoneName = 'UTC';
                        
                        if (country && COUNTRY_TIMEZONE_MAP[country]) {
                            const tzInfo = COUNTRY_TIMEZONE_MAP[country];
                            utcOffset = tzInfo.offset;
                            timezoneName = tzInfo.name;
                        } else if (lat >= 3 && lat <= 14 && lon >= 3 && lon <= 15) {
                            utcOffset = 1;
                            timezoneName = 'WAT';
                        } else {
                            utcOffset = Math.round(lon / 15);
                            timezoneName = `UTC${utcOffset >= 0 ? '+' : ''}${utcOffset}`;
                        }
                        
                        const utcTime = new Date(worldClockRes.data.currentDateTime);
                        const localTime = new Date(utcTime.getTime() + utcOffset * 60 * 60 * 1000);
                        
                        timeData = {
                            timezone: timezoneName,
                            current_time: localTime.toISOString(),
                            current_date: localTime.toISOString().split('T')[0],
                            utc_offset: `UTC${utcOffset >= 0 ? '+' : ''}${utcOffset}`,
                            is_dst: false,
                            timezone_source: 'worldclockapi.com'
                        };
                        apiSuccess = true;
                        console.log(`[WorldClockAPI] Success!`);
                    }
                } catch (worldClockErr) {
                    console.log(`[WorldClockAPI] Failed: ${worldClockErr.message}`);
                }
            }
            
            if (!apiSuccess) {
                let utcOffset = 0;
                let timezoneName = 'UTC';
                
                if (country && COUNTRY_TIMEZONE_MAP[country]) {
                    const tzInfo = COUNTRY_TIMEZONE_MAP[country];
                    utcOffset = tzInfo.offset;
                    timezoneName = tzInfo.name;
                    console.log(`[Fallback] Using ${country} mapping: ${timezoneName}`);
                } else if (lat >= 3 && lat <= 14 && lon >= 3 && lon <= 15) {
                    utcOffset = 1;
                    timezoneName = 'WAT';
                    console.log(`[Fallback] Geographic detection: West Africa (WAT)`);
                } else {
                    utcOffset = Math.round(lon / 15);
                    timezoneName = `UTC${utcOffset >= 0 ? '+' : ''}${utcOffset}`;
                    console.log(`[Fallback] Using longitude estimate: ${timezoneName}`);
                }
                
                const now = new Date();
                const localTime = new Date(now.getTime() + utcOffset * 60 * 60 * 1000);
                
                timeData = {
                    timezone: timezoneName,
                    current_time: localTime.toISOString(),
                    current_date: localTime.toISOString().split('T')[0],
                    utc_offset: `UTC${utcOffset >= 0 ? '+' : ''}${utcOffset}`,
                    is_dst: false,
                    timezone_source: 'fallback',
                    note: "Using fallback timezone detection - may not account for DST"
                };
            }
            
            const timeStr = timeData.current_time;
            let hour = 0, minute = 0;
            if (timeStr) {
                const match = timeStr.match(/T?(\d{2}):(\d{2})/);
                if (match) {
                    hour = parseInt(match[1]);
                    minute = parseInt(match[2]);
                }
            }
            
            let utcHour = hour, utcMinute = minute;
            let offsetHours = 0;
            
            if (timeData.utc_offset) {
                if (typeof timeData.utc_offset === 'object' && timeData.utc_offset.seconds) {
                    offsetHours = timeData.utc_offset.seconds / 3600;
                } else if (typeof timeData.utc_offset === 'string') {
                    const offsetMatch = timeData.utc_offset.match(/UTC([+-]?\d+(?:\.\d+)?)/);
                    if (offsetMatch) {
                        offsetHours = parseFloat(offsetMatch[1]);
                    }
                } else if (typeof timeData.utc_offset === 'number') {
                    offsetHours = timeData.utc_offset;
                }
            }

            const localTotalMinutes = hour * 60 + minute;
            const offsetMinutes = offsetHours * 60;
            let utcTotalMinutes = localTotalMinutes - offsetMinutes;

            if (utcTotalMinutes < 0) utcTotalMinutes += 24 * 60;
            if (utcTotalMinutes >= 24 * 60) utcTotalMinutes -= 24 * 60;
            
            utcHour = Math.floor(utcTotalMinutes / 60);
            utcMinute = Math.floor(utcTotalMinutes % 60);
            
            return {
                verified: true,
                ...timeData,
                ...locationData,
                time_24hr: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
                hour: hour,
                minute: minute,
                utc_time_24hr: `${utcHour.toString().padStart(2, '0')}:${utcMinute.toString().padStart(2, '0')}`,
                utc_hour: utcHour,
                utc_minute: utcMinute,
                offset_hours: offsetHours,
                coordinates: { latitude: lat, longitude: lon }
            };
            
        } catch (e) {
            console.error("[Time Check Error]", e.message);
            return { 
                error: "Failed to retrieve time/timezone data", 
                details: e.message,
                fallback_utc_time: new Date().toISOString()
            };
        }
    }


};

function parseDERSignature(signatureHex) {
    try {
        const cleanHex = signatureHex.replace(/^0x/, '');
        const buf = Buffer.from(cleanHex, 'hex');
        let offset = 0;

        if (buf[offset++] !== 0x30) throw new Error("Invalid Header (Not 0x30)");
        let seqLen = buf[offset++];
        if (seqLen & 0x80) { 
            const lenBytes = seqLen & 0x7f;
            offset += lenBytes;
        }

        if (buf[offset++] !== 0x02) throw new Error("Invalid R Tag");
        let rLen = buf[offset++];
        let r = buf.subarray(offset, offset + rLen);
        offset += rLen;
        if (r[0] === 0x00 && rLen > 32) r = r.subarray(1);
        if (buf[offset++] !== 0x02) throw new Error("Invalid S Tag");
        let sLen = buf[offset++];
        let s = buf.subarray(offset, offset + sLen);
        if (s[0] === 0x00 && sLen > 32) s = s.subarray(1);
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
        console.error("DER Parsing Failed:", e.message);
        throw new Error("Signature format invalid. Expected ASN.1 DER.");
    }
}

async function runGatekeeper(rule, user_data, modelIndex = 0, keyIndex = 0) {
    if (keyIndex >= GEN_AI_KEYS.length) {
        throw new Error("All AI Models and API Keys exhausted.");
    }

    if (modelIndex >= MODELS.length) {
        console.warn(`[Gatekeeper] All models failed with API Key #${keyIndex + 1}. Trying next key...`);
        return runGatekeeper(rule, user_data, 0, keyIndex + 1); 
    }
    
    const currentModelName = MODELS[modelIndex];
    const currentApiKey = GEN_AI_KEYS[keyIndex];

    try {
        const genAI = new GoogleGenerativeAI(currentApiKey);
        console.log(`[Gatekeeper] Using API Key #${keyIndex + 1}, Model: ${currentModelName}`);
        const model = genAI.getGenerativeModel({
            model: currentModelName,
            tools: [{ functionDeclarations: toolsDefinition }]
        });

        const chat = model.startChat();

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
        STOP! DO NOT USE ANY TOOLS.
        ACTION: Check 'User Answer' directly against the rule.
        - If 'User Answer' matches the fact -> APPROVE.
        - If 'User Answer' is wrong or empty -> REJECT.

        TYPE B: FINANCIAL & HISTORY (Real-Time + Historical)
        (Examples: "Must hold > 0.1 ETH", "Gas spender > 0.5 ETH", "Old Wallet > 1 year", "Nonce is even")
        ---------------------------------------------------------
        USE TOOL: 'check_evm_stats'
        - For "ETH Balance" -> Check 'balance_eth'.
        - For "Gas Spent" -> Check 'lifetime_gas_eth'.
        - For "Wallet Age" -> Check 'wallet_age_days'.
        - For "Inactivity" -> Check 'days_since_active'.

        TYPE C: ERC-20 TOKENS
        (Examples: "Must hold 10 USDC", "Must hold PEPE")
        ---------------------------------------------------------
        USE TOOL: 'check_token_balance'
        - Map symbol (e.g., USDC, PEPE) to the 'tokenSymbol' argument.

        TYPE D: NFTs & COLLECTIONS
        (Examples: "Must own a Pudgy Penguin", "Must own ENS", "Hold BAYC")
        ---------------------------------------------------------
        USE TOOL: 'check_nft_ownership'
        - If the rule mentions a specific name (e.g., "Pudgy Penguin"), pass it as 'collectionName' ONLY.
        - DO NOT specify 'chain' parameter for known collections - the system will automatically use the correct mainnet chain.
        - Only specify 'chain' if the rule explicitly says "on Sepolia testnet" or similar.
        - If the rule gives a 0x address, pass it as 'contractAddress'.
        - Call this tool ONCE per NFT collection, not multiple times across different chains.

        TYPE E: SOCIAL & WEB2 (Mocked)
        (Examples: "Follow on Twitter", "Star GitHub repo", "Spotify Listener")
        ---------------------------------------------------------
        USE TOOL: 'check_social_mock'
        - Extract the 'platform' (Twitter, GitHub, etc.) and 'action'.

        TYPE F: DISCORD COMMUNITY
        (Examples: "Must be in Discord", "Must be a Member > 1 year", "Must have VIP Role")
        ---------------------------------------------------------
        USE TOOL: 'check_discord_membership'

        TYPE G: LOCATION / HUMANITY
        (Examples: "Must be in Nigeria", "Must be Human", "No VPN")
        ---------------------------------------------------------
        USE TOOL: 'check_sybil_geo_real'

        TYPE H: TIME & TIMEZONE CHECKS
        (Examples: "Can only claim after 7:50PM", "Must be before midnight", "Only on weekends", "Must be in Lagos at 8PM", "2:32 PM UTC+0")
        ---------------------------------------------------------
        USE TOOL: 'check_time_timezone'
        - For LOCAL time requirements (no timezone specified), use 'hour' and 'minute' fields
        - For UTC/specific timezone requirements (e.g., "2:32 PM UTC+0"), use 'utc_hour' and 'utc_minute' fields
        - The tool returns BOTH local time (hour, minute) AND UTC time (utc_hour, utc_minute)
        - For grace period requirements (e.g., "± 3 mins"), calculate if the time is within range
        - Example: "2:32 PM UTC+0 ± 3 mins" means utc_hour == 14 AND utc_minute >= 29 AND utc_minute <= 35
        - For location + time (e.g., "in Lagos after 7:50PM"), check BOTH 'city' matches AND time requirements
        - Example: "after 7:50PM local" means hour >= 19 AND (hour > 19 OR minute >= 50)

        ### HALLUCINATION GUARD:
        - NEVER call a tool for Trivia (e.g. "What is 2+2?").
        - If a tool returns an error (e.g. "Token not found") -> REJECT.
        - DO NOT approve just because the user asks nicely.

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

        const prompt = `${systemPrompt}\nUser Context:\n${JSON.stringify(user_data)}`;
        let result = await chat.sendMessage(prompt);
        let call = result.response.functionCalls()?.[0];
        let turns = 0;
        const toolResults = []; 
        const MAX_TURNS = 12; 
        
        while (turns < MAX_TURNS) {
            turns++;
            
            // Check if there's a function call to process
            if (call) {
                const fn = functions[call.name];
                if (fn) {
                    console.log(`[Gatekeeper] 🤖 Calling Tool: ${call.name} (Turn ${turns}/${MAX_TURNS})`);
                    const toolArgs = { ...call.args };

                    if (!toolArgs.address && user_data.address) {
                        toolArgs.address = user_data.address;
                    }

                    if (call.name === 'check_sybil_geo_real') {
                        if (!toolArgs.latitude) toolArgs.latitude = user_data.latitude;
                        if (!toolArgs.longitude) toolArgs.longitude = user_data.longitude;
                    }

                    if (call.name === 'check_time_timezone') {
                        if (!toolArgs.latitude) toolArgs.latitude = user_data.latitude;
                        if (!toolArgs.longitude) toolArgs.longitude = user_data.longitude;
                    }

                    if (call.name === 'check_discord_membership') {
                        if (!toolArgs.userId) toolArgs.userId = user_data.discordId;
                        if (!toolArgs.guildId) {
                            const idMatch = rule.match(/\b\d{17,19}\b/);

                            if (idMatch) {
                                toolArgs.guildId = idMatch[0];
                            } else {
                                toolArgs.guildId = "1322709977826529321";
                            }
                        }
                    }

                    const output = await fn(toolArgs);
                    console.log(`[Gatekeeper] Tool Output:`, JSON.stringify(output).substring(0, 500));
                    
                    toolResults.push({ tool: call.name, args: toolArgs, result: output });
                    
                    result = await chat.sendMessage([{ functionResponse: { name: call.name, response: { content: output } } }]);
                    call = result.response.functionCalls()?.[0];
                    
                    if (!call) {
                        const currentResponse = result.response.text();
                        if (!currentResponse || currentResponse.trim() === '') {
                            console.warn(`[Gatekeeper] Empty response after tool call. Prompting to continue...`);
                            

                            result = await chat.sendMessage(
                                `You just received tool results. The original rule was: "${rule}"\n` +
                                `Tools called so far: ${toolResults.map(t => t.tool).join(', ')}\n` +
                                `If there are MORE criteria to check, call the appropriate tool NOW.\n` +
                                `If ALL criteria have been checked, provide your final JSON decision: {"approved": boolean, "explanation": "..."}`
                            );
                            call = result.response.functionCalls()?.[0];
                            
                            if (!call && (!result.response.text() || result.response.text().trim() === '')) {
                                console.warn(`[Gatekeeper] AI stuck. Continuing recovery loop...`);
                            }
                        }
                    }
                } else {
                    console.warn(`[Gatekeeper] Unknown tool: ${call.name}`);
                    break;
                }
            } else {
                const currentResponse = result.response.text();
                if (currentResponse && currentResponse.trim() !== '') {
                    break;
                }
                console.warn(`[Gatekeeper] No tool call and empty response at turn ${turns}. Attempting recovery...`);
                
                if (turns <= 2) {
                    result = await chat.sendMessage(
                        `You must evaluate the rule: "${rule}"\n` +
                        `Start by calling the appropriate verification tools. Do not respond until all criteria are checked.`
                    );
                    call = result.response.functionCalls()?.[0];
                } else {
                    break; 
                }
            }
        }
        
        let responseText = result.response.text();
        console.log(`[Gatekeeper] Raw AI Response:`, responseText);
        console.log(`[Gatekeeper] Completed ${turns} turns with ${toolResults.length} tool calls`);
        
        if (!responseText || responseText.trim() === '') {
            console.warn(`[Gatekeeper] Empty response after ${turns} turns, ${toolResults.length} tool calls. Starting recovery...`);
            console.log(`[Gatekeeper] Tools called:`, toolResults.map(t => `${t.tool}(${JSON.stringify(t.args).substring(0, 50)}...)`).join(', '));
            
            const followUpPrompts = [
                `The original rule is: "${rule}"\n` +
                `You have called ${toolResults.length} tools. Here are ALL the results:\n` +
                toolResults.map((t, i) => `${i + 1}. ${t.tool}: ${JSON.stringify(t.result)}`).join('\n') + '\n' +
                `Based on these results, does the user meet ALL criteria? Respond with JSON: {"approved": boolean, "explanation": "..."}`,
                
                'You must respond with a JSON decision NOW. Analyze all tool results and decide. {"approved": true/false, "explanation": "..."}',
                
                'RESPOND NOW. JSON ONLY: {"approved": false, "explanation": "Verification incomplete"}'
            ];
            
            for (let i = 0; i < followUpPrompts.length; i++) {
                try {
                    console.log(`[Gatekeeper] Retry attempt ${i + 1}/3...`);
                    result = await chat.sendMessage(followUpPrompts[i]);
                    responseText = result.response.text();
                    console.log(`[Gatekeeper] Retry ${i + 1} Response:`, responseText);
                    
                    if (responseText && responseText.trim() !== '') {
                        break;
                    }
                    
                    // Small delay between retries
                    await new Promise(r => setTimeout(r, 500));
                } catch (retryErr) {
                    console.warn(`[Gatekeeper] Retry ${i + 1} failed: ${retryErr.message}`);
                }
            }
            
            if (!responseText || responseText.trim() === '') {
                console.warn(`[Gatekeeper] All AI retries failed. Making programmatic decision from ${toolResults.length} tool results...`);
                
                let allChecksPassed = true;
                let failureReasons = [];
                let successCount = 0;
                
                // Analyze ALL tool results for multi-criteria evaluation
                for (const tr of toolResults) {
                    const r = tr.result;
                    const tool = tr.tool;
                    
                    console.log(`[Gatekeeper] Analyzing ${tool}:`, JSON.stringify(r).substring(0, 200));
                    
                    // Check for explicit errors
                    if (r.error) {
                        allChecksPassed = false;
                        failureReasons.push(`${tool}: ${r.error}`);
                        continue;
                    }
                    
                    // EVM Stats checks
                    if (tool === 'check_evm_stats') {
                        const balance = parseFloat(r.balance_eth || 0);
                        const gasSpent = parseFloat(r.lifetime_gas_eth || 0);
                        const daysSinceActive = r.days_since_active;
                        
                        if (balance >= 0) successCount++;
                    }
                    
                    // Token balance checks
                    if (tool === 'check_token_balance') {
                        const balance = parseFloat(r.balance || 0);
                        if (balance > 0) successCount++;
                    }
                    
                    if (tool === 'check_nft_ownership') {
                        if (r.owns_nft === false) {
                            const ruleUpper = rule.toUpperCase();
                            const collectionName = (r.collection || '').toUpperCase();
                            if (ruleUpper.includes('NOT') && ruleUpper.includes(collectionName)) {
                                successCount++;
                            } else {
                                allChecksPassed = false;
                                failureReasons.push(`Does not own required NFT: ${r.collection}`);
                            }
                        } else if (r.owns_nft === true) {
                            const ruleUpper = rule.toUpperCase();
                            const collectionName = (r.collection || '').toUpperCase();
                            if (ruleUpper.includes('NOT') && ruleUpper.includes(collectionName)) {
                                allChecksPassed = false;
                                failureReasons.push(`Must NOT own ${r.collection} but user owns it`);
                            } else {
                                successCount++;
                            }
                        }
                    }
                    
                    if (tool === 'check_discord_membership') {
                        if (r.is_member === false) {
                            allChecksPassed = false;
                            failureReasons.push('Not a member of required Discord server');
                        } else if (r.is_member === true) {
                            successCount++;
                        }
                    }
                    
                    if (tool === 'check_time_timezone') {
                        if (r.verified === true) successCount++;
                        else if (r.verified === false) {
                            allChecksPassed = false;
                            failureReasons.push('Time/location requirement not met');
                        }
                    }
                    
                    if (tool === 'check_sybil_geo_real') {
                        if (r.is_sybil === true) {
                            allChecksPassed = false;
                            failureReasons.push('Flagged as potential sybil');
                        } else if (r.verified === false) {
                            allChecksPassed = false;
                            failureReasons.push('Location/identity verification failed');
                        } else if (r.verified === true) {
                            successCount++;
                        }
                    }
                }
                
                // Final decision
                const inferredApproval = allChecksPassed && successCount > 0;
                const inferredExplanation = inferredApproval 
                    ? `All ${successCount} verification checks passed` 
                    : (failureReasons.length > 0 ? failureReasons.join('; ') : 'Verification incomplete - some checks may have failed');
                
                console.log(`[Gatekeeper] Programmatic decision: approved=${inferredApproval}, reasons: ${inferredExplanation}`);
                responseText = JSON.stringify({ approved: inferredApproval, explanation: inferredExplanation });
            }
            
            if (!responseText || responseText.trim() === '') {
                throw new Error("Empty response after all recovery attempts - triggering model failover");
            }
        }
        
        responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        return responseText;

    } catch (e) {
        console.warn(`[Gatekeeper] Model ${currentModelName} (Key #${keyIndex + 1}) failed: ${e.message}`);
        return runGatekeeper(rule, user_data, modelIndex + 1, keyIndex);
    }
}

function parseAIResponse(text) {
    if (!text || text.trim() === '') {
        console.warn("[Parse] Empty AI response received");
        return { approved: false, explanation: "AI returned empty response. Please try again." };
    }
    
    console.log("[Parse] Raw response text:", text);
    
    let clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    
    // Try multiple JSON extraction strategies
    let jsonObject = null;
    
    try {
        jsonObject = JSON.parse(clean);
        console.log("[Parse] Success: Direct JSON parse");
        return jsonObject;
    } catch (e) {
        console.log("[Parse] Strategy 1 failed - not direct JSON");
    }
    
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    
    if (start !== -1 && end !== -1 && start < end) {
        const extracted = clean.substring(start, end + 1);
        try {
            jsonObject = JSON.parse(extracted);
            console.log("[Parse] Success: Extracted JSON from text");
            return jsonObject;
        } catch (e) {
            console.log("[Parse] Strategy 2 failed - extracted text not valid JSON");
        }
    }
    
    const jsonMatch = clean.match(/\{[\s\S]*"approved"\s*:\s*(true|false)[\s\S]*\}/);
    if (jsonMatch) {
        try {
            jsonObject = JSON.parse(jsonMatch[0]);
            console.log("[Parse] Success: Regex-extracted JSON");
            return jsonObject;
        } catch (e) {
            console.log("[Parse] Strategy 3 failed - regex match not valid JSON");
        }
    }
    
    console.warn("[Parse] All JSON parsing failed. Attempting intelligent inference...");
    console.warn("[Parse] Full text:", text.substring(0, 500));
    
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('"approved": true') || 
        lowerText.includes('"approved":true') ||
        lowerText.includes('approved: true') ||
        (lowerText.includes('approved') && lowerText.includes('true'))) {
        
        let explanation = "Verification passed";
        const explMatch = text.match(/"explanation"\s*:\s*"([^"]*)"/i);
        if (explMatch && explMatch[1]) {
            explanation = explMatch[1];
        }
        
        console.log("[Parse] Inferred APPROVAL from text");
        return { approved: true, explanation };
    }
    
    if (lowerText.includes('"approved": false') || 
        lowerText.includes('"approved":false') ||
        lowerText.includes('approved: false')) {
        
        let explanation = "Condition not met";
        const explMatch = text.match(/"explanation"\s*:\s*"([^"]*)"/i);
        if (explMatch && explMatch[1]) {
            explanation = explMatch[1];
        }
        
        console.log("[Parse] Inferred REJECTION from text");
        return { approved: false, explanation };
    }
    
    const approvalWords = ['granted', 'approved', 'verified', 'passed', 'success', 'yes'];
    const rejectionWords = ['denied', 'rejected', 'failed', 'incorrect', 'wrong', 'no'];
    
    const hasApproval = approvalWords.some(word => lowerText.includes(word));
    const hasRejection = rejectionWords.some(word => lowerText.includes(word));
    
    if (hasApproval && !hasRejection) {
        console.log("[Parse] Inferred APPROVAL from keywords");
        return { approved: true, explanation: "Verification passed (inferred from response)" };
    }
    
    if (hasRejection || !hasApproval) {
        console.log("[Parse] Inferred REJECTION from keywords or lack of approval");
        return { approved: false, explanation: "Condition not met. Please verify your details." };
    }
    
    console.error("[Parse] Complete parsing failure. Defaulting to REJECT for security.");
    return { approved: false, explanation: "Unable to verify. Please try again." };
}

app.post('/api/verify', async (req, res) => {
    try {
        const { rule, user_data } = req.body;
        const decisionText = await runGatekeeper(rule, user_data);
        console.log("AI Output:", decisionText); 
        let decision = parseAIResponse(decisionText);
        if (!decision) {
            console.warn("AI Response unreadable. Defaulting to fallback.");
            const isApproved = /yes|true|approve|grant/i.test(decisionText);
            decision = {
                approved: isApproved,
                explanation: isApproved ? "Access Granted (Fallback)" : "AI Output Unclear"
            };
        }
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
        res.json({ approved: false, explanation: "Verification Server Error" });
    }
});
app.post('/api/claim', async (req, res) => {
    try {
        const { dropId, receiver, biometricData } = req.body;

        console.log(`Processing Claim for Drop #${dropId}`);
        console.log(`   Receiver: ${receiver}`);
        const messageToSign = ethers.solidityPackedKeccak256(
            ["uint256", "address"],
            [dropId, receiver]
        );

        const rawSignature = await relayerWallet.signMessage(ethers.getBytes(messageToSign));
        const agentSigArray = Array.from(ethers.getBytes(rawSignature));
        console.log(` Agent Signed Authorization`);
        let bioSigArray;
        let bioHashArray;

        if (biometricData && biometricData.signature) {
            console.log("Real Biometric Data Detected. Processing...");
            try {
                bioSigArray = Array.isArray(biometricData.signature) 
                    ? biometricData.signature 
                    : Array.from(Buffer.from(biometricData.signature, 'hex'));
                
                if (bioSigArray.length !== 64) {
                    throw new Error(`Expected 64-byte signature, got ${bioSigArray.length}`);
                }

                const clientDataHash = crypto.createHash('sha256').update(
                    Buffer.from(biometricData.clientDataJSON || [])
                ).digest();
                bioHashArray = Array.from(clientDataHash);

                console.log(`Biometric Signature Ready (${bioSigArray.length} bytes)`);

            } catch (e) {
                console.error("Biometric Processing Failed:", e.message);
                throw new Error("Invalid Passkey Signature Format");
            }
        }

        const tx = await contract.claimDrop(
            dropId,
            receiver,
            agentSigArray,    
            bioSigArray,       
            bioHashArray,   
            { gasLimit: 2000000 } 
        );

        console.log(`Claim Transaction Sent! Hash: ${tx.hash}`);
        res.json({ success: true, txHash: tx.hash });

    } catch (error) {
        console.error("Claim Error:", error);

        // Detailed Error Debugging for Stylus
        if (error.code === 'CALL_EXCEPTION') {
            console.error("   Reason:", error.reason);
            console.error("   Data:", error.data);
            // Decode common Stylus errors if possible
            if (error.data && error.data.includes('E15')) {
                console.error("   CRITICAL: Contract returned 'E15'. Signature length was not 64 bytes.");
            }
        }
        res.status(500).json({ error: error.message || "Transaction failed" });
    }
});

app.get('/api/check-claim/:dropId', async (req, res) => {
    try {
        const { dropId } = req.params;
        const functionSelector = ethers.id("drops(uint256)").slice(0, 10); 
        const encodedDropId = ethers.zeroPadValue(ethers.toBeHex(dropId), 32);
        const callData = functionSelector + encodedDropId.slice(2);

        let rawResult;
        try {
            rawResult = await relayerProvider.call({
                to: STYLUS_CONTRACT_ADDRESS,
                data: callData
            });
        } catch (e) {
            console.error("Contract Read Error:", e.message);
            return res.status(404).json({ error: "Drop not found or Contract Unreachable" });
        }
        
        if (!rawResult || rawResult === '0x' || rawResult.length < 200) {
            return res.status(404).json({ error: "Drop not found (empty response)" });
        }

        const dataStart = 2 + 128; 
        const senderHex = '0x' + rawResult.slice(dataStart + 24, dataStart + 64); 
        const amountHex = '0x' + rawResult.slice(dataStart + 64, dataStart + 128);
        const activeHex = '0x' + rawResult.slice(dataStart + 128, dataStart + 192);
        const expiresHex = '0x' + rawResult.slice(dataStart + 192, dataStart + 256);
        const gatekeeperHex = '0x' + rawResult.slice(dataStart + 216, dataStart + 256);
        
        const sender = ethers.getAddress(senderHex);
        const amount = BigInt(amountHex);
        const isActive = BigInt(activeHex) !== 0n;
        const expiresAt = BigInt(expiresHex);
        const gatekeeper = ethers.getAddress(gatekeeperHex);

        let claimedBy = null;
        let reclaimed = false;

        if (!isActive) {
            const claimFilter = contract.filters.DropClaimed(dropId);
            const claimEvents = await contract.queryFilter(claimFilter);

            if (claimEvents.length > 0) {
                claimedBy = claimEvents[0].args[1]; 
            } else {
                reclaimed = true;
            }
        }

        res.json({
            active: isActive,
            claimed: !isActive && !reclaimed,
            reclaimed: reclaimed,
            claimedBy: claimedBy,
            details: {
                sender: sender,
                amount: amount.toString(),
                expiresAt: expiresAt.toString(),
                gatekeeper: gatekeeper
            }
        });

    } catch (e) {
        console.error("Status Check Fatal Error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

const SERVER_PORT = process.env.PORT || 4000;
app.get('/api/auth/discord', (req, res) => {
    const scope = 'identify'; 
    const url = `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.DISCORD_REDIRECT_URI)}&response_type=code&scope=${scope}`;
    res.redirect(url);
});

app.get('/api/auth/discord/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.send('No code provided');

    try {
        const tokenResponse = await axios.post(
            'https://discord.com/api/oauth2/token',
            new URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID,
                client_secret: process.env.DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code.toString(),
                redirect_uri: process.env.DISCORD_REDIRECT_URI,
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const { access_token } = tokenResponse.data;
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        const userData = userResponse.data; 

        const html = `
            <html>
                <body>
                    <script>
                        window.opener.postMessage({ type: 'DISCORD_CONNECTED', user: ${JSON.stringify(userData)} }, '*');
                        window.close();
                    </script>
                    <h1>Authentication Successful. You can close this window.</h1>
                </body>
            </html>
        `;
        res.send(html);

    } catch (e) {
        console.error("Discord Auth Error:", e.response?.data || e.message);
        res.status(500).send("Authentication Failed");
    }
});
app.listen(SERVER_PORT, () => {
    console.log(`\nStylusLink Gatekeeper Active`);
    console.log(`   Port: ${SERVER_PORT}`);
    console.log(`   RPC: ${process.env.RPC_SEPOLIA_ARBITRUM ? "Connected" : "Missing"}`);
    console.log(`   AI Model: ${MODELS[0]}`);
});