const express = require('express');
const authRoutes = require('./auth');
const hotelRoutes = require('./hotels');
const menuRoutes = require('./menus');
const orderRoutes = require('./orders');
const deliveryRoutes = require('./delivery');
const reportRoutes = require('./reports');
const uploadRoutes = require('./upload');
const invoiceRoutes = require('./invoices');

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
