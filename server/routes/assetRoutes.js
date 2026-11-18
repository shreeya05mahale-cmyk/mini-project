/**
 * Asset & Inventory Routes (Engine 2)
 */

const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
const { requireLogin } = require('../middleware/auth');

router.use(requireLogin);

/**
 * @swagger
 * /api/assets:
 *   get:
 *     summary: List assets with optional filtering
 *     tags: [Inventory]
 *     parameters:
 *       - in: query
 *         name: lab
 *         schema:
 *           type: string
 *         description: Filter by Lab name (e.g. "Lab 1", "Lab-2", "Lab 4")
 *       - in: query
 *         name: condition
 *         schema:
 *           type: string
 *           enum: [NEW, GOOD, FAIR, DAMAGED, DISPOSED]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by computer name or model
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Filtered list of assets
 */
router.get('/', assetController.getAssets);

/**
 * @swagger
 * /api/assets/summary:
 *   get:
 *     summary: Get asset inventory summary counts
 *     tags: [Inventory]
 *     responses:
 *       200:
 *         description: Summary counts of working/damaged assets and by lab
 */
router.get('/summary', assetController.getInventorySummary);

/**
 * @swagger
 * /api/assets/{id}:
 *   get:
 *     summary: Get single asset by ID or asset code
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Single asset with full specifications
 *       404:
 *         description: Asset not found
 */
router.get('/:id', assetController.getAssetById);

module.exports = router;
