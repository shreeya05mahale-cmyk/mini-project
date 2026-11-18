/**
 * Authentication Routes (Engine 4)
 * 
 * Defines endpoints for login, logout, and session status verification.
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireLogin } = require('../middleware/auth');
const { validateRequiredFields } = require('../middleware/validate');

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Sign in to the system
 *     description: >
 *       Verifies email and password against bcrypt hash in PostgreSQL.
 *       On success, creates a secure session cookie (httpOnly).
 *       Use the same browser session for all subsequent protected API calls.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: hod.cs@kletech.ac.in
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful. Session cookie set.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Login successful.
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Missing email or password field
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid email or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/login',
  validateRequiredFields(['email', 'password']),
  authController.login
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Sign out of the system
 *     description: Destroys the current session and clears the session cookie.
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Not logged in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/logout', requireLogin, authController.logout);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get currently logged-in user
 *     description: Returns the profile of the user attached to the current session.
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Current session user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Not logged in — no active session
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/me', requireLogin, authController.getCurrentUser);

module.exports = router;
