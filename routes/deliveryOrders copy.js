const express = require('express');
const router = express.Router();
const db = require('../database'); // ตรวจสอบให้แน่ใจว่า path ไปยังไฟล์ database.js ของคุณถูกต้อง

// Helper function to run database operations with promises
const run = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
    });
});

const get = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
    });
});

const all = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
    });
});


// GET /api/delivery-orders - Get all delivery orders
router.get('/', async (req, res) => {
    try {
        const sql = `
            SELECT 
                do.id, 
                do.do_number, 
                do.shipping_date, 
                do.status, 
                so.so_number, 
                c.name as customer_name
            FROM delivery_orders do
            JOIN sales_orders so ON do.so_id = so.id
            JOIN entities c ON do.customer_id = c.id
            ORDER BY do.id DESC
        `;
        const rows = await all(sql);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/delivery-orders - Create a new delivery order
router.post('/', async (req, res) => {
    const { so_id, shipping_date, shipping_address, items } = req.body;

    if (!so_id || !shipping_date || !items || items.length === 0) {
        return res.status(400).json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' });
    }

    try {
        await run('BEGIN TRANSACTION');

        const so = await get('SELECT customer_id FROM sales_orders WHERE id = ?', [so_id]);
        if (!so) throw new Error('ไม่พบ Sales Order');
        
        // Generate DO Number (e.g., DO-YYYYMM-XXXX)
        const date = new Date();
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const lastDO = await get(`SELECT do_number FROM delivery_orders WHERE do_number LIKE ? ORDER BY id DESC LIMIT 1`, [`DO-${year}${month}-%`]);
        let nextId = 1;
        if (lastDO) {
            nextId = parseInt(lastDO.do_number.split('-').pop()) + 1;
        }
        const do_number = `DO-${year}${month}-${nextId.toString().padStart(4, '0')}`;

        // 1. Insert into delivery_orders
        const doResult = await run(
            'INSERT INTO delivery_orders (do_number, so_id, customer_id, shipping_date, shipping_address, created_by) VALUES (?, ?, ?, ?, ?, ?)',
            [do_number, so_id, so.customer_id, shipping_date, shipping_address, req.session.user.id]
        );
        const do_id = doResult.id;

        // 2. Insert into delivery_order_items, update inventory
        for (const item of items) {
            await run(
                'INSERT INTO delivery_order_items (do_id, so_item_id, item_code, quantity_shipped) VALUES (?, ?, ?, ?)',
                [do_id, item.so_item_id, item.item_code, item.quantity_shipped]
            );

            // 3. Update stock quantity in 'items' table
            await run('UPDATE items SET stock_quantity = stock_quantity - ? WHERE item_code = ?', [item.quantity_shipped, item.item_code]);
            
            // 4. Record in inventory_transactions
            const currentStock = await get('SELECT stock_quantity FROM items WHERE item_code = ?', [item.item_code]);
            await run(
                'INSERT INTO inventory_transactions (item_code, transaction_type, quantity_change, new_quantity, reference_type, reference_id) VALUES (?, ?, ?, ?, ?, ?)',
                [item.item_code, 'dispatch', -item.quantity_shipped, currentStock.stock_quantity, 'delivery_order', do_id]
            );
        }
        
        // 5. Update SO status (Simplified logic)
        // A more complex logic would check if all items are fully shipped
        await run(`UPDATE sales_orders SET status = ? WHERE id = ?`, ['partially_shipped', so_id]);

        await run('COMMIT');
        res.status(201).json({ success: true, message: 'สร้างใบส่งของสำเร็จ!', data: { do_id, do_number } });

    } catch (error) {
        await run('ROLLBACK');
        res.status(500).json({ success: false, error: error.message });
    }
});
// GET /api/delivery-orders/:id - ดึงข้อมูล DO ใบเดียวแบบละเอียด
router.get('/:id', async (req, res) => {
    try {
        const doId = req.params.id;

        // ดึงข้อมูลหลักของ DO และข้อมูลที่เชื่อมโยงกัน
        const detailsSql = `
            SELECT
                do.*,
                so.so_number,
                so.customer_po_number,
                c.name as customer_name,
                c.address as customer_address,
                c.phone as customer_phone,
                c.tax_id as customer_tax_id,
                u.fullName as created_by_name
            FROM delivery_orders do
            LEFT JOIN sales_orders so ON do.so_id = so.id
            LEFT JOIN entities c ON do.customer_id = c.id
            LEFT JOIN users u ON do.created_by = u.id
            WHERE do.id = ?
        `;
        const details = await get(detailsSql, [doId]);

        if (!details) {
            return res.status(404).json({ success: false, error: 'Delivery Order not found' });
        }

        // ดึงรายการสินค้าใน DO นั้นๆ
        const itemsSql = `
            SELECT 
                doi.quantity_shipped,
                i.item_code,
                i.item_name,
                i.uom
            FROM delivery_order_items doi
            JOIN items i ON doi.item_code = i.item_code
            WHERE doi.do_id = ?
        `;
        const items = await all(itemsSql, [doId]);

        res.json({ success: true, data: { details, items } });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});



module.exports = router;