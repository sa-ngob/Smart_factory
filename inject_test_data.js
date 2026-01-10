const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false
});

const inject = async () => {
    const client = await pool.connect();
    try {
        console.log("💉 Injecting test data for MC-001 and MC-002...");
        await client.query(`
            INSERT INTO machine_data (
                machine_id, timestamp, machine_status, mold_count, 
                mold_temp_core, mold_temp_cavity, cycle_time_sec, material_dry_temp, mo_number, item_name
            ) VALUES (
                'MC-001', NOW(), 1, 1000, 80.5, 80.2, 15.5, 90.0, 'TEST-MO-01', 'Test Item A'
            )
        `);
        await client.query(`
            INSERT INTO machine_data (
                machine_id, timestamp, machine_status, mold_count, 
                mold_temp_core, mold_temp_cavity, cycle_time_sec, material_dry_temp, mo_number, item_name
            ) VALUES (
                'MC-002', NOW(), 0, 500, 30.5, 30.2, 0, 40.0, 'TEST-MO-02', 'Test Item B'
            )
        `);
        console.log("✅ Injected 2 records. Please refresh the dashboard.");
    } catch (e) {
        console.error("❌ Error injecting data:", e);
    } finally {
        client.release();
        pool.end();
    }
};

inject();
