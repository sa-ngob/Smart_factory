require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function checkSchemaAndData() {
    console.log("🔍 Inspecting 'production_records' Table...");
    const client = await pool.connect();
    try {
        // 1. Check Column Types
        console.log("\n--- Table Schema ---");
        const schemaRes = await client.query(`
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'production_records'
            ORDER BY ordinal_position;
        `);
        console.table(schemaRes.rows);

        // 2. Check Latest Data
        console.log("\n--- Latest 3 Records ---");
        const dataRes = await client.query(`
            SELECT id, record_date, TO_CHAR(record_date, 'YYYY-MM-DD HH24:MI:SS') as formatted_date, good_quantity 
            FROM production_records 
            ORDER BY id DESC 
            LIMIT 3
        `);
        console.table(dataRes.rows);

    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        client.release();
        process.exit(0);
    }
}

checkSchemaAndData();
