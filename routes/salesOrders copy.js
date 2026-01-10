// routes/salesOrders.js
const express = require('express');
const router = express.Router();
const db = require('../database.js');

// GET: ดึงเลขที่ใบสั่งขายถัดไป
router.get('/next-so-number', (req, res) => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const prefix = `SO-${year}${month}-`;
    const sql = `SELECT so_number FROM sales_orders WHERE so_number LIKE ? ORDER BY so_number DESC LIMIT 1`;

    db.get(sql, [`${prefix}%`], (err, row) => {
        if (err) {
            return res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงเลขที่ SO" });
        }
        let nextSequence = 1;
        if (row) {
            const lastSequence = parseInt(row.so_number.replace(prefix, ''), 10);
            nextSequence = lastSequence + 1;
        }
        const nextSoNumber = `${prefix}${String(nextSequence).padStart(4, '0')}`;
        res.json({ next_so_number: nextSoNumber });
    });
});

// GET: ดึงข้อมูลใบสั่งขายทั้งหมด
router.get('/', (req, res) => {
    const sql = `
        SELECT 
            so.id, 
            so.so_number, 
            so.customer_po_number, 
            e.name as customer_name, 
            so.order_date, 
            so.due_date, 
            so.status, 
            so.total_amount,
            (
                SELECT GROUP_CONCAT(i.item_name, ', ') 
                FROM sales_order_items soi
                JOIN items i ON soi.item_code = i.item_code
                WHERE soi.so_id = so.id
            ) as item_names
        FROM sales_orders so
        JOIN entities e ON so.customer_id = e.id
        ORDER BY so.id DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Error fetching sales orders:", err.message);
            return res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลใบสั่งขาย" });
        }
        res.json({ data: rows });
    });
});

// GET /api/sales-orders/:id - ดึงข้อมูล SO เดียวแบบละเอียด
router.get('/:id', (req, res) => {
    const soId = req.params.id;
    const responseData = {};

    const soSql = `
        SELECT 
            so.*, 
            e.name as customer_name,
            e.address as customer_address,
            e.phone as customer_phone,
            e.email as customer_email,
            u.fullName as created_by_name
        FROM sales_orders so
        JOIN entities e ON so.customer_id = e.id
        LEFT JOIN users u ON so.created_by = u.id
        WHERE so.id = ?
    `;

    db.get(soSql, [soId], (err, soRow) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!soRow) {
            return res.status(404).json({ error: "Sales Order not found" });
        }
        responseData.details = soRow;

        const itemsSql = `
            SELECT 
                soi.*,
                i.item_name
            FROM sales_order_items soi
            JOIN items i ON soi.item_code = i.item_code
            WHERE soi.so_id = ?
        `;

        db.all(itemsSql, [soId], (err, itemRows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            responseData.items = itemRows;
            res.json({ data: responseData });
        });
    });
});


// POST: สร้างใบสั่งขายใหม่
router.post('/', (req, res) => {
    const { so_number, customer_po_number, customer_id, order_date, due_date, total_amount, items } = req.body;
    const created_by_user_id = req.session.user ? req.session.user.id : 1;

    if (!so_number || !customer_id || !order_date || !due_date || !items || items.length === 0) {
        return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
    }

    db.serialize(() => {
        db.run("BEGIN TRANSACTION;");
        const soSql = `INSERT INTO sales_orders (so_number, customer_po_number, customer_id, order_date, due_date, total_amount, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        const soParams = [so_number, customer_po_number, customer_id, order_date, due_date, total_amount, 'draft', created_by_user_id];
        db.run(soSql, soParams, function(err) {
            if (err) {
                db.run("ROLLBACK;");
                return res.status(400).json({ error: `ไม่สามารถสร้างใบสั่งขายได้: ${err.message}` });
            }
            const so_id = this.lastID;
            const itemSql = `INSERT INTO sales_order_items (so_id, item_code, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)`;
            const stmt = db.prepare(itemSql);
            let itemsError = null;
            items.forEach(item => {
                if (itemsError) return;
                stmt.run(so_id, item.item_code, item.quantity, item.unit_price, item.total_price, (err) => {
                    if (err) itemsError = err;
                });
            });
            stmt.finalize((err) => {
                if (err) {
                    db.run("ROLLBACK;");
                    return res.status(400).json({ error: `ไม่สามารถบันทึกรายการสินค้าได้: ${err.message}` });
                }
                db.run("COMMIT;");
                res.status(201).json({ message: 'สร้างใบสั่งขายสำเร็จ!', so_id: so_id });
            });
        });
    });
});

// +++ API ใหม่ที่เพิ่มเข้ามา +++
// PUT /api/sales-orders/:id - อัปเดตข้อมูล SO
router.put('/:id', (req, res) => {
    const soId = req.params.id;
    const { customer_po_number, customer_id, order_date, due_date, total_amount, items, status } = req.body;

    if (!customer_id || !order_date || !due_date || !items || items.length === 0) {
        return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
    }

    db.serialize(() => {
        db.run("BEGIN TRANSACTION;");

        // 1. อัปเดตข้อมูลหลักในตาราง sales_orders
        const updateSoSql = `
            UPDATE sales_orders 
            SET customer_po_number = ?, customer_id = ?, order_date = ?, due_date = ?, total_amount = ?, status = ?
            WHERE id = ?
        `;
        const soParams = [customer_po_number, customer_id, order_date, due_date, total_amount, status, soId];
        
        db.run(updateSoSql, soParams, function(err) {
            if (err) {
                db.run("ROLLBACK;");
                return res.status(400).json({ error: `ไม่สามารถอัปเดตใบสั่งขายได้: ${err.message}` });
            }

            // 2. ลบรายการสินค้าเก่าทั้งหมดของ SO นี้
            const deleteItemsSql = 'DELETE FROM sales_order_items WHERE so_id = ?';
            db.run(deleteItemsSql, [soId], function(err) {
                if (err) {
                    db.run("ROLLBACK;");
                    return res.status(400).json({ error: `ไม่สามารถลบรายการสินค้าเก่าได้: ${err.message}` });
                }

                // 3. เพิ่มรายการสินค้าใหม่ทั้งหมดเข้าไป
                const insertItemSql = `INSERT INTO sales_order_items (so_id, item_code, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)`;
                const stmt = db.prepare(insertItemSql);
                let itemsError = null;

                items.forEach(item => {
                    if (itemsError) return;
                    stmt.run(soId, item.item_code, item.quantity, item.unit_price, item.total_price, (err) => {
                        if (err) itemsError = err;
                    });
                });

                stmt.finalize((err) => {
                    if (err) {
                        db.run("ROLLBACK;");
                        return res.status(400).json({ error: `ไม่สามารถบันทึกรายการสินค้าใหม่ได้: ${err.message}` });
                    }

                    // 4. ถ้าทุกอย่างสำเร็จ ให้ Commit
                    db.run("COMMIT;");
                    res.status(200).json({ message: 'อัปเดตใบสั่งขายสำเร็จ!', so_id: soId });
                });
            });
        });
    });
});
// GET /for-delivery - ดึงข้อมูล SO ที่พร้อมสำหรับสร้างใบส่งของ
router.get('/for-delivery', async (req, res) => {
    try {
        // คำสั่ง SQL นี้จะดึงข้อมูล SO ที่มีสถานะเหมาะสม (ยังไม่เสร็จสิ้นสมบูรณ์)
        // และยังไม่ได้ถูกยกเลิก เพื่อนำไปแสดงใน dropdown
        const sql = `
            SELECT
                so.id,
                so.so_number,
                so.customer_po_number,
                e.name as customer_name,
                e.address as customer_address
            FROM sales_orders so
            JOIN entities e ON so.customer_id = e.id
            WHERE so.status IN ('confirmed', 'in_production', 'partially_shipped')
            ORDER BY so.id DESC
        `;

        db.all(sql, [], (err, rows) => {
            if (err) {
                res.status(500).json({ success: false, error: err.message });
                return;
            }
            res.json({ success: true, data: rows });
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// เพิ่ม API เพื่อดึงรายการสินค้าที่เหลือสำหรับจัดส่ง
// GET /:id/delivery-items
router.get('/:id/delivery-items', async (req, res) => {
    const { id } = req.params;
    try {
        // ดึงรายการสินค้าทั้งหมดใน SO
        const soItemsSql = `
            SELECT 
                soi.id as sales_order_item_id,
                soi.item_code,
                i.item_name,
                soi.quantity as quantity_ordered
            FROM sales_order_items soi
            JOIN items i ON soi.item_code = i.item_code
            WHERE soi.so_id = ?
        `;
        const soItems = await new Promise((resolve, reject) => {
            db.all(soItemsSql, [id], (err, rows) => err ? reject(err) : resolve(rows));
        });

        // ดึงจำนวนที่เคยส่งไปแล้วทั้งหมดสำหรับ SO นี้
        const shippedItemsSql = `
            SELECT 
                doi.item_code, 
                SUM(doi.quantity_shipped) as total_shipped
            FROM delivery_order_items doi
            JOIN delivery_orders do ON doi.do_id = do.id
            WHERE do.so_id = ?
            GROUP BY doi.item_code
        `;
        const shippedItems = await new Promise((resolve, reject) => {
            db.all(shippedItemsSql, [id], (err, rows) => err ? reject(err) : resolve(rows));
        });
        
        const shippedMap = shippedItems.reduce((acc, item) => {
            acc[item.item_code] = item.total_shipped;
            return acc;
        }, {});

        // คำนวณจำนวนคงเหลือ
        const resultItems = soItems.map(item => ({
            ...item,
            quantity_shipped: shippedMap[item.item_code] || 0
        })).filter(item => item.quantity_ordered > item.quantity_shipped);


        res.json({ success: true, data: resultItems });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
