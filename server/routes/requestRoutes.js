/**
 * Purchase Request Routes (Engine 1)
 */

const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { requireLogin } = require('../middleware/auth');

router.use(requireLogin);

/**
 * @swagger
 * /api/requests:
 *   post:
 *     summary: Submit a new purchase request (HOD only)
 *     tags: [Purchase Requests]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [justification, items]
 *             properties:
 *               justification:
 *                 type: string
 *                 example: L2 and L3 Network Switches for AI Lab infrastructure
 *               items:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/RequestItem'
 *     responses:
 *       201:
 *         description: Request submitted with generated approval chain
 *       403:
 *         description: Only HOD can submit requisitions
 */
router.post('/', requestController.createRequest);

/**
 * @swagger
 * /api/requests:
 *   get:
 *     summary: Get list of purchase requests
 *     tags: [Purchase Requests]
 *     responses:
 *       200:
 *         description: List of purchase requests
 */
router.get('/', requestController.getRequests);

router.get('/next-ref', requestController.getNextRef);

/**
 * @swagger
 * /api/requests/{id}:
 *   get:
 *     summary: Get full request detail, line items, and approval progress trail
 *     tags: [Purchase Requests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detailed purchase request
 */
router.get('/:id', requestController.getRequestDetail);

module.exports = router;
