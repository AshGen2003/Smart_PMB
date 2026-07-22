const router = require('express').Router();
const { pool } = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate, deliveryCreateSchema } = require('../validators/schemas');

// POST /api/deliveries — assign delivery to a purchase/warehouse
router.post('/', requireAuth, requireRole('PMB_OFFICER'),
  validate(deliveryCreateSchema),
  async (req, res, next) => {
    try {
      const { purchase_id, warehouse_id, vehicle_id, route_id, pickup_location, drop_location } = req.body;
      const { rows } = await pool.query(
        `INSERT INTO deliveries
          (purchase_id, warehouse_id, vehicle_id, route_id, pickup_location, drop_location, status)
         VALUES ($1,$2,$3,$4,$5,$6,'SCHEDULED') RETURNING *`,
        [purchase_id, warehouse_id, vehicle_id, route_id, pickup_location, drop_location]
      );
      res.status(201).json({ delivery: rows[0] });
    } catch (e) { next(e); }
  }
);

// GET /api/deliveries — list
router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT d.*, v.vehicle_number, v.driver_name, w.name AS warehouse_name
      FROM deliveries d
      LEFT JOIN vehicles v   ON v.vehicle_id = d.vehicle_id
      LEFT JOIN warehouses w ON w.warehouse_id = d.warehouse_id
      ORDER BY d.delivery_date DESC
    `);
    res.json({ deliveries: rows });
  } catch (e) { next(e); }
});

module.exports = router;
