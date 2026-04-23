import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Client, GatewayIntentBits } from "discord.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

/* =========================================
   🔥 DISCORD BOT SETUP
========================================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
});

const statusMap = {};
const lastUpdated = {};

/* =========================================
   ✅ READY EVENT (FIXED + INITIAL LOAD)
========================================= */

client.once("clientReady", async () => {
  console.log(`✅ Bot Logged in as ${client.user.tag}`);

  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);

    // 🔥 fetch all members WITH presence
    const members = await guild.members.fetch();

    // ✅ preload statuses (IMPORTANT FIX)
    members.forEach((member) => {
      const status = member.presence?.status || "offline";
      statusMap[member.id] = status;
      lastUpdated[member.id] = Date.now();
    });

    console.log("✅ Members fetched + initial presence cached");
  } catch (err) {
    console.error("❌ Error fetching guild:", err);
  }
});

/* =========================================
   🔥 PRESENCE LISTENER (REAL-TIME)
========================================= */

client.on("presenceUpdate", (oldPresence, newPresence) => {
  if (!newPresence?.userId) return;

  const userId = newPresence.userId;
  const status = newPresence.status || "offline";

  statusMap[userId] = status;
  lastUpdated[userId] = Date.now();

  console.log(`📡 ${userId} → ${status}`);
});

/* =========================================
   ✅ FIXED STATUS FUNCTION (NO BUG)
========================================= */

function getStatus(userId) {
  // 🔥 ALWAYS trust latest event data
  if (statusMap[userId]) {
    return statusMap[userId];
  }

  return "offline";
}

/* =========================================
   🌐 API ROUTES
========================================= */

// 🔥 POST (for frontend usage)
app.post("/api/staff-status", (req, res) => {
  const staffList = req.body;

  if (!Array.isArray(staffList)) {
    return res.status(400).json({ error: "Invalid data" });
  }

  const result = staffList.map((staff) => ({
    ...staff,
    status: getStatus(staff.discordId),
  }));

  res.json(result);
});

/* =========================================
   🔥 GET ROUTE (FOR TESTING IN BROWSER)
========================================= */

app.get("/status", (req, res) => {
  const idsParam = req.query.ids;

  if (!idsParam) {
    return res.status(400).json({ error: "Provide ids query param" });
  }

  const ids = idsParam.split(",");

  const result = ids.map((id) => ({
    discordId: id,
    status: getStatus(id),
  }));

  res.json(result);
});

/* =========================================
   🔥 HEALTH CHECK
========================================= */

app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

/* =========================================
   🚀 START SERVER + BOT
========================================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🌐 API running on port ${PORT}`);
});

client.login(process.env.DISCORD_TOKEN);