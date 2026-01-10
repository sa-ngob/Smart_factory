// routes/billingNotes.js
const express = require('express');
const router = express.Router();
const db = require('../database.js');

// Helper functions
const run = (sql, params = []) => new Promise((resolve, reject) => { db.run(sql, params, function (err) { if (err) reject(err); else resolve({ id: this.lastID, changes: this.changes }); }); });
const get = (sql, params = []) => new Promise((resolve, reject) => { db.get(sql, params, (err, row) => { if (err) reject(err); else resolve(row); }); });
const all = (sql, params = []) => new Promise((resolve, reject) => { db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows); }); });


// GET /api/billing-notes - ดึงรายการใบวางบิลทั้งหมด
router.get('/', async (req, res) => {
    try {
        // ✨ UPDATE: เพิ่มการดึง due_date
        const sql = `
            SELECT
                bn.id, bn.bn_number, bn.issue_date, bn.due_date, 
                bn.payment_terms, bn.total_amount, bn.status, e.name as customer_name
            FROM billing_notes bn
            LEFT JOIN entities e ON bn.customer_id = e.id
            ORDER BY bn.id DESC
        `;
        const rows = await all(sql);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// GET /next-bn-number - สร้างเลขที่ใบวางบิลใหม่
router.get('/next-bn-number', async (req, res) => {
    try {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const prefix = `BL-${year}${month}-`;
        
        const lastBN = await get(`SELECT bn_number FROM billing_notes WHERE bn_number LIKE ? ORDER BY id DESC LIMIT 1`, [`${prefix}%`]);
        
        let nextId = 1;
        if (lastBN) {
            nextId = parseInt(lastBN.bn_number.split('-').pop()) + 1;
        }
        const next_bn_number = `${prefix}${nextId.toString().padStart(4, '0')}`;
        res.json({ success: true, next_bn_number });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// POST / - สร้างใบวางบิลใหม่
router.post('/', async (req, res) => {
    // ✨ UPDATE: เพิ่มการรับ due_date จาก request body
    const { customer_id, bn_number, issue_date, due_date, payment_terms, total_amount, invoice_ids, remark } = req.body;
    const created_by = req.session && req.session.user ? req.session.user.id : 1;
    
    if (!customer_id || !bn_number || !issue_date || !due_date || !invoice_ids || invoice_ids.length === 0) {
        return res.status(400).json({ success: false, error: 'ข้อมูลไม่ครบถ้วน: กรุณากรอกข้อมูลให้ครบ' });
    }

    try {
        await run('BEGIN TRANSACTION');
        
        // ✨ UPDATE: เพิ่ม due_date เข้าไปในคำสั่ง INSERT
        const bnResult = await run(
            'INSERT INTO billing_notes (bn_number, customer_id, issue_date, due_date, payment_terms, total_amount, remark, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [bn_number, customer_id, issue_date, due_date, payment_terms, total_amount, remark, 'billed', created_by]
        );
        const billing_note_id = bnResult.id;

        for (const invoice_id of invoice_ids) {
            await run('INSERT INTO billing_note_invoices (billing_note_id, invoice_id) VALUES (?, ?)', [billing_note_id, invoice_id]);
            await run(`UPDATE invoices SET status = 'issued' WHERE id = ?`, [invoice_id]); // อัปเดตสถานะ Invoice เป็น issued (วางบิลแล้ว)
        }
        
        await run('COMMIT');
        res.status(201).json({ success: true, message: 'สร้างใบวางบิลสำเร็จ!', data: { billing_note_id } });
    } catch (error) {
        await run('ROLLBACK');
        res.status(500).json({ success: false, error: error.message });
    }
});


// GET /:id - ดึงข้อมูลใบวางบิลใบเดียว
router.get('/:id', async (req, res) => {
    try {
        const bnId = req.params.id;
        // ✨ UPDATE: เพิ่มการดึง due_date
        const detailsSql = `
            SELECT
                bn.*,
                c.name as customer_name, c.address as customer_address, c.tax_id as customer_tax_id
            FROM billing_notes bn
            LEFT JOIN entities c ON bn.customer_id = c.id
            WHERE bn.id = ?
        `;
        const details = await get(detailsSql, [bnId]);

        if (!details) {
            return res.status(404).json({ success: false, error: 'Billing Note not found' });
        }
        const invoicesSql = `
            SELECT
                inv.invoice_number, inv.issue_date, inv.sub_total,
                inv.tax_amount, inv.grand_total
            FROM invoices inv
            JOIN billing_note_invoices bni ON inv.id = bni.invoice_id
            WHERE bni.billing_note_id = ?
            ORDER BY inv.issue_date, inv.invoice_number
        `;
        const invoices = await all(invoicesSql, [bnId]);

        res.json({ success: true, data: { details, invoices } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// API: ดึงใบวางบิลที่ยังไม่ได้รับชำระของลูกค้า
router.get('/unpaid/:customerId', async (req, res) => {
    try {
        const customerId = req.params.customerId;
        // ✨ UPDATE: เพิ่มการดึง due_date
        const sql = `
            SELECT id, bn_number, issue_date, due_date, total_amount
            FROM billing_notes
            WHERE customer_id = ? AND status = 'billed'
            ORDER BY issue_date
        `;
        const rows = await all(sql, [customerId]);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


module.exports = router;