const router = require('express').Router();
const { pool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

// GET /api/approvals/recent — feed for "Recent Approvals" widget
router.get('/recent', requireAuth, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.approval_id, a.entity_type, a.entity_id, a.action, a.note, a.created_at,
             u.name AS officer_name
      FROM approvals a
      JOIN users u ON u.id = a.officer_id
      ORDER BY a.created_at DESC
      LIMIT 10
    `);
    res.json({ approvals: rows });
  } catch (e) { next(e); }
});

module.exports = router;
