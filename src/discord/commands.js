const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Show current Rust server status'),

  new SlashCommandBuilder()
    .setName('players')
    .setDescription('List currently online players'),

  new SlashCommandBuilder()
    .setName('rcon')
    .setDescription('Run an RCON command on the server (admin only)')
    .addStringOption((opt) =>
      opt.setName('command').setDescription('RCON command to run').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('say')
    .setDescription('Send a message to in-game chat')
    .addStringOption((opt) =>
      opt.setName('message').setDescription('Message to send').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('serverreport')
    .setDescription('Generate a player activity report')
    .addIntegerOption((opt) =>
      opt
        .setName('days')
        .setDescription('Time period in days (e.g. 30, 60, 90)')
        .setRequired(true)
        .addChoices(
          { name: '30 days', value: 30 },
          { name: '60 days', value: 60 },
          { name: '90 days', value: 90 },
          { name: '180 days', value: 180 },
          { name: 'All time', value: 9999 }
        )
    ),
].map((cmd) => cmd.toJSON());

async function registerCommands(client) {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, process.env.DISCORD_GUILD_ID),
      { body: commands }
    );
    console.log('✅ Slash commands registered');
  } catch (err) {
    console.error('Failed to register commands:', err);
  }
}

module.exports = { registerCommands };
