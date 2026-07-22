const router = require('express').Router();
const { pool } = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate, warehouseCreateSchema } = require('../validators/schemas');

// GET /api/warehouses — list all warehouses with computed utilization
router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT warehouse_id, name, district, location, capacity_kg, current_stock_kg, status,
             ROUND((current_stock_kg / capacity_kg) * 100, 1) AS utilization_pct
      FROM warehouses
      ORDER BY warehouse_id
    `);
    res.json({ warehouses: rows });
  } catch (e) { next(e); }
});

// GET /api/warehouses/:id — single warehouse
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT *, ROUND((current_stock_kg / capacity_kg) * 100, 1) AS utilization_pct
       FROM warehouses WHERE warehouse_id = $1`,
      [req.params.id]
    );
    if (!rows.length) return next({ status: 404, code: 'NOT_FOUND', message: 'Warehouse not found' });
    res.json({ warehouse: rows[0] });
  } catch (e) { next(e); }
});

// GET /api/warehouses/:id/inventory — inventory rows for warehouse
router.get('/:id/inventory', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT inventory_id, paddy_type, quantity_kg, storage_date
       FROM inventory WHERE warehouse_id = $1
       ORDER BY storage_date DESC`,
      [req.params.id]
    );
    res.json({ inventory: rows });
  } catch (e) { next(e); }
});

// POST /api/warehouses — PMB_OFFICER only
router.post('/', requireAuth, requireRole('PMB_OFFICER'),
  validate(warehouseCreateSchema),
  async (req, res, next) => {
    try {
      const { name, district, location, capacity_kg, status = 'ACTIVE' } = req.body;
      const { rows } = await pool.query(
        `INSERT INTO warehouses (name, district, location, capacity_kg, status)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [name, district, location, capacity_kg, status]
      );
      res.status(201).json({ warehouse: rows[0] });
    } catch (e) { next(e); }
  }
);

// GET /api/warehouses/alerts/low-capacity — warehouses above 85% capacity
router.get('/alerts/capacity', requireAuth, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT warehouse_id, name, district, capacity_kg, current_stock_kg,
             ROUND((current_stock_kg / capacity_kg) * 100, 1) AS utilization_pct
      FROM warehouses
      WHERE (current_stock_kg / capacity_kg) >= 0.85
         OR (current_stock_kg / capacity_kg) <= 0.10
      ORDER BY utilization_pct DESC
    `);
    res.json({ alerts: rows });
  } catch (e) { next(e); }
});

module.exports = router;
