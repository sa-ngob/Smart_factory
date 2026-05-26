// สคริปต์แก้ไขสคีมา delivery_orders
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false
});

async function fixSchema() {
    try {
        console.log('🔧 กำลังเชื่อมต่อฐานข้อมูล...');
        const client = await pool.connect();

        try {
            console.log('📋 ตรวจสอบ delivery_orders table...');

            // ลบตาราง
            console.log('🗑️  ลบตาราง delivery_order_items...');
            await client.query('DROP TABLE IF EXISTS delivery_order_items CASCADE');

            console.log('🗑️  ลบตาราง delivery_orders...');
            await client.query('DROP TABLE IF EXISTS delivery_orders CASCADE');

            // สร้างตาราง delivery_orders ใหม่ (ถูกต้อง)
            console.log('✨ สร้าง delivery_orders table (ไม่มี created_by)...');
            await client.query(`
                CREATE TABLE delivery_orders (
                    id SERIAL PRIMARY KEY,
                    do_number VARCHAR(100) UNIQUE NOT NULL,
                    so_id INTEGER REFERENCES sales_orders(id),
                    customer_id INTEGER REFERENCES entities(id),
                    shipping_date TIMESTAMP DEFAULT NOW(),
                    status VARCHAR(50) DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);
            console.log('✅ สร้าง delivery_orders สำเร็จ');

            // สร้างตาราง delivery_order_items
            console.log('✨ สร้าง delivery_order_items table...');
            await client.query(`
                CREATE TABLE delivery_order_items (
                    id SERIAL PRIMARY KEY,
                    do_id INTEGER NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
                    so_item_id INTEGER,
                    quantity_shipped INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);
            console.log('✅ สร้าง delivery_order_items สำเร็จ');

            // สร้าง indexes
            console.log('📊 สร้าง indexes...');
            await client.query('CREATE INDEX IF NOT EXISTS idx_delivery_orders_do_number ON delivery_orders(do_number)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_delivery_orders_customer_id ON delivery_orders(customer_id)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_delivery_order_items_do_id ON delivery_order_items(do_id)');
            console.log('✅ สร้าง indexes สำเร็จ');

            // ตรวจสอบคอลัมน์
            console.log('\n📋 ตรวจสอบคอลัมน์ที่มีในตาราง...');
            const result = await client.query(`
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'delivery_orders'
                ORDER BY ordinal_position
            `);
            console.log('คอลัมน์ใน delivery_orders:');
            result.rows.forEach(row => {
                console.log(`  - ${row.column_name} (${row.data_type})`);
            });

            console.log('\n✅ ✅ ✅ ตรวจสอบความจำเป็น - ไม่พบ created_by!');
            console.log('✅ สคีมาแก้ไขสำเร็จแล้ว!');

        } finally {
            client.release();
        }
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

console.log('🚀 เริ่มแก้ไขสคีมา delivery_orders...\n');
fixSchema();
