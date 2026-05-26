// routes/deliveryOrders.js
const express = require('express');
const router = express.Router();
const db = require('../database.js');

// GET /api/delivery-orders - Get all delivery orders
router.get('/', async (req, res) => {
    console.log('GET / (list) called');
    try {
        const sql = `
            SELECT
                d.id,
                d.do_number,
                d.shipping_date,
                d.status,
                c.name as customer_name,
                (
                    SELECT so.so_number
                    FROM sales_orders so
                    JOIN sales_order_items soi ON so.id = soi.so_id
                    JOIN delivery_order_items doi ON soi.id = doi.so_item_id
                    WHERE doi.do_id = d.id
                    LIMIT 1
                ) as so_number
            FROM delivery_orders d
            LEFT JOIN entities c ON d.customer_id = c.id
            ORDER BY d.id DESC
        `;
        const result = await db.query(sql);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/delivery-orders - Create a new delivery order
router.post('/', async (req, res) => {
    const { so_id, customer_id, shipping_date, items } = req.body;

    if (!customer_id || !shipping_date || !items || !items.length) {
        return res.status(400).json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' });
    }

    // Check User Session
    const created_by = req.session && req.session.userId ? req.session.userId : 1;

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const date = new Date();
        const prefix = `DO-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}-`;

        const lastDO = await client.query(`SELECT do_number FROM delivery_orders WHERE do_number LIKE $1 ORDER BY id DESC LIMIT 1`, [`${prefix}%`]);

        let nextId = 1;
        if (lastDO.rows.length > 0) {
            nextId = parseInt(lastDO.rows[0].do_number.split('-').pop()) + 1;
        }
        const do_number = `${prefix}${nextId.toString().padStart(4, '0')}`;

        const insertSql = 'INSERT INTO delivery_orders (do_number, so_id, customer_id, shipping_date, status) VALUES ($1, $2, $3, $4, $5) RETURNING id';
        const doResult = await client.query(insertSql, [do_number, so_id, customer_id, shipping_date, 'pending']);
        const do_id = doResult.rows[0].id;

        for (const item of items) {
            await client.query('INSERT INTO delivery_order_items (do_id, so_item_id, quantity_shipped) VALUES ($1, $2, $3)', [do_id, item.so_item_id, item.quantity_shipped]);
            await client.query('UPDATE items SET stock_quantity = stock_quantity - $1 WHERE item_code = $2', [item.quantity_shipped, item.item_code]);
            const currentStockRes = await client.query('SELECT stock_quantity FROM items WHERE item_code = $1', [item.item_code]);
            const currentStock = currentStockRes.rows[0];

            await client.query('INSERT INTO inventory_transactions (item_code, transaction_type, quantity_change, new_quantity, reference_type, reference_id) VALUES ($1, $2, $3, $4, $5, $6)', [item.item_code, 'dispatch', -item.quantity_shipped, currentStock.stock_quantity, 'delivery_order', do_id]);
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true, message: 'สร้างใบส่งของสำเร็จ!', data: { do_id, do_number } });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error creating DO:", error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
});

// GET /api/delivery-orders/:id - Get DO details
router.get('/:id', async (req, res) => {
    try {
        const doId = req.params.id;
        const responseData = {};

        const detailsSql = `
            SELECT
                d.id, d.do_number, d.so_id, d.customer_id, d.shipping_date, d.status,
                d.created_at, d.updated_at,
                c.name as customer_name, c.address as customer_address,
                c.phone as customer_phone, c.tax_id as customer_tax_id
            FROM delivery_orders d
            LEFT JOIN entities c ON d.customer_id = c.id
            WHERE d.id = $1
        `;

        const detailsResult = await db.query(detailsSql, [doId]);
        const details = detailsResult.rows[0];

        if (!details) {
            return res.status(404).json({ error: 'Delivery Order not found' });
        }

        responseData.details = details;

        const itemsSql = `
            SELECT
                doi.id, doi.quantity_shipped, i.item_code, i.item_name, i.uom,
                so.so_number, so.customer_po_number,
                soi.unit_price
            FROM delivery_order_items doi
            JOIN sales_order_items soi ON doi.so_item_id = soi.id
            JOIN items i ON soi.item_code = i.item_code
            JOIN sales_orders so ON soi.so_id = so.id
            WHERE doi.do_id = $1
        `;
        const itemsResult = await db.query(itemsSql, [doId]);
        responseData.items = itemsResult.rows;

        res.json({ data: responseData });
    } catch (error) {
        console.error("Error at GET /api/delivery-orders/:id :", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;