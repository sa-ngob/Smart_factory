const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixInventorySchema() {
    const client = await pool.connect();
    try {
        console.log("🛠️ Dropping and Recreating 'inventory_transactions' table...");

        await client.query("DROP TABLE IF EXISTS inventory_transactions");

        await client.query(`
            CREATE TABLE inventory_transactions (
                id SERIAL PRIMARY KEY,
                transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                item_code VARCHAR(50) NOT NULL,
                transaction_type VARCHAR(50) NOT NULL, -- 'IN', 'OUT', 'ADJUST'
                quantity_change INTEGER NOT NULL,
                new_quantity INTEGER,
                reference_type VARCHAR(50), -- 'MO', 'PO', 'manual'
                reference_id VARCHAR(50),
                notes TEXT,
                created_by VARCHAR(100)
            );
        `);
        console.log("   ✅ 'inventory_transactions' table recreated with correct schema.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error fixing schema:", err);
        process.exit(1);
    } finally {
        client.release();
    }
}

fixInventorySchema();
