import { pool } from './src/config/database';

async function run() {
  const users = await pool.query("SELECT * FROM users WHERE role = 'STUDENT'");
  console.log('Students:', users.rows.length);
  
  const groups = await pool.query("SELECT * FROM project_groups");
  console.log('Groups:', groups.rows.length);
  
  process.exit(0);
}
run();
