const express = require('express');
const authRoutes = require('./auth.js');
const hotelRoutes = require('./hotels.js');
const menuRoutes = require('./menus.js');
const orderRoutes = require('./orders.js');
const deliveryRoutes = require('./delivery.js');
const reportRoutes = require('./reports.js');
const uploadRoutes = require('./upload.js');
const invoiceRoutes = require('./invoices.js');
const pricingRoutes = require('./pricing.js');
const whatsappRoutes = require('./whatsapp.js');
const notificationsRoutes = require('./notifications.js');

const settingsRoutes = require('./settings.js');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/hotels', hotelRoutes);
router.use('/menus', menuRoutes);
router.use('/orders', orderRoutes);
router.use('/delivery', deliveryRoutes);
router.use('/reports', reportRoutes);
router.use('/upload', uploadRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/pricing', pricingRoutes);
router.use('/whatsapp', whatsappRoutes.router);
router.use('/notifications', notificationsRoutes);
router.use('/settings', settingsRoutes);

module.exports = router;
