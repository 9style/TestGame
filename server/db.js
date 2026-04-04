const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS game_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_name TEXT NOT NULL,
    character_id TEXT NOT NULL,
    ending_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const insertStmt = db.prepare(
  'INSERT INTO game_records (player_name, character_id, ending_id) VALUES (?, ?, ?)'
);

const countStmt = db.prepare('SELECT COUNT(*) as total FROM game_records');

const endingCountsStmt = db.prepare(
  'SELECT ending_id, COUNT(*) as count FROM game_records GROUP BY ending_id ORDER BY count DESC'
);

const characterCountsStmt = db.prepare(
  'SELECT character_id, COUNT(*) as count FROM game_records GROUP BY character_id ORDER BY count DESC'
);

const recentRecordsStmt = db.prepare(
  'SELECT player_name, character_id, ending_id, created_at FROM game_records ORDER BY id DESC LIMIT 50'
);

function addRecord(playerName, characterId, endingId) {
  insertStmt.run(playerName, characterId, endingId);
}

function getStats() {
  const totalGames = countStmt.get().total;
  const endingCounts = endingCountsStmt.all();
  const characterCounts = characterCountsStmt.all();
  const recentRecords = recentRecordsStmt.all();
  return { totalGames, endingCounts, characterCounts, recentRecords };
}

module.exports = { addRecord, getStats };
