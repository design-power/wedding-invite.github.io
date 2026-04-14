const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const Database = require('better-sqlite3');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 3001);

const dataDir = path.resolve(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'rsvp.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    confirmation TEXT NOT NULL CHECK (confirmation IN ('yes', 'no')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const app = express();
app.use(express.json());

function normalizeName(input) {
  if (typeof input !== 'string') {
    return '';
  }

  return input.trim();
}

function normalizeConfirmation(input) {
  if (Array.isArray(input) && input.length > 0) {
    return normalizeConfirmation(input[0]);
  }

  if (input === true || input === 'true') {
    return 'yes';
  }

  if (input === false || input === 'false') {
    return 'no';
  }

  if (typeof input !== 'string') {
    return '';
  }

  const value = input.trim().toLowerCase();
  if (value === 'yes' || value === 'no') {
    return value;
  }

  return '';
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/rsvp', (req, res) => {
  const name = normalizeName(req.body?.name);
  const confirmation = normalizeConfirmation(req.body?.confirmation);

  if (!name || !confirmation) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  db.prepare('INSERT INTO responses(name, confirmation) VALUES (?, ?)').run(name, confirmation);
  return res.json({ ok: true });
});

app.get('/api/results', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT id, name, confirmation, created_at
       FROM responses
       ORDER BY id DESC`,
    )
    .all();

  return res.json({ rows });
});

const server = app.listen(PORT, HOST, () => {
  console.log(`API started on http://${HOST}:${PORT}`);
  console.log(`SQLite path: ${dbPath}`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
