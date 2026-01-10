const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixEntitiesSchema() {
    const client = await pool.connect();
    try {
        console.log('Checking entities table schema...');

        await client.query('BEGIN');

        // Add entity_code column
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='entities' AND column_name='entity_code') THEN 
                    ALTER TABLE entities ADD COLUMN entity_code TEXT UNIQUE; 
                    RAISE NOTICE 'Added entity_code column';
                END IF;
            END $$;
        `);

        // Add is_customer column
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='entities' AND column_name='is_customer') THEN 
                    ALTER TABLE entities ADD COLUMN is_customer INTEGER DEFAULT 0; 
                    RAISE NOTICE 'Added is_customer column';
                END IF;
            END $$;
        `);

        // Add is_vendor column
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='entities' AND column_name='is_vendor') THEN 
                    ALTER TABLE entities ADD COLUMN is_vendor INTEGER DEFAULT 0; 
                    RAISE NOTICE 'Added is_vendor column';
                END IF;
            END $$;
        `);

        await client.query('COMMIT');
        console.log('✅ Entities schema fixed successfully.');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error fixing entities schema:', err);
    } finally {
        client.release();
        pool.end();
    }
}

fixEntitiesSchema();
