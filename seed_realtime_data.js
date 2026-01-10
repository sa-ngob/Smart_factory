const { pool } = require('./database.js');

async function mockRealtimeProduction() {
    console.log("🚀 Seeding Real-time Production Data (machine_data)...");
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Note: machine_id in machine_data is typically the machine_code (e.g., 'MC-001')
        const machines = [
            { id: 'MC-001', name: 'Injection 01' },
            { id: 'MC-002', name: 'Injection 02' },
            { id: 'MC-003', name: 'Injection 03' },
            { id: 'MC-004', name: 'Injection 04' },
            { id: 'MC-005', name: 'Injection 05' },
            { id: 'MC-006', name: 'Injection 06' }
        ];

        // Ensure machines exist in 'machines' table table first (using minimal columns)
        for (const m of machines) {
            await client.query(`
                INSERT INTO machines (machine_code, machine_name, status, machine_type)
                VALUES ($1, $2, 'idle', 'Injection Molding')
                ON CONFLICT (machine_code) DO NOTHING
            `, [m.id, m.name]);
        }

        // Insert latest data for each machine into machine_data
        // Status: 0=Stop, 1=Running, 2=Alarm

        await client.query("DELETE FROM machine_data"); // Clear old real-time snapshots

        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

        // MC-001: Running
        await client.query(`
            INSERT INTO machine_data (machine_id, timestamp, machine_status, mold_count, mold_temp_core, mold_temp_cavity, cycle_time_sec, material_dry_temp, mo_number, item_name)
            VALUES ('MC-001', $1, 1, 15420, 85.5, 84.2, 30.5, 90.0, 'MO-20251208-01', 'Plastic Cover A')
        `, [timestamp]);

        // MC-002: Running
        await client.query(`
            INSERT INTO machine_data (machine_id, timestamp, machine_status, mold_count, mold_temp_core, mold_temp_cavity, cycle_time_sec, material_dry_temp, mo_number, item_name)
            VALUES ('MC-002', $1, 1, 8900, 120.0, 118.5, 45.2, 110.0, 'MO-20251208-02', 'Gear Box Case')
        `, [timestamp]);

        // MC-003: Stop
        await client.query(`
            INSERT INTO machine_data (machine_id, timestamp, machine_status, mold_count, mold_temp_core, mold_temp_cavity, cycle_time_sec, material_dry_temp, mo_number, item_name)
            VALUES ('MC-003', $1, 0, 0, 40.0, 40.0, 0, 50.0, NULL, NULL)
        `, [timestamp]);

        // MC-004: Alarm
        await client.query(`
            INSERT INTO machine_data (machine_id, timestamp, machine_status, mold_count, mold_temp_core, mold_temp_cavity, cycle_time_sec, material_dry_temp, mo_number, item_name)
            VALUES ('MC-004', $1, 2, 500, 75.0, 70.0, 0, 88.0, 'MO-20251208-03', 'Bottle Cap')
        `, [timestamp]);

        // MC-005: Running
        await client.query(`
            INSERT INTO machine_data (machine_id, timestamp, machine_status, mold_count, mold_temp_core, mold_temp_cavity, cycle_time_sec, material_dry_temp, mo_number, item_name)
            VALUES ('MC-005', $1, 1, 33200, 95.0, 94.5, 12.0, 95.0, 'MO-20251208-05', 'Toy Brick 2x4')
        `, [timestamp]);

        // MC-006: Stop (Maintenance)
        await client.query(`
            INSERT INTO machine_data (machine_id, timestamp, machine_status, mold_count, mold_temp_core, mold_temp_cavity, cycle_time_sec, material_dry_temp, mo_number, item_name)
            VALUES ('MC-006', $1, 0, 0, 25.0, 25.0, 0, 25.0, NULL, NULL)
        `, [timestamp]);


        await client.query('COMMIT');
        console.log("✅ Real-time Production Data Seeded!");

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Error seeding production data:", err);
    } finally {
        client.release();
        process.exit(0);
    }
}

mockRealtimeProduction();
