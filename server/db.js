/**
 * Database Connection & Transaction Manager
 * 
 * Uses node-postgres (pg) Pool to manage reusable database connections.
 * In production and academic projects, using a connection pool prevents 
 * opening and closing expensive TCP connections for every single request.
 */

const { Pool } = require('pg');
require('dotenv').config();

// Initialize the PostgreSQL connection pool using environment variables
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'kle_asset_db',
  max: 20, // Maximum number of active connections in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Log unexpected connection pool errors
pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client:', err.message);
});

/**
 * Execute a single parameterized SQL query.
 * 
 * Parameterized queries ($1, $2...) prevent SQL injection attacks
 * by separating the SQL command structure from user-supplied data.
 * 
 * @param {string} text - SQL query string with parameter placeholders ($1, $2...)
 * @param {Array} params - Array of parameter values to bind
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params = []) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // Uncomment below for query debugging if needed:
  // console.log(`[DB Query] ${text.slice(0, 50)}... [${duration}ms] rows: ${res.rowCount}`);
  return res;
}

/**
 * Execute multiple database operations inside a single ACID transaction.
 * 
 * If all operations succeed: COMMIT is called and changes become permanent.
 * If any error is thrown: ROLLBACK is called, undoing all partial changes.
 * The connection client is always guaranteed to be released back to the pool in finally.
 * 
 * @param {Function} callback - Async function receiving the transactional db client: async (client) => { ... }
 * @returns {Promise<any>} The value returned by the callback
 */
async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    // Release the client back to the connection pool
    client.release();
  }
}

module.exports = {
  pool,
  query,
  withTransaction
};
