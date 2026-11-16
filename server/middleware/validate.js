/**
 * Request Validation Middleware (Engine 4)
 * 
 * Validates request payload properties against required schema definitions.
 * Returns 400 Bad Request with field-level error messages if validation fails.
 */

/**
 * Validates that all specified required fields are present and non-empty in req.body.
 * 
 * @param {Array<string>} requiredFields - List of required body field names
 */
function validateRequiredFields(requiredFields = []) {
  return (req, res, next) => {
    const missing = [];

    for (const field of requiredFields) {
      const val = req.body[field];
      if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing or empty required field(s): ${missing.join(', ')}`,
        missingFields: missing
      });
    }

    next();
  };
}

module.exports = {
  validateRequiredFields
};
