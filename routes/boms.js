// boms.js (ฉบับสมบูรณ์ แก้ไขเรื่องการเก็บประวัติ item)

const express = require('express');
const router = express.Router();
const { pool, ...db } = require('../database.js');

// READ: ดึงข้อมูล BOMs ทั้งหมด (แสดงเฉพาะเวอร์ชันที่ Active ในหน้าหลัก)
router.get('/', async (req, res) => {
    const sql = `
        SELECT
            b.id, b.product_part_number, b.version, b.is_active
        FROM boms b
        WHERE b.is_active = 1
        ORDER BY b.product_part_number
    `;
    try {
        const rows = await db.allAsync(sql);
        res.json({ data: rows });
    } catch (err) {
        res.status(500).json({ "error": err.message });
    }
});

// READ: ดึงข้อมูล BOM ใบเดียวแบบละเอียด (พร้อมประวัติ)
router.get('/:id', async (req, res) => {
    const bomId = req.params.id;
    const responseData = {};
    try {
        const sqlBom = `SELECT b.* FROM boms b WHERE b.id = $1`;
        const bom = await db.getAsync(sqlBom, [bomId]);

        if (!bom) return res.status(404).json({ "error": "BOM not found" });
        responseData.bom = bom;

        const sqlProduct = `SELECT part_weight_gram FROM items WHERE item_code = $1`;
        const product = await db.getAsync(sqlProduct, [bom.product_part_number]);

        const partWeight = product ? product.part_weight_gram : 0;
        responseData.part_weight_gram = partWeight;

        // ส่วนนี้จะดึงรายการวัตถุดิบที่ผูกกับ bomId ที่ร้องขอมา
        const sqlItems = `SELECT bi.*, i.image_path FROM bom_items bi LEFT JOIN items i ON bi.material_code = i.item_code WHERE bi.bom_id = $1`;
        const items = await db.allAsync(sqlItems, [bomId]);
        responseData.items = items;

        const sqlHistory = `
            SELECT id, version, is_active
            FROM boms
            WHERE product_part_number = $1
            ORDER BY version DESC`;
        const history = await db.allAsync(sqlHistory, [bom.product_part_number]);
        responseData.history = history;

        res.json(responseData);
    } catch (err) {
        res.status(500).json({ "error": err.message });
    }
});

// CREATE: สร้าง BOM ใหม่ครั้งแรก
router.post('/', async (req, res) => {
    const { product_part_number, version, items } = req.body;

    // Validate required fields
    if (!product_part_number || !version) {
        return res.status(400).json({ error: "product_part_number และ version เป็นข้อมูลจำเป็น" });
    }

    const client = await pool.connect();

    try {
        const checkSql = `SELECT id FROM boms WHERE product_part_number = $1 AND version = $2`;
        const checkRes = await client.query(checkSql, [product_part_number, version]);

        if (checkRes.rows.length > 0) {
            client.release();
            return res.status(400).json({ "error": `มี BOM สำหรับรหัสสินค้า '${product_part_number}' เวอร์ชัน '${version}' อยู่ในระบบแล้ว` });
        }

        await client.query('BEGIN');

        const sqlBom = `INSERT INTO boms (product_part_number, version, is_active) VALUES ($1, $2, 1) RETURNING id`;
        const bomRes = await client.query(sqlBom, [product_part_number, version]);
        const bomId = bomRes.rows[0].id;

        const sqlItem = `INSERT INTO bom_items (bom_id, material_code, material_name, mixing_ratio, unit) VALUES ($1, $2, $3, $4, $5)`;
        for (const item of items) {
            await client.query(sqlItem, [bomId, item.material_code, item.material_name, item.mixing_ratio, item.unit]);
        }

        await client.query('COMMIT');
        res.json({ "message": "success", "id": bomId });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ "error": err.message });
    } finally {
        client.release();
    }
});

// UPDATE: อัปเดต BOM และรายการวัตถุดิบ
router.put('/:id', async (req, res) => {
    const bomId = req.params.id;
    const { version, items } = req.body;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // ขั้นตอนที่ 1: อัปเดตเวอร์ชัน BOM
        if (version) {
            const sqlUpdate = `UPDATE boms SET version = $1 WHERE id = $2`;
            await client.query(sqlUpdate, [version, bomId]);
        }

        // ขั้นตอนที่ 2: ลบรายการวัตถุดิบเก่า
        await client.query('DELETE FROM bom_items WHERE bom_id = $1', [bomId]);

        // ขั้นตอนที่ 3: เพิ่มรายการวัตถุดิบใหม่
        if (items && items.length > 0) {
            const sqlItem = `INSERT INTO bom_items (bom_id, material_code, material_name, mixing_ratio, unit) VALUES ($1, $2, $3, $4, $5)`;
            for (const item of items) {
                await client.query(sqlItem, [bomId, item.material_code, item.material_name, item.mixing_ratio, item.unit]);
            }
        }

        await client.query('COMMIT');
        res.json({ "message": "success", "id": bomId });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ "error": `Failed to update BOM: ${err.message}` });
    } finally {
        client.release();
    }
});

// DELETE: ลบ BOM (ควรลบทั้ง header และ items)
router.delete('/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // ลบ items ก่อน
        await client.query('DELETE FROM bom_items WHERE bom_id = $1', [req.params.id]);
        // แล้วค่อยลบ bom header
        const result = await client.query('DELETE FROM boms WHERE id = $1', [req.params.id]);

        await client.query('COMMIT');
        res.json({ "message": "deleted", changes: result.rowCount });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ "error": err.message });
    } finally {
        client.release();
    }
});

module.exports = router;