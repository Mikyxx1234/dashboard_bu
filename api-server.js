import express from 'express';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: '147.93.34.2',
  port: 5432,
  user: 'postgres',
  password: '^&TN5Qkg3BTXpW#eeqHj@E',
  database: 'postgres',
  ssl: false,
});

const app = express();

app.get('/api/sessions/list', async (req, res) => {
  try {
    const { start, end } = req.query;
    let query = 'SELECT * FROM anh_google_sessions';
    const params = [];

    if (start) {
      params.push(start);
      query += ` WHERE created_at >= $${params.length}`;
    }
    if (end) {
      params.push(end + ' 23:59:59');
      query += params.length > 1 ? ' AND' : ' WHERE';
      query += ` created_at <= $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar sessões:', err);
    res.status(500).json({ error: 'Falha ao buscar sessões' });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`API sessions rodando na porta ${PORT}`));
