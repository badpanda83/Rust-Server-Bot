const { EmbedBuilder } = require('discord.js');

let statusMessageId = null;

async function updateStatusEmbed(rcon, client) {
  const channelId = process.env.CHANNEL_STATUS;
  if (!channelId) return;
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;

  let embed;
  try {
    const info = await rcon.send('serverinfo');
    const data = JSON.parse(info);
    embed = new EmbedBuilder()
      .setTitle('🦀 Rust Server Status')
      .setColor(data.Players > 0 ? 0x2ecc71 : 0x95a5a6)
      .addFields(
        { name: '🗺️ Map', value: data.Map || 'Unknown', inline: true },
        { name: '👥 Players', value: `${data.Players}/${data.MaxPlayers}`, inline: true },
        { name: '⏳ Queue', value: String(data.Queued || 0), inline: true },
        { name: '🌱 Seed', value: String(data.WorldSeed || 'N/A'), inline: true },
        { name: '📐 Map Size', value: String(data.WorldSize || 'N/A'), inline: true },
        { name: '🕐 Game Time', value: String(data.GameTime || 'N/A'), inline: true },
      )
      .setFooter({ text: 'Last updated' })
      .setTimestamp();
  } catch {
    embed = new EmbedBuilder()
      .setTitle('🦀 Rust Server Status')
      .setColor(0xe74c3c)
      .setDescription('⚠️ Server appears to be offline or unreachable.')
      .setTimestamp();
  }

  try {
    if (statusMessageId) {
      const msg = await channel.messages.fetch(statusMessageId).catch(() => null);
      if (msg) {
        await msg.edit({ embeds: [embed] });
        return;
      }
    }
    const sent = await channel.send({ embeds: [embed] });
    statusMessageId = sent.id;
  } catch (err) {
    console.error('Status embed error:', err.message);
  }
}

module.exports = { updateStatusEmbed };
