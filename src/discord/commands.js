const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  // ── Server Info ──────────────────────────────────────────
  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Show current Rust server status'),

  new SlashCommandBuilder()
    .setName('players')
    .setDescription('List currently online players'),

  new SlashCommandBuilder()
    .setName('wipeinfo')
    .setDescription('Show last wipe date, seed, map size and rustmaps link'),

  new SlashCommandBuilder()
    .setName('nextwipe')
    .setDescription('Show the scheduled next wipe date'),

  new SlashCommandBuilder()
    .setName('map')
    .setDescription('Post the rustmaps.com link for the current map'),

  // ── Player Lookup ────────────────────────────────────────
  new SlashCommandBuilder()
    .setName('playerinfo')
    .setDescription('Show session history and playtime for a player')
    .addStringOption((opt) =>
      opt.setName('player').setDescription('Player name or Steam ID').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('playtime')
    .setDescription('Quick playtime lookup for a player')
    .addStringOption((opt) =>
      opt.setName('player').setDescription('Player name').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('seen')
    .setDescription('Show when a player was last online')
    .addStringOption((opt) =>
      opt.setName('player').setDescription('Player name').setRequired(true)
    ),

  // ── Stats ────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName('serverreport')
    .setDescription('Generate a player activity report')
    .addIntegerOption((opt) =>
      opt.setName('days').setDescription('Time period in days').setRequired(true)
        .addChoices(
          { name: '30 days',  value: 30 },
          { name: '60 days',  value: 60 },
          { name: '90 days',  value: 90 },
          { name: '180 days', value: 180 },
          { name: 'All time', value: 9999 }
        )
    ),

  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Top 10 players by total playtime'),

  new SlashCommandBuilder()
    .setName('peakplayers')
    .setDescription('Show the highest concurrent player count ever recorded'),

  // ── Community / Fun ──────────────────────────────────────
  new SlashCommandBuilder()
    .setName('tip')
    .setDescription('Post a random Rust tip to in-game chat'),

  new SlashCommandBuilder()
    .setName('event')
    .setDescription('Announce a server event to Discord and in-game')
    .addStringOption((opt) =>
      opt.setName('description').setDescription('Event description (e.g. Raidable base at G12)').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('votewipe')
    .setDescription('Start a wipe vote in Discord (tallied after 5 minutes)'),

  // ── Admin Tools (restricted to CHANNEL_ADMIN) ────────────
  new SlashCommandBuilder()
    .setName('say')
    .setDescription('[Admin] Send a message to in-game chat')
    .addStringOption((opt) =>
      opt.setName('message').setDescription('Message to send').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('announce')
    .setDescription('[Admin] Broadcast a styled message to all in-game players')
    .addStringOption((opt) =>
      opt.setName('message').setDescription('Message to broadcast').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('alert')
    .setDescription('[Admin] Send a warning-style server message')
    .addStringOption((opt) =>
      opt.setName('message').setDescription('Warning message').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('restart')
    .setDescription('[Admin] Countdown restart warning to in-game chat')
    .addIntegerOption((opt) =>
      opt.setName('minutes').setDescription('Minutes until restart').setRequired(true)
        .addChoices(
          { name: '5 minutes',  value: 5 },
          { name: '10 minutes', value: 10 },
          { name: '15 minutes', value: 15 },
          { name: '30 minutes', value: 30 }
        )
    ),

  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('[Admin] Kick a player from the server')
    .addStringOption((opt) =>
      opt.setName('player').setDescription('Player name').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for kick').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('[Admin] Ban a player from the server')
    .addStringOption((opt) =>
      opt.setName('player').setDescription('Player name or Steam ID').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for ban').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('unban')
    .setDescription('[Admin] Unban a player by Steam ID')
    .addStringOption((opt) =>
      opt.setName('steamid').setDescription('Steam ID to unban').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('rcon')
    .setDescription('[Admin] Run a raw RCON command on the server')
    .addStringOption((opt) =>
      opt.setName('command').setDescription('RCON command to run').setRequired(true)
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
