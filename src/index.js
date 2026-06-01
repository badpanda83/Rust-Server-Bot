require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { connectRcon, startRconPolling, getRcon } = require('./rcon/rconClient');
const { registerCommands } = require('./discord/commands');
const { handleInteraction } = require('./discord/interactionHandler');
const { updateStatusEmbed } = require('./discord/statusEmbed');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('clientReady', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  await registerCommands(client);
  await connectRcon(client);
  startRconPolling(client);
  // Run status embed immediately on startup instead of waiting for first interval
  await updateStatusEmbed(getRcon(), client);
});

client.on('interactionCreate', (interaction) => handleInteraction(interaction));

client.login(process.env.DISCORD_TOKEN);
