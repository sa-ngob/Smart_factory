// routes/entities.js (ฉบับปรับปรุง)
const express = require('express');
const router = express.Router();
const db = require('../database.js');
const { checkRole } = require('../middleware/auth.js');

// --- Middleware (ส่วนที่เพิ่มใหม่) ---
// Middleware สำหรับตรวจสอบ và ตั้งค่าประเภทของ Entity (customer/vendor)
// เพื่อลดความซ้ำซ้อนใน Route ต่างๆ
const setEntityType = (req, res, next) => {
    const listType = req.query.list_for || req.query.type;
    if (!listType || !['customer', 'vendor'].includes(listType)) {
        return res.status(400).json({ error: 'A valid list_for or type parameter (customer, vendor) is required.' });
    }
    // กำหนดค่าลงใน request เพื่อให้ route handler ตัวถัดไปนำไปใช้ได้เลย
    req.entityType = listType;
    req.entityColumn = listType === 'customer' ? 'is_customer' : 'is_vendor';
    next();
};


// --- Routes ---

// GET /next-code (ปรับปรุงเล็กน้อย)
// ใช้ Middleware 'setEntityType' เพื่อลดโค้ดซ้ำซ้อน
router.get('/next-code', setEntityType, async (req, res) => {
    const prefix = req.entityType === 'customer' ? 'CUS-' : 'VDR-';
    // Note: We use template literal for column name because it's validated by middleware to be safe ('is_customer' or 'is_vendor')
    const sql = `SELECT entity_code FROM entities WHERE ${req.entityColumn} = 1 ORDER BY id DESC LIMIT 1`;

    try {
        const row = await db.getAsync(sql);

        let nextSequence = 1;
        if (row && row.entity_code) {
            const lastSequence = parseInt(row.entity_code.replace(prefix, ''), 10);
            if (!isNaN(lastSequence)) nextSequence = lastSequence + 1;
        }

        const nextCode = `${prefix}${String(nextSequence).padStart(4, '0')}`;
        res.json({ entity_code: nextCode });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET / (ปรับปรุงเล็กน้อย)
// ใช้ Middleware 'setEntityType' เพื่อลดโค้ดซ้ำซ้อน
router.get('/', setEntityType, async (req, res) => {
    const sql = `SELECT * FROM entities WHERE ${req.entityColumn} = 1 ORDER BY id DESC`;

    try {
        const rows = await db.allAsync(sql);
        res.json({ data: rows });
    } catch (err) {
        res.status(500).json({ "error": err.message });
    }
});

// GET /:id (✨ Route ที่เพิ่มเข้ามาใหม่)
// สำหรับดึงข้อมูล Entity (ลูกค้า/ผู้ขาย) เพียงรายการเดียวตาม ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const sql = `SELECT * FROM entities WHERE id = $1`;

    try {
        const row = await db.getAsync(sql, [id]);
        if (!row) {
            return res.status(404).json({ error: 'Entity not found.' });
        }
        res.json({ data: row });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// GET /customers/:id/outstanding-pos (โค้ดเดิม ไม่เปลี่ยนแปลง)
router.get('/customers/:id/outstanding-pos', async (req, res) => {
    const customerId = req.params.id;

    // --- DEBUG 1: ตรวจสอบว่า API ถูกเรียกและได้รับ customerId ถูกต้อง ---
    console.log(`\n[BACKEND-DEBUG] 1. API route '/customers/${customerId}/outstanding-pos' was hit.`);

    const sql = `
        SELECT DISTINCT so.customer_po_number
        FROM delivery_orders do
        JOIN delivery_order_items doi ON do.id = doi.do_id
        JOIN sales_order_items soi ON doi.so_item_id = soi.id
        JOIN sales_orders so ON soi.so_id = so.id
        WHERE do.customer_id = $1
          AND do.status = 'shipped'
          AND so.customer_po_number IS NOT NULL AND so.customer_po_number != ''
        ORDER BY so.customer_po_number
    `;

    // --- DEBUG 2: แสดงคำสั่ง SQL และ Parameters ที่จะใช้ ---
    console.log('[BACKEND-DEBUG] 2. Executing SQL:', sql);
    console.log('[BACKEND-DEBUG] 3. With Parameters:', [customerId]);

    try {
        const rows = await db.allAsync(sql, [customerId]);

        // --- DEBUG 4 (SUCCESS): แสดงผลลัพธ์ที่ได้จากฐานข้อมูล ---
        console.log(`[BACKEND-DEBUG] 4. DATABASE SUCCESS. Found ${rows.length} rows.`);
        console.log('[BACKEND-DEBUG] 5. Data received from DB:', rows);

        res.json({ success: true, data: rows });
    } catch (err) {
        // --- DEBUG 4 (ERROR): แสดงข้อผิดพลาดจากฐานข้อมูล ---
        console.error('[BACKEND-DEBUG] 4. DATABASE ERROR:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
});


// POST / (โค้ดเดิม ไม่เปลี่ยนแปลง)
router.post('/', async (req, res) => {
    const { entity_code, name, address, tax_id, branch_code, branch_name, contact_person, email, phone, is_customer, is_vendor } = req.body;
    const sql = `INSERT INTO entities (entity_code, name, address, tax_id, branch_code, branch_name, contact_person, email, phone, is_customer, is_vendor) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`;
    const params = [entity_code, name, address, tax_id, branch_code, branch_name, contact_person, email, phone, is_customer || 0, is_vendor || 0];

    try {
        const result = await db.query(sql, params);
        res.json({ "message": "success", "id": result.rows[0].id });
    } catch (err) {
        res.status(400).json({ "error": err.message });
    }
});

// PUT /:id (โค้ดเดิม ไม่เปลี่ยนแปลง)
router.put('/:id', async (req, res) => {
    const { entity_code, name, address, tax_id, branch_code, branch_name, contact_person, email, phone, is_customer, is_vendor } = req.body;
    const sql = `UPDATE entities SET
        entity_code = $1, name = $2, address = $3, tax_id = $4, branch_code = $5,
        branch_name = $6, contact_person = $7, email = $8, phone = $9,
        is_customer = $10, is_vendor = $11
        WHERE id = $12`;
    const params = [entity_code, name, address, tax_id, branch_code, branch_name, contact_person, email, phone, is_customer || 0, is_vendor || 0, req.params.id];

    try {
        const result = await db.runAsync(sql, params);
        res.json({ message: "success", changes: result.rowCount });
    } catch (err) {
        res.status(400).json({ "error": err.message });
    }
});

// DELETE /:id (โค้ดเดิม ไม่เปลี่ยนแปลง)
router.delete('/:id', async (req, res) => {
    const sql = 'DELETE FROM entities WHERE id = $1';
    try {
        const result = await db.runAsync(sql, [req.params.id]);
        res.json({ message: 'deleted', changes: result.rowCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;