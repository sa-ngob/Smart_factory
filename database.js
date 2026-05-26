// database.js - PostgreSQL Only
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

process.env.PGTZ = 'Asia/Bangkok';

if (!process.env.DATABASE_URL) {
    console.error('FATAL: DATABASE_URL is required for PostgreSQL connection');
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

const db = {
    pool: pool,
    query: (text, params) => pool.query(text, params),
    allAsync: async (text, params) => (await pool.query(text, params)).rows,
    getAsync: async (text, params) => (await pool.query(text, params)).rows[0],
    runAsync: async (text, params) => ({ rowCount: (await pool.query(text, params)).rowCount }),
    all: (text, params, cb) => pool.query(text, params, (e, r) => cb && cb(e, r ? r.rows : null)),
    get: (text, params, cb) => pool.query(text, params, (e, r) => cb && cb(e, r ? r.rows[0] : null)),
    run: (text, params, cb) => pool.query(text, params, (e, r) => cb && cb(e, { rowCount: r ? r.rowCount : 0 })),
};

async function initializeTables() {
    try {
        // Drop and recreate tables to ensure correct schema
        await pool.query(`DROP TABLE IF EXISTS delivery_order_items CASCADE`).catch(() => {});
        await pool.query(`DROP TABLE IF EXISTS delivery_orders CASCADE`).catch(() => {});
        await pool.query(`DROP TABLE IF EXISTS users CASCADE`).catch(() => {});

        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                fullname VARCHAR(255),
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50),
                status VARCHAR(50) DEFAULT 'active'
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS roles (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS pages (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                url VARCHAR(500) UNIQUE NOT NULL
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS role_pages (
                role_id INTEGER REFERENCES roles(id),
                page_id INTEGER REFERENCES pages(id),
                PRIMARY KEY (role_id, page_id)
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS entities (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                tax_id VARCHAR(100),
                address TEXT,
                branch_code VARCHAR(100),
                branch_name VARCHAR(255),
                contact_person VARCHAR(255),
                email VARCHAR(255),
                phone VARCHAR(20),
                is_customer INTEGER DEFAULT 0,
                is_vendor INTEGER DEFAULT 0,
                entity_code VARCHAR(100) UNIQUE
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS session (
                sid VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
                sess JSON NOT NULL,
                expire TIMESTAMP(6) NOT NULL
            ) WITH (OIDS=FALSE)
        `).catch(() => {
            // Table might already exist
        });

        // Create delivery_orders table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS delivery_orders (
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

        // Create delivery_order_items table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS delivery_order_items (
                id SERIAL PRIMARY KEY,
                do_id INTEGER NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
                so_item_id INTEGER,
                quantity_shipped INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Create admin user if not exists
        const adminUser = await pool.query('SELECT * FROM users WHERE email = $1', ['admin@local']);
        if (adminUser.rows.length === 0) {
            const adminPassword = bcrypt.hashSync('admin', 10);
            await pool.query(
                'INSERT INTO users (fullname, email, password, role, status) VALUES ($1, $2, $3, $4, $5)',
                ['Administrator', 'admin@local', adminPassword, 'admin', 'active']
            );
            console.log('✅ Admin user created: admin@local / admin');
        }

        // Insert default roles if not exists
        await pool.query(
            "INSERT INTO roles (name) VALUES ('admin') ON CONFLICT (name) DO NOTHING"
        );
        await pool.query(
            "INSERT INTO roles (name) VALUES ('qc') ON CONFLICT (name) DO NOTHING"
        );
        await pool.query(
            "INSERT INTO roles (name) VALUES ('user') ON CONFLICT (name) DO NOTHING"
        );

        console.log('✅ PostgreSQL tables initialized');
    } catch (err) {
        console.error('Error initializing tables:', err.message);
    }
}

initializeTables();

console.log('✅ PostgreSQL connection pool initialized');

module.exports = db;
