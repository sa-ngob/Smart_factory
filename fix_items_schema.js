const { pool } = require('./database.js');

async function fixItemsSchema() {
    const client = await pool.connect();
    try {
        console.log("Checking and fixing 'items' table schema...");
        await client.query('BEGIN');

        // Check columns
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'items';
        `);
        const columns = res.rows.map(r => r.column_name);
        console.log("Existing columns:", columns);

        if (!columns.includes('item_type')) {
            console.log("Adding 'item_type' column...");
            await client.query(`ALTER TABLE items ADD COLUMN item_type TEXT;`);
        }

        if (!columns.includes('image_path')) {
            console.log("Adding 'image_path' column...");
            await client.query(`ALTER TABLE items ADD COLUMN image_path TEXT;`);
        }

        if (!columns.includes('uom')) {
            console.log("Adding 'uom' column...");
            await client.query(`ALTER TABLE items ADD COLUMN uom TEXT;`);
        }

        if (!columns.includes('stock_quantity')) {
            console.log("Adding 'stock_quantity' column...");
            await client.query(`ALTER TABLE items ADD COLUMN stock_quantity INTEGER DEFAULT 0;`);
        }

        if (!columns.includes('status')) {
            console.log("Adding 'status' column...");
            await client.query(`ALTER TABLE items ADD COLUMN status TEXT DEFAULT 'active';`);
        }

        if (!columns.includes('cycle_time_sec')) {
            console.log("Adding 'cycle_time_sec' column...");
            await client.query(`ALTER TABLE items ADD COLUMN cycle_time_sec REAL;`);
        }

        if (!columns.includes('material_dry_temp')) {
            console.log("Adding 'material_dry_temp' column...");
            await client.query(`ALTER TABLE items ADD COLUMN material_dry_temp REAL;`);
        }

        // Check for other fields used in INSERT
        // item_code, customer_id, item_name, model, material_name, grade, colour, part_weight_gram
        const otherFields = ['customer_id', 'model', 'material_name', 'grade', 'colour', 'part_weight_gram'];
        for (const field of otherFields) {
            if (!columns.includes(field)) {
                console.log(`Adding '${field}' column...`);
                let type = 'TEXT';
                if (field === 'customer_id') type = 'INTEGER';
                if (field === 'part_weight_gram') type = 'REAL';
                await client.query(`ALTER TABLE items ADD COLUMN ${field} ${type};`);
            }
        }

        await client.query('COMMIT');
        console.log("Schema fix completed successfully.");

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error fixing schema:", err);
    } finally {
        client.release();
        pool.end();
    }
}

fixItemsSchema();
