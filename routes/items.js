const express = require('express');
const router = express.Router();
const { pool, ...db } = require('../database.js');
const multer = require('multer');
const fs = require('fs');

// --- การตั้งค่า Multer (เหมือนเดิม) ---
const uploadDir = 'public/uploads/items';
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir, { recursive: true }); }
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `item-${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage: storage });
const parseNumber = (value) => {
    if (value === '' || value === undefined || value === null) return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
};

// API สำหรับสร้างรหัสสินค้าอัตโนมัติ (เหมือนเดิม)
router.get('/next-code', async (req, res) => {
    const { type } = req.query;
    if (!type) return res.status(400).json({ error: 'Item type is required' });
    const prefixes = { finished_good: 'FG-', semi_good: 'SE-', raw_material: 'RM-', consumable: 'CS-' };
    const prefix = prefixes[type];
    if (!prefix) return res.status(400).json({ error: 'Invalid item type' });

    try {
        const sql = `SELECT item_code FROM items WHERE item_code LIKE $1 ORDER BY item_code DESC LIMIT 1`;
        const row = await db.getAsync(sql, [`${prefix}%`]);

        let nextNumber = 1;
        if (row) {
            try {
                const lastNumber = parseInt(row.item_code.replace(prefix, ''), 10);
                nextNumber = lastNumber + 1;
            } catch (parseErr) { nextNumber = 1; }
        }
        const nextCode = `${prefix}${String(nextNumber).padStart(4, '0')}`;
        res.json({ item_code: nextCode });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// READ: ดึงข้อมูลสินค้าทั้งหมด
router.get('/', async (req, res) => {
    const type = req.query.item_type || req.query.type;
    const { search, customer_id } = req.query;

    let sql = `SELECT i.*, e.name as customer_name FROM items i LEFT JOIN entities e ON i.customer_id = e.id WHERE 1=1`;
    const params = [];
    let paramIndex = 1;

    // Filter by Active status by default unless specified otherwise? 
    // The previous simple handler filtered by status='active'. The main handler didn't. 
    // We should probably default to generic list or maybe the UI expects active only?
    // Let's stick to the previous main handler logic but typically dropdowns want active items.
    // However, the prompt says "Finished Good dropdown not show".
    // If I removed the block, it will use the main logic.

    if (type) { sql += ` AND i.item_type = $${paramIndex++}`; params.push(type); }
    if (search) { sql += ` AND (i.item_code LIKE $${paramIndex++} OR i.item_name LIKE $${paramIndex++})`; params.push(`%${search}%`, `%${search}%`); }
    if (customer_id) { sql += ` AND (i.customer_id = $${paramIndex++} OR i.customer_id IS NULL)`; params.push(customer_id); }

    // Add status check if it's for dropdowns (usually implied by presence of type?)
    // Actually, let's just use the robust logic.

    sql += ' ORDER BY i.item_code';

    try {
        const rows = await db.allAsync(sql, params);
        res.json({ data: rows });
    } catch (err) {
        console.error("Error in GET /api/items (full list):", err);
        res.status(500).json({ "error": err.message });
    }
});

// GET /api/items/by-vendor/:vendorId
router.get('/by-vendor/:vendorId', async (req, res) => {
    const vendorId = req.params.vendorId;
    const sql = `SELECT i.item_code, i.item_name FROM items i JOIN item_vendors iv ON i.id = iv.item_id WHERE iv.vendor_id = $1 AND i.status = 'active' ORDER BY i.item_code`;
    try {
        const rows = await db.allAsync(sql, [vendorId]);
        res.json({ data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/items/by-code/:code - ดึงข้อมูลสินค้าจากรหัสสินค้า
router.get('/by-code/:code', async (req, res) => {
    const itemCode = req.params.code;
    const sql = `SELECT * FROM items WHERE item_code = $1`;
    try {
        const row = await db.getAsync(sql, [itemCode]);
        if (!row) return res.status(404).json({ error: "Item not found" });
        res.json({ data: row });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// READ: ดึงข้อมูลสินค้าชิ้นเดียว (เหมือนเดิม)
router.get('/:id', async (req, res) => {
    const sql = `SELECT i.*, e.name as customer_name FROM items i LEFT JOIN entities e ON i.customer_id = e.id WHERE i.id = $1`;
    try {
        const row = await db.getAsync(sql, [req.params.id]);
        if (!row) return res.status(404).json({ "error": "Item not found" });
        res.json({ data: row });
    } catch (err) {
        res.status(500).json({ "error": err.message });
    }
});

// === API ใหม่: ดึงรายชื่อผู้ขายที่ผูกกับสินค้า ===
router.get('/:id/vendors', async (req, res) => {
    const itemId = req.params.id;
    const sql = "SELECT vendor_id FROM item_vendors WHERE item_id = $1";
    try {
        const rows = await db.allAsync(sql, [itemId]);
        const vendorIds = rows.map(row => row.vendor_id);
        res.json({ data: vendorIds });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE: สร้างข้อมูลสินค้าใหม่ (เหมือนเดิม)
router.post('/', upload.single('image'), async (req, res) => {
    const data = req.body;
    const image_path = req.file ? `/uploads/items/${req.file.filename}` : null;

    // SQLite Parameters (using ?)
    const paramsSQLite = [
        data.item_code, parseNumber(data.customer_id), data.item_name, data.model, data.material_name,
        data.grade, data.colour, parseNumber(data.part_weight_gram), parseNumber(data.cycle_time_sec),
        data.item_type, data.uom, parseNumber(data.stock_quantity) || 0, image_path,
        parseNumber(data.selling_price) || 0, parseNumber(data.cost_price) || 0, parseNumber(data.min_stock) || 0
    ];

    try {
        let itemId;
        if (pool) {
            // Postgres
            const sql = `INSERT INTO items (item_code, customer_id, item_name, model, material_name, grade, colour, part_weight_gram, cycle_time_sec, item_type, uom, stock_quantity, image_path, status, selling_price, cost_price, min_stock) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, 'active', $14, $15, $16) RETURNING id`;
            const result = await pool.query(sql, paramsSQLite); // Postgres driver accepts array for $1...$n
            itemId = result.rows[0].id;
        } else {
            // SQLite
            const sql = `INSERT INTO items (item_code, customer_id, item_name, model, material_name, grade, colour, part_weight_gram, cycle_time_sec, item_type, uom, stock_quantity, image_path, status, selling_price, cost_price, min_stock) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?, 'active', ?, ?, ?)`;
            const result = await db.runAsync(sql, paramsSQLite);
            itemId = result.lastID;
        }
        res.json({ "message": "success", "id": itemId });
    } catch (err) {
        res.status(400).json({ "error": err.message });
    }
});

// === จุดที่แก้ไข: อัปเดตข้อมูลสินค้าและความสัมพันธ์กับผู้ขาย ===
router.put('/:id', upload.single('image'), async (req, res) => {
    const data = req.body;
    const itemId = req.params.id;
    let vendors = data.vendors || [];
    if (typeof vendors === 'string' && vendors) {
        vendors = vendors.split(',').map(Number);
    } else if (!Array.isArray(vendors)) {
        vendors = [];
    }

    // Postgres Loop
    if (pool) {
        const client = await pool.connect();
        try {
            const oldItemRes = await client.query('SELECT image_path FROM items WHERE id = $1', [itemId]);
            const oldItem = oldItemRes.rows[0];
            if (!oldItem) { client.release(); return res.status(404).json({ "error": "Item not found" }); }
            const image_path = req.file ? `/uploads/items/${req.file.filename}` : oldItem.image_path;

            await client.query('BEGIN');
            const sql = `UPDATE items SET
                item_code = $1, customer_id = $2, item_name = $3, model = $4, material_name = $5,
                grade = $6, colour = $7, part_weight_gram = $8, cycle_time_sec = $9, item_type = $10, uom = $11, status = $12,
                image_path = $13
                WHERE id = $14`;
            const params = [
                data.item_code, parseNumber(data.customer_id), data.item_name, data.model, data.material_name,
                data.grade, data.colour, parseNumber(data.part_weight_gram), parseNumber(data.cycle_time_sec),
                data.item_type, data.uom, data.status || 'active',
                image_path, itemId
            ];
            await client.query(sql, params);
            await client.query("DELETE FROM item_vendors WHERE item_id = $1", [itemId]);
            if (vendors.length > 0) {
                const insertSql = "INSERT INTO item_vendors (item_id, vendor_id) VALUES ($1, $2)";
                for (const vendorId of vendors) await client.query(insertSql, [itemId, vendorId]);
            }
            await client.query('COMMIT');
            res.json({ message: "Item updated successfully" });
        } catch (err) {
            await client.query('ROLLBACK');
            res.status(500).json({ "error": err.message });
        } finally {
            client.release();
        }
    } else {
        // SQLite
        try {
            const oldItem = await db.getAsync('SELECT image_path FROM items WHERE id = ?', [itemId]);
            if (!oldItem) return res.status(404).json({ "error": "Item not found" });

            const image_path = req.file ? `/uploads/items/${req.file.filename}` : oldItem.image_path;

            const sql = `UPDATE items SET
                item_code = ?, customer_id = ?, item_name = ?, model = ?, material_name = ?,
                grade = ?, colour = ?, part_weight_gram = ?, cycle_time_sec = ?, item_type = ?, uom = ?, status = ?, image_path = ?
                WHERE id = ?`;
            const params = [
                data.item_code, parseNumber(data.customer_id), data.item_name, data.model, data.material_name,
                data.grade, data.colour, parseNumber(data.part_weight_gram), parseNumber(data.cycle_time_sec),
                data.item_type, data.uom, data.status || 'active', image_path,
                itemId
            ];

            await db.runAsync(sql, params);
            await db.runAsync("DELETE FROM item_vendors WHERE item_id = ?", [itemId]);
            if (vendors.length > 0) {
                const insertSql = "INSERT INTO item_vendors (item_id, vendor_id) VALUES (?, ?)";
                for (const vendorId of vendors) await db.runAsync(insertSql, [itemId, vendorId]);
            }
            res.json({ message: "Item updated successfully" });
        } catch (err) {
            res.status(500).json({ "error": err.message });
        }
    }
});

// DELETE: (เหมือนเดิม)
router.delete('/:id', async (req, res) => {
    const sql = `UPDATE items SET status = 'inactive' WHERE id = $1`;
    try {
        const result = await db.runAsync(sql, [req.params.id]);
        res.json({ "message": "deactivated", changes: result.rowCount });
    } catch (err) {
        res.status(400).json({ "error": err.message });
    }
});

module.exports = router;