const { EmbedBuilder } = require('discord.js');
const { getRcon } = require('../rcon/rconClient');

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
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply('\u274C Could not fetch server status.');
    }

  } else if (commandName === 'players') {
    await interaction.deferReply();
    try {
      const response = await rcon.send('playerlist');
      const players = JSON.parse(response);
      if (!players.length) {
        return interaction.editReply('No players currently online.');
      }
      const list = players.map((p) => `\u2022 **${p.DisplayName}** \u2014 ${p.SteamID}`).join('\n');
      const embed = new EmbedBuilder()
        .setTitle(`\uD83D\uDC65 Online Players (${players.length})`)
        .setColor(0x3498db)
        .setDescription(list)
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply('\u274C Could not fetch player list.');
    }

  } else if (commandName === 'rcon') {
    const roleId = process.env.RCON_ROLE_ID;
    if (roleId && !interaction.member.roles.cache.has(roleId)) {
      return interaction.reply({
        content: '\u274C You do not have permission to run RCON commands.',
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
      await interaction.editReply(`\u274C RCON error: ${err.message}`);
    }

  } else if (commandName === 'say') {
    await interaction.deferReply();
    const message = interaction.options.getString('message');
    const senderName = interaction.user.username;
    try {
      await rcon.send(`say [Discord] ${senderName}: ${message}`);
      await interaction.editReply(`\u2705 Sent to server: **${message}**`);
    } catch (err) {
      await interaction.editReply(`\u274C Failed to send message: ${err.message}`);
    }
  }
}

module.exports = { handleInteraction };
