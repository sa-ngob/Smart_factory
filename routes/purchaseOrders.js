const express = require('express');
const router = express.Router();
const db = require('../database.js');
const fs = require('fs');

// Helper to log errors
const logError = (msg, err) => {
    const log = `[${new Date().toISOString()}] ${msg}: ${err.message}\n${err.stack}\n\n`;
    try { fs.appendFileSync('debug_po_error.txt', log); } catch (e) { console.error("Log failed", e); }
    console.error(msg, err);
};

// GET /api/purchase-orders - Get a list of all purchase orders
router.get('/', async (req, res) => {
    try {
        const sql = `
            SELECT
                po.id,
                po.po_number,
                po.order_date,
                po.total_amount,
                po.status,
                e.name as vendor_name
            FROM purchase_orders po
            LEFT JOIN entities e ON po.vendor_id = e.id
            ORDER BY po.id DESC;
        `;
        // Pass empty array for params to be safe
        const result = await db.query(sql, []);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        logError("GET /api/purchase-orders Error", error);
        res.status(500).json({ success: false, error: 'Failed to fetch purchase orders. ' + error.message });
    }
});

router.post('/', async (req, res) => {
    const { vendor_id, po_number, order_date, total_amount, quotation_ref, items } = req.body;
    // Safe session check
    const created_by = req.session && req.session.userId ? req.session.userId : 1;

    if (!vendor_id || !po_number || !order_date || !items || items.length === 0) {
        return res.status(400).json({ success: false, error: 'Incomplete data submitted.' });
    }

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // Insert PO
        const insertPoSql = `INSERT INTO purchase_orders (po_number, vendor_id, order_date, total_amount, quotation_ref, created_by, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`;
        const poResult = await client.query(insertPoSql, [po_number, vendor_id, order_date, total_amount, quotation_ref, created_by, 'pending']);
        const po_id = poResult.rows[0].id;

        for (const item of items) {
            let item_code = item.item_code;
            let item_name = item.item_name || 'Item'; // Fallback

            // Handle New Item creation if flagged
            if (item.is_new) {
                const newCodePrefix = 'MAT-';
                // Use client.query for transaction safety
                const lastItemResult = await client.query(`SELECT item_code FROM items WHERE item_code LIKE $1 ORDER BY id DESC LIMIT 1`, [`${newCodePrefix}%`]);

                let nextItemId = 1;
                if (lastItemResult.rows.length > 0) {
                    const lastCode = lastItemResult.rows[0].item_code;
                    // Extract number part safely
                    const numPart = lastCode.replace(newCodePrefix, '');
                    const parsed = parseInt(numPart, 10);
                    if (!isNaN(parsed)) nextItemId = parsed + 1;
                }
                item_code = `${newCodePrefix}${nextItemId.toString().padStart(4, '0')}`;

                await client.query(
                    `INSERT INTO items (item_code, item_name, item_type, uom) VALUES ($1, $2, $3, $4)`,
                    [item_code, item_name, 'raw_material', 'unit']
                );
            }

            await client.query(
                `INSERT INTO purchase_order_items (po_id, item_code, item_name, quantity, unit_price, total_price) VALUES ($1, $2, $3, $4, $5, $6)`,
                [po_id, item_code, item_name, item.quantity, item.unit_price, item.total_price]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true, id: po_id, message: "Purchase Order created successfully!" });
    } catch (error) {
        await client.query('ROLLBACK');
        logError("POST /api/purchase-orders Error", error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
});

// GET /next-po-number - Get the next available PO number
router.get('/next-po-number', async (req, res) => {
    try {
        const sql = `SELECT po_number FROM purchase_orders ORDER BY id DESC LIMIT 1`;
        const result = await db.query(sql, []);

        let nextPoNumber = 'PO-0001';

        if (result.rows.length > 0) {
            const lastPoNumber = result.rows[0].po_number;
            const match = lastPoNumber.match(/PO-(\d+)/);
            if (match) {
                const number = parseInt(match[1], 10) + 1;
                nextPoNumber = `PO-${number.toString().padStart(4, '0')}`;
            } else {
                // Heuristic fallback
                const numMatch = lastPoNumber.match(/(\d+)$/);
                if (numMatch) {
                    const number = parseInt(numMatch[1], 10) + 1;
                    const prefix = lastPoNumber.slice(0, lastPoNumber.lastIndexOf(numMatch[1]));
                    nextPoNumber = `${prefix}${number.toString().padStart(numMatch[1].length, '0')}`;
                }
            }
        }

        res.json({ success: true, po_number: nextPoNumber });
    } catch (error) {
        logError("GET /next-po-number Error", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /:id - Get details for a single PO
router.get('/:id', async (req, res) => {
    try {
        const poId = req.params.id;

        const poSql = `
            SELECT 
                po.id, po.po_number, po.order_date, po.status, po.total_amount, po.quotation_ref, po.expect_delivery_date as expected_date,
                e.name as vendor_name, e.address as vendor_address, e.tax_id as vendor_tax_id,
                e.phone as vendor_phone, e.contact_person as vendor_contact
            FROM purchase_orders po
            LEFT JOIN entities e ON po.vendor_id = e.id
            WHERE po.id = $1
        `;
        const poResult = await db.query(poSql, [poId]);
        const po = poResult.rows[0];

        if (!po) {
            return res.status(404).json({ success: false, error: 'Purchase Order not found' });
        }

        const itemsSql = `
            SELECT id, item_code, item_name, quantity, unit_price, total_price 
            FROM purchase_order_items 
            WHERE po_id = $1
            ORDER BY id ASC
        `;
        const itemsResult = await db.query(itemsSql, [poId]);

        res.json({ success: true, po: po, items: itemsResult.rows });

    } catch (error) {
        logError(`GET /:id (${req.params.id}) Error`, error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /:id/status - Update PO Status
router.put('/:id/status', async (req, res) => {
    try {
        const poId = req.params.id;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ success: false, error: 'Status is required' });
        }

        const sql = `UPDATE purchase_orders SET status = $1 WHERE id = $2`;
        await db.query(sql, [status, poId]);

        res.json({ success: true, message: 'Status updated successfully' });
    } catch (error) {
        logError(`PUT /:id/status (${req.params.id}) Error`, error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;