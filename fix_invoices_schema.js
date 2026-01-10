require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixSchema() {
    console.log('Connecting to database...');
    const client = await pool.connect();
    try {
        console.log('Checking invoices table schema...');

        // Add customer_po_number if missing
        await client.query(`
            ALTER TABLE invoices 
            ADD COLUMN IF NOT EXISTS customer_po_number VARCHAR(50);
        `);
        console.log('✅ Added column customer_po_number to invoices (if it was missing).');

        // Add other potentially missing columns just in case
        await client.query(`
            ALTER TABLE invoices 
            ADD COLUMN IF NOT EXISTS sub_total NUMERIC(10, 2),
            ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10, 2),
            ADD COLUMN IF NOT EXISTS grand_total NUMERIC(10, 2);
        `);
        console.log('✅ Checked/Added financial columns to invoices.');

    } catch (error) {
        console.error('❌ Error updating schema:', error);
    } finally {
        client.release();
        pool.end();
    }
}

fixSchema();
