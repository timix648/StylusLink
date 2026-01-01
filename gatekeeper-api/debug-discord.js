require('dotenv').config();
const axios = require('axios');
const CONFIG = {
    guildId: "1453315409787883647", 
    userId: "742808637751165080",  
    roleId: "1453315719130251314"  
};

async function checkDiscord() {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) return console.error("❌ No Token in .env");

    console.log("🔍 Checking Discord API direct connection...");

    try {
        const url = `https://discord.com/api/v10/guilds/${CONFIG.guildId}/members/${CONFIG.userId}`;
        const res = await axios.get(url, {
            headers: { Authorization: `Bot ${token}` }
        });

        console.log("User Found:", res.data.user.username);
        console.log("Roles User Has:", res.data.roles);
        console.log("Role We Want:", CONFIG.roleId);

        if (res.data.roles.includes(CONFIG.roleId)) {
            console.log("SUCCESS: User HAS the role!");
        } else {
            console.log("FAILURE: User does NOT have the role.");
            console.log("Go to Discord -> Server Settings -> Roles -> Assign it to yourself.");
        }

    } catch (e) {
        console.error("API ERROR:", e.response ? e.response.data : e.message);
        if (e.response?.status === 404) console.log("Cause: User not in server OR Bot not in server.");
        if (e.response?.status === 403) console.log("Cause: Bot lacks 'View Channels' permission.");
    }
}

checkDiscord();