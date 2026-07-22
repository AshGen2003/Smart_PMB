// SMART PMB — Warehouse & Stock API entrypoint
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const warehouseRoutes = require('./src/routes/warehouses');
const purchaseRoutes = require('./src/routes/purchases');
const deliveryRoutes = require('./src/routes/deliveries');
const approvalRoutes = require('./src/routes/approvals');
const { errorHandler } = require('./src/middleware/error');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'warehouse-api' }));

app.use('/api/warehouses', warehouseRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/approvals', approvalRoutes);

// Consistent JSON error shape: { error: { message, code, details? } }
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`[warehouse-api] listening on :${PORT}`));
