// routes/entities.js (ฉบับเพิ่ม DEBUG)
const express = require('express');
const router = express.Router();
const db = require('../database.js');
const { checkRole } = require('../middleware/auth.js');

// ... (โค้ดส่วนอื่น ๆ เหมือนเดิม) ...
router.get('/next-code', (req, res) => {
    const listType = req.query.list_for || req.query.type;
    if (!listType) {
        return res.status(400).json({ error: 'list_for or type parameter is required' });
    }
    const prefix = listType === 'customer' ? 'CUS-' : 'VDR-';
    const column = listType === 'customer' ? 'is_customer' : 'is_vendor';
    const sql = `SELECT entity_code FROM entities WHERE ${column} = 1 ORDER BY id DESC LIMIT 1`;

    db.get(sql, [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        let nextSequence = 1;
        if (row && row.entity_code) {
            const lastSequence = parseInt(row.entity_code.replace(prefix, ''), 10);
            if (!isNaN(lastSequence)) nextSequence = lastSequence + 1;
        }
        const nextCode = `${prefix}${String(nextSequence).padStart(4, '0')}`;
        res.json({ entity_code: nextCode });
    });
});
router.get('/', (req, res) => {
    const listType = req.query.list_for || req.query.type;
    if (!listType || !['customer', 'vendor'].includes(listType)) {
        return res.status(400).json({ error: 'A valid list_for or type parameter is required.' });
    }
    const column = listType === 'customer' ? 'is_customer' : 'is_vendor';
    const sql = `SELECT * FROM entities WHERE ${column} = 1 ORDER BY id DESC`;

    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ "error": err.message });
        res.json({ data: rows });
    });
});
// ... (จบโค้ดส่วนอื่น ๆ) ...


// GET /customers/:id/outstanding-pos (ฉบับเพิ่ม DEBUG)
router.get('/customers/:id/outstanding-pos', (req, res) => {
    const customerId = req.params.id;

    // --- DEBUG 1: ตรวจสอบว่า API ถูกเรียกและได้รับ customerId ถูกต้อง ---
    console.log(`\n[BACKEND-DEBUG] 1. API route '/customers/${customerId}/outstanding-pos' was hit.`);

    const sql = `
        SELECT DISTINCT so.customer_po_number
        FROM delivery_orders do
        JOIN delivery_order_items doi ON do.id = doi.do_id
        JOIN sales_order_items soi ON doi.so_item_id = soi.id
        JOIN sales_orders so ON soi.so_id = so.id
        WHERE do.customer_id = ?
          AND do.status = 'shipped'
          AND so.customer_po_number IS NOT NULL AND so.customer_po_number != ''
        ORDER BY so.customer_po_number
    `;

    // --- DEBUG 2: แสดงคำสั่ง SQL และ Parameters ที่จะใช้ ---
    console.log('[BACKEND-DEBUG] 2. Executing SQL:', sql);
    console.log('[BACKEND-DEBUG] 3. With Parameters:', [customerId]);


    db.all(sql, [customerId], (err, rows) => {
        if (err) {
            // --- DEBUG 4 (ERROR): แสดงข้อผิดพลาดจากฐานข้อมูล ---
            console.error('[BACKEND-DEBUG] 4. DATABASE ERROR:', err.message);
            return res.status(500).json({ success: false, error: err.message });
        }

        // --- DEBUG 4 (SUCCESS): แสดงผลลัพธ์ที่ได้จากฐานข้อมูล ---
        console.log(`[BACKEND-DEBUG] 4. DATABASE SUCCESS. Found ${rows.length} rows.`);
        console.log('[BACKEND-DEBUG] 5. Data received from DB:', rows);

        res.json({ success: true, data: rows });
    });
});

// ... (โค้ดส่วน POST, PUT, DELETE เหมือนเดิม) ...
router.post('/', (req, res) => {
    const { entity_code, name, address, tax_id, branch_code, branch_name, contact_person, email, phone, is_customer, is_vendor } = req.body;
    const sql = `INSERT INTO entities (entity_code, name, address, tax_id, branch_code, branch_name, contact_person, email, phone, is_customer, is_vendor) VALUES (?,?,?,?,?,?,?,?,?,?,?)`;
    const params = [entity_code, name, address, tax_id, branch_code, branch_name, contact_person, email, phone, is_customer || 0, is_vendor || 0];
    db.run(sql, params, function(err) {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ "message": "success", "id": this.lastID });
    });
});
router.put('/:id', (req, res) => {
    const { entity_code, name, address, tax_id, branch_code, branch_name, contact_person, email, phone, is_customer, is_vendor } = req.body;
    const sql = `UPDATE entities SET
        entity_code = ?, name = ?, address = ?, tax_id = ?, branch_code = ?,
        branch_name = ?, contact_person = ?, email = ?, phone = ?,
        is_customer = ?, is_vendor = ?
        WHERE id = ?`;
    const params = [entity_code, name, address, tax_id, branch_code, branch_name, contact_person, email, phone, is_customer || 0, is_vendor || 0, req.params.id];
    db.run(sql, params, function (err) {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ message: "success", changes: this.changes });
    });
});
router.delete('/:id', (req, res) => {
    const sql = 'DELETE FROM entities WHERE id = ?';
    db.run(sql, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'deleted', changes: this.changes });
    });
});

// ... (จบโค้ดส่วนอื่น ๆ) ...


module.exports = router;