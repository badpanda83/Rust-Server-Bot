const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(path.join(dbDir, 'sessions.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    steam_id   TEXT NOT NULL,
    name       TEXT NOT NULL,
    login_at   DATETIME NOT NULL,
    logout_at  DATETIME
  );
  CREATE INDEX IF NOT EXISTS idx_steam_id ON sessions(steam_id);
  CREATE INDEX IF NOT EXISTS idx_name ON sessions(name);

  CREATE TABLE IF NOT EXISTS tickets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     TEXT NOT NULL,
    username    TEXT NOT NULL,
    channel_id  TEXT NOT NULL,
    category    TEXT NOT NULL,
    description TEXT NOT NULL,
    opened_at   DATETIME NOT NULL DEFAULT (datetime('now')),
    closed_at   DATETIME
  );
  CREATE INDEX IF NOT EXISTS idx_ticket_channel ON tickets(channel_id);
  CREATE INDEX IF NOT EXISTS idx_ticket_user    ON tickets(user_id);
`);

// Close any sessions that were left open from a previous bot run
db.prepare(`UPDATE sessions SET logout_at = datetime('now') WHERE logout_at IS NULL`).run();

// ── Sessions ──────────────────────────────────────────────────────────────────
const stmtInsert = db.prepare(
  `INSERT INTO sessions (steam_id, name, login_at) VALUES (?, ?, datetime('now'))`
);
const stmtLogout = db.prepare(
  `UPDATE sessions SET logout_at = datetime('now'), name = ? WHERE steam_id = ? AND logout_at IS NULL`
);
const stmtFindOnline = db.prepare(
  `SELECT steam_id, name FROM sessions WHERE logout_at IS NULL AND (LOWER(name) = LOWER(?) OR LOWER(name) LIKE LOWER(?))`
);
const stmtFindRecent = db.prepare(
  `SELECT steam_id, name, logout_at FROM sessions
   WHERE (LOWER(name) = LOWER(?) OR LOWER(name) LIKE LOWER(?))
   ORDER BY logout_at DESC LIMIT 1`
);

function recordLogin(steamId, name) {
  stmtInsert.run(steamId, name);
}

function recordLogout(steamId, name) {
  stmtLogout.run(name, steamId);
}

function findPlayerInDb(nameQuery) {
  const exact   = nameQuery;
  const partial = `%${nameQuery}%`;
  const online  = stmtFindOnline.get(exact, partial);
  if (online) return { found: true, online: true, name: online.name, steamId: online.steam_id };
  const recent  = stmtFindRecent.get(exact, partial);
  if (recent)  return { found: true, online: false, name: recent.name, steamId: recent.steam_id, lastSeen: recent.logout_at };
  return { found: false };
}

// ── Tickets ───────────────────────────────────────────────────────────────────
const stmtOpenTicket = db.prepare(
  `INSERT INTO tickets (user_id, username, channel_id, category, description)
   VALUES (?, ?, ?, ?, ?)`
);
const stmtCloseTicket = db.prepare(
  `UPDATE tickets SET closed_at = datetime('now') WHERE channel_id = ? AND closed_at IS NULL`
);
const stmtGetTicketByChannel = db.prepare(
  `SELECT * FROM tickets WHERE channel_id = ? AND closed_at IS NULL`
);
const stmtGetOpenTicketByUser = db.prepare(
  `SELECT * FROM tickets WHERE user_id = ? AND closed_at IS NULL LIMIT 1`
);

function openTicket(userId, username, channelId, category, description) {
  const info = stmtOpenTicket.run(userId, username, channelId, category, description);
  return info.lastInsertRowid;
}

function closeTicket(channelId) {
  stmtCloseTicket.run(channelId);
}

function getTicketByChannelId(channelId, userId) {
  if (channelId) return stmtGetTicketByChannel.get(channelId) || null;
  if (userId)    return stmtGetOpenTicketByUser.get(userId) || null;
  return null;
}

module.exports = {
  recordLogin,
  recordLogout,
  findPlayerInDb,
  openTicket,
  closeTicket,
  getTicketByChannelId,
};
