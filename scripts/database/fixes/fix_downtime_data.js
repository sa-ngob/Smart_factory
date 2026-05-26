const { pool } = require('./database.js');

async function fixDowntimeData() {
    console.log("🛠️ Fixing Downtime Logs (Forcing UTC+7 friendly times)...");
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Clear existing logs
        await client.query("DELETE FROM machine_status_logs");

        // We want logs to appear around 08:00 - 17:00 BKK time.
        // BKK is UTC+7.
        // So 08:00 BKK = 01:00 UTC.
        // 17:00 BKK = 10:00 UTC.

        const machineCodes = ['MC-001', 'MC-002', 'MC-003', 'MC-004', 'MC-005', 'MC-006'];

        // Use a fixed "Now" as base, but ensure we define it in UTC terms if needed? 
        // Actually simplest is to build Date objects using UTC methods.

        const now = new Date(); // Current system time

        // Generate logs for Today, Yesterday, DayBefore
        for (let d = 0; d < 3; d++) {

            // Create a base date for 'd' days ago
            const dateBase = new Date(now);
            dateBase.setDate(dateBase.getDate() - d);

            // We iterate a few times per machine
            for (const machine of machineCodes) {
                const numLogs = 2 + Math.floor(Math.random() * 3); // 2-4 logs

                for (let i = 0; i < numLogs; i++) {
                    // Random Hour between 1 and 9 (UTC) -> 8 and 16 (BKK)
                    const utcHour = 1 + Math.floor(Math.random() * 9);
                    const utcMinute = Math.floor(Math.random() * 60);

                    const startTime = new Date(dateBase);
                    startTime.setUTCHours(utcHour, utcMinute, 0, 0);

                    // Duration 10-60 mins
                    const durationMins = 10 + Math.floor(Math.random() * 50);
                    const endTime = new Date(startTime);
                    endTime.setMinutes(endTime.getMinutes() + durationMins);

                    // console.log(`Genering: ${startTime.toISOString()} (UTC) -> Should be ${utcHour+7}:${utcMinute} (BKK)`);

                    await client.query(`
                        INSERT INTO machine_status_logs 
                        (machine_id, status, start_time, end_time, duration_sec, reason_id, notes)
                        VALUES ($1, 0, $2, $3, $4, NULL, 'System Gen')
                    `, [machine, startTime, endTime, durationMins * 60]);
                }
            }
        }

        await client.query('COMMIT');
        console.log("✅ Fixed Logs Successfully!");

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Error fixing logs:", err);
    } finally {
        client.release();
        process.exit(0);
    }
}

fixDowntimeData();
