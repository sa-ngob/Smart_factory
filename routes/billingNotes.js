const express = require('express');
const router = express.Router();
const db = require('../database.js');

// GET /api/billing-notes - Get a list of all billing notes
router.get('/', async (req, res) => {
    try {
        const sql = `
            SELECT
                bn.id, bn.bn_number, bn.issue_date, bn.due_date, 
                bn.payment_terms, bn.total_amount, bn.status, e.name as customer_name
            FROM billing_notes bn
            LEFT JOIN entities e ON bn.customer_id = e.id
            ORDER BY bn.id DESC
        `;
        const result = await db.query(sql, []);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error("GET /api/billing-notes Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// GET /next-bn-number - Generate the next billing note number
router.get('/next-bn-number', async (req, res) => {
    try {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const prefix = `BL-${year}${month}-`;

        const result = await db.query(`SELECT bn_number FROM billing_notes WHERE bn_number LIKE $1 ORDER BY id DESC LIMIT 1`, [`${prefix}%`]);
        const lastBN = result.rows[0];

        let nextId = 1;
        if (lastBN) {
            nextId = parseInt(lastBN.bn_number.split('-').pop()) + 1;
        }
        const next_bn_number = `${prefix}${nextId.toString().padStart(4, '0')}`;
        res.json({ success: true, next_bn_number });
    } catch (error) {
        console.error("GET /next-bn-number Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// POST / - Create a new billing note
router.post('/', async (req, res) => {
    const { customer_id, bn_number, issue_date, due_date, payment_terms, total_amount, invoice_ids, remark } = req.body;
    const created_by = req.session && req.session.userId ? req.session.userId : 1;

    if (!customer_id || !bn_number || !issue_date || !due_date || !invoice_ids || invoice_ids.length === 0) {
        return res.status(400).json({ success: false, error: 'Incomplete data: Please fill out all required fields.' });
    }

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const bnResult = await client.query(
            'INSERT INTO billing_notes (bn_number, customer_id, issue_date, due_date, payment_terms, total_amount, remark, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
            [bn_number, customer_id, issue_date, due_date, payment_terms, total_amount, remark, 'billed', created_by]
        );
        const billing_note_id = bnResult.rows[0].id;

        for (const invoice_id of invoice_ids) {
            await client.query('INSERT INTO billing_note_invoices (billing_note_id, invoice_id) VALUES ($1, $2)', [billing_note_id, invoice_id]);
            await client.query(`UPDATE invoices SET status = 'issued' WHERE id = $1`, [invoice_id]);
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true, message: 'Billing note created successfully!', data: { billing_note_id } });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("POST /api/billing-notes Error:", error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
});


// GET /:id - Get details for a single billing note
router.get('/:id', async (req, res) => {
    try {
        const bnId = req.params.id;
        const detailsSql = `
            SELECT
                bn.*,
                c.name as customer_name, c.address as customer_address, c.tax_id as customer_tax_id
            FROM billing_notes bn
            LEFT JOIN entities c ON bn.customer_id = c.id
            WHERE bn.id = $1
        `;
        const detailsResult = await db.query(detailsSql, [bnId]);
        const details = detailsResult.rows[0];

        if (!details) {
            return res.status(404).json({ success: false, error: 'Billing Note not found' });
        }
        const invoicesSql = `
            SELECT
                inv.invoice_number, inv.issue_date, inv.sub_total,
                inv.tax_amount, inv.grand_total, inv.id
            FROM invoices inv
            JOIN billing_note_invoices bni ON inv.id = bni.invoice_id
            WHERE bni.billing_note_id = $1
            ORDER BY inv.issue_date, inv.invoice_number
        `;
        const invoicesResult = await db.query(invoicesSql, [bnId]);
        const invoices = invoicesResult.rows;

        res.json({ success: true, data: { details, invoices } });
    } catch (error) {
        console.error("GET /:id Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// GET /unpaid/:customerId - Get unpaid billing notes for a customer
router.get('/unpaid/:customerId', async (req, res) => {
    try {
        const customerId = req.params.customerId;
        const sql = `
            SELECT id, bn_number, issue_date, due_date, total_amount
            FROM billing_notes
            WHERE customer_id = $1 AND status = 'billed'
            ORDER BY issue_date
        `;
        const result = await db.query(sql, [customerId]);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error("GET /unpaid/:customerId Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});


module.exports = router;