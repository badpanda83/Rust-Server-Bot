# 🦀 Rust Server Discord Bot

A Discord bot that monitors your Rust game server via WebSocket RCON, relaying chat, admin reports, keyword alerts, join/leave events, and live server status directly to your Discord server.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🟢 **Live Server Status** | Auto-updating embed with online status, players, map, seed, map size, queue & game time |
| 💬 **Two-Way Chat Relay** | In-game global chat mirrored to Discord in real-time via WebSocket push events |
| 🚨 **Admin Reports** | Players type `!report <player> <reason>` in-game; instantly posted to Discord |
| 👥 **`!pop` Command** | Players type `!pop` in-game to see current player count with a fun random quip |
| 🔍 **Keyword Monitoring** | Flags configurable toxic/banned words in chat and alerts a Discord channel |
| 🗺️ **Wipe Detection** | Automatically announces map wipes to Discord with `@everyone` |
| 📋 **Join/Leave Logs** | Tracks player connections and disconnections |
| 🔌 **RCON Bridge** | Run any RCON command from a restricted Discord channel |

---

## 🛠️ Setup

### Requirements
- Node.js 18+
- A Rust server with WebSocket RCON enabled (`+rcon.web 1`)
- A Discord bot token ([Discord Developer Portal](https://discord.com/developers/applications))

### Installation

```bash
git clone https://github.com/badpanda83/Rust-Server-Bot.git
cd Rust-Server-Bot
npm install
cp .env.example .env
# Edit .env with your values
node src/index.js
```

### Running with PM2 (recommended)

```bash
npm install -g pm2
pm2 start src/index.js --name rust-server-bot
pm2 save
pm2 startup
```

---

## ⚙️ Configuration

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|---|---|
| `DISCORD_TOKEN` | Your Discord bot token |
| `DISCORD_GUILD_ID` | Your Discord server ID |
| `RCON_HOST` | Rust server IP address |
| `RCON_PORT` | RCON port (default: `28016`) |
| `RCON_PASSWORD` | RCON password |
| `CHANNEL_STATUS` | Channel ID for the live server status embed |
| `CHANNEL_CHAT` | Channel ID for in-game chat relay |
| `CHANNEL_REPORTS` | Channel ID for admin reports |
| `CHANNEL_KEYWORDS` | Channel ID for keyword alerts |
| `CHANNEL_JOINLEAVE` | Channel ID for join/leave logs |
| `KEYWORD_LIST` | Comma-separated words to flag (default: `cheat,hack,exploit`) |
| `RCON_ROLE_ID` | Discord role ID allowed to use `/rcon` |
| `STATUS_INTERVAL` | Seconds between status embed updates (default: `60`) |

---

## 📺 Recommended Discord Channels

| Channel | Purpose |
|---|---|
| `#server-status` | Live auto-updating server status embed |
| `#rust-chat` | Live in-game chat relay |
| `#rust-reports` | Admin report alerts |
| `#rust-keyword-alerts` | Flagged chat messages |
| `#rust-joinleave` | Player join/leave logs |
| `#rust-rcon` | Admin-only RCON command channel |

---

## 💬 Discord Slash Commands

| Command | Description | Permission |
|---|---|---|
| `/status` | Show current server status embed | Everyone |
| `/players` | List currently online players | Everyone |
| `/say <message>` | Send a message to in-game global chat | Everyone |
| `/rcon <command>` | Run a raw RCON command | Admin role only (`RCON_ROLE_ID`) |

---

## 🎮 In-Game Chat Commands

| Command | Description |
|---|---|
| `!report <player> <reason>` | Report a player — posts an alert to Discord admins |
| `!pop` | Shows current online player count with a fun message |

---

## 🏗️ Architecture

```
src/
├── index.js                  # Bot entry point
├── discord/
│   ├── commands.js           # Slash command registration
│   ├── interactionHandler.js # Slash command logic
│   ├── statusEmbed.js        # Auto-updating server status embed
│   └── wipeAnnouncer.js      # Wipe detection announcements
└── rcon/
    ├── rconClient.js         # WebSocket RCON connection & polling
    └── chatHandler.js        # In-game chat relay, !report, !pop, keyword detection
```

The bot connects to Rust's WebSocket RCON (`ws://host:port/password`) and listens for real-time push events (`Identifier: -1`) for instant chat relay — no polling required.

---

## 📄 License

MIT
