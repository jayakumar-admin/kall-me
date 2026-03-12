const express = require('express');
const authRoutes = require('./auth.js');
const hotelRoutes = require('./hotels.js');
const menuRoutes = require('./menus.js');
const orderRoutes = require('./orders.js');
const deliveryRoutes = require('./delivery.js');
const reportRoutes = require('./reports.js');
const uploadRoutes = require('./upload.js');
const invoiceRoutes = require('./invoices.js');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/hotels', hotelRoutes);
router.use('/menus', menuRoutes);
router.use('/orders', orderRoutes);
router.use('/delivery', deliveryRoutes);
router.use('/reports', reportRoutes);
router.use('/upload', uploadRoutes);
router.use('/invoices', invoiceRoutes);

module.exports = router;
