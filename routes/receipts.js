const express = require('express');
const router = express.Router();
const db = require('../database.js');


// GET /next-receipt-number
router.get('/next-receipt-number', async (req, res) => {
    try {
        const date = new Date();
        const prefix = `RE-${date.getFullYear().toString().slice(-2)}${(date.getMonth() + 1).toString().padStart(2, '0')}-`;
        const result = await db.query(`SELECT receipt_number FROM receipts WHERE receipt_number LIKE $1 ORDER BY id DESC LIMIT 1`, [`${prefix}%`]);
        const lastReceipt = result.rows[0];
        let nextId = 1;
        if (lastReceipt) {
            nextId = parseInt(lastReceipt.receipt_number.split('-').pop()) + 1;
        }
        const next_receipt_number = `${prefix}${nextId.toString().padStart(4, '0')}`;
        res.json({ success: true, next_receipt_number });
    } catch (error) {
        console.error("GET /next-receipt-number Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// GET / - Get a list of all receipts
router.get('/', async (req, res) => {
    try {
        const sql = `
            SELECT r.id, r.receipt_number, r.payment_date, r.total_amount_paid, r.status, e.name as customer_name
            FROM receipts r LEFT JOIN entities e ON r.customer_id = e.id
            ORDER BY r.id DESC;`;
        const result = await db.query(sql, []);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error("Error fetching receipts:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// POST / - Create a new receipt
router.post('/', async (req, res) => {
    const { customer_id, payment_date, payment_method, total_amount_paid, notes, billing_note_ids } = req.body;
    const created_by = req.session && req.session.userId ? req.session.userId : 1;

    if (!customer_id || !payment_date || total_amount_paid === undefined || !billing_note_ids || !Array.isArray(billing_note_ids) || billing_note_ids.length === 0) {
        return res.status(400).json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' });
    }

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const date = new Date();
        const prefix = `RE-${date.getFullYear().toString().slice(-2)}${(date.getMonth() + 1).toString().padStart(2, '0')}-`;
        const lasRecResult = await client.query(`SELECT receipt_number FROM receipts WHERE receipt_number LIKE $1 ORDER BY id DESC LIMIT 1`, [`${prefix}%`]);
        const lastReceipt = lasRecResult.rows[0];
        let nextId = 1;
        if (lastReceipt) { nextId = parseInt(lastReceipt.receipt_number.split('-').pop()) + 1; }
        const receipt_number = `${prefix}${nextId.toString().padStart(4, '0')}`;

        const receiptResult = await client.query(
            `INSERT INTO receipts (receipt_number, customer_id, payment_date, payment_method, total_amount_paid, notes, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
            [receipt_number, customer_id, payment_date, payment_method, total_amount_paid, notes, 'pending_confirmation', created_by]
        );
        const receipt_id = receiptResult.rows[0].id;

        for (const bn_id of billing_note_ids) {
            await client.query('INSERT INTO receipt_billing_notes (receipt_id, billing_note_id) VALUES ($1, $2)', [receipt_id, bn_id]);
            await client.query(`UPDATE billing_notes SET status = 'collected' WHERE id = $1`, [bn_id]);
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true, message: 'Receipt created successfully!', data: { receipt_id } });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error creating receipt:", error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
});


// GET /:id - Get single receipt details
router.get('/:id', async (req, res) => {
    try {
        const receiptId = req.params.id;
        const detailsSql = `SELECT r.*, e.name as customer_name, e.address as customer_address, e.tax_id as customer_tax_id FROM receipts r LEFT JOIN entities e ON r.customer_id = e.id WHERE r.id = $1;`;
        const detailsResult = await db.query(detailsSql, [receiptId]);
        const details = detailsResult.rows[0];

        if (!details) return res.status(404).json({ success: false, error: 'Receipt not found' });

        const invoicesSql = `SELECT inv.invoice_number, inv.issue_date, inv.sub_total, inv.tax_amount, inv.grand_total FROM invoices inv JOIN billing_note_invoices bni ON inv.id = bni.invoice_id JOIN receipt_billing_notes rbn ON bni.billing_note_id = rbn.billing_note_id WHERE rbn.receipt_id = $1 ORDER BY inv.issue_date, inv.invoice_number;`;
        const invoicesResult = await db.query(invoicesSql, [receiptId]);

        res.json({ success: true, data: { details, invoices: invoicesResult.rows } });
    } catch (error) {
        console.error("GET /:id Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// POST /:id/confirm - Confirm a payment
router.post('/:id/confirm', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query("UPDATE receipts SET status = 'confirmed' WHERE id = $1 AND status = 'pending_confirmation'", [id]);
        if (result.rowCount === 0) return res.status(404).json({ success: false, error: "Receipt not found or already confirmed." });
        res.json({ success: true, message: "Receipt payment confirmed successfully." });
    } catch (error) {
        console.error("POST /:id/confirm Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});


module.exports = router;