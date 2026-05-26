const { Pool } = require('pg');

const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'postgres',
    database: process.env.DB_NAME || 'smart_factory',
    password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres123',
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: false
};

const pool = new Pool(dbConfig);

async function updateSchema() {
    console.log('🔌 Connecting to Postgres to update items table schema...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const columnsToAdd = [
            { name: 'selling_price', type: 'NUMERIC(10, 2) DEFAULT 0' },
            { name: 'cost_price', type: 'NUMERIC(10, 2) DEFAULT 0' },
            { name: 'min_stock', type: 'INTEGER DEFAULT 0' },
            { name: 'material_name', type: 'TEXT' },
            { name: 'grade', type: 'TEXT' },
            { name: 'colour', type: 'TEXT' }, // UK spelling as per code
            { name: 'part_weight_gram', type: 'REAL' },
            { name: 'cycle_time_sec', type: 'REAL' },
            { name: 'customer_id', type: 'INTEGER' },
            { name: 'model', type: 'TEXT' },
            { name: 'item_type', type: 'TEXT' },
            { name: 'uom', type: 'TEXT' },
            { name: 'image_path', type: 'TEXT' },
            { name: 'status', type: 'TEXT DEFAULT \'active\'' }
        ];

        for (const col of columnsToAdd) {
            // Check if column exists
            const checkRes = await client.query(
                `SELECT column_name FROM information_schema.columns WHERE table_name='items' AND column_name=$1`,
                [col.name]
            );

            if (checkRes.rowCount === 0) {
                console.log(`➕ Adding missing column: ${col.name}`);
                await client.query(`ALTER TABLE items ADD COLUMN ${col.name} ${col.type}`);
            } else {
                console.log(`✅ Column exists: ${col.name}`);
            }
        }

        await client.query('COMMIT');
        console.log('🎉 Items table schema updated successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error updating schema:', err);
    } finally {
        client.release();
        pool.end();
    }
}

updateSchema();
