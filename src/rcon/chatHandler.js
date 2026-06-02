const { EmbedBuilder } = require('discord.js');

const processedMessages = new Set();
const keywords = (process.env.KEYWORD_LIST || 'cheat,hack,exploit')
  .split(',')
  .map((k) => k.trim().toLowerCase());

async function handleChatMessage(event, client, rcon) {
  const { UserId: steamId, Username: username, Message: message } = event;
  if (!message || !username) return;

  const msgId = `${event.Time}-${steamId}`;
  if (processedMessages.has(msgId)) return;
  processedMessages.add(msgId);
  if (processedMessages.size > 500) {
    processedMessages.delete(processedMessages.values().next().value);
  }

  try { await relayChatMessage(client, username, steamId, message); } catch (_) {}

  const lower = message.toLowerCase().trim();

  if (lower.startsWith('!report')) {
    await handleReport(client, rcon, username, steamId, message);
    return;
  }

  if (lower === '!pop') {
    await handlePop(rcon);
    return;
  }

  const hit = keywords.find((kw) => lower.includes(kw));
  if (hit) {
    await handleKeywordAlert(client, username, steamId, message, hit);
  }
}

async function handlePop(rcon) {
  try {
    const info = await rcon.send('serverinfo');
    let count = '?';
    let max = '?';
    try {
      const data = JSON.parse(info);
      count = data.Players ?? '?';
      max = data.MaxPlayers ?? '?';
    } catch (_) {}
    const quips = [
      `[POP] ${count}/${max} survivors still breathing.`,
      `[POP] ${count}/${max} players. They came, they farmed, they died.`,
      `[POP] ${count}/${max} poor souls roaming the island.`,
      `[POP] ${count}/${max} online. Most are probably naked with a rock.`,
    ];
    const reply = quips[Math.floor(Math.random() * quips.length)];
    await rcon.send(`say ${reply}`);
  } catch (err) {
    console.error('!pop error:', err.message);
  }
}

async function findPlayerOnline(rcon, nameQuery) {
  try {
    const raw = await rcon.send('playerlist');
    const players = JSON.parse(raw);
    const query = nameQuery.toLowerCase();
    // Try exact match first, then partial
    const match =
      players.find((p) => p.DisplayName.toLowerCase() === query) ||
      players.find((p) => p.DisplayName.toLowerCase().includes(query));
    if (match) {
      return { found: true, name: match.DisplayName, steamId: match.SteamID };
    }
  } catch (_) {}
  return { found: false };
}

async function relayChatMessage(client, username, steamId, message) {
  const channelId = process.env.CHANNEL_CHAT;
  if (!channelId) return;
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;
  await channel.send(`**${username}** (${steamId}): ${message}`);
}

async function handleReport(client, rcon, reporter, reporterSteamId, message) {
  const channelId = process.env.CHANNEL_REPORTS;
  if (!channelId) return;
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;

  const parts = message.split(' ');
  const reportedName = parts[1] || 'Unknown';
  const reason = parts.slice(2).join(' ') || 'No reason given';

  // Attempt to find the reported player in the online playerlist
  const lookup = await findPlayerOnline(rcon, reportedName);

  const reportedField = lookup.found
    ? `${lookup.name}\n[${lookup.steamId}](https://steamcommunity.com/profiles/${lookup.steamId})`
    : `${reportedName}\n*(not found online)*`;

  const embed = new EmbedBuilder()
    .setTitle('🚨 Admin Report')
    .setColor(0xff4444)
    .addFields(
      { name: 'Reporter', value: `${reporter} (${reporterSteamId})`, inline: true },
      { name: 'Reported Player', value: reportedField, inline: true },
      { name: 'Reason', value: reason },
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

async function handleKeywordAlert(client, username, steamId, message, keyword) {
  const channelId = process.env.CHANNEL_KEYWORDS;
  if (!channelId) return;
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle('🔍 Keyword Alert')
    .setColor(0xffa500)
    .addFields(
      { name: 'Player', value: `${username} (${steamId})`, inline: true },
      { name: 'Flagged Word', value: `\`${keyword}\``, inline: true },
      { name: 'Message', value: message },
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

module.exports = { handleChatMessage };
