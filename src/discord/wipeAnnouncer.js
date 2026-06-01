const { EmbedBuilder } = require('discord.js');

async function announceWipe(client) {
  const channelId = process.env.CHANNEL_STATUS;
  if (!channelId) return;
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle('🗺️ MAP WIPE DETECTED!')
    .setColor(0xf39c12)
    .setDescription('The Rust server has wiped! A fresh map is now live. Come join!')
    .setTimestamp();

  await channel.send({ content: '@everyone', embeds: [embed] });
}

module.exports = { announceWipe };
