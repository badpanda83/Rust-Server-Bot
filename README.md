# 🦀 Rust Server Discord Bot

A Discord bot that monitors your Rust game server via RCON, relaying admin reports, keyword alerts, chat, and server status directly to your Discord server.

## Features

- 🚨 **Admin Reports** — Players use `!report <player> <reason>` in-game; alerts are posted to Discord
- 🔍 **Keyword Monitoring** — Flags configurable toxic/banned words in chat
- 📊 **Live Server Status** — Auto-updating embed with player count, map, seed, game time
- 💬 **Two-Way Chat Relay** — In-game chat mirrored to Discord; admins can `/say` back
- 🔌 **RCON Bridge** — Run any RCON command from a restricted Discord channel
- 📋 **Join/Leave Logs** — Track player connections (via RCON playerlist diff)
- 🗺️ **Wipe Detection** — Automatically announces map wipes with `@everyone`

## Setup

### Requirements
- Node.js 18+
- A Rust server with RCON enabled
- A Discord bot token ([Discord Developer Portal](https://discord.com/developers/applications))

### Installation

```bash
npm install
cp .env.example .env
# Edit .env with your values
node src/index.js
```

### Configuration

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|---|---|
| `DISCORD_TOKEN` | Your Discord bot token |
| `DISCORD_GUILD_ID` | Your Discord server ID |
| `RCON_HOST` | Rust server IP address |
| `RCON_PORT` | RCON port (default: `28016`) |
| `RCON_PASSWORD` | RCON password |
| `CHANNEL_REPORTS` | Channel ID for admin reports |
| `CHANNEL_KEYWORDS` | Channel ID for keyword alerts |
| `CHANNEL_CHAT` | Channel ID for chat relay |
| `CHANNEL_STATUS` | Channel ID for server status embed |
| `CHANNEL_JOINLEAVE` | Channel ID for join/leave logs |
| `KEYWORD_LIST` | Comma-separated words to flag |
| `RCON_ROLE_ID` | Discord role ID allowed to use `/rcon` |
| `STATUS_INTERVAL` | Seconds between status embed updates (default: `60`) |

## Recommended Discord Channels

| Channel | Purpose |
|---|---|
| `#rust-reports` | Admin report alerts |
| `#rust-keyword-alerts` | Flagged chat messages |
| `#rust-chat` | Live in-game chat relay |
| `#rust-server-status` | Live server status embed + wipe announcements |
| `#rust-rcon` | Admin-only RCON command channel |

## Discord Slash Commands

| Command | Description | Permission |
|---|---|---|
| `/status` | Show current server status | Everyone |
| `/players` | List online players | Everyone |
| `/say <message>` | Send message to in-game chat | Everyone |
| `/rcon <command>` | Run RCON command | Admin role only |

## In-Game Commands

| Command | Description |
|---|---|
| `!report <player> <reason>` | Report a player to admins on Discord |
