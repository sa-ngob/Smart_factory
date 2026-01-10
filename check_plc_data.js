const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false
});

const checkData = async () => {
    const client = await pool.connect();
    try {
        console.log('🔄 Fetching latest 20 rows from machine_data...');
        const result = await client.query('SELECT * FROM machine_data ORDER BY timestamp DESC LIMIT 20');

        if (result.rows.length === 0) {
            console.log("⚠️ No data found in machine_data table.");
        } else {
            console.table(result.rows);
            // Also showing some specific columns for clarity if the table is wide
            console.log("\n--- Specific Sensor Columns ---");
            const simplified = result.rows.map(row => ({
                timestamp: row.timestamp,
                mo_number: row.mo_number,
                machine_id: row.machine_id,
                temp_core: row.mold_temp_core,
                temp_cavity: row.mold_temp_cavity,
                cycle: row.cycle_time_sec
            }));
            console.table(simplified);
        }

    } catch (e) {
        console.error("❌ Error fetching data:", e);
    } finally {
        client.release();
        pool.end();
    }
};

checkData();
