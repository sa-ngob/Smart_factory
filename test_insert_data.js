const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres123@postgres:5432/smart_factory'
});

async function testInsert() {
    try {
        console.log("Testing INSERT into machine_data...");

        // Use current time
        const now = new Date();
        const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);

        const query = `
            INSERT INTO machine_data (
                machine_id, timestamp, machine_status, mold_count, 
                mold_temp_core, mold_temp_cavity, cycle_time_sec, material_dry_temp,
                mo_number, item_name
            ) VALUES (
                $1, $2, $3, $4, 
                $5, $6, $7, $8,
                $9, $10
            ) RETURNING *;
        `;

        const values = [
            'TEST-001', timestamp, '1', 999,
            80.5, 80.2, 15.5, 90,
            'TEST-MO-999', 'TEST-ITEM'
        ];

        const res = await pool.query(query, values);
        console.log("✅ INSERT SUCCESS!");
        console.log("Inserted Row:", res.rows[0]);

    } catch (err) {
        console.error("❌ INSERT FAILED:", err.message);
    } finally {
        await pool.end();
    }
}

testInsert();
