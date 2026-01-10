const db = require('./database.js');

async function seedData() {
    try {
        console.log("🚀 Starting 3-Item Mock Data Seeding...");

        // 1. Mock 3 Customers
        const customers = [
            { code: 'CUS-MOCK-01', name: 'Mock Customer One', tax_id: '1000000001', address: '111 Mock Road', contact: 'Mr. A', email: 'a@mock.com', phone: '0811111111' },
            { code: 'CUS-MOCK-02', name: 'Mock Customer Two', tax_id: '1000000002', address: '222 Mock Road', contact: 'Ms. B', email: 'b@mock.com', phone: '0822222222' },
            { code: 'CUS-MOCK-03', name: 'Mock Customer Three', tax_id: '1000000003', address: '333 Mock Road', contact: 'Dr. C', email: 'c@mock.com', phone: '0833333333' }
        ];

        console.log("\n--- Seeding 3 Customers ---");
        for (const c of customers) {
            await db.query(`
                INSERT INTO entities (entity_code, name, tax_id, address, contact_person, email, phone, is_customer, is_vendor)
                VALUES ($1, $2, $3, $4, $5, $6, $7, 1, 0)
                ON CONFLICT (entity_code) DO NOTHING
            `, [c.code, c.name, c.tax_id, c.address, c.contact, c.email, c.phone]);
            console.log(`✅ Customer inserted: ${c.name}`);
        }

        // 2. Mock 3 Vendors
        const vendors = [
            { code: 'VEN-MOCK-01', name: 'Mock Vendor One', tax_id: '2000000001', address: '444 Supply St', contact: 'Vendor A', email: 'v1@mock.com', phone: '0911111111' },
            { code: 'VEN-MOCK-02', name: 'Mock Vendor Two', tax_id: '2000000002', address: '555 Supply St', contact: 'Vendor B', email: 'v2@mock.com', phone: '0922222222' },
            { code: 'VEN-MOCK-03', name: 'Mock Vendor Three', tax_id: '2000000003', address: '666 Supply St', contact: 'Vendor C', email: 'v3@mock.com', phone: '0933333333' }
        ];

        console.log("\n--- Seeding 3 Vendors ---");
        for (const v of vendors) {
            await db.query(`
                INSERT INTO entities (entity_code, name, tax_id, address, contact_person, email, phone, is_customer, is_vendor)
                VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 1)
                ON CONFLICT (entity_code) DO NOTHING
            `, [v.code, v.name, v.tax_id, v.address, v.contact, v.email, v.phone]);
            console.log(`✅ Vendor inserted: ${v.name}`);
        }

        // 3. Mock 3 Items
        const items = [
            { code: 'ITEM-MOCK-01', name: 'Mock Item A', type: 'Part', uom: 'pcs', stock: 100 },
            { code: 'ITEM-MOCK-02', name: 'Mock Item B', type: 'Part', uom: 'set', stock: 200 },
            { code: 'ITEM-MOCK-03', name: 'Mock Item C', type: 'Material', uom: 'kg', stock: 500 }
        ];

        console.log("\n--- Seeding 3 Items ---");
        for (const i of items) {
            await db.query(`
                INSERT INTO items (item_code, item_name, item_type, uom, stock_quantity, status)
                VALUES ($1, $2, $3, $4, $5, 'active')
                ON CONFLICT (item_code) DO NOTHING
            `, [i.code, i.name, i.type, i.uom, i.stock]);
            console.log(`✅ Item inserted: ${i.name}`);
        }

        // 4. Mock 3 Molds
        let customerId = null;
        // Try to get the first mock customer we just inserted
        const res = await db.query("SELECT id FROM entities WHERE entity_code = 'CUS-MOCK-01'");
        if (res.rows && res.rows.length > 0) {
            customerId = res.rows[0].id;
        } else {
            // Fallback to any customer
            const anyCusPromise = await db.query("SELECT id FROM entities WHERE is_customer = 1 LIMIT 1");
            if (anyCusPromise.rows.length > 0) customerId = anyCusPromise.rows[0].id;
        }

        const molds = [
            { code: 'MOLD-MOCK-01', name: 'Mock Mold X', type: 'Injection', cavity: 4 },
            { code: 'MOLD-MOCK-02', name: 'Mock Mold Y', type: 'Injection', cavity: 8 },
            { code: 'MOLD-MOCK-03', name: 'Mock Mold Z', type: 'Blow', cavity: 2 }
        ];

        console.log("\n--- Seeding 3 Molds ---");
        for (const m of molds) {
            await db.query(`
                INSERT INTO molds (mold_code, mold_name, mold_type, cavity, customer_id, status)
                VALUES ($1, $2, $3, $4, $5, 'active')
                ON CONFLICT (mold_code) DO NOTHING
            `, [m.code, m.name, m.type, m.cavity, customerId]);
            console.log(`✅ Mold inserted: ${m.name}`);
        }

        console.log("\n🎉 All mock data seeded successfully!");
        process.exit(0);

    } catch (err) {
        console.error("❌ Error seeding mock data:", err);
        process.exit(1);
    }
}

// Give a small delay for DB connection
setTimeout(seedData, 1500);
