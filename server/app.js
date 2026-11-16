/**
 * Express Application Setup
 * 
 * Configures the web server, session management with PostgreSQL backing,
 * static file serving for the frontend, API route registration,
 * and central error handling.
 */

require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { pool, query } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Body parsers: parse incoming JSON payloads and URL-encoded form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration: stores session data in PostgreSQL rather than memory,
// so user logins persist across server restarts.
app.use(
  session({
    store: new pgSession({
      pool: pool,
      tableName: 'session',
      createTableIfMissing: true, // Creates the session table automatically if it doesn't exist
    }),
    secret: process.env.SESSION_SECRET || 'kle_infocell_secret_dev_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // Prevents client-side JavaScript from accessing cookies (XSS mitigation)
      secure: process.env.NODE_ENV === 'production', // true only over HTTPS in production
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
    },
  })
);

// Serve static frontend files from the public/ directory
// Since frontend and backend are served from the same origin, no CORS is needed
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint to verify server and database connectivity
app.get('/api/health', async (req, res, next) => {
  try {
    const dbResult = await query('SELECT NOW() AS current_time, current_database() AS database_name;');
    res.json({
      success: true,
      status: 'UP',
      timestamp: new Date().toISOString(),
      database: dbResult.rows[0],
      message: 'KLE Asset & Procurement System API is operational'
    });
  } catch (err) {
    next(err);
  }
});

// API Routes (Engine 4)
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 handler for unknown API endpoints
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.originalUrl}' not found`
  });
});

// Centralized error handling middleware
// Catches all errors passed via next(err) and sends a consistent JSON response
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);

  const status = err.status || 500;
  const message = status === 500
    ? 'An unexpected internal server error occurred.'
    : err.message;

  res.status(status).json({
    success: false,
    status,
    message,
    ...(process.env.NODE_ENV !== 'production' && { detail: err.message, stack: err.stack })
  });
});

// Start the HTTP server only if not in testing mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` KLE Tech Asset & Procurement System Server Running`);
    console.log(` URL: http://localhost:${PORT}`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`====================================================`);
  });
}

module.exports = app;
