require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'postgres',
    database: process.env.DB_NAME || 'smart_factory',
    password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres123',
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: false
});

async function checkSchema() {
    const client = await pool.connect();
    try {
        const tables = ['manufacturing_orders', 'users', 'machines', 'product_standards'];
        for (const t of tables) {
            const res = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${t}'`);
            console.log(`\nTable: ${t}`);
            res.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type})`));
        }
    } catch (e) { console.error(e); }
    finally { client.release(); pool.end(); }
}
checkSchema();
