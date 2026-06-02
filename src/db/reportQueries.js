const Database = require('better-sqlite3');
const path = require('path');

function getDb() {
  return new Database(path.join(__dirname, '../../data/sessions.db'), { readonly: true });
}

function getPlayerReport(days) {
  const db = getDb();
  const since = days >= 9999
    ? '1970-01-01'
    : new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Total unique players
  const { total_unique } = db.prepare(`
    SELECT COUNT(DISTINCT steam_id) AS total_unique
    FROM sessions
    WHERE login_at >= ?
  `).get(since);

  // Repeat players (more than 1 session)
  const { repeat_players } = db.prepare(`
    SELECT COUNT(*) AS repeat_players FROM (
      SELECT steam_id
      FROM sessions
      WHERE login_at >= ?
      GROUP BY steam_id
      HAVING COUNT(*) > 1
    )
  `).get(since);

  // Average session duration in minutes (only completed sessions)
  const { avg_minutes } = db.prepare(`
    SELECT ROUND(AVG((julianday(logout_at) - julianday(login_at)) * 1440), 1) AS avg_minutes
    FROM sessions
    WHERE login_at >= ? AND logout_at IS NOT NULL
  `).get(since);

  // Total sessions
  const { total_sessions } = db.prepare(`
    SELECT COUNT(*) AS total_sessions
    FROM sessions
    WHERE login_at >= ?
  `).get(since);

  // Top 5 players by total time online (minutes)
  const topPlayers = db.prepare(`
    SELECT
      name,
      steam_id,
      COUNT(*) AS sessions,
      ROUND(SUM((julianday(COALESCE(logout_at, datetime('now'))) - julianday(login_at)) * 1440), 0) AS total_minutes
    FROM sessions
    WHERE login_at >= ?
    GROUP BY steam_id
    ORDER BY total_minutes DESC
    LIMIT 5
  `).all(since);

  db.close();

  return { total_unique, repeat_players, avg_minutes, total_sessions, topPlayers };
}

function formatMinutes(mins) {
  if (!mins || mins < 1) return '< 1m';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

module.exports = { getPlayerReport, formatMinutes };
