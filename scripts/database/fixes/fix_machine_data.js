const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false
});

const fixTable = async () => {
    const client = await pool.connect();
    try {
        console.log("🔄 Dropping old 'machine_data' table (to remove incorrect constraints)...");
        await client.query("DROP TABLE IF EXISTS machine_data");

        console.log("🛠️ Creating new 'machine_data' table (Time-Series / History Optimized)...");
        await client.query(`
            CREATE TABLE machine_data (
                machine_id TEXT NOT NULL,
                timestamp TIMESTAMP NOT NULL,
                machine_status INTEGER,
                mold_count INTEGER,
                mold_temp_core DOUBLE PRECISION,
                mold_temp_cavity DOUBLE PRECISION,
                cycle_time_sec DOUBLE PRECISION,
                material_dry_temp DOUBLE PRECISION,
                mo_number TEXT,
                item_name TEXT,
                PRIMARY KEY (timestamp, machine_id) 
            )
        `);

        // Index for performance
        await client.query("CREATE INDEX idx_machine_data_mo ON machine_data(mo_number, timestamp)");
        await client.query("CREATE INDEX idx_machine_data_machine ON machine_data(machine_id, timestamp)");

        console.log("✅ Table 'machine_data' has been fixed! History tracking is now enabled.");
    } catch (e) {
        console.error("❌ Error fixing table:", e);
    } finally {
        client.release();
        pool.end();
    }
};

fixTable();
