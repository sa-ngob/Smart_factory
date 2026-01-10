// routes/receipts.js (ฉบับสมบูรณ์)
const express = require('express');
const router = express.Router();
const db = require('../database.js');

const run = (sql, params = []) => new Promise((resolve, reject) => { db.run(sql, params, function (err) { if (err) reject(err); else resolve({ id: this.lastID, changes: this.changes }); }); });
const get = (sql, params = []) => new Promise((resolve, reject) => { db.get(sql, params, (err, row) => { if (err) reject(err); else resolve(row); }); });
const all = (sql, params = []) => new Promise((resolve, reject) => { db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows); }); });


// GET /api/receipts - ดึงรายการใบเสร็จทั้งหมด
router.get('/', async (req, res) => {
    try {
        const sql = `
            SELECT r.id, r.receipt_number, r.payment_date, r.total_amount_paid, r.payment_method, e.name as customer_name
            FROM receipts r LEFT JOIN entities e ON r.customer_id = e.id ORDER BY r.id DESC
        `;
        const rows = await all(sql);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/receipts/next-receipt-number
router.get('/next-receipt-number', async (req, res) => {
    try {
        const date = new Date();
        const prefix = `RPT-${date.getFullYear().toString().slice(-2)}${(date.getMonth() + 1).toString().padStart(2, '0')}-`;
        const lastRE = await get(`SELECT receipt_number FROM receipts WHERE receipt_number LIKE ? ORDER BY id DESC LIMIT 1`, [`${prefix}%`]);
        let nextId = 1;
        if (lastRE) { nextId = parseInt(lastRE.receipt_number.split('-').pop()) + 1; }
        const next_receipt_number = `${prefix}${nextId.toString().padStart(4, '0')}`;
        res.json({ success: true, next_receipt_number });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/receipts - บันทึกการรับชำระเงิน (Logic อ้างอิงจาก Billing Note)
router.post('/', async (req, res) => {
    const { customer_id, receipt_number, payment_date, payment_method, notes, billing_note_id } = req.body;
    const created_by = req.session.user ? req.session.user.id : 1;
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!customer_id || !receipt_number || !payment_date || !billing_note_id) {
        return res.status(400).json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' });
    }

    try {
        await run('BEGIN TRANSACTION');

        const bnData = await get('SELECT total_amount FROM billing_notes WHERE id = ?', [billing_note_id]);
        if (!bnData) throw new Error('ไม่พบใบวางบิล');
        const total_amount_paid = bnData.total_amount;

        const receiptResult = await run(
            'INSERT INTO receipts (receipt_number, customer_id, payment_date, total_amount_paid, payment_method, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [receipt_number, customer_id, payment_date, total_amount_paid, payment_method, notes, created_by]
        );
        const receipt_id = receiptResult.id;

        const invoicesToPay = await all('SELECT invoice_id FROM billing_note_invoices WHERE billing_note_id = ?', [billing_note_id]);

        for (const inv of invoicesToPay) {
            const invoiceData = await get('SELECT grand_total FROM invoices WHERE id = ?', [inv.invoice_id]);
            await run('INSERT INTO receipt_invoices (receipt_id, invoice_id, amount_applied) VALUES (?, ?, ?)',
                [receipt_id, inv.invoice_id, invoiceData.grand_total]
            );
            await run('UPDATE invoices SET status = ? WHERE id = ?', ['paid', inv.invoice_id]);
        }
        
        await run('UPDATE billing_notes SET status = ? WHERE id = ?', ['collected', billing_note_id]);

        await run('COMMIT');
        res.status(201).json({ success: true, message: 'บันทึกการรับชำระเงินสำเร็จ!', data: { receipt_id } });

    } catch (error) {
        await run('ROLLBACK');
        console.error("Error creating receipt:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// **API ที่แก้ไข**: GET /api/receipts/:id - ดึงข้อมูลใบเสร็จใบเดียวแบบละเอียด
router.get('/:id', async (req, res) => {
    try {
        const receiptId = req.params.id;

        // 1. ดึงข้อมูลหลักของใบเสร็จ
        const detailsSql = `
            SELECT r.*, c.name as customer_name, c.address as customer_address, c.tax_id as customer_tax_id
            FROM receipts r
            LEFT JOIN entities c ON r.customer_id = c.id
            WHERE r.id = ?
        `;
        const details = await get(detailsSql, [receiptId]);

        if (!details) {
            return res.status(404).json({ success: false, error: 'Receipt not found' });
        }

        // 2. ดึงรายการ Invoice ที่ถูกชำระโดยใบเสร็จนี้
        const invoicesSql = `
            SELECT
                inv.invoice_number, inv.issue_date, inv.sub_total,
                inv.tax_amount, inv.grand_total
            FROM invoices inv
            JOIN receipt_invoices ri ON inv.id = ri.invoice_id
            WHERE ri.receipt_id = ?
            ORDER BY inv.issue_date
        `;
        const invoices = await all(invoicesSql, [receiptId]);

        // 3. (ถ้ามี) ค้นหาข้อมูลอ้างอิงจากใบวางบิล
        if (invoices.length > 0) {
            const firstInvoiceId = await get('SELECT invoice_id FROM receipt_invoices WHERE receipt_id = ? LIMIT 1', [receiptId]);
            const refSql = `
                SELECT bn.bn_number as ref_bn_number, bn.payment_terms
                FROM billing_notes bn
                JOIN billing_note_invoices bni ON bn.id = bni.billing_note_id
                WHERE bni.invoice_id = ?
                LIMIT 1
            `;
            const refInfo = await get(refSql, [firstInvoiceId.invoice_id]);
            if (refInfo) {
                details.ref_bn_number = refInfo.ref_bn_number;
                details.payment_terms = refInfo.payment_terms;
            }
        }

        res.json({ success: true, data: { details, invoices } });

    } catch (error) {
        console.error("Error fetching receipt details:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;