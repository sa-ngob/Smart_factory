const express = require('express');
const router = express.Router();
const { pool, ...db } = require('../database.js');
const inventoryService = require('../services/inventoryService.js');

// ======================= DEBUGGING LINE =======================
console.log('✅ [DEBUG] routes/inventory.js file has been loaded successfully.');
// ==============================================================

// GET /api/inventory/summary - ดึงข้อมูลสรุปสต็อกทั้งหมด
router.get('/summary', async (req, res) => {
    // ======================= DEBUGGING LINE =======================
    console.log('✅✅✅ [DEBUG] HIT: GET /api/inventory/summary route handler was executed!');
    // ==============================================================
    const sql = `
        SELECT 
            id, item_code, item_name, item_type, uom, stock_quantity, status 
        FROM items
        ORDER BY item_type, item_code
    `;
    try {
        const rows = await db.allAsync(sql);
        res.json({ data: rows });
    } catch (err) {
        console.error('[DEBUG] ERROR in /api/inventory/summary:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/inventory/transactions/:item_code - ดึงประวัติการเคลื่อนไหวของสินค้า
router.get('/transactions/:item_code', async (req, res) => {
    const { item_code } = req.params;
    const sql = `
        SELECT * FROM inventory_transactions 
        WHERE item_code = $1 
        ORDER BY transaction_date DESC
    `;
    try {
        const rows = await db.allAsync(sql, [item_code]);
        res.json({ data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/inventory/adjust - สำหรับปรับสต็อก
router.post('/adjust', async (req, res) => {
    const { item_code, new_quantity, notes } = req.body;

    if (!item_code || new_quantity === undefined || new_quantity < 0) {
        return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วนหรือไม่ถูกต้อง (item_code, new_quantity)' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. ดึงสต็อกปัจจุบันเพื่อคำนวณส่วนต่าง
        const itemRes = await client.query("SELECT stock_quantity FROM items WHERE item_code = $1", [item_code]);
        const item = itemRes.rows[0];

        if (!item) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'ไม่พบรหัสสินค้านี้' });
        }

        const current_quantity = item.stock_quantity;
        const quantity_change = new_quantity - current_quantity;

        if (quantity_change === 0) {
            await client.query('ROLLBACK'); // No changes needed
            return res.json({ message: 'No changes made, stock quantity is already correct.' });
        }

        // 2. เรียกใช้ inventoryService เพื่อสร้าง Transaction
        await inventoryService.createTransaction(
            item_code,
            'adjustment',
            quantity_change,
            'manual', // ประเภทการอ้างอิง
            null,     // ไม่มี ID อ้างอิง
            notes,
            client    // Pass the client for transaction context
        );

        await client.query('COMMIT');
        res.json({ message: `ปรับสต็อกของ ${item_code} เป็น ${new_quantity} เรียบร้อยแล้ว` });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`[Adjust Stock] FAILED for item ${item_code}. Error:`, error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

module.exports = router;