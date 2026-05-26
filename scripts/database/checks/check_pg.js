require('dotenv').config();
const { Pool } = require('pg');

async function run() {
    if (!process.env.DATABASE_URL) {
        console.error("No DATABASE_URL found");
        process.exit(1);
    }

    // Add ssl: false to avoid self-signed cert errors in dev
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: false
    });

    try {
        const res = await pool.query("SELECT id, name, branch_code, branch_name FROM entities ORDER BY id DESC LIMIT 5");
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

run();
