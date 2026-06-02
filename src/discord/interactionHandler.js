const { EmbedBuilder } = require('discord.js');
const { getRcon } = require('../rcon/rconClient');
const { getPlayerReport, formatMinutes } = require('../db/reportQueries');

function extractValue(raw) {
  if (!raw) return 'N/A';
  const match = raw.match(/:\s*"?([^"\s]+)"?/);
  return match ? match[1] : raw.trim();
}

async function handleInteraction(interaction) {
  if (!interaction.isChatInputCommand()) return;

  const rcon = getRcon();
  const { commandName } = interaction;

  if (commandName === 'status') {
    await interaction.deferReply();
    try {
      const [info, seedRaw, sizeRaw] = await Promise.all([
        rcon.send('serverinfo'),
        rcon.send('server.seed'),
        rcon.send('server.worldsize'),
      ]);
      const data = JSON.parse(info);
      const seed = extractValue(seedRaw);
      const mapSize = extractValue(sizeRaw);

      const embed = new EmbedBuilder()
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
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply('❌ Could not fetch server status.');
    }

  } else if (commandName === 'players') {
    await interaction.deferReply();
    try {
      const response = await rcon.send('playerlist');
      const players = JSON.parse(response);
      if (!players.length) {
        return interaction.editReply('No players currently online.');
      }
      const list = players.map((p) => `• **${p.DisplayName}** — ${p.SteamID}`).join('\n');
      const embed = new EmbedBuilder()
        .setTitle(`👥 Online Players (${players.length})`)
        .setColor(0x3498db)
        .setDescription(list)
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply('❌ Could not fetch player list.');
    }

  } else if (commandName === 'rcon') {
    const roleId = process.env.RCON_ROLE_ID;
    if (roleId && !interaction.member.roles.cache.has(roleId)) {
      return interaction.reply({
        content: '❌ You do not have permission to run RCON commands.',
        ephemeral: true,
      });
    }
    await interaction.deferReply({ ephemeral: true });
    const command = interaction.options.getString('command');
    try {
      const result = await rcon.send(command);
      await interaction.editReply(
        `**Command:** \`${command}\`\n**Response:**\n\`\`\`${result || '(no output)'}\`\`\``
      );
    } catch (err) {
      await interaction.editReply(`❌ RCON error: ${err.message}`);
    }

  } else if (commandName === 'say') {
    await interaction.deferReply();
    const message = interaction.options.getString('message');
    const senderName = interaction.user.username;
    try {
      await rcon.send(`say [Discord] ${senderName}: ${message}`);
      await interaction.editReply(`✅ Sent to server: **${message}**`);
    } catch (err) {
      await interaction.editReply(`❌ Failed to send message: ${err.message}`);
    }

  } else if (commandName === 'serverreport') {
    await interaction.deferReply();
    try {
      const days = interaction.options.getInteger('days');
      const label = days >= 9999 ? 'All Time' : `Last ${days} Days`;
      const { total_unique, repeat_players, avg_minutes, total_sessions, topPlayers } = getPlayerReport(days);

      const topList = topPlayers.length
        ? topPlayers
            .map((p, i) => {
              const medal = ['🥇','🥈','🥉','4️⃣','5️⃣'][i];
              return `${medal} **${p.name}** — ${formatMinutes(p.total_minutes)} (${p.sessions} session${p.sessions !== 1 ? 's' : ''})`;
            })
            .join('\n')
        : 'No data yet';

      const returnRate = total_unique > 0
        ? `${Math.round((repeat_players / total_unique) * 100)}%`
        : 'N/A';

      const embed = new EmbedBuilder()
        .setTitle(`📊 Server Report — ${label}`)
        .setColor(0x9b59b6)
        .addFields(
          { name: '👤 Unique Players', value: String(total_unique || 0), inline: true },
          { name: '🔁 Repeat Players', value: `${repeat_players || 0} (${returnRate})`, inline: true },
          { name: '📋 Total Sessions', value: String(total_sessions || 0), inline: true },
          { name: '⏱️ Avg Session Length', value: formatMinutes(avg_minutes || 0), inline: true },
          { name: '🏆 Top Players by Time', value: topList },
        )
        .setFooter({ text: `Report generated` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('serverreport error:', err);
      await interaction.editReply('❌ Could not generate report.');
    }
  }
}

module.exports = { handleInteraction };
