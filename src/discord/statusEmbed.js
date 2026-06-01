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

    // WorldSeed and WorldSize can come back as 0 or missing — handle both
    const seed = (data.WorldSeed !== undefined && data.WorldSeed !== null && data.WorldSeed !== '') ? String(data.WorldSeed) : 'N/A';
    const mapSize = (data.WorldSize !== undefined && data.WorldSize !== null && data.WorldSize !== 0 && data.WorldSize !== '') ? String(data.WorldSize) : 'N/A';

    embed = new EmbedBuilder()
      .setTitle('🦀 Rust Server Status')
      .setColor(0x2ecc71)
      .addFields(
        { name: '🟢 Status', value: 'Online', inline: true },
        { name: '🗺️ Map', value: data.Map || 'Unknown', inline: true },
        { name: '👥 Players', value: `${data.Players}/${data.MaxPlayers}`, inline: true },
        { name: '⏳ Queue', value: String(data.Queued || 0), inline: true },
        { name: '🌱 Seed', value: seed, inline: true },
        { name: '📐 Map Size', value: mapSize, inline: true },
        { name: '🕐 Game Time', value: String(data.GameTime || 'N/A'), inline: true },
      )
      .setFooter({ text: 'Last updated' })
      .setTimestamp();
  } catch {
    embed = new EmbedBuilder()
      .setTitle('🦀 Rust Server Status')
      .setColor(0xe74c3c)
      .addFields({ name: '🔴 Status', value: 'Offline', inline: true })
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
