const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
app.use(express.json());

const db = new Database(path.join(__dirname, '..', 'data', 'rsvp.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    confirmation TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

app.post('/api/rsvp', (req, res) => {
  const { name, confirmation } = req.body || {};
  if (!name || !['yes', 'no'].includes(confirmation)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  db.prepare('INSERT INTO responses(name, confirmation) VALUES (?, ?)').run(
    name.trim(),
    confirmation,
  );
  res.json({ ok: true });
});

app.get('/api/results', (_req, res) => {
  const rows = db
    .prepare('SELECT id, name, confirmation, created_at FROM responses ORDER BY id DESC')
    .all();
  res.json({ rows });
});

app.listen(3001, '127.0.0.1', () => console.log('API started on 127.0.0.1:3001'));
