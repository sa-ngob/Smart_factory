const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false
});

const clearMachineData = async () => {
    const client = await pool.connect();
    try {
        console.log('🗑️ Clearing all machine data...');
        // ลบข้อมูลทั้งหมดจากตาราง machine_data
        await client.query('TRUNCATE TABLE machine_data');
        console.log('✅ Machine Data Cleared.');

        console.log('🗑️ Clearing all status logs...');
        // ลบข้อมูลทั้งหมดจากตาราง machine_status_logs
        await client.query('TRUNCATE TABLE machine_status_logs');
        console.log('✅ Machine Status Logs Cleared.');

        console.log('\n✨ Database is now clean and ready for new PLC data.');

    } catch (e) {
        console.error("❌ Error clearing data:", e);
    } finally {
        client.release();
        pool.end();
    }
};

clearMachineData();
