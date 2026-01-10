require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function debugQuery() {
    console.log("🔍 Debugging Sales Dashboard Query...");
    const client = await pool.connect();
    try {
        const sql = `
            SELECT e.name as customer_name, SUM(inv.grand_total) as total_sales
            FROM invoices inv JOIN entities e ON inv.customer_id = e.id
            WHERE inv.status != 'cancelled' 
            GROUP BY e.name ORDER BY total_sales DESC LIMIT 10
        `;
        console.log("Executing SQL:", sql);
        const res = await client.query(sql);
        console.table(res.rows);
    } catch (err) {
        console.error("❌ SQL Error:", err.message);
    } finally {
        client.release();
        process.exit(0);
    }
}

debugQuery();
