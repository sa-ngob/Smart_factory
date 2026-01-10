const { pool } = require('./database.js');

async function checkSchema() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'items';
        `);
        console.log("Columns in 'items' table:");
        res.rows.forEach(row => console.log(`- ${row.column_name} (${row.data_type})`));
    } catch (err) {
        console.error("Error checking schema:", err);
    } finally {
        pool.end();
    }
}

checkSchema();
