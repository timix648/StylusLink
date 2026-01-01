const axios = require('axios');
const { ethers } = require('ethers');
require('dotenv').config();

const API_URL = 'http://localhost:4000/api';
const MY_DROP_ID = "395884"; 
const MY_ADDRESS = process.env.PRIVATE_KEY ? new ethers.Wallet(process.env.PRIVATE_KEY).address : "0x123...";

async function main() {
    console.log(`\n🤖 STARTING AI AGENT TEST FLOW...`);
    console.log(`   Target Drop: #${MY_DROP_ID}`);
    console.log(`   User: ${MY_ADDRESS}`);

    try {
        console.log(`\n🔎 Step 1: Asking AI to verify user...`);
        const verifyRes = await axios.post(`${API_URL}/verify`, {
            rule: "The secret password is 'StylusRocks'. User must say it.",
            user_data: {
                address: MY_ADDRESS,
                answer: "I am a real human developer.",
                latitude: 6.52,  
                longitude: 3.37
            }
        });

        console.log(`   AI Decision:`, verifyRes.data);

        if (!verifyRes.data.approved) {
            console.error("AI Rejected the user. Stopping.");
            return;
        }

        console.log(`\nStep 2: AI Approved! Submitting Claim to Blockchain...`);
        
        const claimRes = await axios.post(`${API_URL}/claim`, {
            dropId: MY_DROP_ID,
            receiver: MY_ADDRESS,
            biometricData: { 
                mock: true 
            }
        });

        console.log(`   CLAIM SUCCESS!`);
        console.log(`   Tx Hash: ${claimRes.data.txHash}`);
        console.log(`\nStep 3: Checking final status...`);
        await new Promise(r => setTimeout(r, 2000)); // Wait for chain update
        const statusRes = await axios.get(`${API_URL}/check-claim/${MY_DROP_ID}`);
        console.log(`   Final State:`, statusRes.data);

    } catch (e) {
        console.error("ERROR:", e.response ? e.response.data : e.message);
    }
}

main();