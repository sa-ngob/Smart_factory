const { Pool } = require('pg');

// Use the environment variable from the container
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("❌ DATABASE_URL is not defined!");
    process.exit(1);
}

const pool = new Pool({
    connectionString: connectionString,
    ssl: connectionString.includes('render.com') ? { rejectUnauthorized: false } : false
});

const createTables = async () => {
    const client = await pool.connect();
    try {
        console.log('🔄 Connecting to PostgreSQL...');
        await client.query('BEGIN');

        console.log('🛠️ Creating Finance & Purchasing Tables...');

        await client.query(`CREATE TABLE IF NOT EXISTS purchase_orders ( id SERIAL PRIMARY KEY, po_number TEXT UNIQUE NOT NULL, vendor_id INTEGER, order_date TEXT, total_amount DOUBLE PRECISION, quotation_ref TEXT, created_by INTEGER, status TEXT DEFAULT 'pending', expect_delivery_date TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (vendor_id) REFERENCES entities(id) )`);
        await client.query(`CREATE TABLE IF NOT EXISTS purchase_order_items ( id SERIAL PRIMARY KEY, po_id INTEGER NOT NULL, item_code TEXT, item_name TEXT, quantity INTEGER, unit_price DOUBLE PRECISION, total_price DOUBLE PRECISION, FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE )`);

        await client.query(`CREATE TABLE IF NOT EXISTS delivery_orders ( id SERIAL PRIMARY KEY, do_number TEXT UNIQUE NOT NULL, customer_id INTEGER, shipping_date TEXT, shipping_address TEXT, status TEXT DEFAULT 'pending', created_by INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (customer_id) REFERENCES entities(id) )`);
        await client.query(`CREATE TABLE IF NOT EXISTS delivery_order_items ( id SERIAL PRIMARY KEY, do_id INTEGER NOT NULL, so_item_id INTEGER, item_code TEXT, quantity_shipped INTEGER, FOREIGN KEY (do_id) REFERENCES delivery_orders(id) ON DELETE CASCADE )`);

        await client.query(`CREATE TABLE IF NOT EXISTS invoices ( id SERIAL PRIMARY KEY, invoice_number TEXT UNIQUE NOT NULL, customer_id INTEGER, customer_po_number TEXT, issue_date TEXT, due_date TEXT, sub_total DOUBLE PRECISION, tax_amount DOUBLE PRECISION, grand_total DOUBLE PRECISION, status TEXT DEFAULT 'pending_issue', created_by INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (customer_id) REFERENCES entities(id) )`);
        await client.query(`CREATE TABLE IF NOT EXISTS invoice_items ( id SERIAL PRIMARY KEY, invoice_id INTEGER NOT NULL, item_code TEXT, description TEXT, quantity INTEGER, unit_price DOUBLE PRECISION, total_price DOUBLE PRECISION, FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE )`);
        await client.query(`CREATE TABLE IF NOT EXISTS invoice_delivery_orders ( invoice_id INTEGER NOT NULL, do_id INTEGER NOT NULL, PRIMARY KEY (invoice_id, do_id), FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE, FOREIGN KEY (do_id) REFERENCES delivery_orders(id) )`);

        await client.query(`CREATE TABLE IF NOT EXISTS billing_notes ( id SERIAL PRIMARY KEY, bn_number TEXT UNIQUE NOT NULL, customer_id INTEGER, issue_date TEXT, due_date TEXT, payment_terms TEXT, total_amount DOUBLE PRECISION, remark TEXT, status TEXT DEFAULT 'billed', created_by INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (customer_id) REFERENCES entities(id) )`);
        await client.query(`CREATE TABLE IF NOT EXISTS billing_note_invoices ( billing_note_id INTEGER NOT NULL, invoice_id INTEGER NOT NULL, PRIMARY KEY (billing_note_id, invoice_id), FOREIGN KEY (billing_note_id) REFERENCES billing_notes(id) ON DELETE CASCADE, FOREIGN KEY (invoice_id) REFERENCES invoices(id) )`);

        await client.query(`CREATE TABLE IF NOT EXISTS receipts ( id SERIAL PRIMARY KEY, receipt_number TEXT UNIQUE NOT NULL, customer_id INTEGER, payment_date TEXT, payment_method TEXT, total_amount_paid DOUBLE PRECISION, notes TEXT, status TEXT DEFAULT 'pending_confirmation', created_by INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (customer_id) REFERENCES entities(id) )`);
        await client.query(`CREATE TABLE IF NOT EXISTS receipt_billing_notes ( receipt_id INTEGER NOT NULL, billing_note_id INTEGER NOT NULL, PRIMARY KEY (receipt_id, billing_note_id), FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE, FOREIGN KEY (billing_note_id) REFERENCES billing_notes(id) )`);

        await client.query('COMMIT');
        console.log("✅ All Finance Tables created successfully!");

    } catch (e) {
        await client.query('ROLLBACK');
        console.error("❌ Error creating tables:", e);
    } finally {
        client.release();
        pool.end();
    }
};

createTables();
