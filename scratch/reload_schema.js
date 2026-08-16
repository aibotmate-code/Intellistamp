/* eslint-disable */
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query(`NOTIFY pgrst, 'reload schema';`);
  console.log('Schema reloaded');
  await client.end();
}

main().catch(console.error);
