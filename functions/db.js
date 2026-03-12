const path = require('path');
const { Pool, types } = require('pg');

// Load environment variables from the server folder (works regardless of cwd)
require('dotenv').config({ path: path.join(__dirname, '.env') });

// The 'pg' driver returns NUMERIC types (OID 1700) as strings to avoid
// precision loss with very large numbers. For this application's purposes,
// parsing them as JavaScript numbers (floats) is safe and aligns with the
// frontend's data models, preventing `toFixed is not a function` errors.
types.setTypeParser(1700, (val) => {
  return val === null ? null : parseFloat(val);
});

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
  ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// const pool = new Pool({
//   user: process.env.PG_USER,
//   host: process.env.PG_HOST,
//   database: process.env.PG_DATABASE,
//   password: process.env.PG_PASSWORD,
//   port: process.env.PG_PORT,
// });

// const pool = new Pool({
//   user: 'postgres',
//   host:'localhost',
//   database: 'pavan_db',
//   password: '12345678',
//   port: '5432',
// });

module.exports = {
  query: (text, params) => pool.query(text, params),
  // Method to get a client from the pool for transactions
  getClient: () => pool.connect(),
  // Expose the pool for the seeder to manage connections
  pool: pool 
};
