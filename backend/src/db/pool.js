const { Pool, types } = require('pg');

// 1082 is DATE. A Postgres DATE carries no time and no zone, but node-pg turns
// it into a JS Date at *local* midnight, which serialises to the previous day
// anywhere ahead of UTC — WIB included. Every read of a lead's dates came back
// a day early, so editing one and saving it shifted it again. Hand the
// 'YYYY-MM-DD' text through untouched instead.
types.setTypeParser(1082, (value) => value);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error', err);
  process.exit(1);
});

module.exports = pool;
