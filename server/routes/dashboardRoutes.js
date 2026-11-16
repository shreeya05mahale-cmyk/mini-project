/**
 * Dashboard Routes (Engine 4)
 * 
 * Endpoints for live dashboard metrics and on-the-fly notifications.
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { requireLogin } = require('../middleware/auth');

// All dashboard routes require an active session
router.use(requireLogin);

router.get('/stats', dashboardController.getStats);
router.get('/notifications', dashboardController.getNotifications);

module.exports = router;
