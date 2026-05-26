require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function debugInventory() {
    console.log("🔍 Debugging Inventory Dashboard Queries...");
    const client = await pool.connect();
    try {
        // 1. Check Table Schema
        console.log("\n--- 'items' Table Schema ---");
        const schemaRes = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'items'
            ORDER BY ordinal_position;
        `);
        console.table(schemaRes.rows);

        // 2. Test Queries
        console.log("\n--- Testing Individual Queries ---");

        try {
            console.log("1. Total Value:");
            await client.query("SELECT SUM(stock_quantity * COALESCE(cost_price, 0)) as total FROM items");
            console.log("   ✅ OK");
        } catch (e) { console.error("   ❌ Failed:", e.message); }

        try {
            console.log("2. Type Breakdown:");
            await client.query("SELECT item_type, COUNT(id) as count FROM items GROUP BY item_type");
            console.log("   ✅ OK");
        } catch (e) { console.error("   ❌ Failed:", e.message); }

        try {
            console.log("3. Low Stock Check (min_stock):");
            await client.query("SELECT COUNT(id) as count FROM items WHERE stock_quantity <= min_stock");
            console.log("   ✅ OK");
        } catch (e) { console.error("   ❌ Failed:", e.message); }

    } catch (err) {
        console.error("General Error:", err.message);
    } finally {
        client.release();
        process.exit(0);
    }
}

debugInventory();
