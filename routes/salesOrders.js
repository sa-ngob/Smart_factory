// routes/salesOrders.js
const express = require('express');
const router = express.Router();
const { pool, ...db } = require('../database.js');

// GET: ดึงเลขที่ใบสั่งขายถัดไป
router.get('/next-so-number', async (req, res) => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const prefix = `SO-${year}${month}-`;
    const sql = `SELECT so_number FROM sales_orders WHERE so_number LIKE $1 ORDER BY so_number DESC LIMIT 1`;

    try {
        const row = await db.getAsync(sql, [`${prefix}%`]);
        let nextSequence = 1;
        if (row) {
            const lastSequence = parseInt(row.so_number.replace(prefix, ''), 10);
            nextSequence = lastSequence + 1;
        }
        const nextSoNumber = `${prefix}${String(nextSequence).padStart(4, '0')}`;
        res.json({ next_so_number: nextSoNumber });
    } catch (err) {
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงเลขที่ SO" });
    }
});

// Helper function for date conditions
const getDateCondition = (period, dateColumn) => {
    let startDate;
    const now = new Date();
    if (period === 'daily') startDate = new Date(now.setHours(0, 0, 0, 0));
    else if (period === 'monthly') startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (period === 'yearly') startDate = new Date(now.getFullYear(), 0, 1);
    return startDate ? ` AND ${dateColumn} >= '${startDate.toISOString()}'` : '';
};

// GET: ดึงข้อมูลใบสั่งขายทั้งหมด
router.get('/', async (req, res) => {
    const { period } = req.query;
    let sql = `
        SELECT
            so.id, so.so_number, so.customer_po_number, e.name as customer_name,
            so.order_date, so.due_date, so.status, so.total_amount,
            (SELECT STRING_AGG(i.item_name, ', ')
             FROM sales_order_items soi JOIN items i ON soi.item_code = i.item_code
             WHERE soi.so_id = so.id) as item_names
        FROM sales_orders so
        JOIN entities e ON so.customer_id = e.id
        WHERE 1=1
    `;
    sql += getDateCondition(period, 'so.order_date');
    sql += ' ORDER BY so.id DESC';

    try {
        const rows = await db.allAsync(sql);
        res.json({ data: rows });
    } catch (err) {
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลใบสั่งขาย" });
    }
});

// GET /for-delivery - ดึงข้อมูล SO ที่พร้อมสำหรับสร้างใบส่งของ (ฉบับแก้ไข)
router.get('/for-delivery', async (req, res) => {
    const sql = `
        SELECT so.id, so.so_number, so.customer_po_number, e.name as customer_name, e.address as customer_address, so.customer_id
        FROM sales_orders so
        JOIN entities e ON so.customer_id = e.id
        WHERE so.status IN ('confirmed', 'in_production', 'partially_shipped')
        ORDER BY so.id DESC
    `;
    try {
        const rows = await db.allAsync(sql);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /:id/delivery-items - ดึงรายการสินค้าที่เหลือสำหรับจัดส่ง
router.get('/:id/delivery-items', async (req, res) => {
    const soId = req.params.id;
    const sql = `
        SELECT
            soi.id as sales_order_item_id,
            soi.item_code,
            i.item_name,
            soi.quantity as quantity_ordered,
            COALESCE((
                SELECT SUM(doi.quantity_shipped)
                FROM delivery_order_items doi
                WHERE doi.so_item_id = soi.id
            ), 0) as quantity_shipped
        FROM sales_order_items soi
        JOIN items i ON soi.item_code = i.item_code
        WHERE soi.so_id = $1
    `;
    try {
        const items = await db.allAsync(sql, [soId]);
        const resultItems = items.filter(item => item.quantity_ordered > item.quantity_shipped);
        res.json({ success: true, data: resultItems });
    } catch (err) {
        console.error(`DB Error (delivery-items) for SO ID ${soId}:`, err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /:id - ดึงข้อมูล SO เดียวแบบละเอียด
router.get('/:id', async (req, res) => {
    const soId = req.params.id;
    const soSql = `
        SELECT so.*, e.name as customer_name, e.address as customer_address, e.phone as customer_phone,
               e.email as customer_email, u.full_name as created_by_name
        FROM sales_orders so
        JOIN entities e ON so.customer_id = e.id
        LEFT JOIN users u ON so.created_by = u.id
        WHERE so.id = $1
    `;
    try {
        const soRow = await db.getAsync(soSql, [soId]);
        if (!soRow) return res.status(404).json({ error: "Sales Order not found" });

        const itemsSql = `
            SELECT soi.*, i.item_name
            FROM sales_order_items soi
            JOIN items i ON soi.item_code = i.item_code
            WHERE soi.so_id = $1
        `;
        const itemRows = await db.allAsync(itemsSql, [soId]);
        res.json({ data: { details: soRow, items: itemRows } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST: สร้างใบสั่งขายใหม่
router.post('/', async (req, res) => {
    const { so_number, customer_po_number, customer_id, order_date, due_date, total_amount, items } = req.body;
    const created_by_user_id = req.session.user ? req.session.user.id : 1;

    if (!so_number || !customer_id || !order_date || !due_date || !items || items.length === 0) {
        return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const soSql = `INSERT INTO sales_orders (so_number, customer_po_number, customer_id, order_date, due_date, total_amount, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`;
        const soResult = await client.query(soSql, [so_number, customer_po_number, customer_id, order_date, due_date, total_amount, 'draft', created_by_user_id]);
        const so_id = soResult.rows[0].id;

        const itemSql = `INSERT INTO sales_order_items (so_id, item_code, quantity, unit_price, total_price) VALUES ($1, $2, $3, $4, $5)`;
        for (const item of items) {
            await client.query(itemSql, [so_id, item.item_code, item.quantity, item.unit_price, item.total_price]);
        }

        await client.query('COMMIT');
        res.status(201).json({ message: 'สร้างใบสั่งขายสำเร็จ!', so_id: so_id });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: `ไม่สามารถสร้างใบสั่งขายได้: ${err.message}` });
    } finally {
        client.release();
    }
});

// PUT /:id - อัปเดตข้อมูล SO
router.put('/:id', async (req, res) => {
    const soId = req.params.id;
    const { customer_po_number, customer_id, order_date, due_date, total_amount, items, status } = req.body;

    if (!customer_id || !order_date || !due_date || !items || items.length === 0) {
        return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const updateSoSql = `UPDATE sales_orders SET customer_po_number = $1, customer_id = $2, order_date = $3, due_date = $4, total_amount = $5, status = $6 WHERE id = $7`;
        await client.query(updateSoSql, [customer_po_number, customer_id, order_date, due_date, total_amount, status, soId]);

        const deleteItemsSql = 'DELETE FROM sales_order_items WHERE so_id = $1';
        await client.query(deleteItemsSql, [soId]);

        const insertItemSql = `INSERT INTO sales_order_items (so_id, item_code, quantity, unit_price, total_price) VALUES ($1, $2, $3, $4, $5)`;
        for (const item of items) {
            await client.query(insertItemSql, [soId, item.item_code, item.quantity, item.unit_price, item.total_price]);
        }

        await client.query('COMMIT');
        res.status(200).json({ message: 'อัปเดตใบสั่งขายสำเร็จ!', so_id: soId });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: `ไม่สามารถอัปเดตใบสั่งขายได้: ${err.message}` });
    } finally {
        client.release();
    }
});

module.exports = router;