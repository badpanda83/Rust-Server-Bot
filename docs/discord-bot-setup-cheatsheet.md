# 🤖 Discord Bot Setup — Quick Reference Cheat Sheet

## Step 1 — Create the Application
1. Go to https://discord.com/developers/applications
2. Click **New Application** → name it (e.g. `Rust Server Monitor`) → **Create**
3. In the left sidebar go to **Bot** → click **Add Bot** → confirm

---

## Step 2 — Get Your Bot Token
1. Under **Bot → Token** click **Reset Token** → copy it
2. Paste it into your `.env` as `DISCORD_TOKEN=`

> ⚠️ Never share this token or commit it to GitHub. If leaked, reset it immediately.

---

## Step 3 — Enable Required Intents
Under **Bot → Privileged Gateway Intents** enable:

| Intent | Required For |
|---|---|
| ✅ Message Content Intent | Reading Discord messages for `/say` command |

---

## Step 4 — Generate an Invite URL
1. Go to **OAuth2 → URL Generator**
2. Under **Scopes** check:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Under **Bot Permissions** check:

| Permission | Why It's Needed |
|---|---|
| ✅ View Channels | Bot can see channels |
| ✅ Send Messages | Post chat relay, reports, keyword alerts |
| ✅ Send Messages in Threads | Thread support |
| ✅ Embed Links | Rich embeds for status, reports, alerts |
| ✅ Read Message History | Fetch and edit the live status embed |
| ✅ Mention Everyone | Wipe announcements (`@everyone`) |
| ✅ Use Slash Commands | `/status`, `/players`, `/rcon`, `/say` |

4. Copy the generated URL at the bottom → open in browser → invite to your server

---

## Step 5 — Enable Developer Mode in Discord
**Discord Settings → Advanced → Developer Mode ✅**

This lets you right-click to copy IDs.

---

## Step 6 — Collect Your IDs for `.env`

| `.env` Variable | How To Get It |
|---|---|
| `DISCORD_TOKEN` | Bot page → Reset Token → copy |
| `DISCORD_GUILD_ID` | Right-click your server icon → **Copy Server ID** |
| `CHANNEL_REPORTS` | Right-click `#rust-reports` → **Copy Channel ID** |
| `CHANNEL_KEYWORDS` | Right-click `#rust-keyword-alerts` → **Copy Channel ID** |
| `CHANNEL_CHAT` | Right-click `#rust-chat` → **Copy Channel ID** |
| `CHANNEL_STATUS` | Right-click `#rust-server-status` → **Copy Channel ID** |
| `RCON_ROLE_ID` | Server Settings → Roles → right-click admin role → **Copy Role ID** |

---

## Step 7 — Recommended Discord Channels to Create

| Channel Name | Purpose |
|---|---|
| `#rust-reports` | In-game `!report` alerts |
| `#rust-keyword-alerts` | Flagged chat messages |
| `#rust-chat` | Live in-game chat relay |
| `#rust-server-status` | Auto-updating server status embed + wipe alerts |
| `#rust-rcon` | Admin-only RCON command channel |

---

## Step 8 — Fill In Your `.env`
```bash
nano ~/Rust-Server-Bot/.env
```

```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_server_id_here

RCON_HOST=your.rust.server.ip
RCON_PORT=28016
RCON_PASSWORD=your_rcon_password

CHANNEL_REPORTS=
CHANNEL_KEYWORDS=
CHANNEL_CHAT=
CHANNEL_STATUS=

KEYWORD_LIST=cheat,hack,exploit,aimbot,esp
RCON_ROLE_ID=your_admin_role_id
STATUS_INTERVAL=60
```

---

## Step 9 — Start / Restart the Bot with PM2

### First time setup
```bash
cd ~/Rust-Server-Bot
npm install
pm2 start src/index.js --name rust-server-bot
pm2 save
```

### After changing `.env` or pulling code updates
```bash
pm2 restart rust-server-bot
```

### Useful PM2 commands

| Command | What It Does |
|---|---|
| `pm2 list` | Show all running bots and their status |
| `pm2 restart rust-server-bot` | Restart after `.env` or code changes |
| `pm2 stop rust-server-bot` | Stop the bot |
| `pm2 start rust-server-bot` | Start a stopped bot |
| `pm2 logs rust-server-bot` | View live logs |
| `pm2 logs rust-server-bot --lines 50` | View last 50 log lines |
| `pm2 save` | Save current process list (survives reboot) |
| `pm2 startup` | Auto-start PM2 on Pi reboot |

---

## 🔁 Do I Need to Restart After Changes?

| Change Made | Restart Needed? |
|---|---|
| `.env` file edited | ✅ Yes — `pm2 restart rust-server-bot` |
| Code files changed (`src/`) | ✅ Yes — `pm2 restart rust-server-bot` |
| `KEYWORD_LIST` updated in `.env` | ✅ Yes |
| New channel IDs added to `.env` | ✅ Yes |
| Discord channel renamed (not ID) | ❌ No — bot uses IDs not names |
| Discord role renamed (not ID) | ❌ No — bot uses IDs not names |

---

## 🆘 Troubleshooting

| Problem | Fix |
|---|---|
| Bot is offline in Discord | `pm2 restart rust-server-bot` then check `pm2 logs rust-server-bot` |
| Slash commands not showing | Check `DISCORD_GUILD_ID` is correct, restart bot |
| No messages in channels | Check channel IDs are correct in `.env` |
| RCON errors in logs | Check `RCON_HOST`, `RCON_PORT`, `RCON_PASSWORD` and that `rcon.web 1` is set on the server |
| Bot token invalid | Reset token in Discord Developer Portal and update `.env` |

---

> 💡 **Tip:** Run `pm2 logs` in a separate SSH terminal while testing — you'll see errors in real time.
