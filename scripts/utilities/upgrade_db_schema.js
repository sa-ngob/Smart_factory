require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function upgradeSchema() {
    console.log("⚙️  Upgrading Database Schema...");
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log("   - Converting production_records.record_date to TIMESTAMP...");
        await client.query("ALTER TABLE production_records ALTER COLUMN record_date TYPE TIMESTAMP USING record_date::timestamp");

        console.log("   - Converting manufacturing_orders times to TIMESTAMP...");
        await client.query("ALTER TABLE manufacturing_orders ALTER COLUMN actual_start_time TYPE TIMESTAMP USING actual_start_time::timestamp");
        await client.query("ALTER TABLE manufacturing_orders ALTER COLUMN actual_end_time TYPE TIMESTAMP USING actual_end_time::timestamp");

        await client.query('COMMIT');
        console.log("✅  Schema Upgrade Complete. Time data will now be preserved.");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Error upgrading schema:", err.message);
    } finally {
        client.release();
        process.exit(0);
    }
}

upgradeSchema();
