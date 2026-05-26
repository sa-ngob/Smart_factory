require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function reseedDowntime() {
    console.log("🛠️  Reseeding Downtime Logs (Using Server Local Time)...");
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query("DELETE FROM machine_status_logs");

        const machines = ['MC-001', 'MC-002', 'MC-003', 'MC-004', 'MC-005', 'MC-006'];
        const now = new Date();

        console.log("   - Ensuring machines exist...");
        for (const code of machines) {
            await client.query(`
                INSERT INTO machines (machine_code, machine_name, status, machine_type)
                VALUES ($1, $1, 'idle', 'Injection Molding')
                ON CONFLICT (machine_code) DO NOTHING
            `, [code]);
        }

        console.log("   Server Time:", now.toString()); // Should show GMT+0700 if TZ is set

        for (const machine of machines) {
            const numLogs = 1 + Math.floor(Math.random() * 2);
            for (let i = 0; i < numLogs; i++) {
                // Generate time for today 09:xx - 11:xx
                const h = 9 + Math.floor(Math.random() * 3);
                const m = Math.floor(Math.random() * 60);

                // Create Date object explicitly
                const logTime = new Date(now);
                logTime.setHours(h, m, 0, 0);

                const duration = 15 + Math.floor(Math.random() * 30);
                const endTime = new Date(logTime);
                endTime.setMinutes(endTime.getMinutes() + duration);

                // Insert standard parameterized query. 
                // PG will interpret the JS Date object based on connection/server timezone.
                // Since both are now BKK, this should "Just Work".
                await client.query(`
                    INSERT INTO machine_status_logs 
                    (machine_id, status, start_time, end_time, duration_sec, reason_id, notes)
                    VALUES ($1, 0, $2, $3, $4, NULL, 'System Fix')
                `, [machine, logTime, endTime, duration * 60]);
            }
        }

        await client.query('COMMIT');
        console.log("✅  Logs reseeded successfully.");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Error reseeding:", err);
    } finally {
        client.release();
        process.exit(0);
    }
}

reseedDowntime();
