// routes/invoices.js
const express = require('express');
const router = express.Router();
const db = require('../database.js');


// GET /api/invoices - Get a list of all invoices
router.get('/', async (req, res) => {
    try {
        const sql = `
            SELECT inv.id, inv.invoice_number, inv.issue_date,
                   inv.grand_total, inv.status, e.name as customer_name
            FROM invoices inv
            LEFT JOIN entities e ON inv.customer_id = e.id
            ORDER BY inv.id DESC`;
        const result = await db.query(sql);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// GET /next-invoice-number - Generate a new invoice number
router.get('/next-invoice-number', async (req, res) => {
    try {
        const date = new Date();
        const prefix = `IV-${date.getFullYear().toString().slice(-2)}${(date.getMonth() + 1).toString().padStart(2, '0')}-`;
        const result = await db.query(`SELECT invoice_number FROM invoices WHERE invoice_number LIKE $1 ORDER BY id DESC LIMIT 1`, [`${prefix}%`]);
        const lastInv = result.rows[0];
        let nextId = 1;
        if (lastInv) { nextId = parseInt(lastInv.invoice_number.split('-').pop()) + 1; }
        const next_invoice_number = `${prefix}${nextId.toString().padStart(4, '0')}`;
        res.json({ success: true, next_invoice_number });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// GET /items-for-customer/:customerId - Get all un-invoiced DOs for a customer
router.get('/items-for-customer/:customerId', async (req, res) => {
    const { customerId } = req.params;
    if (!customerId) {
        return res.status(400).json({ success: false, error: 'Customer ID is required' });
    }
    try {
        const sql = `
            SELECT
                d.id as do_id, d.do_number, d.shipping_date, i.item_code,
                i.item_name, soi.unit_price, doi.quantity_shipped, so.customer_po_number
            FROM delivery_orders d
            JOIN delivery_order_items doi ON d.id = doi.do_id
            JOIN sales_order_items soi ON doi.so_item_id = soi.id
            JOIN sales_orders so ON soi.so_id = so.id
            JOIN items i ON soi.item_code = i.item_code
            WHERE d.customer_id = $1 AND (d.status = 'shipped' OR d.status = 'pending')
            ORDER BY d.shipping_date, d.do_number, i.item_code;
        `;
        const result = await db.query(sql, [customerId]);
        const items = result.rows;

        const dos = items.reduce((acc, item) => {
            if (!acc[item.do_id]) {
                acc[item.do_id] = {
                    do_id: item.do_id,
                    do_number: item.do_number,
                    shipping_date: item.shipping_date,
                    customer_po_number: item.customer_po_number,
                    total_amount: 0,
                    items: []
                };
            }
            const item_total = item.quantity_shipped * item.unit_price;
            acc[item.do_id].items.push({
                item_code: item.item_code,
                item_name: item.item_name,
                quantity: item.quantity_shipped,
                unit_price: item.unit_price,
                total_price: item_total
            });
            acc[item.do_id].total_amount += item_total;
            return acc;
        }, {});

        res.json({ success: true, data: Object.values(dos) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// POST / - Create a new invoice
router.post('/', async (req, res) => {
    const { customer_id, invoice_number, issue_date, grand_total, items, delivery_order_ids } = req.body;
    // Handle session userId or default to 1 (admin) if missing
    const created_by = req.session?.userId || 1;

    if (!customer_id || !invoice_number || !issue_date || !grand_total || !items || !delivery_order_ids) {
        return res.status(400).json({ success: false, error: 'Incomplete data' });
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // Insert Invoice
        const invResult = await client.query(
            'INSERT INTO invoices (invoice_number, customer_id, issue_date, grand_total, status, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [invoice_number, customer_id, issue_date, grand_total, 'pending', created_by]
        );
        const invoice_id = invResult.rows[0].id;

        // Insert Invoice Items
        for (const item of items) {
            await client.query('INSERT INTO invoice_items (invoice_id, item_code, description, quantity, unit_price, total_price) VALUES ($1, $2, $3, $4, $5, $6)',
                [invoice_id, item.item_code, item.item_name, item.quantity, item.unit_price, item.total_price]
            );
        }

        // Link Invoice to Delivery Orders
        for (const do_id of delivery_order_ids) {
            await client.query('INSERT INTO invoice_delivery_orders (invoice_id, do_id) VALUES ($1, $2)', [invoice_id, do_id]);
            await client.query(`UPDATE delivery_orders SET status = 'invoiced' WHERE id = $1`, [do_id]);
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true, message: 'Invoice created successfully!', data: { invoice_id } });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error creating invoice:", error);
        // Log to file for debugging
        const fs = require('fs');
        const logMsg = `${new Date().toISOString()} - POST /api/invoices ERROR: ${error.message}\nStack: ${error.stack}\nBody: ${JSON.stringify(req.body)}\n\n`;
        try { fs.appendFileSync('debug_invoices_error.txt', logMsg); } catch (e) { console.error("Could not write to debug log", e); }

        res.status(500).json({ success: false, error: 'Internal Server Error', details: error.message });
    } finally {
        client.release();
    }
});


// GET /:id - Get details for a single invoice
router.get('/:id', async (req, res) => {
    try {
        const invoiceId = req.params.id;

        // 1. Get Invoice Details
        const detailsSql = `
            SELECT inv.*, c.name as customer_name, c.address as customer_address, c.tax_id as customer_tax_id,
                   c.branch_code, c.branch_name
            FROM invoices inv
            LEFT JOIN entities c ON inv.customer_id = c.id
            WHERE inv.id = $1`;

        const detailsResult = await db.query(detailsSql, [invoiceId]);
        const details = detailsResult.rows[0];

        if (!details) {
            return res.status(404).json({ success: false, error: 'Invoice not found' });
        }

        // 2. Get Invoice Items
        const itemsSql = `SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id ASC`;
        const itemsRes = await db.query(itemsSql, [invoiceId]);
        let items = itemsRes.rows;

        // 3. Get Linked DO Numbers
        const dosSql = `
            SELECT d.do_number 
            FROM invoice_delivery_orders ido 
            JOIN delivery_orders d ON ido.do_id = d.id 
            WHERE ido.invoice_id = $1`;

        const dosRes = await db.query(dosSql, [invoiceId]);
        const doNumbers = dosRes.rows.map(r => r.do_number);

        const ref_do_string = doNumbers.join(', ');

        // 4. Attach DO string to items (as per current schema design)
        items = items.map(item => ({
            ...item,
            ref_do_numbers: ref_do_string
        }));

        res.json({ success: true, data: { details, items } });
    } catch (error) {
        console.error("Error getting invoice details:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// GET /unbilled/:customerId - Get unbilled invoices for a customer
router.get('/unbilled/:customerId', async (req, res) => {
    try {
        const customerId = req.params.customerId;
        const sql = `
            SELECT inv.id, inv.invoice_number, inv.issue_date, inv.grand_total
            FROM invoices inv
            WHERE inv.customer_id = $1 AND inv.status = 'pending_issue'
            ORDER BY inv.issue_date`;
        const result = await db.query(sql, [customerId]);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;