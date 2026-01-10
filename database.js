// database.js - Updated for Thai Timezone Support
require('dotenv').config();
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const util = require('util');

process.env.PGTZ = 'Asia/Bangkok';

if (process.env.DATABASE_URL && process.env.DATABASE_URL !== "YOUR_POSTGRES_URL_HERE") {
    // ... (Postgres Part - kept generic for brevity, usually not used in local dev)
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
    pool.on('error', (err) => { console.error('Unexpected error on idle client', err); process.exit(-1); });
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
    async function createTables() { /* Postgres Init - Skipped for Local focus */ }
    module.exports = db;
} else {
    // 🔴 SQLite Section (Local Dev) - Fixed Timezone 🔴
    console.log('Using SQLite for local development (Thai Time Fixed).');
    const DB_PATH = process.env.DB_PATH || './smart_factory.db';
    const dbDir = path.dirname(DB_PATH);
    if (dbDir && dbDir !== '.' && !fs.existsSync(dbDir)) try { fs.mkdirSync(dbDir, { recursive: true }); } catch (e) {}

    const dbInstance = new sqlite3.Database(DB_PATH, (err) => {
        if (err) console.error('Error opening SQLite database', err.message);
        else {
            console.log('✅ Connected to the SQLite database.');
            dbInstance.run('PRAGMA journal_mode = WAL;');
            createTables();
        }
    });

    dbInstance.allAsync = util.promisify(dbInstance.all.bind(dbInstance));
    dbInstance.getAsync = util.promisify(dbInstance.get.bind(dbInstance));
    dbInstance.runAsync = util.promisify(dbInstance.run.bind(dbInstance));

    function createTables() {
        dbInstance.serialize(() => {
            // ✅ Fix: Use datetime('now', 'localtime')
            dbInstance.run(`CREATE TABLE IF NOT EXISTS users ( id INTEGER PRIMARY KEY AUTOINCREMENT, fullName TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL, status TEXT DEFAULT 'active' )`);
            dbInstance.run(`CREATE TABLE IF NOT EXISTS roles ( id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL )`);
            dbInstance.run(`CREATE TABLE IF NOT EXISTS pages ( id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, url TEXT UNIQUE NOT NULL )`);
            dbInstance.run(`CREATE TABLE IF NOT EXISTS role_pages ( role_id INTEGER, page_id INTEGER, PRIMARY KEY (role_id, page_id), FOREIGN KEY (role_id) REFERENCES roles(id), FOREIGN KEY (page_id) REFERENCES pages(id) )`);
            dbInstance.run(`CREATE TABLE IF NOT EXISTS entities ( id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, tax_id TEXT, address TEXT, branch_code TEXT, branch_name TEXT, contact_person TEXT, email TEXT, phone TEXT, is_customer INTEGER DEFAULT 0, is_vendor INTEGER DEFAULT 0, entity_code TEXT UNIQUE )`);
            dbInstance.run(`CREATE TABLE IF NOT EXISTS entity_roles ( entity_id INTEGER NOT NULL, role_name TEXT NOT NULL, PRIMARY KEY (entity_id, role_name), FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE )`);
            dbInstance.run(`CREATE TABLE IF NOT EXISTS items ( id INTEGER PRIMARY KEY AUTOINCREMENT, item_code TEXT UNIQUE NOT NULL, item_name TEXT NOT NULL, item_type TEXT, uom TEXT, stock_quantity INTEGER DEFAULT 0, status TEXT, cycle_time_sec REAL, material_dry_temp REAL, customer_id INTEGER, model TEXT, material_name TEXT, grade TEXT, colour TEXT, part_weight_gram REAL, image_path TEXT )`);
            
            dbInstance.run(`CREATE TABLE IF NOT EXISTS molds ( id INTEGER PRIMARY KEY AUTOINCREMENT, mold_code TEXT UNIQUE NOT NULL, mold_name TEXT NOT NULL, customer_id INTEGER, received_date TEXT, storage_location TEXT, mold_type TEXT, runner_system TEXT, gate_type TEXT, size_w REAL, size_l REAL, size_h REAL, weight REAL, cavity INTEGER, part_weight_gram REAL, runner_weight_gram REAL, cycle_time_sec REAL, shot_counter INTEGER DEFAULT 0, status TEXT DEFAULT 'active', core_image_path TEXT, cavity_image_path TEXT, part_image_path TEXT, notes TEXT, FOREIGN KEY (customer_id) REFERENCES entities(id) )`);
            dbInstance.run(`CREATE TABLE IF NOT EXISTS mold_parts ( id INTEGER PRIMARY KEY AUTOINCREMENT, mold_id INTEGER NOT NULL, part_number TEXT NOT NULL, part_name TEXT NOT NULL, quantity INTEGER DEFAULT 1, material TEXT, notes TEXT, FOREIGN KEY (mold_id) REFERENCES molds(id) ON DELETE CASCADE )`);
            
            // Fix Created Date for BOMs
            dbInstance.run(`CREATE TABLE IF NOT EXISTS boms ( id INTEGER PRIMARY KEY AUTOINCREMENT, product_part_number TEXT NOT NULL, product_name TEXT, mold_id INTEGER, creation_date TEXT DEFAULT (datetime('now', 'localtime')), version INTEGER DEFAULT 1, is_active INTEGER DEFAULT 1, FOREIGN KEY (mold_id) REFERENCES molds(id) )`);
            dbInstance.run(`CREATE TABLE IF NOT EXISTS bom_items ( id INTEGER PRIMARY KEY AUTOINCREMENT, bom_id INTEGER NOT NULL, material_code TEXT NOT NULL, material_name TEXT, mixing_ratio REAL, unit TEXT, FOREIGN KEY (bom_id) REFERENCES boms(id) ON DELETE CASCADE )`);
            
            // Fix Transaction Date
            dbInstance.run(`CREATE TABLE IF NOT EXISTS inventory_transactions ( id INTEGER PRIMARY KEY AUTOINCREMENT, transaction_date TEXT DEFAULT (datetime('now', 'localtime')), item_code TEXT NOT NULL, transaction_type TEXT NOT NULL, quantity_change INTEGER NOT NULL, new_quantity INTEGER, reference_type TEXT, reference_id TEXT, notes TEXT, created_by TEXT )`);
            
            dbInstance.run(`CREATE TABLE IF NOT EXISTS machines ( id INTEGER PRIMARY KEY AUTOINCREMENT, machine_code TEXT UNIQUE NOT NULL, machine_name TEXT NOT NULL, status TEXT DEFAULT 'idle', cycle_time_sec REAL, material_dry_temp REAL, notes TEXT, machine_type TEXT )`);
            dbInstance.run(`CREATE TABLE IF NOT EXISTS defect_codes ( id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE NOT NULL, description TEXT NOT NULL )`);
            
            dbInstance.run(`CREATE TABLE IF NOT EXISTS machine_data ( machine_id TEXT PRIMARY KEY, timestamp DATETIME NOT NULL, mold_count INTEGER, machine_status INTEGER, mold_temp_core REAL, mold_temp_cavity REAL, mo_number TEXT, cycle_time_sec REAL, material_dry_temp REAL, item_name TEXT )`);
            
            dbInstance.run(`CREATE TABLE IF NOT EXISTS downtime_reasons ( id INTEGER PRIMARY KEY AUTOINCREMENT, reason_code TEXT UNIQUE NOT NULL, description TEXT NOT NULL, category TEXT )`);
            dbInstance.run(`CREATE TABLE IF NOT EXISTS machine_status_logs ( id INTEGER PRIMARY KEY AUTOINCREMENT, machine_id TEXT NOT NULL, status INTEGER NOT NULL, start_time TEXT NOT NULL, end_time TEXT, duration_sec INTEGER, reason_id INTEGER, notes TEXT, FOREIGN KEY (machine_id) REFERENCES machines (machine_code), FOREIGN KEY (reason_id) REFERENCES downtime_reasons (id) )`);
            
            // Sales & Production with Local Time
            dbInstance.run(`CREATE TABLE IF NOT EXISTS sales_orders ( id INTEGER PRIMARY KEY AUTOINCREMENT, so_number TEXT UNIQUE NOT NULL, customer_po_number TEXT, customer_id INTEGER, order_date TEXT, due_date TEXT, total_amount REAL, status TEXT DEFAULT 'draft', created_by INTEGER, created_at TEXT DEFAULT (datetime('now', 'localtime')), FOREIGN KEY (customer_id) REFERENCES entities(id) )`);
            dbInstance.run(`CREATE TABLE IF NOT EXISTS sales_order_items ( id INTEGER PRIMARY KEY AUTOINCREMENT, so_id INTEGER NOT NULL, item_code TEXT, quantity INTEGER, unit_price REAL, total_price REAL, FOREIGN KEY (so_id) REFERENCES sales_orders(id) ON DELETE CASCADE )`);
            
            dbInstance.run(`CREATE TABLE IF NOT EXISTS manufacturing_orders ( id INTEGER PRIMARY KEY AUTOINCREMENT, mo_number TEXT UNIQUE NOT NULL, so_id INTEGER, item_code TEXT, quantity_to_produce INTEGER, bom_id INTEGER, due_date TEXT, status TEXT DEFAULT 'pending', planned_start_time TEXT, planned_end_time TEXT, actual_start_time TEXT, actual_end_time TEXT, machine_id INTEGER, adjustment_reason TEXT, created_at TEXT DEFAULT (datetime('now', 'localtime')), FOREIGN KEY (so_id) REFERENCES sales_orders(id) )`);
            
            dbInstance.run(`CREATE TABLE IF NOT EXISTS production_records ( id INTEGER PRIMARY KEY AUTOINCREMENT, mo_id INTEGER NOT NULL, record_date TEXT DEFAULT (datetime('now', 'localtime')), good_quantity INTEGER DEFAULT 0, total_scrap_quantity INTEGER DEFAULT 0, operator_name TEXT, note TEXT, FOREIGN KEY (mo_id) REFERENCES manufacturing_orders(id) ON DELETE CASCADE )`);
            dbInstance.run(`CREATE TABLE IF NOT EXISTS scrap_records ( id INTEGER PRIMARY KEY AUTOINCREMENT, record_id INTEGER NOT NULL, defect_code_id INTEGER NOT NULL, quantity INTEGER DEFAULT 0, FOREIGN KEY (record_id) REFERENCES production_records(id) ON DELETE CASCADE, FOREIGN KEY (defect_code_id) REFERENCES defect_codes(id) )`);
            
             dbInstance.run(`CREATE TABLE IF NOT EXISTS product_standards ( id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL, standard_name TEXT NOT NULL, version INTEGER DEFAULT 1, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now', 'localtime')), FOREIGN KEY (product_id) REFERENCES items(id) )`);
            dbInstance.run(`CREATE TABLE IF NOT EXISTS standard_categories ( id INTEGER PRIMARY KEY AUTOINCREMENT, product_standard_id INTEGER NOT NULL, category_name TEXT NOT NULL, drawing_image_path TEXT, FOREIGN KEY (product_standard_id) REFERENCES product_standards(id) ON DELETE CASCADE )`);
            dbInstance.run(`CREATE TABLE IF NOT EXISTS inspection_points ( id INTEGER PRIMARY KEY AUTOINCREMENT, standard_category_id INTEGER NOT NULL, point_number INTEGER, pos_x REAL, pos_y REAL, name TEXT, method TEXT, standard_value TEXT, tolerance TEXT, upper_limit TEXT, lower_limit TEXT, unit TEXT, tool_used TEXT, FOREIGN KEY (standard_category_id) REFERENCES standard_categories(id) ON DELETE CASCADE )`);
            dbInstance.run(`CREATE TABLE IF NOT EXISTS inspection_logs ( id INTEGER PRIMARY KEY AUTOINCREMENT, production_order_id INTEGER NOT NULL, inspection_point_id INTEGER NOT NULL, inspection_result TEXT, measured_value TEXT, notes TEXT, inspector_id INTEGER, inspected_at TEXT DEFAULT (datetime('now', 'localtime')), FOREIGN KEY (production_order_id) REFERENCES manufacturing_orders(id), FOREIGN KEY (inspection_point_id) REFERENCES inspection_points(id), FOREIGN KEY (inspector_id) REFERENCES users(id) )`);
            dbInstance.run(`CREATE TABLE IF NOT EXISTS projects ( id INTEGER PRIMARY KEY AUTOINCREMENT, project_name TEXT NOT NULL, project_type TEXT, customer_id INTEGER, model_name TEXT, part_name TEXT, part_code TEXT, start_date TEXT, target_date TEXT, actual_finish_date TEXT, status TEXT DEFAULT 'In Process', progress INTEGER DEFAULT 0, part_image_path TEXT, drawing_path TEXT, created_at TEXT DEFAULT (datetime('now', 'localtime')), FOREIGN KEY (customer_id) REFERENCES entities(id) )`);
            dbInstance.run(`CREATE TABLE IF NOT EXISTS project_tasks ( id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL, task_name TEXT NOT NULL, start_date TEXT, end_date TEXT, status TEXT DEFAULT 'pending', progress INTEGER DEFAULT 0, FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE )`);

            // Seed Pages (Same as before)
             const allPages = [
                { name: 'Dashboard', url: '/dashboard.html' },
                { name: 'ภาพรวมโรงงาน', url: '/overview-dashboard.html' },
                { name: 'การผลิต (Real-time)', url: '/production-dashboard.html' },
                { name: 'การขายและการตลาด', url: '/sales-dashboard.html' },
                { name: 'คลังสินค้า', url: '/inventory-dashboard.html' },
                { name: 'Workflow การขาย', url: '/workflow-dashboard.html' },
                { name: 'OEE Dashboard', url: '/oee_dashboard.html' },
                { name: 'Downtime Log', url: '/downtime-log.html' },
                { name: 'วิเคราะห์ใบสั่งผลิต', url: '/mo_dashboard.html' },
                { name: 'Operator Interface', url: '/operator.html' },
                { name: 'ใบสั่งขาย (SO)', url: '/sales-orders.html' },
                { name: 'ใบสั่งผลิต (MO)', url: '/manufacturing-orders.html' },
                { name: 'Production Schedule', url: '/production-schedule.html' },
                { name: 'ระบบควบคุมคุณภาพ', url: '/Quality Management System.html' },
                { name: 'รายการมาตรฐาน QC', url: '/quality-standards-list.html' },
                { name: 'แดชบอร์ดคุณภาพ', url: '/quality-dashboard.html' },
                { name: 'บันทึกผลตรวจสอบ', url: '/quality-inspection.html' },
                { name: 'จัดการสต็อก', url: '/inventory.html' },
                { name: 'จัดการข้อมูลสินค้า', url: '/items.html' },
                { name: 'จัดการ BOM', url: '/boms.html' },
                { name: 'จัดการประวัติแม่พิมพ์', url: '/molds.html' },
                { name: 'จัดการเครื่องจักร', url: '/machines.html' },
                { name: 'Projects', url: '/projects.html' },
                { name: 'ใบสั่งซื้อ (PO)', url: '/purchase-orders.html' },
                { name: 'ใบส่งของ (DO)', url: '/delivery-orders.html' },
                { name: 'ใบแจ้งหนี้ (Invoice)', url: '/invoices.html' },
                { name: 'ใบวางบิล', url: '/billing-notes.html' },
                { name: 'ใบเสร็จรับเงิน', url: '/receipts.html' },
                { name: 'จัดการลูกค้า', url: '/customers.html' },
                { name: 'จัดการผู้ขาย', url: '/vendors.html' },
                { name: 'จัดการผู้ใช้', url: '/users.html' },
                { name: 'จัดการ Roles', url: '/manage_roles.html' },
                { name: 'จัดการสิทธิ์', url: '/manage_permissions.html' },
                { name: 'สร้างแม่พิมพ์ใหม่', url: '/create-mold.html' },
                { name: 'แก้ไขข้อมูลแม่พิมพ์', url: '/edit-mold.html' },
                { name: 'รายละเอียดแม่พิมพ์', url: '/mold-details.html' },
                { name: 'จัดการ Part List', url: '/manage-parts.html' },
                { name: 'สร้าง BOM ใหม่', url: '/create-bom.html' },
                { name: 'แก้ไข BOM', url: '/edit-bom.html' },
                { name: 'รายละเอียด BOM', url: '/bom-details.html' },
                { name: 'สร้างสินค้าใหม่', url: '/create-item.html' },
                { name: 'แก้ไขข้อมูลสินค้า', url: '/edit-item.html' },
                { name: 'รายละเอียดสินค้า', url: '/item-details.html' },
                { name: 'เพิ่มผู้ใช้', url: '/add-user.html' },
                { name: 'แก้ไขผู้ใช้', url: '/edit-user.html' }
            ];

            const insertPage = dbInstance.prepare(`INSERT OR IGNORE INTO pages (name, url) VALUES (?, ?)`);
            for (const p of allPages) insertPage.run(p.name, p.url);
            insertPage.finalize();
            
            dbInstance.run(`INSERT OR IGNORE INTO roles (name) VALUES ('admin'), ('qc'), ('user')`);

            dbInstance.get(`SELECT COUNT(*) AS cnt FROM users`, (err, row) => {
                if (!err && row && row.cnt === 0) {
                    const adminPass = bcrypt.hashSync('admin', 10);
                    dbInstance.run(`INSERT INTO users (fullName, email, password, role) VALUES (?, ?, ?, ?)`,
                        ['Administrator', 'admin@local', adminPass, 'admin']);
                    console.log('✅ Admin user created.');
                }
            });

            console.log('All SQLite tables initialized successfully (with Thai Time).');
        });
    }

    module.exports = dbInstance;
}
