const { pool } = require('./database.js');

async function checkEntitiesSchema() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'entities';
        `);
        console.log("Columns in 'entities' table:", JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error("Error checking schema:", err);
    } finally {
        pool.end();
    }
}

checkEntitiesSchema();
