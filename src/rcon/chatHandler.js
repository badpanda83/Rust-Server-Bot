const { EmbedBuilder } = require('discord.js');

const processedMessages = new Set();
const keywords = (process.env.KEYWORD_LIST || 'cheat,hack,exploit')
  .split(',')
  .map((k) => k.trim().toLowerCase());

// Called for each real-time push event from Rust RCON (Identifier: -1)
async function handleChatMessage(event, client) {
  // Rust push event shape: { Type, UserId, Username, Message, Time, Channel, Color }
  const { UserId: steamId, Username: username, Message: message } = event;
  if (!message || !username) return;

  // Deduplicate by time + userId
  const msgId = `${event.Time}-${steamId}`;
  if (processedMessages.has(msgId)) return;
  processedMessages.add(msgId);
  if (processedMessages.size > 500) {
    processedMessages.delete(processedMessages.values().next().value);
  }

  // Relay to chat channel
  await relayChatMessage(client, username, steamId, message);

  // Handle !report command
  if (message.toLowerCase().startsWith('!report')) {
    await handleReport(client, username, steamId, message);
    return;
  }

  // Keyword detection
  const lower = message.toLowerCase();
  const hit = keywords.find((kw) => lower.includes(kw));
  if (hit) {
    await handleKeywordAlert(client, username, steamId, message, hit);
  }
}

async function relayChatMessage(client, username, steamId, message) {
  const channelId = process.env.CHANNEL_CHAT;
  if (!channelId) return;
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;
  await channel.send(`**${username}** (${steamId}): ${message}`);
}

async function handleReport(client, reporter, reporterSteamId, message) {
  const channelId = process.env.CHANNEL_REPORTS;
  if (!channelId) return;
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;

  const parts = message.split(' ');
  const reported = parts[1] || 'Unknown';
  const reason = parts.slice(2).join(' ') || 'No reason given';

  const embed = new EmbedBuilder()
    .setTitle('🚨 Admin Report')
    .setColor(0xff4444)
    .addFields(
      { name: 'Reporter', value: `${reporter} (${reporterSteamId})`, inline: true },
      { name: 'Reported Player', value: reported, inline: true },
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
