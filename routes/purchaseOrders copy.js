const express = require('express');
const router = express.Router();
const db = require('../database.js');

const run = (sql, params = []) => new Promise((resolve, reject) => { db.run(sql, params, function (err) { if (err) reject(err); else resolve({ id: this.lastID, changes: this.changes }); }); });
const get = (sql, params = []) => new Promise((resolve, reject) => { db.get(sql, params, (err, row) => { if (err) reject(err); else resolve(row); }); });
const all = (sql, params = []) => new Promise((resolve, reject) => { db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows); }); });

// GET next PO number
router.get('/next-po-number', async (req, res) => {
    try {
        const date = new Date();
        const prefix = `PO-${date.getFullYear().toString().slice(-2)}${(date.getMonth() + 1).toString().padStart(2, '0')}-`;
        const lastPO = await get(`SELECT po_number FROM purchase_orders WHERE po_number LIKE ? ORDER BY id DESC LIMIT 1`, [`${prefix}%`]);
        let nextId = 1;
        if (lastPO) { nextId = parseInt(lastPO.po_number.split('-').pop()) + 1; }
        const po_number = `${prefix}${nextId.toString().padStart(4, '0')}`;
        res.json({ success: true, po_number });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// POST a new Purchase Order
router.post('/', async (req, res) => {
    const { vendor_id, po_number, order_date, total_amount, quotation_ref, items } = req.body;
    const created_by = req.session.userId;

    if (!vendor_id || !po_number || !order_date || !items || items.length === 0) {
        return res.status(400).json({ success: false, error: 'Incomplete data submitted.' });
    }

    try {
        await run('BEGIN TRANSACTION');

        const poResult = await run(
            `INSERT INTO purchase_orders (po_number, vendor_id, order_date, total_amount, quotation_ref, created_by, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [po_number, vendor_id, order_date, total_amount, quotation_ref, created_by, 'pending']
        );
        const po_id = poResult.id;

        for (const item of items) {
            let item_code = item.item_code;
            
            if (item.is_new) {
                const newCodePrefix = 'MAT-';
                const lastItem = await get(`SELECT item_code FROM items WHERE item_code LIKE ? ORDER BY id DESC LIMIT 1`, [`${newCodePrefix}%`]);
                let nextItemId = 1;
                if(lastItem) { nextItemId = parseInt(lastItem.item_code.replace(newCodePrefix, '')) + 1; }
                item_code = `${newCodePrefix}${nextItemId.toString().padStart(4, '0')}`;
                
                await run(
                    `INSERT INTO items (item_code, item_name, item_type, uom) VALUES (?, ?, ?, ?)`,
                    [item_code, item.item_name, 'raw_material', 'unit']
                );
            }
            
            // ✨ FIX: Changed column name from 'description' to 'item_name' to match your database table.
            await run(
                `INSERT INTO purchase_order_items (po_id, item_code, item_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)`,
                [po_id, item_code, item.item_name, item.quantity, item.unit_price]
            );
        }
        
        await run('COMMIT');
        res.status(201).json({ success: true, id: po_id, message: "Purchase Order created successfully!" });
    } catch (error) {
        await run('ROLLBACK');
        console.error("Error creating PO:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;