const WebSocket = require('ws');
const { handleChatMessage } = require('./chatHandler');

let ws = null;
let rconInstance = null;
let authenticated = false;
let lastSeed = null;
let messageId = 1;
const pending = new Map();

function sendRaw(message) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return Promise.reject(new Error('RCON not connected'));
  }
  return new Promise((resolve, reject) => {
    const id = messageId++;
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error('RCON command timed out'));
    }, 10000);
    pending.set(id, { resolve, reject, timeout });
    ws.send(JSON.stringify({ Identifier: id, Message: message, Name: 'RustServerBot' }));
  });
}

function getRcon() {
  return rconInstance;
}

async function connectRcon(client) {
  const host = process.env.RCON_HOST;
  const port = parseInt(process.env.RCON_PORT) || 28016;
  const password = process.env.RCON_PASSWORD;
  const url = `ws://${host}:${port}/${password}`;

  console.log(`🔌 Connecting to RCON at ws://${host}:${port}/...`);

  ws = new WebSocket(url);
  rconInstance = { send: sendRaw, isConnected: () => authenticated };

  ws.on('open', () => {
    authenticated = true;
    console.log('✅ RCON connected (WebSocket)');
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);

      // Resolve a pending command response
      const handler = pending.get(msg.Identifier);
      if (handler) {
        clearTimeout(handler.timeout);
        pending.delete(msg.Identifier);
        handler.resolve(msg.Message || '');
        return;
      }

      // Identifier -1 = unsolicited push event from the server
      if (msg.Identifier === -1 && msg.Message) {
        try {
          const event = JSON.parse(msg.Message);
          if (event.Type === 'chat' || event.Channel !== undefined) {
            // Pass rconInstance directly — no circular require needed
            handleChatMessage(event, client, rconInstance).catch(() => {});
          }
        } catch (_) {}
      }
    } catch (_) {}
  });

  ws.on('error', (err) => {
    console.error('RCON WebSocket error:', err.message);
  });

  ws.on('close', () => {
    authenticated = false;
    console.warn('⚠️ RCON disconnected. Reconnecting in 10s...');
    for (const [id, handler] of pending) {
      clearTimeout(handler.timeout);
      handler.reject(new Error('RCON disconnected'));
      pending.delete(id);
    }
    setTimeout(() => connectRcon(client), 10000);
  });

  await new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
}

function startRconPolling(client) {
  const statusInterval = parseInt(process.env.STATUS_INTERVAL) || 60;
  setInterval(async () => {
    if (!authenticated) return;
    try {
      const { updateStatusEmbed } = require('../discord/statusEmbed');
      await updateStatusEmbed(rconInstance, client);
    } catch (err) {
      console.error('Status update error:', err.message);
    }
  }, statusInterval * 1000);

  // Check for wipe (seed change) every 5 minutes
  setInterval(async () => {
    if (!authenticated) return;
    try {
      const seed = (await sendRaw('server.seed')).trim();
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
