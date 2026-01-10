const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: 'localhost', // Run from host
    database: process.env.DB_NAME || 'smart_factory',
    password: process.env.DB_PASSWORD || 'postgres123',
    port: parseInt(process.env.DB_PORT || '5432'),
});

const createInternalTables = async () => {
    const client = await pool.connect();
    try {
        console.log("Starting Quality Control Layout Migration...");
        await client.query('BEGIN');

        // 1. Product Standards Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS product_standards (
                id SERIAL PRIMARY KEY,
                product_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
                standard_name VARCHAR(255) NOT NULL,
                version VARCHAR(50) DEFAULT '1.0',
                is_active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Checked/Created product_standards");

        // 2. Standard Categories (for Drawings)
        await client.query(`
            CREATE TABLE IF NOT EXISTS standard_categories (
                id SERIAL PRIMARY KEY,
                product_standard_id INTEGER NOT NULL REFERENCES product_standards(id) ON DELETE CASCADE,
                category_name VARCHAR(255) NOT NULL,
                drawing_image_path VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Checked/Created standard_categories");

        // 3. Inspection Points (The dots on the drawing)
        await client.query(`
            CREATE TABLE IF NOT EXISTS inspection_points (
                id SERIAL PRIMARY KEY,
                standard_category_id INTEGER NOT NULL REFERENCES standard_categories(id) ON DELETE CASCADE,
                point_number INTEGER NOT NULL,
                pos_x NUMERIC(5, 2),
                pos_y NUMERIC(5, 2),
                name VARCHAR(255),
                method VARCHAR(100),
                standard_value VARCHAR(100),
                tolerance VARCHAR(100),
                upper_limit VARCHAR(100),
                lower_limit VARCHAR(100),
                unit VARCHAR(50),
                tool_used VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Checked/Created inspection_points");

        // 4. Inspection Logs (Daily Checks)
        await client.query(`
            CREATE TABLE IF NOT EXISTS inspection_logs (
                id SERIAL PRIMARY KEY,
                production_order_id INTEGER REFERENCES manufacturing_orders(id),
                inspection_point_id INTEGER REFERENCES inspection_points(id),
                inspection_result VARCHAR(10) CHECK (inspection_result IN ('PASS', 'FAIL')),
                measured_value VARCHAR(100),
                notes TEXT,
                inspector_id VARCHAR(100),
                inspected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Checked/Created inspection_logs");

        await client.query('COMMIT');
        console.log("Migration Completed Successfully!");
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Migration Failed:", error);
    } finally {
        client.release();
        pool.end();
    }
};

createInternalTables();
