const { EmbedBuilder } = require('discord.js');
const { findPlayerInDb } = require('../db/database');

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

  // Only relay global chat (Channel 0) to Discord, ignore team chat (Channel 1)
  if (event.Channel === 0) {
    try { await relayChatMessage(client, username, steamId, message); } catch (_) {}
  }

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

  // Look up in DB (online first, then recently seen)
  const lookup = findPlayerInDb(reportedName);

  let reportedField;
  if (lookup.found && lookup.online) {
    reportedField = `${lookup.name}\n[${lookup.steamId}](https://steamcommunity.com/profiles/${lookup.steamId})\n✅ Currently online`;
  } else if (lookup.found && !lookup.online) {
    const lastSeen = lookup.lastSeen ? `\nLast seen: ${lookup.lastSeen} UTC` : '';
    reportedField = `${lookup.name}\n[${lookup.steamId}](https://steamcommunity.com/profiles/${lookup.steamId})\n⚠️ Recently offline${lastSeen}`;
  } else {
    reportedField = `${reportedName}\n*(not found in records)*`;
  }

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
