require('dotenv').config();
const { ethers } = require('ethers');

// 1. Set the Drop ID you are testing (Default: 0)
const TARGET_DROP_ID = 0; 

async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_SEPOLIA_ARBITRUM);
    const contractAddr = process.env.STYLUS_CONTRACT_ADDRESS;
    const relayerPrivateKey = process.env.PRIVATE_KEY;

    if (!contractAddr || !relayerPrivateKey) {
        console.error("❌ ERROR: Missing .env variables (CONTRACT_ADDRESS or PRIVATE_KEY)");
        return;
    }

    const wallet = new ethers.Wallet(relayerPrivateKey);
    console.log(`\n🔍 ANALYZING RAW STORAGE for Drop #${TARGET_DROP_ID}`);
    console.log(`Your Relayer Address: ${wallet.address}`);
    console.log(`Contract Address:     ${contractAddr}`);

    // --- CALCULATE STORAGE SLOT ---
    // 'drops' mapping is at Slot 0. Key is TARGET_DROP_ID.
    const key = ethers.zeroPadValue(ethers.toBeHex(TARGET_DROP_ID), 32);
    const mapSlot = ethers.zeroPadValue(ethers.toBeHex(0), 32); 
    
    // Solidity/Stylus Mapping Hash: keccak256(key . slot)
    const baseSlotHash = ethers.keccak256(ethers.concat([key, mapSlot]));
    const baseSlotBigInt = BigInt(baseSlotHash);
    
    // Gatekeeper is at offset +4 in the Drop struct (based on your lib.rs)
    // struct Drop { sender(0), amount(1), active(2), expires_at(3), gatekeeper(4) ... }
    const gatekeeperSlot = (baseSlotBigInt + 4n).toString(16);

    console.log(`reading slot: 0x${gatekeeperSlot}...`);
    
    try {
        const data = await provider.getStorage(contractAddr, "0x" + gatekeeperSlot);
        const onChainGatekeeper = "0x" + data.slice(26); // Extract address from 32-byte word

        console.log("\n---------------------------------------------------");
        console.log("👮 GATEKEEPER RESULTS");
        console.log("---------------------------------------------------");
        console.log(`Contract stored:  ${onChainGatekeeper}`);
        console.log(`Your Relayer:     ${wallet.address.toLowerCase()}`);
        
        if (onChainGatekeeper === "0x0000000000000000000000000000000000000000") {
             console.log("\n⚠️  WARNING: Gatekeeper is ZERO.");
             console.log("This means the Drop exists but has NO gatekeeper, OR the Drop ID is wrong/empty.");
        } 
        else if (onChainGatekeeper.toLowerCase() === wallet.address.toLowerCase()) {
            console.log("\n✅ MATCH! The Relayer address is correct.");
            console.log("👉 The issue is NOT the gatekeeper. It is the BIOMETRICS (P-256) or Expiry.");
        } else {
            console.log("\n❌ MISMATCH! The contract expects a different wallet.");
            console.log("👉 FIX: You must create a new Drop and set YOUR Relayer address as the gatekeeper.");
        }
    } catch (e) {
        console.error("❌ RPC CONNECTION FAILED:", e.message);
    }
}

main();
