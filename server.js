const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@libsql/client');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'davi1234';

// DB setup
const db = createClient({
  url: process.env.RAILWAY_ENVIRONMENT ? 'file:/tmp/agendamentos.db' : 'file:./db/agendamentos.db'
});

async function initDB() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS agendamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      servico TEXT NOT NULL,
      preco TEXT NOT NULL,
      data TEXT NOT NULL,
      horario TEXT NOT NULL,
      lang TEXT DEFAULT 'pt',
      status TEXT DEFAULT 'confirmado',
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('Banco de dados pronto.');
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── GET /api/horarios-ocupados?data=2026-06-05 ─────────────
// Retorna lista de horários já reservados para uma data
app.get('/api/horarios-ocupados', async (req, res) => {
  const { data } = req.query;
  if (!data) return res.status(400).json({ erro: 'Data obrigatória.' });
  try {
    const rows = await db.execute({
      sql: `SELECT horario FROM agendamentos WHERE data=? AND status != 'cancelado'`,
      args: [data]
    });
    const ocupados = rows.rows.map(r => r.horario);
    res.json({ ocupados });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao buscar horários.' });
  }
});

// ── POST /api/agendar ──────────────────────────────────────
app.post('/api/agendar', async (req, res) => {
  const { nome, servico, preco, data, horario, lang } = req.body;
  if (!nome || !servico || !data || !horario) {
    return res.status(400).json({ erro: 'Campos obrigatórios faltando.' });
  }
  try {
    // Verifica se horário já está ocupado
    const check = await db.execute({
      sql: `SELECT id FROM agendamentos WHERE data=? AND horario=? AND status != 'cancelado'`,
      args: [data, horario]
    });
    if (check.rows.length > 0) {
      return res.status(409).json({ erro: 'Horário já reservado. Escolha outro.', ocupado: true });
    }
    const result = await db.execute({
      sql: `INSERT INTO agendamentos (nome, servico, preco, data, horario, lang) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [nome, servico, preco || '', data, horario, lang || 'pt']
    });
    res.json({ ok: true, id: Number(result.lastInsertRowid) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao salvar agendamento.' });
  }
});

// ── GET /api/agendamentos?pass=xxx ─────────────────────────
app.get('/api/agendamentos', async (req, res) => {
  if (req.query.pass !== ADMIN_PASS) {
    return res.status(401).json({ erro: 'Senha incorreta.' });
  }
  try {
    const rows = await db.execute(`SELECT * FROM agendamentos ORDER BY data ASC, horario ASC`);
    res.json(rows.rows);
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao buscar agendamentos.' });
  }
});

// ── PATCH /api/agendamentos/:id ────────────────────────────
app.patch('/api/agendamentos/:id', async (req, res) => {
  if (req.query.pass !== ADMIN_PASS) {
    return res.status(401).json({ erro: 'Senha incorreta.' });
  }
  const { status } = req.body;
  const { id } = req.params;
  try {
    await db.execute({ sql: `UPDATE agendamentos SET status=? WHERE id=?`, args: [status, id] });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao atualizar.' });
  }
});

// ── DELETE /api/agendamentos/:id ───────────────────────────
app.delete('/api/agendamentos/:id', async (req, res) => {
  if (req.query.pass !== ADMIN_PASS) {
    return res.status(401).json({ erro: 'Senha incorreta.' });
  }
  try {
    await db.execute({ sql: `DELETE FROM agendamentos WHERE id=?`, args: [req.params.id] });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao deletar.' });
  }
});

// Fallback → site principal
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDB().then(() => {
  app.listen(PORT, () => console.log(`Davi Barber rodando em http://localhost:${PORT}`));
});
