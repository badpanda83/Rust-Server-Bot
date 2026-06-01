const WebSocket = require('ws');
const { handleChatLog } = require('./chatHandler');

let ws = null;
let authenticated = false;
let lastSeed = null;
let messageId = 1;
const pending = new Map();

function sendRaw(data) {
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
    ws.send(JSON.stringify({ Identifier: id, Message: data, Name: 'RustServerBot' }));
  });
}

async function connectRcon(client) {
  const host = process.env.RCON_HOST;
  const port = parseInt(process.env.RCON_PORT) || 28016;
  const password = process.env.RCON_PASSWORD;
  const url = `ws://${host}:${port}/${password}`;

  console.log(`🔌 Connecting to RCON at ws://${host}:${port}/...`);

  ws = new WebSocket(url);

  ws.on('open', () => {
    authenticated = true;
    console.log('✅ RCON connected (WebSocket)');
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      const handler = pending.get(msg.Identifier);
      if (handler) {
        clearTimeout(handler.timeout);
        pending.delete(msg.Identifier);
        handler.resolve(msg.Message || '');
      } else if (msg.Message) {
        // Unsolicited message (e.g. chat) — pass to chat handler
        handleChatLog(msg.Message, client).catch(() => {});
      }
    } catch (_) {}
  });

  ws.on('error', (err) => {
    console.error('RCON WebSocket error:', err.message);
  });

  ws.on('close', () => {
    authenticated = false;
    console.warn('⚠️ RCON disconnected. Reconnecting in 10s...');
    // Reject all pending
    for (const [id, handler] of pending) {
      clearTimeout(handler.timeout);
      handler.reject(new Error('RCON disconnected'));
      pending.delete(id);
    }
    setTimeout(() => connectRcon(client), 10000);
  });

  // Wait for connection to open
  await new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
}

function getRcon() {
  return { send: sendRaw, isConnected: () => authenticated };
}

function startRconPolling(client) {
  // Poll chat logs every 2 seconds
  setInterval(async () => {
    if (!authenticated) return;
    try {
      const response = await sendRaw('global.chatlog 50');
      await handleChatLog(response, client);
    } catch (err) {
      console.error('Chat polling error:', err.message);
    }
  }, 2000);

  // Update server status embed on an interval
  const statusInterval = parseInt(process.env.STATUS_INTERVAL) || 60;
  setInterval(async () => {
    if (!authenticated) return;
    try {
      const { updateStatusEmbed } = require('../discord/statusEmbed');
      await updateStatusEmbed(getRcon(), client);
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
