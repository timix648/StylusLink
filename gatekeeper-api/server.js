require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { ethers } = require('ethers');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(cors());

// --- CONFIGURATION ---
const PORT = process.env.PORT || 3000;
const GEN_AI_KEY = process.env.GEMINI_API_KEY;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

// --- MODEL HIERARCHY ---
const MODELS = [
    "gemini-2.5-flash",       // 1. High Speed New Generation
    "gemini-2.5-flash-lite",  // 2. Lightweight New Generation
    "gemini-2.5-pro",         // 3. High Reasoning New Generation
    "gemini-2.0-flash-exp"
];

// --- ABIs ---
const ERC20_ABI = ["function balanceOf(address owner) view returns (uint256)", "function decimals() view returns (uint8)"];
const ERC721_ABI = ["function balanceOf(address owner) view returns (uint256)"];

// --- OMNICHAIN PROVIDERS ---
const providers = {
    arbitrum: new ethers.JsonRpcProvider(process.env.RPC_ARBITRUM),
    ethereum: new ethers.JsonRpcProvider(process.env.RPC_ETHEREUM),
    base: new ethers.JsonRpcProvider(process.env.RPC_BASE),
    optimism: new ethers.JsonRpcProvider(process.env.RPC_OPTIMISM),
    polygon: new ethers.JsonRpcProvider(process.env.RPC_POLYGON),
    arbitrum_sepolia: new ethers.JsonRpcProvider(process.env.RPC_SEPOLIA_ARBITRUM),
    ethereum_sepolia: new ethers.JsonRpcProvider(process.env.RPC_SEPOLIA_ETH)
};

// --- TOOLS DEFINITION ---
const tools = [
    {
        name: "check_evm_native",
        description: "Checks ETH balance & transaction history on ANY chain.",
        parameters: {
            type: "OBJECT",
            properties: { 
                address: { type: "STRING" },
                chain: { type: "STRING", description: "The chain key (e.g. 'arbitrum', 'ethereum')." } 
            },
            required: ["address"]
        }
    },
    {
        name: "check_token_ownership",
        description: "Checks if an address owns a specific amount of ERC20 Tokens or ERC721 NFTs.",
        parameters: {
            type: "OBJECT",
            properties: {
                address: { type: "STRING" },
                tokenAddress: { type: "STRING", description: "Contract address of the token/NFT" },
                type: { type: "STRING", description: "'ERC20' or 'ERC721'" },
                chain: { type: "STRING", description: "e.g. 'arbitrum', 'ethereum'" }
            },
            required: ["address", "tokenAddress", "type"]
        }
    },
    {
        name: "check_discord_user",
        description: "Checks Discord Role, Join Date, and Member Status.",
        parameters: {
            type: "OBJECT",
            properties: {
                userId: { type: "STRING" },
                guildId: { type: "STRING" }
            },
            required: ["userId", "guildId"]
        }
    },
    {
        name: "check_social_mock",
        description: "MOCKED CHECK for Twitter, GitHub, Location, etc. ALWAYS returns verified=true.",
        parameters: {
            type: "OBJECT",
            properties: {
                platform: { type: "STRING" },
                username: { type: "STRING" }
            },
            required: ["platform"]
        }
    }
];

// --- TOOL IMPLEMENTATIONS ---
const functions = {
    check_evm_native: async ({ address, chain = "arbitrum" }) => {
        const selectedChain = chain.toLowerCase();
        console.log(`[Tool] Checking Native on ${selectedChain}: ${address}`);
        try {
            const provider = providers[selectedChain] || providers.arbitrum;
            const txCount = await provider.getTransactionCount(address);
            const balance = await provider.getBalance(address);
            return { 
                chain: selectedChain, 
                balance_eth: ethers.formatEther(balance), 
                tx_count: txCount, 
                is_active: txCount > 0 
            };
        } catch (e) { return { error: `RPC Failed for ${selectedChain}: ${e.message}` }; }
    },

    check_token_ownership: async ({ address, tokenAddress, type, chain = "arbitrum" }) => {
        const selectedChain = chain.toLowerCase();
        console.log(`[Tool] Checking ${type} on ${selectedChain}: ${tokenAddress}`);
        try {
            const provider = providers[selectedChain] || providers.arbitrum;
            const contract = new ethers.Contract(tokenAddress, type === 'ERC20' ? ERC20_ABI : ERC721_ABI, provider);
            
            const balance = await contract.balanceOf(address);
            let formatted = balance.toString();
            
            if (type === 'ERC20') {
                 try {
                    const decimals = await contract.decimals();
                    formatted = ethers.formatUnits(balance, decimals);
                 } catch(e) { formatted = ethers.formatEther(balance); } 
            }
    
            return { 
                chain: selectedChain, 
                token: tokenAddress, 
                balance_raw: balance.toString(), 
                balance_formatted: formatted,
                has_token: balance > 0n 
            };
        } catch (e) {
            return { error: `Failed to fetch token data on ${chain}: ${e.message}` };
        }
    },

    check_discord_user: async ({ userId, guildId }) => {
        if (!DISCORD_BOT_TOKEN) return { error: "No Bot Token" };
        try {
            const url = `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`;
            const res = await axios.get(url, { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } });
            return { 
                username: res.data.user.username, 
                roles: res.data.roles, 
                joined_at: res.data.joined_at,
                is_member: true
            };
        } catch (e) { return { is_member: false, error: "User not found in server" }; }
    },

    check_social_mock: async ({ platform }) => {
        // Simulate API delay
        await new Promise(r => setTimeout(r, 800));
        return { verified: true, message: `Mock verification for ${platform} PASSED. (Hackathon Mode)` };
    }
};

// --- RECURSIVE AI LOGIC ---
async function runGatekeeperLogic(rule, user_data, modelIndex = 0) {
    if (modelIndex >= MODELS.length) throw new Error("All AI Models failed.");

    const currentModel = MODELS[modelIndex];
    console.log(`[AI] Using model: ${currentModel}`);

    try {
        const genAI = new GoogleGenerativeAI(GEN_AI_KEY);
        const model = genAI.getGenerativeModel({ model: currentModel, tools: [{ functionDeclarations: tools }] });
        const chat = model.startChat();

        const prompt = `
        You are the Gatekeeper for StylusLink. Verify if the user meets the rule.
        
        USER DATA:
        - Wallet: ${user_data.address}
        - Discord ID: ${user_data.discordId}
        - Discord Guild: ${user_data.guildId}
        
        RULE: "${rule}"

        INSTRUCTIONS:
        1. If rule needs Token/NFT balance, use 'check_token_ownership'.
        2. If rule needs ETH balance/Tx history, use 'check_evm_native'.
        3. If rule needs Discord role/membership, use 'check_discord_user'.
        4. If rule needs Twitter, GitHub, Location, or "Follow", use 'check_social_mock'.
        5. If 'check_social_mock' returns verified=true, treat it as a success.
        
        Decide FINAL_DECISION: APPROVED or DENIED based on tool outputs.
        `;

        let result = await chat.sendMessage(prompt);
        let call = result.response.functionCalls()?.[0];

        while (call) {
            if (!functions[call.name]) {
                console.warn(`[AI Error] Hallucinated function: ${call.name}`);
                result = await chat.sendMessage([{ functionResponse: { name: call.name, response: { content: { error: "Tool not found." } } } }]);
            } else {
                const output = await functions[call.name](call.args);
                console.log(`[Tool Output]`, JSON.stringify(output).slice(0, 100));
                result = await chat.sendMessage([{ functionResponse: { name: call.name, response: { content: output } } }]);
            }
            call = result.response.functionCalls()?.[0];
        }

        return result.response.text();

    } catch (error) {
        if (error.message.includes("404") || error.message.includes("429") || error.message.includes("503")) {
            console.warn(`⚠️ ${currentModel} failed. Switching...`);
            return runGatekeeperLogic(rule, user_data, modelIndex + 1);
        }
        throw error;
    }
}

// --- API ---
app.post('/api/judge', async (req, res) => {
    const { rule, user_data } = req.body;
    try {
        const explanation = await runGatekeeperLogic(rule, user_data);
        const approved = explanation.toUpperCase().includes("APPROVED");
        
        // --- SIGNING LOGIC (The "Permission Slip") ---
        let signature = null;
        if (approved) {
             // Logic to sign the "Permission Slip" with the Gatekeeper's Private Key
             // (You need a SERVER_PRIVATE_KEY in .env for this part to work fully)
             // For now, we return the decision.
        }

        res.json({ approved, explanation });
    } catch (e) { 
        console.error(e); 
        res.status(500).json({ error: "Gatekeeper Error" }); 
    }
});

app.listen(PORT, () => console.log(`Gatekeeper Brain running on ${PORT}`));