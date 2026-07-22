const { z } = require('zod');

const warehouseCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  district: z.string().trim().min(2).max(80),
  location: z.string().trim().min(2).max(200),
  capacity_kg: z.number().positive(),
  status: z.enum(['ACTIVE', 'MAINTENANCE', 'INACTIVE']).optional(),
});

const purchaseCreateSchema = z.object({
  farmer_id: z.string().uuid(),
  warehouse_id: z.number().int().positive(),
  paddy_type: z.string().trim().min(2).max(50),
  quantity_kg: z.number().positive(),
  amount_lkr: z.number().nonnegative(),
  payment_status: z.enum(['PENDING', 'COMPLETED', 'FAILED']).optional(),
});

const deliveryCreateSchema = z.object({
  purchase_id: z.number().int().positive().optional(),
  warehouse_id: z.number().int().positive(),
  vehicle_id: z.number().int().positive().optional(),
  route_id: z.number().int().positive().optional(),
  pickup_location: z.string().min(2),
  drop_location: z.string().min(2),
});

// Helper: run zod parse and forward a clean 400 error.
function validate(schema) {
  return (req, _res, next) => {
    const r = schema.safeParse(req.body);
    if (!r.success) {
      return next({
        status: 400,
        code: 'VALIDATION',
        message: 'Invalid request body',
        details: r.error.flatten(),
      });
    }
    req.body = r.data;
    next();
  };
}

module.exports = {
  warehouseCreateSchema,
  purchaseCreateSchema,
  deliveryCreateSchema,
  validate,
};
