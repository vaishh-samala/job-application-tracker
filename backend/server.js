import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db.js';

dotenv.config();
const app = express();
const PORT = Number(process.env.PORT || 5001);
const ALLOWED_STATUSES = ['Wishlist', 'Applied', 'Screening', 'Interview', 'Offer', 'Rejected', 'Withdrawn'];

app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json({ limit: '1mb' }));

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function validateApplication(body, partial = false) {
  const errors = [];
  if (!partial || body.company !== undefined) {
    if (typeof body.company !== 'string' || !body.company.trim()) errors.push('Company is required.');
  }
  if (!partial || body.role !== undefined) {
    if (typeof body.role !== 'string' || !body.role.trim()) errors.push('Role is required.');
  }
  if (body.status !== undefined && !ALLOWED_STATUSES.includes(body.status)) {
    errors.push(`Status must be one of: ${ALLOWED_STATUSES.join(', ')}.`);
  }
  for (const field of ['company', 'role', 'location', 'job_url', 'salary_range', 'notes']) {
    if (body[field] !== undefined && typeof body[field] !== 'string') errors.push(`${field} must be text.`);
  }
  return errors;
}

app.get('/api/health', asyncHandler(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok', database: 'connected' });
}));

app.get('/api/applications/stats', asyncHandler(async (_req, res) => {
  const [totalResult, statusResult, recentResult] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS total FROM applications'),
    pool.query('SELECT status, COUNT(*)::int AS count FROM applications GROUP BY status ORDER BY count DESC'),
    pool.query(`SELECT COUNT(*)::int AS count FROM applications
                WHERE applied_date >= CURRENT_DATE - INTERVAL '7 days'`)
  ]);
  const byStatus = Object.fromEntries(ALLOWED_STATUSES.map((status) => [status, 0]));
  for (const row of statusResult.rows) byStatus[row.status] = row.count;
  res.json({
    total: totalResult.rows[0].total,
    interviews: byStatus.Interview + byStatus.Screening,
    offers: byStatus.Offer,
    appliedThisWeek: recentResult.rows[0].count,
    byStatus
  });
}));

app.get('/api/applications', asyncHandler(async (req, res) => {
  const search = String(req.query.search || '').trim();
  const status = String(req.query.status || '').trim();
  const params = [];
  const where = [];
  if (search) {
    params.push(`%${search}%`);
    where.push(`(company ILIKE $${params.length} OR role ILIKE $${params.length} OR location ILIKE $${params.length})`);
  }
  if (status && status !== 'All statuses') {
    if (!ALLOWED_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status filter.' });
    params.push(status);
    where.push(`status = $${params.length}`);
  }
  const sql = `SELECT * FROM applications ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
               ORDER BY applied_date DESC NULLS LAST, created_at DESC`;
  const result = await pool.query(sql, params);
  res.json(result.rows);
}));

app.get('/api/applications/:id', asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM applications WHERE id = $1', [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: 'Application not found.' });
  res.json(result.rows[0]);
}));

app.post('/api/applications', asyncHandler(async (req, res) => {
  const errors = validateApplication(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });
  const b = req.body;
  const result = await pool.query(
    `INSERT INTO applications
      (company, role, location, job_url, salary_range, status, applied_date, interview_date, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [
      b.company.trim(), b.role.trim(), b.location || '', b.job_url || '', b.salary_range || '',
      b.status || 'Applied', b.applied_date || null, b.interview_date || null, b.notes || ''
    ]
  );
  res.status(201).json(result.rows[0]);
}));

app.put('/api/applications/:id', asyncHandler(async (req, res) => {
  const errors = validateApplication(req.body, true);
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });
  const existing = await pool.query('SELECT * FROM applications WHERE id = $1', [req.params.id]);
  if (!existing.rowCount) return res.status(404).json({ error: 'Application not found.' });
  const old = existing.rows[0];
  const b = { ...old, ...req.body };
  const result = await pool.query(
    `UPDATE applications SET
      company=$1, role=$2, location=$3, job_url=$4, salary_range=$5, status=$6,
      applied_date=$7, interview_date=$8, notes=$9, updated_at=NOW()
     WHERE id=$10 RETURNING *`,
    [b.company, b.role, b.location || '', b.job_url || '', b.salary_range || '',
      b.status || 'Applied', b.applied_date || null, b.interview_date || null, b.notes || '', req.params.id]
  );
  res.json(result.rows[0]);
}));

app.delete('/api/applications/:id', asyncHandler(async (req, res) => {
  const result = await pool.query('DELETE FROM applications WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: 'Application not found.' });
  res.json({ message: 'Application deleted.', id: result.rows[0].id });
}));

app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Server error. Check the backend terminal and database connection.' });
});

app.listen(PORT, () => console.log(`Job Application Tracker API running at http://localhost:${PORT}`));
