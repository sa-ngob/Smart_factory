// routes/invoices.js
const express = require('express');
const router = express.Router();
const db = require('../database.js');

// ===== START: เพิ่ม Helper Functions ที่ขาดไป =====
const run = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) reject(err); else resolve({ id: this.lastID, changes: this.changes });
    });
});
const get = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
        if (err) reject(err); else resolve(row);
    });
});
const all = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
        if (err) reject(err); else resolve(rows);
    });
});
// ===== END: เพิ่ม Helper Functions ที่ขาดไป =====


// GET /api/invoices/next-invoice-number - สร้างเลขที่ Invoice ใหม่
router.get('/next-invoice-number', async (req, res) => {
    try {
        const date = new Date();
        const prefix = `IV-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}-`;
        const lastInv = await get(`SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1`, [`${prefix}%`]);
        let nextId = 1;
        if (lastInv) {
            nextId = parseInt(lastInv.invoice_number.split('-').pop()) + 1;
        }
        const next_invoice_number = `${prefix}${nextId.toString().padStart(4, '0')}`;
        res.json({ success: true, next_invoice_number });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/invoices - ดึงรายการใบแจ้งหนี้ทั้งหมด
router.get('/', async (req, res) => {
    try {
        const sql = `
            SELECT
                inv.id,
                inv.invoice_number,
                inv.issue_date,
                inv.due_date,
                inv.grand_total,
                inv.status,
                e.name as customer_name
            FROM invoices inv
            LEFT JOIN delivery_orders do ON inv.do_id = do.id
            LEFT JOIN entities e ON do.customer_id = e.id
            ORDER BY inv.id DESC
        `;
        const rows = await all(sql); // <-- ตอนนี้จะหาฟังก์ชัน all เจอแล้ว
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error("Error fetching invoices:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});


// POST /api/invoices - บันทึก Invoice ใหม่
router.post('/', async (req, res) => {
    const { do_id, invoice_number, issue_date, due_date, sub_total, tax_amount, grand_total, items } = req.body;
    
    const created_by = req.session.user ? req.session.user.id : null;
    if (!created_by) {
        return res.status(401).json({ success: false, error: 'Session หมดอายุหรือไม่พบผู้ใช้ กรุณา login ใหม่' });
    }
    if (!do_id || !invoice_number || !issue_date || !due_date || !items) {
        return res.status(400).json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' });
    }
    try {
        await run('BEGIN TRANSACTION');
        const invResult = await run(
            'INSERT INTO invoices (invoice_number, do_id, issue_date, due_date, sub_total, tax_amount, grand_total, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [invoice_number, do_id, issue_date, due_date, sub_total, tax_amount, grand_total, created_by]
        );
        const invoice_id = invResult.id;
        for (const item of items) {
            await run(
                'INSERT INTO invoice_items (invoice_id, item_code, description, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)',
                [invoice_id, item.item_code, item.item_name, item.quantity, item.unit_price, item.total_price]
            );
        }
        await run(`UPDATE delivery_orders SET status = 'invoiced' WHERE id = ?`, [do_id]);
        await run('COMMIT');
        res.status(201).json({ success: true, message: 'สร้างใบแจ้งหนี้สำเร็จ!', data: { invoice_id } });
    } catch (error) {
        await run('ROLLBACK');
        console.error("Error creating invoice:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;