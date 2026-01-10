const { pool } = require('./database.js');

async function mockWeeklyOEE() {
    console.log("🚀 Starting Weekly OEE Mock Data Seeding...");

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Ensure Machines exist
        const machines = [
            { code: 'MC-001', name: 'Injection Machine 1' },
            { code: 'MC-002', name: 'Injection Machine 2' },
            { code: 'MC-003', name: 'Injection Machine 3' }
        ];

        for (const m of machines) {
            await client.query(`
                INSERT INTO machines (machine_code, machine_name, status, machine_type)
                VALUES ($1, $2, 'idle', 'Injection Molding')
                ON CONFLICT (machine_code) DO NOTHING
            `, [m.code, m.name]);
        }

        // Get Machine IDs
        const machineRows = await client.query("SELECT id, machine_code FROM machines WHERE machine_code IN ('MC-001', 'MC-002', 'MC-003')");
        const machineMap = {}; // code -> id
        machineRows.rows.forEach(r => machineMap[r.machine_code] = r.id);

        // 2. Ensure Items exist with cycle time
        const items = [
            { code: 'ITEM-OEE-01', name: 'Part A', cycle_time: 30 },
            { code: 'ITEM-OEE-02', name: 'Part B', cycle_time: 45 },
            { code: 'ITEM-OEE-03', name: 'Part C', cycle_time: 60 }
        ];

        for (const i of items) {
            await client.query(`
                INSERT INTO items (item_code, item_name, item_type, uom, cycle_time_sec, status)
                VALUES ($1, $2, 'Part', 'pcs', $3, 'active')
                ON CONFLICT (item_code) DO UPDATE SET cycle_time_sec = EXCLUDED.cycle_time_sec
            `, [i.code, i.name, i.cycle_time]);
        }

        // 3. Generate MOs and Production Records for last 7 days
        const today = new Date();

        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            console.log(`Processing date: ${dateStr}`);

            for (const machineCode of Object.keys(machineMap)) {
                // Determine item to produce randomly
                const item = items[Math.floor(Math.random() * items.length)];

                // Randomize quantity
                const qty = 500 + Math.floor(Math.random() * 500); // 500 - 1000

                // Times
                const startTime = `${dateStr} 08:00:00`;
                const endTime = `${dateStr} 17:00:00`; // 9 hours

                // Planned times
                const mo_number = `MO-OEE-${machineCode}-${dateStr.replace(/-/g, '')}`;

                // Insert MO
                // Check if exists first to avoid duplicate key errors if run multiple times
                const checkMo = await client.query("SELECT id FROM manufacturing_orders WHERE mo_number = $1", [mo_number]);

                let mo_id;
                if (checkMo.rows.length === 0) {
                    const insertMo = await client.query(`
                        INSERT INTO manufacturing_orders 
                        (mo_number, item_code, quantity_to_produce, status, machine_id, planned_start_time, planned_end_time, actual_start_time, actual_end_time)
                        VALUES ($1, $2, $3, 'completed', $4, $5, $6, $5, $6)
                        RETURNING id
                    `, [mo_number, item.code, qty, machineMap[machineCode], startTime, endTime]);
                    mo_id = insertMo.rows[0].id;
                } else {
                    mo_id = checkMo.rows[0].id;
                }

                // Insert Production Record
                // 90-98% Good, rest Scrap
                const goodRate = 0.90 + (Math.random() * 0.08);
                const goodQty = Math.floor(qty * goodRate);
                const scrapQty = qty - goodQty;

                await client.query(`
                    INSERT INTO production_records (mo_id, record_date, shift, operator_name, good_quantity, total_scrap_quantity, notes)
                    VALUES ($1, $2, 'day', 'AutoBot', $3, $4, 'Mock Data')
                `, [mo_id, dateStr, goodQty, scrapQty]);
            }
        }

        await client.query('COMMIT');
        console.log("🎉 Weekly OEE Mock Data Seeded Successfully!");

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Error seeding OEE data:", err);
    } finally {
        client.release();
        process.exit(0);
    }
}

mockWeeklyOEE();
