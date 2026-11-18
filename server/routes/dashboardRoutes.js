/**
 * Dashboard Routes (Engine 4)
 * 
 * Endpoints for live dashboard metrics and on-the-fly notifications.
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { requireLogin } = require('../middleware/auth');

router.use(requireLogin);

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Get live dashboard statistics
 *     description: >
 *       Returns real-time operational metrics: total requests, active POs,
 *       asset counts, and pending approvals for the current user's role.
 *       Used by the Dashboard page to populate summary cards.
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalRequests:
 *                       type: integer
 *                       example: 12
 *                     activePOs:
 *                       type: integer
 *                       example: 3
 *                     totalAssets:
 *                       type: integer
 *                       example: 48
 *                     totalUnits:
 *                       type: integer
 *                       example: 320
 *                     myPendingApprovals:
 *                       type: integer
 *                       example: 2
 *                 recentRequests:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PurchaseRequest'
 *       401:
 *         description: Not logged in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/stats', dashboardController.getStats);

/**
 * @swagger
 * /api/dashboard/notifications:
 *   get:
 *     summary: Get live on-the-fly notifications
 *     description: >
 *       Calculates pending action counts dynamically without a notifications table.
 *       Returns counts for pending approvals, pending deliveries, and
 *       recent status updates relevant to the logged-in user's role.
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Notification counts and messages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 notifications:
 *                   type: object
 *                   properties:
 *                     pendingApprovals:
 *                       type: integer
 *                       example: 1
 *                     pendingDeliveries:
 *                       type: integer
 *                       example: 2
 *                     messages:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                             example: APPROVAL_WAITING
 *                           text:
 *                             type: string
 *                             example: You have 1 purchase request approval waiting for your decision.
 *       401:
 *         description: Not logged in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/notifications', dashboardController.getNotifications);

module.exports = router;
