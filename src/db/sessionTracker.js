const { recordLogin, recordLogout } = require('./database');

// steamId -> display name for currently known online players
const onlineCache = new Map();

async function pollSessions(rcon) {
  try {
    const raw = await rcon.send('playerlist');
    const players = JSON.parse(raw);
    const currentIds = new Set(players.map((p) => String(p.SteamID)));

    // Detect new joins
    for (const p of players) {
      const id = String(p.SteamID);
      if (!onlineCache.has(id)) {
        onlineCache.set(id, p.DisplayName);
        recordLogin(id, p.DisplayName);
        console.log(`📥 Session started: ${p.DisplayName} (${id})`);
      }
    }

    // Detect leaves
    for (const [id, name] of onlineCache) {
      if (!currentIds.has(id)) {
        onlineCache.delete(id);
        recordLogout(id, name);
        console.log(`📤 Session ended: ${name} (${id})`);
      }
    }
  } catch (err) {
    // RCON may be temporarily unavailable — silently skip
  }
}

function startSessionTracking(rcon) {
  const interval = parseInt(process.env.SESSION_POLL_INTERVAL) || 30;
  console.log(`🗄️  Session tracking started (polling every ${interval}s)`);
  setInterval(() => pollSessions(rcon), interval * 1000);
  // Run immediately on start
  pollSessions(rcon);
}

module.exports = { startSessionTracking };
