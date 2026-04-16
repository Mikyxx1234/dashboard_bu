import express from 'express';
import cors from 'cors';
import pg from 'pg';
import { fileURLToPath } from 'url';
import path from 'path';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = new Pool({
  host: process.env.DB_HOST || '168.231.99.126',
  port: parseInt(process.env.DB_PORT || '3232'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '^&TN5Qkg3BTXpW#eeqHj@E',
  database: process.env.DB_NAME || 'site_anhanguera',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});

const app = express();
app.use(cors());

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

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
    res.status(500).json({ error: 'Falha ao buscar sessões', details: err.message });
  }
});

app.get('/api/sessions/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', details: err.message });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API sessions rodando na porta ${PORT}`));
