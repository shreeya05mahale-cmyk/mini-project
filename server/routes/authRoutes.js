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

// Public route: Sign in
router.post(
  '/login',
  validateRequiredFields(['email', 'password']),
  authController.login
);

// Protected route: Sign out
router.post('/logout', requireLogin, authController.logout);

// Protected route: Current user details
router.get('/me', requireLogin, authController.getCurrentUser);

module.exports = router;
