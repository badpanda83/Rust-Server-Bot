require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { connectRcon, startRconPolling } = require('./rcon/rconClient');
const { registerCommands } = require('./discord/commands');
const { handleInteraction } = require('./discord/interactionHandler');

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
});

client.on('interactionCreate', (interaction) => handleInteraction(interaction));

client.login(process.env.DISCORD_TOKEN);
