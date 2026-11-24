/**
 * Approvals Routes (Engine 1)
 */

const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approvalController');
const { requireLogin } = require('../middleware/auth');

router.use(requireLogin);

/**
 * @swagger
 * /api/approvals/pending:
 *   get:
 *     summary: Get actionable pending approvals for logged-in user's role
 *     tags: [Approvals]
 *     responses:
 *       200:
 *         description: List of pending approval tasks
 */
router.get('/pending', approvalController.getPendingApprovals);

/**
 * @swagger
 * /api/approvals/{requestId}/decision:
 *   post:
 *     summary: Record an approval or rejection decision
 *     tags: [Approvals]
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [decision]
 *             properties:
 *               decision:
 *                 type: string
 *                 enum: [APPROVED, REJECTED]
 *               remarks:
 *                 type: string
 *     responses:
 *       200:
 *         description: Decision recorded and chain advanced
 */
router.post('/:requestId/decision', approvalController.recordDecision);

module.exports = router;
