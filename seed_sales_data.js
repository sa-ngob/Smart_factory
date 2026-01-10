const { pool } = require('./database.js');

async function seedSalesData() {
    console.log("🚀 Seeding Sales Dashboard Data...");
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Create Invoices Table if not exists
        await client.query(`
            CREATE TABLE IF NOT EXISTS invoices (
                id SERIAL PRIMARY KEY,
                invoice_number VARCHAR(50) UNIQUE NOT NULL,
                so_id INTEGER,
                customer_id INTEGER,
                issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                due_date TIMESTAMP,
                subtotal NUMERIC(10, 2) DEFAULT 0,
                tax_amount NUMERIC(10, 2) DEFAULT 0,
                grand_total NUMERIC(10, 2) DEFAULT 0,
                status VARCHAR(20) DEFAULT 'draft', -- pending, paid, overdue, cancelled
                FOREIGN KEY (so_id) REFERENCES sales_orders(id),
                FOREIGN KEY (customer_id) REFERENCES entities(id)
            );
        `);

        // 2. Mock Customers (Entities)
        const customers = [
            { code: 'CUST-001', name: 'Alpha Corp', tax_id: '1234567890' },
            { code: 'CUST-002', name: 'Beta Industries', tax_id: '0987654321' },
            { code: 'CUST-003', name: 'Gamma Solutions', tax_id: '1122334455' }
        ];

        for (const c of customers) {
            await client.query(`
                INSERT INTO entities (entity_code, name, tax_id, is_customer)
                VALUES ($1, $2, $3, 1)
                ON CONFLICT (entity_code) DO NOTHING
            `, [c.code, c.name, c.tax_id]);
        }

        // Get Customer IDs
        const custRes = await client.query("SELECT id, entity_code FROM entities WHERE is_customer = 1");
        const custMap = {};
        custRes.rows.forEach(r => custMap[r.entity_code] = r.id);

        // 3. Generate Sales Orders and Invoices for last 30 days
        const today = new Date();
        await client.query("DELETE FROM invoices"); // Clear old invoices to avoid duplicates/confusion if re-run on mock data
        // optionally clear sales orders too if safe, but they might be linked to MOs. 
        // We will insert new ones.

        for (let i = 0; i < 20; i++) {
            // Random date in last 30 days
            const date = new Date(today);
            date.setDate(date.getDate() - Math.floor(Math.random() * 30));
            const dateStr = date.toISOString().split('T')[0];

            const custCode = customers[Math.floor(Math.random() * customers.length)].code;
            const custId = custMap[custCode];

            const soNumber = `SO-${dateStr.replace(/-/g, '')}-${1000 + i}`;
            const totalAmount = 5000 + Math.floor(Math.random() * 45000); // 5000 - 50000

            // Insert SO
            const soRes = await client.query(`
                INSERT INTO sales_orders (so_number, customer_id, order_date, total_amount, status)
                VALUES ($1, $2, $3, $4, 'confirmed')
                ON CONFLICT (so_number) DO UPDATE SET total_amount = EXCLUDED.total_amount
                RETURNING id
            `, [soNumber, custId, dateStr, totalAmount]);
            const soId = soRes.rows[0].id;

            // Generate Invoice for this SO (80% chance)
            if (Math.random() > 0.2) {
                const invNumber = `INV-${dateStr.replace(/-/g, '')}-${1000 + i}`;
                const status = Math.random() > 0.3 ? 'paid' : 'pending';

                await client.query(`
                    INSERT INTO invoices (invoice_number, so_id, customer_id, issue_date, due_date, grand_total, status)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [invNumber, soId, custId, dateStr, dateStr, totalAmount, status]);
            }
        }

        await client.query('COMMIT');
        console.log("✅ Sales Dashboard Mock Data Seeded!");

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Error seeding sales data:", err);
    } finally {
        client.release();
        process.exit(0);
    }
}

seedSalesData();
