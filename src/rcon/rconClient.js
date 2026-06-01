const { Rcon } = require('rcon-client');
const { handleChatLog } = require('./chatHandler');

let rcon = null;
let lastSeed = null;

async function connectRcon(client) {
  rcon = new Rcon({
    host: process.env.RCON_HOST,
    port: parseInt(process.env.RCON_PORT) || 28016,
    password: process.env.RCON_PASSWORD,
  });

  rcon.on('authenticated', () => console.log('✅ RCON connected'));
  rcon.on('error', (err) => console.error('RCON error:', err));
  rcon.on('end', () => {
    console.warn('⚠️ RCON disconnected. Reconnecting in 10s...');
    setTimeout(() => connectRcon(client), 10000);
  });

  await rcon.connect();
  return rcon;
}

function getRcon() {
  return rcon;
}

function startRconPolling(client) {
  // Poll chat logs every 2 seconds
  setInterval(async () => {
    if (!rcon) return;
    try {
      const response = await rcon.send('global.chatlog 50');
      await handleChatLog(response, client);
    } catch (err) {
      console.error('Chat polling error:', err.message);
    }
  }, 2000);

  // Update server status embed on an interval
  const statusInterval = parseInt(process.env.STATUS_INTERVAL) || 60;
  setInterval(async () => {
    if (!rcon) return;
    try {
      const { updateStatusEmbed } = require('../discord/statusEmbed');
      await updateStatusEmbed(rcon, client);
    } catch (err) {
      console.error('Status update error:', err.message);
    }
  }, statusInterval * 1000);

  // Check for wipe (seed change) every 5 minutes
  setInterval(async () => {
    if (!rcon) return;
    try {
      const seed = (await rcon.send('server.seed')).trim();
      if (lastSeed !== null && seed !== lastSeed) {
        const { announceWipe } = require('../discord/wipeAnnouncer');
        await announceWipe(client);
      }
      lastSeed = seed;
    } catch (err) {
      console.error('Wipe check error:', err.message);
    }
  }, 5 * 60 * 1000);
}

module.exports = { connectRcon, getRcon, startRconPolling };
