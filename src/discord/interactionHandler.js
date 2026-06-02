const { EmbedBuilder } = require('discord.js');
const { getRcon } = require('../rcon/rconClient');
const { getPlayerReport, formatMinutes } = require('../db/reportQueries');
const { findPlayerInDb } = require('../db/database');
const Database = require('better-sqlite3');
const path = require('path');

// ── Admin commands restricted to CHANNEL_ADMIN ────────────────────────────────
const ADMIN_COMMANDS = new Set([
  'say', 'announce', 'alert', 'restart', 'kick', 'ban', 'unban', 'rcon',
]);

const RUST_TIPS = [
  'Always carry a sleeping bag — death without a bag means a long walk.',
  'Wood doors can be destroyed with a hatchet. Always upgrade ASAP!',
  'Crouching makes you harder to hit at long range.',
  'Recyclers at monuments give you components — always recycle before you leave.',
  'Hemp grows near roads and rivers. Early game cloth is crucial.',
  'Keep a rock in your hotbar — you can always fall back on it.',
  'Sulfur ore has yellow spots. Learn to spot it quickly.',
  'A sheet metal door costs only 150 metal frags and is much stronger than wood.',
  'Build your base entrance facing away from roads to avoid drive-by raiders.',
  'Tool cupboards prevent others from building near your base — place one immediately.',
  'Bandages stop bleeding. Always carry a few.',
  'Wolves and bears are more dangerous than most players early game — run.',
  'You can pick up placed campfires and sleeping bags within a short window.',
  'Use a furnace to smelt ore — campfires are much slower.',
  'Explosives are expensive. Scout a base before committing to a raid.',
];

function extractValue(raw) {
  if (!raw) return 'N/A';
  const match = raw.match(/:\s*"?([^"\s]+)"?/);
  return match ? match[1] : raw.trim();
}

function getDb() {
  return new Database(path.join(__dirname, '../../data/sessions.db'), { readonly: true });
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return 'Never';
  const diff = Math.floor((Date.now() - new Date(dateStr + ' UTC').getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

async function isAdminChannel(interaction) {
  const adminChannelId = process.env.CHANNEL_ADMIN;
  if (!adminChannelId) return true; // not configured = no restriction
  if (interaction.channelId !== adminChannelId) {
    await interaction.reply({
      content: `⛔ Admin commands can only be used in <#${adminChannelId}>.`,
      ephemeral: true,
    });
    return false;
  }
  return true;
}

async function handleInteraction(interaction) {
  if (!interaction.isChatInputCommand()) return;

  const rcon = getRcon();
  const { commandName } = interaction;

  // Gate admin commands to the admin channel
  if (ADMIN_COMMANDS.has(commandName)) {
    if (!(await isAdminChannel(interaction))) return;
  }

  // ── STATUS ───────────────────────────────────────────────────────────────────
  if (commandName === 'status') {
    await interaction.deferReply();
    try {
      const [info, seedRaw, sizeRaw] = await Promise.all([
        rcon.send('serverinfo'),
        rcon.send('server.seed'),
        rcon.send('server.worldsize'),
      ]);
      const data = JSON.parse(info);
      const embed = new EmbedBuilder()
        .setTitle('🦀 Rust Server Status')
        .setColor(0x2ecc71)
        .addFields(
          { name: '🟢 Status',    value: 'Online',                             inline: true },
          { name: '🗺️ Map',       value: data.Map || 'Unknown',                inline: true },
          { name: '👥 Players',   value: `${data.Players}/${data.MaxPlayers}`, inline: true },
          { name: '⏳ Queue',     value: String(data.Queued || 0),             inline: true },
          { name: '🌱 Seed',      value: extractValue(seedRaw),                inline: true },
          { name: '📐 Map Size',  value: extractValue(sizeRaw),                inline: true },
          { name: '🕐 Game Time', value: String(data.GameTime || 'N/A'),       inline: true },
        )
        .setFooter({ text: 'Last updated' })
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    } catch { await interaction.editReply('❌ Could not fetch server status.'); }

  // ── PLAYERS ──────────────────────────────────────────────────────────────────
  } else if (commandName === 'players') {
    await interaction.deferReply();
    try {
      const players = JSON.parse(await rcon.send('playerlist'));
      if (!players.length) return interaction.editReply('No players currently online.');
      const list = players.map((p) => `• **${p.DisplayName}** — ${p.SteamID}`).join('\n');
      const embed = new EmbedBuilder()
        .setTitle(`👥 Online Players (${players.length})`)
        .setColor(0x3498db)
        .setDescription(list)
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    } catch { await interaction.editReply('❌ Could not fetch player list.'); }

  // ── WIPE INFO ────────────────────────────────────────────────────────────────
  } else if (commandName === 'wipeinfo') {
    await interaction.deferReply();
    try {
      const [seedRaw, sizeRaw] = await Promise.all([
        rcon.send('server.seed'),
        rcon.send('server.worldsize'),
      ]);
      const seed = extractValue(seedRaw);
      const size = extractValue(sizeRaw);
      const lastWipe = process.env.LAST_WIPE_DATE || 'Not configured';
      const mapUrl = `https://rustmaps.com/map/${size}/${seed}`;
      const embed = new EmbedBuilder()
        .setTitle('🗺️ Wipe Info')
        .setColor(0xe67e22)
        .addFields(
          { name: '📅 Last Wipe', value: lastWipe, inline: true },
          { name: '🌱 Seed',      value: seed,     inline: true },
          { name: '📐 Map Size',  value: size,     inline: true },
          { name: '🔗 Map Link',  value: `[View on RustMaps](${mapUrl})` },
        )
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    } catch { await interaction.editReply('❌ Could not fetch wipe info.'); }

  // ── NEXT WIPE ────────────────────────────────────────────────────────────────
  } else if (commandName === 'nextwipe') {
    const nextWipe = process.env.NEXT_WIPE_DATE || 'Not scheduled yet';
    const embed = new EmbedBuilder()
      .setTitle('📅 Next Wipe')
      .setColor(0xe74c3c)
      .setDescription(`Next wipe is scheduled for: **${nextWipe}**`)
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });

  // ── MAP ──────────────────────────────────────────────────────────────────────
  } else if (commandName === 'map') {
    await interaction.deferReply();
    try {
      const [seedRaw, sizeRaw] = await Promise.all([
        rcon.send('server.seed'),
        rcon.send('server.worldsize'),
      ]);
      const seed = extractValue(seedRaw);
      const size = extractValue(sizeRaw);
      await interaction.editReply(`🗺️ **Current Map:** https://rustmaps.com/map/${size}/${seed}`);
    } catch { await interaction.editReply('❌ Could not fetch map info.'); }

  // ── PLAYER INFO ──────────────────────────────────────────────────────────────
  } else if (commandName === 'playerinfo') {
    await interaction.deferReply();
    const query = interaction.options.getString('player');
    try {
      const db = getDb();
      const row = db.prepare(`
        SELECT steam_id, name,
          COUNT(*) AS sessions,
          MIN(login_at) AS first_seen,
          MAX(login_at) AS last_seen,
          ROUND(SUM((julianday(COALESCE(logout_at, datetime('now'))) - julianday(login_at)) * 1440), 0) AS total_minutes
        FROM sessions
        WHERE LOWER(steam_id) = LOWER(?) OR LOWER(name) = LOWER(?) OR LOWER(name) LIKE LOWER(?)
        GROUP BY steam_id
        ORDER BY total_minutes DESC
        LIMIT 1
      `).get(query, query, `%${query}%`);
      db.close();
      if (!row) return interaction.editReply(`❌ No records found for **${query}**.`);
      const lookup = findPlayerInDb(query);
      const onlineStatus = lookup.found && lookup.online ? '🟢 Currently Online' : '🔴 Offline';
      const embed = new EmbedBuilder()
        .setTitle(`👤 Player Info — ${row.name}`)
        .setColor(0x3498db)
        .addFields(
          { name: 'Steam ID',       value: `[${row.steam_id}](https://steamcommunity.com/profiles/${row.steam_id})`, inline: true },
          { name: 'Status',         value: onlineStatus,                    inline: true },
          { name: 'Total Playtime', value: formatMinutes(row.total_minutes), inline: true },
          { name: 'Sessions',       value: String(row.sessions),            inline: true },
          { name: 'First Seen',     value: row.first_seen ? row.first_seen + ' UTC' : 'N/A', inline: true },
          { name: 'Last Seen',      value: row.last_seen  ? row.last_seen  + ' UTC' : 'N/A', inline: true },
        )
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.editReply('❌ Could not look up player.');
    }

  // ── PLAYTIME ─────────────────────────────────────────────────────────────────
  } else if (commandName === 'playtime') {
    await interaction.deferReply();
    const query = interaction.options.getString('player');
    try {
      const db = getDb();
      const row = db.prepare(`
        SELECT name,
          ROUND(SUM((julianday(COALESCE(logout_at, datetime('now'))) - julianday(login_at)) * 1440), 0) AS total_minutes,
          COUNT(*) AS sessions
        FROM sessions
        WHERE LOWER(name) = LOWER(?) OR LOWER(name) LIKE LOWER(?)
        GROUP BY steam_id ORDER BY total_minutes DESC LIMIT 1
      `).get(query, `%${query}%`);
      db.close();
      if (!row) return interaction.editReply(`❌ No records found for **${query}**.`);
      await interaction.editReply(`⏱️ **${row.name}** has **${formatMinutes(row.total_minutes)}** total playtime across **${row.sessions}** session(s).`);
    } catch { await interaction.editReply('❌ Could not fetch playtime.'); }

  // ── SEEN ─────────────────────────────────────────────────────────────────────
  } else if (commandName === 'seen') {
    await interaction.deferReply();
    const query = interaction.options.getString('player');
    try {
      const db = getDb();
      const row = db.prepare(`
        SELECT name, logout_at FROM sessions
        WHERE LOWER(name) = LOWER(?) OR LOWER(name) LIKE LOWER(?)
        ORDER BY login_at DESC LIMIT 1
      `).get(query, `%${query}%`);
      db.close();
      if (!row) return interaction.editReply(`❌ No records found for **${query}**.`);
      const lookup = findPlayerInDb(query);
      if (lookup.found && lookup.online) {
        await interaction.editReply(`🟢 **${row.name}** is **currently online**!`);
      } else {
        await interaction.editReply(`🔴 **${row.name}** was last seen **${formatTimeAgo(row.logout_at)}**.`);
      }
    } catch { await interaction.editReply('❌ Could not check player.'); }

  // ── SERVER REPORT ─────────────────────────────────────────────────────────────
  } else if (commandName === 'serverreport') {
    await interaction.deferReply();
    try {
      const days = interaction.options.getInteger('days');
      const label = days >= 9999 ? 'All Time' : `Last ${days} Days`;
      const { total_unique, repeat_players, avg_minutes, total_sessions, topPlayers } = getPlayerReport(days);
      const topList = topPlayers.length
        ? topPlayers.map((p, i) => {
            const medal = ['🥇','🥈','🥉','4️⃣','5️⃣'][i];
            return `${medal} **${p.name}** — ${formatMinutes(p.total_minutes)} (${p.sessions} session${p.sessions !== 1 ? 's' : ''})`;
          }).join('\n')
        : 'No data yet';
      const returnRate = total_unique > 0 ? `${Math.round((repeat_players / total_unique) * 100)}%` : 'N/A';
      const embed = new EmbedBuilder()
        .setTitle(`📊 Server Report — ${label}`)
        .setColor(0x9b59b6)
        .addFields(
          { name: '👤 Unique Players',      value: String(total_unique || 0),               inline: true },
          { name: '🔁 Repeat Players',      value: `${repeat_players || 0} (${returnRate})`, inline: true },
          { name: '📋 Total Sessions',      value: String(total_sessions || 0),             inline: true },
          { name: '⏱️ Avg Session Length',  value: formatMinutes(avg_minutes || 0),         inline: true },
          { name: '🏆 Top Players by Time', value: topList },
        )
        .setFooter({ text: 'Report generated' })
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('serverreport error:', err);
      await interaction.editReply('❌ Could not generate report.');
    }

  // ── LEADERBOARD ───────────────────────────────────────────────────────────────
  } else if (commandName === 'leaderboard') {
    await interaction.deferReply();
    try {
      const db = getDb();
      const rows = db.prepare(`
        SELECT name,
          ROUND(SUM((julianday(COALESCE(logout_at, datetime('now'))) - julianday(login_at)) * 1440), 0) AS total_minutes,
          COUNT(*) AS sessions
        FROM sessions
        GROUP BY steam_id
        ORDER BY total_minutes DESC
        LIMIT 10
      `).all();
      db.close();
      if (!rows.length) return interaction.editReply('No data yet.');
      const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
      const list = rows.map((p, i) =>
        `${medals[i]} **${p.name}** — ${formatMinutes(p.total_minutes)} (${p.sessions} sessions)`
      ).join('\n');
      const embed = new EmbedBuilder()
        .setTitle('🏆 Playtime Leaderboard')
        .setColor(0xf1c40f)
        .setDescription(list)
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    } catch { await interaction.editReply('❌ Could not fetch leaderboard.'); }

  // ── PEAK PLAYERS ──────────────────────────────────────────────────────────────
  } else if (commandName === 'peakplayers') {
    await interaction.deferReply();
    try {
      const db = getDb();
      const rows = db.prepare(`SELECT login_at, logout_at FROM sessions ORDER BY login_at`).all();
      db.close();
      if (!rows.length) return interaction.editReply('No session data yet.');
      let peak = 0;
      let peakTime = null;
      for (const row of rows) {
        const t = new Date(row.login_at + ' UTC').getTime();
        const active = rows.filter((r) => {
          const start = new Date(r.login_at + ' UTC').getTime();
          const end = r.logout_at ? new Date(r.logout_at + ' UTC').getTime() : Date.now();
          return start <= t && end >= t;
        }).length;
        if (active > peak) { peak = active; peakTime = row.login_at; }
      }
      await interaction.editReply(`📈 Peak concurrent players: **${peak}** *(around ${peakTime} UTC)*`);
    } catch { await interaction.editReply('❌ Could not calculate peak players.'); }

  // ── TIP ───────────────────────────────────────────────────────────────────────
  } else if (commandName === 'tip') {
    await interaction.deferReply();
    const tip = RUST_TIPS[Math.floor(Math.random() * RUST_TIPS.length)];
    try {
      await rcon.send(`say [TIP] ${tip}`);
      await interaction.editReply(`✅ Tip sent to server: *${tip}*`);
    } catch { await interaction.editReply('❌ Could not send tip.'); }

  // ── EVENT ─────────────────────────────────────────────────────────────────────
  } else if (commandName === 'event') {
    await interaction.deferReply();
    const desc = interaction.options.getString('description');
    try {
      await rcon.send(`say [EVENT] ${desc}`);
      const channelId = process.env.CHANNEL_EVENTS || process.env.CHANNEL_CHAT;
      if (channelId) {
        const ch = await interaction.client.channels.fetch(channelId).catch(() => null);
        if (ch) {
          const embed = new EmbedBuilder()
            .setTitle('🎉 Server Event')
            .setColor(0x1abc9c)
            .setDescription(desc)
            .setTimestamp();
          await ch.send({ embeds: [embed] });
        }
      }
      await interaction.editReply(`✅ Event announced: *${desc}*`);
    } catch { await interaction.editReply('❌ Could not announce event.'); }

  // ── VOTE WIPE ─────────────────────────────────────────────────────────────────
  } else if (commandName === 'votewipe') {
    const embed = new EmbedBuilder()
      .setTitle('🗳️ Wipe Vote')
      .setColor(0xe74c3c)
      .setDescription('Should we wipe the server early?\n\n✅ = Yes  |  ❌ = No\n\n*Vote closes in 5 minutes.*')
      .setTimestamp();
    const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
    await msg.react('✅');
    await msg.react('❌');
    setTimeout(async () => {
      try {
        const updated = await msg.fetch();
        const yes = (updated.reactions.cache.get('✅')?.count || 1) - 1;
        const no  = (updated.reactions.cache.get('❌')?.count || 1) - 1;
        const result = yes > no
          ? `✅ **Wipe vote passed!** (${yes} yes / ${no} no) — Admins notified.`
          : `❌ **Wipe vote failed.** (${yes} yes / ${no} no)`;
        await interaction.followUp(result);
      } catch {}
    }, 5 * 60 * 1000);

  // ── SAY ───────────────────────────────────────────────────────────────────────
  } else if (commandName === 'say') {
    await interaction.deferReply();
    const message = interaction.options.getString('message');
    try {
      await rcon.send(`say [Discord] ${interaction.user.username}: ${message}`);
      await interaction.editReply(`✅ Sent: **${message}**`);
    } catch { await interaction.editReply('❌ Failed to send message.'); }

  // ── ANNOUNCE ──────────────────────────────────────────────────────────────────
  } else if (commandName === 'announce') {
    await interaction.deferReply();
    const message = interaction.options.getString('message');
    try {
      await rcon.send(`say ══════════════════`);
      await rcon.send(`say 📢 ${message}`);
      await rcon.send(`say ══════════════════`);
      await interaction.editReply(`✅ Announced: **${message}**`);
    } catch { await interaction.editReply('❌ Failed to announce.'); }

  // ── ALERT ─────────────────────────────────────────────────────────────────────
  } else if (commandName === 'alert') {
    await interaction.deferReply();
    const message = interaction.options.getString('message');
    try {
      await rcon.send(`say ⚠️ [ALERT] ${message}`);
      await interaction.editReply(`✅ Alert sent: **${message}**`);
    } catch { await interaction.editReply('❌ Failed to send alert.'); }

  // ── RESTART ───────────────────────────────────────────────────────────────────
  } else if (commandName === 'restart') {
    await interaction.deferReply();
    const minutes = interaction.options.getInteger('minutes');
    try {
      await rcon.send(`say ⚠️ [RESTART] Server restarting in ${minutes} minute(s). Find shelter!`);
      await interaction.editReply(`✅ Restart warning sent. Countdown started for **${minutes}** minute(s).`);
      let remaining = minutes;
      const tick = setInterval(async () => {
        remaining--;
        if (remaining <= 0) {
          clearInterval(tick);
          await rcon.send('say ⚠️ [RESTART] Server is restarting NOW. See you on the other side!').catch(() => {});
        } else if (remaining <= 3 || remaining === 5 || remaining === 10) {
          await rcon.send(`say ⚠️ [RESTART] ${remaining} minute(s) until restart!`).catch(() => {});
        }
      }, 60 * 1000);
    } catch { await interaction.editReply('❌ Failed to send restart warning.'); }

  // ── KICK ──────────────────────────────────────────────────────────────────────
  } else if (commandName === 'kick') {
    await interaction.deferReply({ ephemeral: true });
    const player = interaction.options.getString('player');
    const reason = interaction.options.getString('reason') || 'Kicked by admin';
    try {
      const result = await rcon.send(`kick "${player}" "${reason}"`);
      await interaction.editReply(`✅ Kicked **${player}**: ${reason}\n\`${result || 'Done'}\``);
    } catch { await interaction.editReply('❌ Failed to kick player.'); }

  // ── BAN ───────────────────────────────────────────────────────────────────────
  } else if (commandName === 'ban') {
    await interaction.deferReply({ ephemeral: true });
    const player = interaction.options.getString('player');
    const reason = interaction.options.getString('reason') || 'Banned by admin';
    try {
      const result = await rcon.send(`ban "${player}" "${reason}"`);
      await interaction.editReply(`✅ Banned **${player}**: ${reason}\n\`${result || 'Done'}\``);
    } catch { await interaction.editReply('❌ Failed to ban player.'); }

  // ── UNBAN ─────────────────────────────────────────────────────────────────────
  } else if (commandName === 'unban') {
    await interaction.deferReply({ ephemeral: true });
    const steamId = interaction.options.getString('steamid');
    try {
      const result = await rcon.send(`unban ${steamId}`);
      await interaction.editReply(`✅ Unbanned **${steamId}**\n\`${result || 'Done'}\``);
    } catch { await interaction.editReply('❌ Failed to unban.'); }

  // ── RCON ──────────────────────────────────────────────────────────────────────
  } else if (commandName === 'rcon') {
    await interaction.deferReply({ ephemeral: true });
    const command = interaction.options.getString('command');
    try {
      const result = await rcon.send(command);
      await interaction.editReply(`**Command:** \`${command}\`\n**Response:**\n\`\`\`${result || '(no output)'}\`\`\``);
    } catch (err) { await interaction.editReply(`❌ RCON error: ${err.message}`); }
  }
}

module.exports = { handleInteraction };
