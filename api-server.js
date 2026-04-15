import express from 'express';
import cors from 'cors';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:%5E%26TN5Qkg3BTXpW%23eeqHj%40E@168.231.99.126:3232/site_anhanguera?sslmode=disable',
});

app.get('/api/sessions/list', async (req, res) => {
  try {
    const { start, end } = req.query;
    let query = 'SELECT * FROM anh_google_sessions';
    const values = [];
    const conditions = [];

    if (start) {
      values.push(start);
      conditions.push(`created_at >= $${values.length}::date`);
    }
    if (end) {
      values.push(end + 'T23:59:59.999Z');
      conditions.push(`created_at <= $${values.length}::timestamptz`);
    }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY created_at DESC LIMIT 2000';

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use(express.static(join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`Dashboard rodando na porta ${PORT}`));
