const db = require('./database.js');

async function seedEntities() {
    try {
        console.log("🌱 Seeding Customers and Vendors...");

        // Mock Data: 2 Customers, 2 Vendors
        const entities = [
            // Customers
            {
                entity_code: 'CUS-001',
                name: 'Alpha Corp Industries',
                tax_id: '1234567890123',
                address: '123 Tech Park, Bangkok',
                branch_code: '00000',
                branch_name: 'Headquarters',
                contact_person: 'John Doe',
                email: 'contact@alphacorp.com',
                phone: '02-111-1111',
                is_customer: 1,
                is_vendor: 0
            },
            {
                entity_code: 'CUS-002',
                name: 'Beta Manufacturing Ltd',
                tax_id: '9876543210987',
                address: '456 Industrial Estate, Rayong',
                branch_code: '00000',
                branch_name: 'Main Factory',
                contact_person: 'Jane Smith',
                email: 'purchasing@betamfg.com',
                phone: '038-222-2222',
                is_customer: 1,
                is_vendor: 0
            },
            // Vendors
            {
                entity_code: 'VEN-001',
                name: 'Global Steel Supply',
                tax_id: '1112223334445',
                address: '789 Steel Road, Samut Prakan',
                branch_code: '00000',
                branch_name: 'Warehouse',
                contact_person: 'Mike Steel',
                email: 'sales@globalsteel.com',
                phone: '02-333-3333',
                is_customer: 0,
                is_vendor: 1
            },
            {
                entity_code: 'VEN-002',
                name: 'Advanced Polymers Co',
                tax_id: '5556667778889',
                address: '101 Plastic Way, Chonburi',
                branch_code: '00000',
                branch_name: 'Sales Office',
                contact_person: 'Sarah Polymer',
                email: 'info@advpolymers.com',
                phone: '038-444-4444',
                is_customer: 0,
                is_vendor: 1
            }
        ];

        // Insert loop
        for (const e of entities) {
            // Check if exists to avoid unique constraint error on entity_code
            const check = await db.query(`SELECT id FROM entities WHERE entity_code = $1`, [e.entity_code]);
            if (check.rows.length === 0) {
                await db.query(
                    `INSERT INTO entities 
                    (entity_code, name, tax_id, address, branch_code, branch_name, contact_person, email, phone, is_customer, is_vendor) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                    [e.entity_code, e.name, e.tax_id, e.address, e.branch_code, e.branch_name, e.contact_person, e.email, e.phone, e.is_customer, e.is_vendor]
                );
                console.log(`✅ Added: ${e.name} (${e.entity_code})`);
            } else {
                console.log(`⚠️ Skipped (Already exists): ${e.name} (${e.entity_code})`);
            }
        }

        console.log("🎉 Seeding completed.");
        process.exit(0);

    } catch (err) {
        console.error("❌ Error seeding entities:", err);
        process.exit(1);
    }
}

// Allow slight delay for db connection init if needed
setTimeout(seedEntities, 1000);
