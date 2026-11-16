/**
 * Authentication Controller (Engine 4)
 * 
 * Handles user login, password verification using bcrypt,
 * session establishment, session destruction on logout,
 * and current session profile retrieval.
 */

const bcrypt = require('bcrypt');
const { query } = require('../db');

/**
 * Log in a user by email and password.
 * 
 * Route: POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    // Lookup user in database by email (case-insensitive)
    const sql = `
      SELECT 
        u.user_id,
        u.name,
        u.email,
        u.password_hash,
        u.role,
        u.dept_id,
        d.name AS dept_name
      FROM users u
      LEFT JOIN departments d ON u.dept_id = d.dept_id
      WHERE LOWER(u.email) = LOWER($1);
    `;
    const result = await query(sql, [email.trim()]);

    if (result.rows.length === 0) {
      // Intentionally generic error message to prevent user enumeration
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const user = result.rows[0];

    // Verify password against stored bcrypt hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Establish user session (password_hash is excluded from session storage)
    req.session.user = {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
      dept_id: user.dept_id,
      dept_name: user.dept_name
    };

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      user: req.session.user
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Log out the currently authenticated user.
 * 
 * Route: POST /api/auth/logout
 */
async function logout(req, res, next) {
  try {
    if (!req.session) {
      return res.status(200).json({
        success: true,
        message: 'Already logged out.'
      });
    }

    req.session.destroy((err) => {
      if (err) {
        return next(err);
      }
      res.clearCookie('connect.sid');
      return res.status(200).json({
        success: true,
        message: 'Logged out successfully.'
      });
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get profile details of currently logged-in user.
 * 
 * Route: GET /api/auth/me
 */
async function getCurrentUser(req, res) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      message: 'Not logged in.'
    });
  }

  return res.status(200).json({
    success: true,
    user: req.session.user
  });
}

module.exports = {
  login,
  logout,
  getCurrentUser
};
