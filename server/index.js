import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import Database from 'better-sqlite3';

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 3001);
const RESULTS_DELETE_PASSWORD = process.env.RESULTS_DELETE_PASSWORD || 'may';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'rsvp.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

const RESPONSES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    confirmation TEXT NOT NULL CHECK (confirmation IN ('yes', 'no', 'maybe')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

function ensureResponsesTable() {
  db.exec(RESPONSES_TABLE_SQL);

  const tableSql = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'responses'")
    .pluck()
    .get();

  const hasMaybeConfirmation =
    typeof tableSql === 'string' && tableSql.toLowerCase().includes("'maybe'");

  if (hasMaybeConfirmation) {
    return;
  }

  const migrate = db.transaction(() => {
    db.exec('ALTER TABLE responses RENAME TO responses_legacy');
    db.exec(RESPONSES_TABLE_SQL);
    db.exec(`
      INSERT INTO responses (id, name, confirmation, created_at)
      SELECT id, name, confirmation, created_at
      FROM responses_legacy
    `);
    db.exec('DROP TABLE responses_legacy');
  });

  migrate();
}

ensureResponsesTable();

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

  if (value === 'yes' || value === 'no' || value === 'maybe') {
    return value;
  }

  if (value === 'unknown' || value === 'затрудняюсь' || value === 'затрудняюсь ответить') {
    return 'maybe';
  }

  return '';
}

function normalizeResponseId(input) {
  const value = Number(input);

  if (!Number.isInteger(value) || value <= 0) {
    return 0;
  }

  return value;
}

function normalizeDeletePassword(input) {
  if (typeof input !== 'string') {
    return '';
  }

  return input.trim();
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

  const insertResult = db
    .prepare('INSERT INTO responses(name, confirmation) VALUES (?, ?)')
    .run(name, confirmation);

  const row = db
    .prepare(
      `SELECT id, name, confirmation, created_at
       FROM responses
       WHERE id = ?`,
    )
    .get(insertResult.lastInsertRowid);

  return res.status(201).json({ ok: true, row });
});

app.patch('/api/rsvp/:id', (req, res) => {
  const responseId = normalizeResponseId(req.params.id);
  const confirmation = normalizeConfirmation(req.body?.confirmation);

  if (!responseId || !confirmation) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const updateResult = db
    .prepare('UPDATE responses SET confirmation = ? WHERE id = ?')
    .run(confirmation, responseId);

  if (updateResult.changes === 0) {
    return res.status(404).json({ error: 'Response not found' });
  }

  const row = db
    .prepare(
      `SELECT id, name, confirmation, created_at
       FROM responses
       WHERE id = ?`,
    )
    .get(responseId);

  return res.json({ ok: true, row });
});

app.delete('/api/results/:id', (req, res) => {
  const responseId = normalizeResponseId(req.params.id);
  const password = normalizeDeletePassword(req.body?.password ?? req.query?.password);

  if (!responseId) {
    return res.status(400).json({ error: 'Invalid response id' });
  }

  if (!password || password !== RESULTS_DELETE_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const deleteResult = db.prepare('DELETE FROM responses WHERE id = ?').run(responseId);

  if (deleteResult.changes === 0) {
    return res.status(404).json({ error: 'Response not found' });
  }

  return res.json({ ok: true, deletedId: responseId });
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
