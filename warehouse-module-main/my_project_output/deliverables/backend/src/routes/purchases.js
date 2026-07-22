const router = require('express').Router();
const { pool } = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate, purchaseCreateSchema } = require('../validators/schemas');

// GET /api/purchases?status=PENDING — list purchases, optional status filter.
// Joins farmer + warehouse for display.
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status).toUpperCase() : null;
    const params = [];
    let where = '';
    if (status) { params.push(status); where = `WHERE p.payment_status = $1`; }
    const { rows } = await pool.query(`
      SELECT p.purchase_id, p.paddy_type, p.quantity_kg, p.amount_lkr, p.payment_status,
             p.purchase_date, u.name AS farmer_name, w.name AS warehouse_name,
             w.warehouse_id
      FROM purchases p
      JOIN users u      ON u.id = p.farmer_id
      JOIN warehouses w ON w.warehouse_id = p.warehouse_id
      ${where}
      ORDER BY p.purchase_date DESC
      LIMIT 100
    `, params);
    res.json({ purchases: rows });
  } catch (e) { next(e); }
});

// POST /api/purchases — record intake.
// Wrapped in a transaction: creates purchase, inserts inventory batch,
// and increments warehouse.current_stock_kg. Rejects if it would exceed capacity.
router.post('/', requireAuth, requireRole('AUTHORIZED_PURCHASER', 'PMB_OFFICER'),
  validate(purchaseCreateSchema),
  async (req, res, next) => {
    const { farmer_id, warehouse_id, paddy_type, quantity_kg, amount_lkr, payment_status = 'PENDING' } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock the warehouse row so two concurrent intakes can't both overflow capacity.
      const wRes = await client.query(
        `SELECT capacity_kg, current_stock_kg FROM warehouses
         WHERE warehouse_id = $1 FOR UPDATE`,
        [warehouse_id]
      );
      if (!wRes.rows.length) throw { status: 404, code: 'NOT_FOUND', message: 'Warehouse not found' };
      const { capacity_kg, current_stock_kg } = wRes.rows[0];
      const remaining = Number(capacity_kg) - Number(current_stock_kg);
      if (Number(quantity_kg) > remaining) {
        throw { status: 400, code: 'OVER_CAPACITY',
          message: `Intake exceeds remaining capacity (${remaining} kg available)` };
      }

      // 1. Create purchase
      const pRes = await client.query(
        `INSERT INTO purchases
          (farmer_id, purchaser_id, warehouse_id, paddy_type, quantity_kg, amount_lkr, payment_status)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [farmer_id, req.user.sub, warehouse_id, paddy_type, quantity_kg, amount_lkr, payment_status]
      );

      // 2. Add inventory batch
      await client.query(
        `INSERT INTO inventory (warehouse_id, paddy_type, quantity_kg)
         VALUES ($1,$2,$3)`,
        [warehouse_id, paddy_type, quantity_kg]
      );

      // 3. Update warehouse running stock total
      await client.query(
        `UPDATE warehouses SET current_stock_kg = current_stock_kg + $1
         WHERE warehouse_id = $2`,
        [quantity_kg, warehouse_id]
      );

      await client.query('COMMIT');
      res.status(201).json({ purchase: pRes.rows[0] });
    } catch (e) {
      await client.query('ROLLBACK');
      next(e);
    } finally {
      client.release();
    }
  }
);

module.exports = router;
