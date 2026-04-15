import express from 'express';
import cors from 'cors';
import pg from 'pg';

const { Pool } = pg;

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: 'postgres://postgres:%5E%26TN5Qkg3BTXpW%23eeqHj%40E@168.231.99.126:3232/site_anhanguera?sslmode=disable',
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

app.listen(3001, () => console.log('API sessions rodando na porta 3001'));
