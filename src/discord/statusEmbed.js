const { EmbedBuilder } = require('discord.js');

let statusMessageId = null;

function extractValue(raw) {
  if (!raw) return 'N/A';
  // Strips prefix like 'server.seed: "39084899"' or 'server.worldsize: "6000"'
  const match = raw.match(/:\s*"?([^"\s]+)"?/);
  return match ? match[1] : raw.trim();
}

async function updateStatusEmbed(rcon, client) {
  const channelId = process.env.CHANNEL_STATUS;
  if (!channelId) return;
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;

  let embed;
  try {
    const [info, seedRaw, sizeRaw] = await Promise.all([
      rcon.send('serverinfo'),
      rcon.send('server.seed'),
      rcon.send('server.worldsize'),
    ]);
    const data = JSON.parse(info);
    const seed = extractValue(seedRaw);
    const mapSize = extractValue(sizeRaw);

    embed = new EmbedBuilder()
      .setTitle('\uD83E\uDD80 Rust Server Status')
      .setColor(0x2ecc71)
      .addFields(
        { name: '\uD83D\uDFE2 Status', value: 'Online', inline: true },
        { name: '\uD83D\uDDFA\uFE0F Map', value: data.Map || 'Unknown', inline: true },
        { name: '\uD83D\uDC65 Players', value: `${data.Players}/${data.MaxPlayers}`, inline: true },
        { name: '\u23F3 Queue', value: String(data.Queued || 0), inline: true },
        { name: '\uD83C\uDF31 Seed', value: seed, inline: true },
        { name: '\uD83D\uDCD0 Map Size', value: mapSize, inline: true },
        { name: '\uD83D\uDD50 Game Time', value: String(data.GameTime || 'N/A'), inline: true },
      )
      .setFooter({ text: 'Last updated' })
      .setTimestamp();
  } catch {
    embed = new EmbedBuilder()
      .setTitle('\uD83E\uDD80 Rust Server Status')
      .setColor(0xe74c3c)
      .addFields({ name: '\uD83D\uDD34 Status', value: 'Offline', inline: true })
      .setDescription('\u26A0\uFE0F Server appears to be offline or unreachable.')
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
