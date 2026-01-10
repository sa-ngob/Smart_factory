const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false
});

const checkMappings = async () => {
    const client = await pool.connect();
    try {
        console.log("🔍 Checking 'tag_mappings' table...");
        const res = await client.query("SELECT * FROM tag_mappings ORDER BY plc_name, address");

        if (res.rows.length === 0) {
            console.log("⚠️ No mappings found! The 'tag_mappings' table is empty.");
            console.log("   👉 You must add mappings via the /mapping page or API.");
            console.log("   👉 REQUIRED Tags: 'machine_status' and 'mold_count'.");
        } else {
            console.log(`✅ Found ${res.rows.length} mappings:`);
            console.table(res.rows.map(r => ({
                plc: r.plc_name,
                tag: r.tag_name,
                addr: r.address,
                type: r.data_type
            })));
        }
    } catch (e) {
        console.error("❌ Error checking mappings:", e);
    } finally {
        client.release();
        pool.end();
    }
};

checkMappings();
