const { pool } = require('./database.js');

async function mockDowntimeLogs() {
    console.log("🚀 Seeding Downtime Logs...");
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Ensure Downtime Reasons exist
        const reasons = [
            { code: 'DT-01', desc: 'Mold Change', cat: 'Planned' },
            { code: 'DT-02', desc: 'Machine Breakdown', cat: 'Unplanned' },
            { code: 'DT-03', desc: 'Material Shortage', cat: 'Unplanned' },
            { code: 'DT-04', desc: 'Operator Break', cat: 'Planned' },
            { code: 'DT-05', desc: 'Quality Check', cat: 'Planned' }
        ];

        for (const r of reasons) {
            await client.query(`
                INSERT INTO downtime_reasons (reason_code, description, category)
                VALUES ($1, $2, $3)
                ON CONFLICT (reason_code) DO NOTHING
            `, [r.code, r.desc, r.cat]);
        }

        // Get Reason IDs
        const reasonRes = await client.query("SELECT id, reason_code FROM downtime_reasons");
        const reasonMap = {}; // code -> id
        reasonRes.rows.forEach(row => reasonMap[row.reason_code] = row.id);

        // 2. Ensure Machines exist (Minimal Insert)
        const machineCodes = ['MC-001', 'MC-002', 'MC-003', 'MC-004', 'MC-005', 'MC-006'];
        for (const code of machineCodes) {
            await client.query(`
                INSERT INTO machines (machine_code, machine_name, status, machine_type)
                VALUES ($1, $1, 'idle', 'Injection Molding')
                ON CONFLICT (machine_code) DO NOTHING
            `, [code]);
        }

        // 3. Generate Mock Logs for the last 3 days
        // Status: 0=Stop/Downtime, 1=Running, 2=Alarm
        // We only care about Downtime (0 or 2) for the log page usually, but logs track all state changes.
        // Assuming dashboard filters for non-running states.

        await client.query("DELETE FROM machine_status_logs");

        const now = new Date();

        for (const machine of machineCodes) {
            // Generate 3-5 logs per machine per day
            for (let d = 0; d < 3; d++) {
                const dayDate = new Date(now);
                dayDate.setDate(dayDate.getDate() - d);

                const numLogs = 3 + Math.floor(Math.random() * 3); // 3 to 5 logs

                for (let i = 0; i < numLogs; i++) {
                    // Random start time between 08:00 and 17:00
                    const hour = 8 + Math.floor(Math.random() * 9);
                    const minute = Math.floor(Math.random() * 60);

                    const startTime = new Date(dayDate);
                    startTime.setHours(hour, minute, 0, 0);

                    // Duration 15 to 120 mins
                    const durationMins = 15 + Math.floor(Math.random() * 105);
                    const endTime = new Date(startTime);
                    endTime.setMinutes(endTime.getMinutes() + durationMins);

                    // Random Reason (sometimes null)
                    const reasonCodes = Object.keys(reasonMap);
                    const randomReasonCode = Math.random() > 0.3 ? reasonCodes[Math.floor(Math.random() * reasonCodes.length)] : null;
                    const reasonId = randomReasonCode ? reasonMap[randomReasonCode] : null;

                    await client.query(`
                        INSERT INTO machine_status_logs 
                        (machine_id, status, start_time, end_time, duration_sec, reason_id, notes)
                        VALUES ($1, 0, $2, $3, $4, $5, 'Mock downtime log')
                    `, [machine, startTime, endTime, durationMins * 60, reasonId]);
                }
            }
        }

        await client.query('COMMIT');
        console.log("✅ Mock Downtime Logs Seeded Successfully!");

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Error seeding downtime logs:", err);
    } finally {
        client.release();
        process.exit(0);
    }
}

mockDowntimeLogs();
