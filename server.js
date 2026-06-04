const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@libsql/client');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASS = process.env.ADMIN_PASSWORD;

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
  await db.execute(`
    CREATE TABLE IF NOT EXISTS avaliacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      nota INTEGER NOT NULL,
      comentario TEXT,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS dias_bloqueados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL UNIQUE,
      motivo TEXT
    )
  `);
  console.log('Banco de dados pronto.');
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── HORÁRIOS OCUPADOS ──────────────────────────────────────
app.get('/api/horarios-ocupados', async (req, res) => {
  const { data } = req.query;
  if (!data) return res.status(400).json({ erro: 'Data obrigatória.' });
  try {
    // Verifica se dia está bloqueado
    const bloqueado = await db.execute({ sql: `SELECT id FROM dias_bloqueados WHERE data=?`, args: [data] });
    if (bloqueado.rows.length > 0) return res.json({ ocupados: [], diaBloqueado: true });
    const rows = await db.execute({ sql: `SELECT horario FROM agendamentos WHERE data=? AND status != 'cancelado'`, args: [data] });
    res.json({ ocupados: rows.rows.map(r => r.horario), diaBloqueado: false });
  } catch (e) { res.status(500).json({ erro: 'Erro.' }); }
});

// ── AGENDAR ────────────────────────────────────────────────
app.post('/api/agendar', async (req, res) => {
  const { nome, servico, preco, data, horario, lang } = req.body;
  if (!nome || !servico || !data || !horario) return res.status(400).json({ erro: 'Campos obrigatórios faltando.' });
  try {
    const bloqueado = await db.execute({ sql: `SELECT id FROM dias_bloqueados WHERE data=?`, args: [data] });
    if (bloqueado.rows.length > 0) return res.status(409).json({ erro: 'Este dia está bloqueado.', diaBloqueado: true });
    const check = await db.execute({ sql: `SELECT id FROM agendamentos WHERE data=? AND horario=? AND status != 'cancelado'`, args: [data, horario] });
    if (check.rows.length > 0) return res.status(409).json({ erro: 'Horário já reservado.', ocupado: true });
    const result = await db.execute({ sql: `INSERT INTO agendamentos (nome, servico, preco, data, horario, lang) VALUES (?, ?, ?, ?, ?, ?)`, args: [nome, servico, preco || '', data, horario, lang || 'pt'] });
    res.json({ ok: true, id: Number(result.lastInsertRowid) });
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro ao salvar.' }); }
});

// ── LISTAR AGENDAMENTOS (admin) ────────────────────────────
app.get('/api/agendamentos', async (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ erro: 'Senha incorreta.' });
  try {
    const rows = await db.execute(`SELECT * FROM agendamentos ORDER BY data ASC, horario ASC`);
    res.json(rows.rows);
  } catch (e) { res.status(500).json({ erro: 'Erro.' }); }
});

// ── ATUALIZAR STATUS ───────────────────────────────────────
app.patch('/api/agendamentos/:id', async (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ erro: 'Senha incorreta.' });
  const { status } = req.body;
  try {
    await db.execute({ sql: `UPDATE agendamentos SET status=? WHERE id=?`, args: [status, req.params.id] });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ erro: 'Erro.' }); }
});

// ── DELETAR AGENDAMENTO ────────────────────────────────────
app.delete('/api/agendamentos/:id', async (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ erro: 'Senha incorreta.' });
  try {
    await db.execute({ sql: `DELETE FROM agendamentos WHERE id=?`, args: [req.params.id] });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ erro: 'Erro.' }); }
});

// ── AVALIAÇÕES (público) ───────────────────────────────────
app.get('/api/avaliacoes', async (req, res) => {
  try {
    const rows = await db.execute(`SELECT * FROM avaliacoes ORDER BY criado_em DESC LIMIT 20`);
    res.json(rows.rows);
  } catch (e) { res.status(500).json({ erro: 'Erro.' }); }
});

app.post('/api/avaliacoes', async (req, res) => {
  const { nome, nota, comentario } = req.body;
  if (!nome || !nota) return res.status(400).json({ erro: 'Nome e nota obrigatórios.' });
  if (nota < 1 || nota > 5) return res.status(400).json({ erro: 'Nota deve ser entre 1 e 5.' });
  try {
    await db.execute({ sql: `INSERT INTO avaliacoes (nome, nota, comentario) VALUES (?, ?, ?)`, args: [nome, nota, comentario || ''] });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ erro: 'Erro ao salvar avaliação.' }); }
});

app.delete('/api/avaliacoes/:id', async (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ erro: 'Senha incorreta.' });
  try {
    await db.execute({ sql: `DELETE FROM avaliacoes WHERE id=?`, args: [req.params.id] });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ erro: 'Erro.' }); }
});

// ── DIAS BLOQUEADOS ────────────────────────────────────────
app.get('/api/dias-bloqueados', async (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ erro: 'Senha incorreta.' });
  try {
    const rows = await db.execute(`SELECT * FROM dias_bloqueados ORDER BY data ASC`);
    res.json(rows.rows);
  } catch (e) { res.status(500).json({ erro: 'Erro.' }); }
});

app.post('/api/dias-bloqueados', async (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ erro: 'Senha incorreta.' });
  const { data, motivo } = req.body;
  if (!data) return res.status(400).json({ erro: 'Data obrigatória.' });
  try {
    await db.execute({ sql: `INSERT OR IGNORE INTO dias_bloqueados (data, motivo) VALUES (?, ?)`, args: [data, motivo || ''] });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ erro: 'Erro.' }); }
});

app.delete('/api/dias-bloqueados/:id', async (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ erro: 'Senha incorreta.' });
  try {
    await db.execute({ sql: `DELETE FROM dias_bloqueados WHERE id=?`, args: [req.params.id] });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ erro: 'Erro.' }); }
});

// ── RELATÓRIO FINANCEIRO ───────────────────────────────────
app.get('/api/relatorio', async (req, res) => {
  if (req.query.pass !== ADMIN_PASS) return res.status(401).json({ erro: 'Senha incorreta.' });
  try {
    const today = new Date().toISOString().split('T')[0];
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStr = weekStart.toISOString().split('T')[0];
    const monthStr = today.slice(0, 7);

    const [all, todayRows, weekRows, monthRows] = await Promise.all([
      db.execute(`SELECT preco, status FROM agendamentos`),
      db.execute({ sql: `SELECT preco, status FROM agendamentos WHERE data=?`, args: [today] }),
      db.execute({ sql: `SELECT preco, status FROM agendamentos WHERE data >= ?`, args: [weekStr] }),
      db.execute({ sql: `SELECT preco, status FROM agendamentos WHERE data LIKE ?`, args: [monthStr + '%'] }),
    ]);

    const calcTotal = rows => rows.rows
      .filter(r => r.status !== 'cancelado')
      .reduce((sum, r) => sum + parseFloat((r.preco || '$0').replace(/[^0-9.]/g, '') || 0), 0);

    res.json({
      hoje: { total: calcTotal(todayRows), count: todayRows.rows.filter(r => r.status !== 'cancelado').length },
      semana: { total: calcTotal(weekRows), count: weekRows.rows.filter(r => r.status !== 'cancelado').length },
      mes: { total: calcTotal(monthRows), count: monthRows.rows.filter(r => r.status !== 'cancelado').length },
      geral: { total: calcTotal(all), count: all.rows.filter(r => r.status !== 'cancelado').length }
    });
  } catch (e) { res.status(500).json({ erro: 'Erro.' }); }
});

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDB().then(() => {
  app.listen(PORT, () => console.log(`Davi Barber rodando em http://localhost:${PORT}`));
});
