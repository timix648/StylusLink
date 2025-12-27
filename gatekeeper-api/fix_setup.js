require('dotenv').config();
const { ethers } = require('ethers');

async function main() {
    console.log("🏥 STARTING FINAL SETUP...");
    
    const provider = new ethers.JsonRpcProvider(process.env.RPC_SEPOLIA_ARBITRUM);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contractAddr = process.env.STYLUS_CONTRACT_ADDRESS;

    console.log(`🔑 Wallet:   ${wallet.address}`);
    console.log(`📍 Contract: ${contractAddr}`);

    // 1. DATA PREPARATION
    const DROP_ID = Math.floor(Math.random() * 1000000);
    const expires = Math.floor(Date.now() / 1000) + 86400;

    // Generate random keys
    const rawX = ethers.randomBytes(32);
    const rawY = ethers.randomBytes(32);

    // CRITICAL FIX: Convert Uint8Array (Bytes) -> Standard Array [1, 255, 0...]
    // This satisfies the "uint8[]" requirement from your ABI export.
    const pubX_Array = Array.from(rawX);
    const pubY_Array = Array.from(rawY);

    // 2. DEFINE ABI (Exactly as exported)
    const abi = [
        "function createDrop(uint256 drop_id, uint8[] pub_x, uint8[] pub_y, address gatekeeper, uint64 expires_at) external payable"
    ];
    const contract = new ethers.Contract(contractAddr, abi, wallet);

    try {
        console.log(`\n🚀 Creating Drop #${DROP_ID} (using 'createDrop')...`);
        
        // We use manual gas limit to be safe
        const tx = await contract.createDrop(
            DROP_ID, 
            pubX_Array, 
            pubY_Array, 
            wallet.address, 
            expires, 
            { 
                value: ethers.parseEther("0.0001"), 
                gasLimit: 5000000 
            }
        );
        
        console.log(`✅ SENT! Hash: ${tx.hash}`);
        console.log("⏳ Waiting for confirmation...");
        
        const receipt = await tx.wait();
        if (receipt.status === 1) {
            console.log(`\n🎉 SUCCESS! Drop #${DROP_ID} Created.`);
            console.log("--------------------------------------------------");
            console.log(`👉 YOUR DROP ID: ${DROP_ID}`);
            console.log("--------------------------------------------------");
            console.log("✅ Use this ID in your frontend/Postman.");
        } else {
            console.error("❌ Transaction Reverted on-chain.");
        }

    } catch (e) {
        console.error("❌ ERROR:");
        // If this still fails, we try the 'bytes' version as a fallback
        if (e.shortMessage && e.shortMessage.includes("revert")) {
            console.log("\n⚠️  Retrying with 'bytes' format (Standard Rust mapping)...");
            await retryWithBytes(contractAddr, wallet, DROP_ID, rawX, rawY, expires);
        } else {
            console.error(e.shortMessage || e.message);
        }
    }
}

async function retryWithBytes(addr, wallet, id, x, y, exp) {
    const abiBytes = ["function createDrop(uint256, bytes, bytes, address, uint64) external payable"];
    const contract = new ethers.Contract(addr, abiBytes, wallet);
    try {
        const tx = await contract.createDrop(id, x, y, wallet.address, exp, { value: ethers.parseEther("0.0001"), gasLimit: 5000000 });
        console.log(`✅ SENT (Bytes Version)! Hash: ${tx.hash}`);
        await tx.wait();
        console.log(`🎉 SUCCESS! Drop #${id} Created.`);
        console.log(`👉 YOUR DROP ID: ${id}`);
    } catch(e) {
        console.error("❌ Both formats failed. Please check the contract logs.");
    }
}

main();