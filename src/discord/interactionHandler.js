const { EmbedBuilder } = require('discord.js');
const { getRcon } = require('../rcon/rconClient');

function parseSeed(val) {
  if (val === undefined || val === null || val === '') return 'N/A';
  return String(val);
}

function parseMapSize(val) {
  if (val === undefined || val === null || val === '' || val === 0) return 'N/A';
  return String(val);
}

async function handleInteraction(interaction) {
  if (!interaction.isChatInputCommand()) return;

  const rcon = getRcon();
  const { commandName } = interaction;

  if (commandName === 'status') {
    await interaction.deferReply();
    try {
      const info = await rcon.send('serverinfo');
      const data = JSON.parse(info);
      const embed = new EmbedBuilder()
        .setTitle('🦀 Rust Server Status')
        .setColor(0x2ecc71)
        .addFields(
          { name: '🟢 Status', value: 'Online', inline: true },
          { name: '🗺️ Map', value: data.Map || 'Unknown', inline: true },
          { name: '👥 Players', value: `${data.Players}/${data.MaxPlayers}`, inline: true },
          { name: '⏳ Queue', value: String(data.Queued || 0), inline: true },
          { name: '🌱 Seed', value: parseSeed(data.WorldSeed), inline: true },
          { name: '📐 Map Size', value: parseMapSize(data.WorldSize), inline: true },
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
  }
}

module.exports = { handleInteraction };
