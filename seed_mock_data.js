const { pool } = require('./database.js');

async function seedMockData() {
    const client = await pool.connect();
    try {
        console.log("🌱 Seeding mock data...");
        await client.query('BEGIN');

        // 1. Create Mock Customer (Entity)
        console.log("Creating mock customer...");
        let customerId;
        const customerRes = await client.query(`
            INSERT INTO entities (name, address, contact_person, email, phone)
            VALUES ('Mock Customer Co., Ltd.', '123 Factory Road, Industrial Park', 'John Doe', 'contact@mockcustomer.com', '02-123-4567')
            RETURNING id;
        `);

        if (customerRes.rows.length > 0) {
            customerId = customerRes.rows[0].id;
        } else {
            // If already exists, fetch it
            const existing = await client.query(`SELECT id FROM entities WHERE name = 'Mock Customer Co., Ltd.'`);
            customerId = existing.rows[0].id;
        }
        console.log(`Customer ID: ${customerId}`);

        // 2. Create Mock Items
        console.log("Creating mock items...");

        // Raw Materials
        const rawMaterials = [
            { code: 'RM-001', name: 'ABS Plastic Pellets', type: 'raw_material', uom: 'kg', stock: 500, material: 'ABS', grade: 'High Impact', color: 'White' },
            { code: 'RM-002', name: 'PP Plastic Pellets', type: 'raw_material', uom: 'kg', stock: 300, material: 'PP', grade: 'Standard', color: 'Clear' },
            { code: 'RM-003', name: 'Masterbatch Red', type: 'raw_material', uom: 'kg', stock: 50, material: 'Pigment', grade: 'Premium', color: 'Red' }
        ];

        for (const rm of rawMaterials) {
            await client.query(`
                INSERT INTO items (
                    item_code, item_name, item_type, uom, stock_quantity, 
                    material_name, grade, colour, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
                ON CONFLICT (item_code) DO NOTHING;
            `, [rm.code, rm.name, rm.type, rm.uom, rm.stock, rm.material, rm.grade, rm.color]);
        }

        // Finished Goods
        const finishedGoods = [
            { code: 'FG-001', name: 'Plastic Cover Model A', type: 'finished_good', uom: 'pcs', stock: 100, weight: 150, cycle: 45, model: 'Model A' },
            { code: 'FG-002', name: 'Storage Box Small', type: 'finished_good', uom: 'pcs', stock: 50, weight: 300, cycle: 60, model: 'Box-S' }
        ];

        for (const fg of finishedGoods) {
            await client.query(`
                INSERT INTO items (
                    item_code, item_name, item_type, uom, stock_quantity, 
                    part_weight_gram, cycle_time_sec, model, customer_id, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
                ON CONFLICT (item_code) DO NOTHING;
            `, [fg.code, fg.name, fg.type, fg.uom, fg.stock, fg.weight, fg.cycle, fg.model, customerId]);
        }

        // 3. Create Mock Molds
        console.log("Creating mock molds...");
        const molds = [
            {
                code: 'MOLD-001', name: 'Mold for Cover A', type: 'Injection',
                cavity: 4, size_w: 500, size_l: 600, size_h: 400, weight: 1200,
                cycle: 45, runner: 'Cold Runner', gate: 'Submarine'
            },
            {
                code: 'MOLD-002', name: 'Mold for Box Small', type: 'Injection',
                cavity: 2, size_w: 700, size_l: 800, size_h: 500, weight: 2500,
                cycle: 60, runner: 'Hot Runner', gate: 'Direct'
            }
        ];

        for (const m of molds) {
            await client.query(`
                INSERT INTO molds (
                    mold_code, mold_name, customer_id, mold_type, 
                    cavity, size_w, size_l, size_h, weight, 
                    cycle_time_sec, runner_system, gate_type, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active')
                ON CONFLICT (mold_code) DO NOTHING;
            `, [m.code, m.name, customerId, m.type, m.cavity, m.size_w, m.size_l, m.size_h, m.weight, m.cycle, m.runner, m.gate]);
        }

        await client.query('COMMIT');
        console.log("✅ Mock data seeded successfully!");

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Error seeding data:", err);
    } finally {
        client.release();
        pool.end();
    }
}

seedMockData();
