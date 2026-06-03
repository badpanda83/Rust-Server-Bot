const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');
const { openTicket, closeTicket, getTicketByChannelId } = require('../db/database');

// Called once by /setuptickets to post the persistent panel
async function postTicketPanel(channel) {
  const embed = new EmbedBuilder()
    .setTitle('🎫 Support Tickets')
    .setColor(0xe67e22)
    .setDescription(
      'Need help? Click the button below to open a support ticket.\n\n' +
      '**Categories available:**\n' +
      '🔧 General Help\n' +
      '🚨 Report a Player\n' +
      '⚖️ Ban Appeal\n' +
      '❓ Other'
    )
    .setFooter({ text: 'A private channel will be created just for you.' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_open')
      .setLabel('📩 Open a Ticket')
      .setStyle(ButtonStyle.Primary)
  );

  await channel.send({ embeds: [embed], components: [row] });
}

// Handles the "Open a Ticket" button — shows the modal form
async function handleTicketButton(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('ticket_modal')
    .setTitle('Open a Support Ticket');

  const categoryInput = new TextInputBuilder()
    .setCustomId('ticket_category')
    .setLabel('Category')
    .setPlaceholder('General Help / Report a Player / Ban Appeal / Other')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(50);

  const descriptionInput = new TextInputBuilder()
    .setCustomId('ticket_description')
    .setLabel('Describe your issue')
    .setPlaceholder('Please provide as much detail as possible...')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000);

  modal.addComponents(
    new ActionRowBuilder().addComponents(categoryInput),
    new ActionRowBuilder().addComponents(descriptionInput)
  );

  await interaction.showModal(modal);
}

// Handles modal submission — creates private ticket channel
async function handleTicketModal(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const category    = interaction.fields.getTextInputValue('ticket_category');
  const description = interaction.fields.getTextInputValue('ticket_description');
  const guild       = interaction.guild;
  const user        = interaction.user;

  // Check user doesn't already have an open ticket
  const existing = getTicketByChannelId(null, user.id);
  if (existing) {
    return interaction.editReply(`❌ You already have an open ticket: <#${existing.channel_id}>`);
  }

  const adminRoleId = process.env.TICKET_ADMIN_ROLE;
  let resolvedAdminRole = null;
  if (adminRoleId) {
    resolvedAdminRole = guild.roles.cache.get(adminRoleId)
      || await guild.roles.fetch(adminRoleId).catch(() => null);
    if (!resolvedAdminRole) {
      console.warn(`[Tickets] TICKET_ADMIN_ROLE "${adminRoleId}" not found in guild — skipping role overwrite.`);
    }
  }

  const channelName = `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  // NOTE: Only ViewChannel, SendMessages, ReadMessageHistory are set in overwrites.
  // ManageChannels is intentionally excluded — setting it in an overwrite requires
  // the bot to have Manage Roles, which is a larger permission than needed.
  // Ticket closing is handled exclusively via the Close Ticket button.
  const permissionOverwrites = [
    {
      id: guild.roles.everyone,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
  ];

  if (resolvedAdminRole) {
    permissionOverwrites.push({
      id: resolvedAdminRole.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    });
  }

  let ticketChannel;
  try {
    ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      permissionOverwrites,
    });
  } catch (err) {
    console.error('Failed to create ticket channel:', err);
    return interaction.editReply(
      `❌ Could not create ticket channel.\n**Reason:** ${err.message}\n\n` +
      `Make sure the bot role has **Manage Channels** in Server Settings → Roles.`
    );
  }

  // Log to DB
  const ticketId = openTicket(user.id, user.username, ticketChannel.id, category, description);

  // Post the ticket embed inside the new channel
  const ticketEmbed = new EmbedBuilder()
    .setTitle(`🎫 Ticket #${ticketId} — ${category}`)
    .setColor(0xe67e22)
    .addFields(
      { name: '👤 Opened by', value: `<@${user.id}>`, inline: true },
      { name: '📂 Category',  value: category,         inline: true },
      { name: '📝 Issue',     value: description },
    )
    .setFooter({ text: 'An admin will be with you shortly.' })
    .setTimestamp();

  const closeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('🔒 Close Ticket')
      .setStyle(ButtonStyle.Danger)
  );

  await ticketChannel.send({
    content: resolvedAdminRole ? `<@${user.id}> <@&${resolvedAdminRole.id}>` : `<@${user.id}>`,
    embeds: [ticketEmbed],
    components: [closeRow],
  });

  await interaction.editReply(`✅ Your ticket has been opened: ${ticketChannel}`);
}

// Handles the "Close Ticket" button
async function handleTicketClose(interaction) {
  await interaction.deferReply();

  const channelId = interaction.channelId;
  const ticket    = getTicketByChannelId(channelId);

  if (!ticket) {
    return interaction.editReply('❌ This does not appear to be an active ticket.');
  }

  // Collect recent messages for transcript
  const messages = await interaction.channel.messages.fetch({ limit: 50 });
  const transcript = [...messages.values()]
    .reverse()
    .filter((m) => !m.author.bot || m.embeds.length === 0)
    .map((m) => `[${new Date(m.createdTimestamp).toISOString()}] ${m.author.username}: ${m.content}`)
    .join('\n');

  // Close in DB
  closeTicket(channelId);

  // Post to log channel
  const logChannelId = process.env.CHANNEL_TICKET_LOG;
  if (logChannelId) {
    const logChannel = await interaction.client.channels.fetch(logChannelId).catch(() => null);
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setTitle(`🔒 Ticket #${ticket.id} Closed — ${ticket.category}`)
        .setColor(0x95a5a6)
        .addFields(
          { name: '👤 User',      value: `${ticket.username} (${ticket.user_id})`, inline: true },
          { name: '📂 Category',  value: ticket.category,                          inline: true },
          { name: '📝 Issue',     value: ticket.description },
          { name: '🕐 Opened',    value: ticket.opened_at + ' UTC',                inline: true },
          { name: '🔒 Closed by', value: `${interaction.user.username}`,           inline: true },
        )
        .setTimestamp();

      await logChannel.send({ embeds: [logEmbed] });

      if (transcript.length > 0) {
        const truncated = transcript.length > 1900 ? transcript.slice(-1900) + '\n...' : transcript;
        await logChannel.send(`**Transcript:**\n\`\`\`\n${truncated}\n\`\`\``);
      }
    }
  }

  await interaction.editReply('🔒 Ticket closed. This channel will be deleted in 5 seconds.');
  setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
}

module.exports = { postTicketPanel, handleTicketButton, handleTicketModal, handleTicketClose };
