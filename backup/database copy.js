// database.js
const sqlite3 = require('sqlite3').verbose();
const util = require('util');
const DB_PATH = './smart_factory.db';

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');

        // **ย้ายมาไว้ตรงนี้!**
        // 1. ตั้งค่า Timeout ก่อนเป็นอันดับแรก
        db.configure('busyTimeout', 3000); // รอ 3000ms (3 วินาที)

        // 2. ค่อยเริ่มสร้างตาราง
        createTables();
    }
});

// ✅ เพิ่ม: Promisify a-la-carte for sqlite3 ณ จุดนี้
// ทำให้ทุกไฟล์ที่ require('database.js') จะได้ฟังก์ชันเหล่านี้ไปใช้ทันที
db.allAsync = util.promisify(db.all.bind(db));
db.getAsync = util.promisify(db.get.bind(db));
db.runAsync = util.promisify(db.run.bind(db));

function createTables() {
    db.serialize(() => {
        console.log("Initializing database tables...");

        // --- Core System Tables ---
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fullName TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            status TEXT DEFAULT 'active'
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS roles ( id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL )`);
        db.run(`CREATE TABLE IF NOT EXISTS pages ( id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, url TEXT UNIQUE NOT NULL )`);
        db.run(`CREATE TABLE IF NOT EXISTS role_pages ( role_id INTEGER, page_id INTEGER, PRIMARY KEY (role_id, page_id), FOREIGN KEY (role_id) REFERENCES roles(id), FOREIGN KEY (page_id) REFERENCES pages(id) )`);

        // --- Master Data Tables ---
        db.run(`CREATE TABLE IF NOT EXISTS entities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            tax_id TEXT,
            address TEXT,
            branch_code TEXT,
            branch_name TEXT,
            contact_person TEXT,
            email TEXT,
            phone TEXT
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS entity_roles ( entity_id INTEGER NOT NULL, role_name TEXT NOT NULL, PRIMARY KEY (entity_id, role_name), FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE )`);
        db.run(`CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_code TEXT UNIQUE NOT NULL,
            item_name TEXT NOT NULL,
            item_type TEXT,
            uom TEXT,
            stock_quantity INTEGER DEFAULT 0,
            status TEXT,
            cycle_time_sec REAL,
            material_dry_temp REAL
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS machines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            machine_code TEXT UNIQUE NOT NULL,
            machine_name TEXT NOT NULL,
            status TEXT DEFAULT 'idle',
            cycle_time_sec REAL,
            material_dry_temp REAL
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS defect_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            description TEXT NOT NULL
        )`);

        // --- Sales & Planning Tables ---
        db.run(`CREATE TABLE IF NOT EXISTS sales_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            so_number TEXT UNIQUE NOT NULL,
            customer_id INTEGER NOT NULL,
            customer_po_number TEXT,
            order_date TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            FOREIGN KEY (customer_id) REFERENCES entities(id)
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS sales_order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            so_id INTEGER NOT NULL,
            item_code TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            FOREIGN KEY (so_id) REFERENCES sales_orders(id),
            FOREIGN KEY (item_code) REFERENCES items(item_code)
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS manufacturing_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mo_number TEXT UNIQUE NOT NULL,
            so_id INTEGER,
            item_code TEXT NOT NULL,
            quantity_to_produce INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            machine_id INTEGER,
            planned_start_time TEXT,
            planned_end_time TEXT,
            actual_start_time TEXT,
            actual_end_time TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (so_id) REFERENCES sales_orders(id),
            FOREIGN KEY (item_code) REFERENCES items(item_code),
            FOREIGN KEY (machine_id) REFERENCES machines(id)
        )`);

        // --- Production & Machine Data Tables ---
        db.run(`CREATE TABLE IF NOT EXISTS machine_data (
            machine_id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            mold_count INTEGER,
            machine_status INTEGER,
            mold_temp_core REAL,
            mold_temp_cavity REAL,
            mo_number TEXT
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS production_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mo_id INTEGER NOT NULL,
            record_date TEXT NOT NULL,
            shift TEXT,
            operator_name TEXT,
            good_quantity INTEGER DEFAULT 0,
            total_scrap_quantity INTEGER DEFAULT 0,
            FOREIGN KEY (mo_id) REFERENCES manufacturing_orders(id)
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS scrap_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            production_record_id INTEGER NOT NULL,
            defect_code_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            FOREIGN KEY (production_record_id) REFERENCES production_records(id),
            FOREIGN KEY (defect_code_id) REFERENCES defect_codes(id)
        )`);

        // --- OEE & Downtime Foundation ---
        db.run(`CREATE TABLE IF NOT EXISTS downtime_reasons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reason_code TEXT UNIQUE NOT NULL,
            description TEXT NOT NULL,
            category TEXT CHECK(category IN ('planned', 'unplanned', 'setup'))
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS machine_status_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            machine_id TEXT NOT NULL,
            status INTEGER NOT NULL, -- 0=Stop, 1=Running, 2=Alarm
            start_time TEXT NOT NULL,
            end_time TEXT,
            duration_sec INTEGER,
            reason_id INTEGER,
            notes TEXT,
            FOREIGN KEY (machine_id) REFERENCES machines (machine_code),
            FOREIGN KEY (reason_id) REFERENCES downtime_reasons (id)
        )`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_status_logs_machine_time ON machine_status_logs (machine_id, start_time)`);

        // --- Financial Tables ---
        db.run(`CREATE TABLE IF NOT EXISTS delivery_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            do_number TEXT UNIQUE NOT NULL,
            customer_id INTEGER NOT NULL,
            shipping_date TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            FOREIGN KEY (customer_id) REFERENCES entities(id)
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS delivery_order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            do_id INTEGER NOT NULL,
            so_item_id INTEGER NOT NULL,
            quantity_shipped INTEGER NOT NULL,
            FOREIGN KEY (do_id) REFERENCES delivery_orders(id),
            FOREIGN KEY (so_item_id) REFERENCES sales_order_items(id)
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_number TEXT UNIQUE NOT NULL,
            do_id INTEGER,
            issue_date TEXT NOT NULL,
            due_date TEXT NOT NULL,
            sub_total REAL,
            tax_amount REAL,
            grand_total REAL,
            status TEXT DEFAULT 'unpaid',
            created_by INTEGER,
            FOREIGN KEY (do_id) REFERENCES delivery_orders(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        )`);

        console.log("All tables initialized successfully.");
    });
}


module.exports = db;