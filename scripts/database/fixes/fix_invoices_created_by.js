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
        console.log('Checking invoices table schema for created_by...');

        // Add created_by if missing
        await client.query(`
            ALTER TABLE invoices 
            ADD COLUMN IF NOT EXISTS created_by INTEGER;
        `);
        console.log('✅ Added column created_by to invoices (if it was missing).');

        // Optionally add foreign key constraint if it doesn't exist (harder to check idempotently in raw SQL without querying catalog, but likely fine to skip strict constraint for now or try adding it)
        try {
            await client.query(`
                ALTER TABLE invoices 
                ADD CONSTRAINT fk_invoices_created_by 
                FOREIGN KEY (created_by) REFERENCES users(id);
            `);
            console.log('✅ Added FK constraint for created_by.');
        } catch (e) {
            console.log('ℹ️  FK constraint might already exist or failed:', e.message);
        }

    } catch (error) {
        console.error('❌ Error updating schema:', error);
    } finally {
        client.release();
        pool.end();
    }
}

fixSchema();
