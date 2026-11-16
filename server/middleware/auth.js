/**
 * Authentication & Role Authorization Middleware (Engine 4)
 * 
 * Protects API routes by verifying session state and institutional roles.
 * - Missing session -> 401 Unauthorized
 * - Insufficient role -> 403 Forbidden
 */

/**
 * Ensures a request originates from an authenticated user with an active session.
 */
function requireLogin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized. Please sign in to access this resource.'
    });
  }
  next();
}

/**
 * Ensures the authenticated user possesses one of the allowed roles for the action.
 * 
 * @param  {...string} allowedRoles - e.g. 'ADMIN', 'HOD', 'COORDINATOR', etc.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Please sign in to access this resource.'
      });
    }

    const userRole = req.session.user.role;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Role '${userRole}' is not permitted to perform this action.`
      });
    }

    next();
  };
}

module.exports = {
  requireLogin,
  requireRole
};
