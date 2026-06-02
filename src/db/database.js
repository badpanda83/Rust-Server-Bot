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
`);

// Close any sessions that were left open from a previous bot run
db.prepare(`UPDATE sessions SET logout_at = datetime('now') WHERE logout_at IS NULL`).run();

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
  const exact = nameQuery;
  const partial = `%${nameQuery}%`;

  // Check currently online first
  const online = stmtFindOnline.get(exact, partial);
  if (online) return { found: true, online: true, name: online.name, steamId: online.steam_id };

  // Fall back to most recently seen
  const recent = stmtFindRecent.get(exact, partial);
  if (recent) return { found: true, online: false, name: recent.name, steamId: recent.steam_id, lastSeen: recent.logout_at };

  return { found: false };
}

module.exports = { recordLogin, recordLogout, findPlayerInDb };
