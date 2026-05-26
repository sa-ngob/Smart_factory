const express = require('express');
const router = express.Router();
const { pool, ...db } = require('../database.js');
const inventoryService = require('../services/inventoryService.js');

// Helper function to generate next MO Number
const getNextMoNumber = async (queryClient) => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const prefix = `MO-${year}${month}-`;
    const sql = `SELECT mo_number FROM manufacturing_orders WHERE mo_number LIKE $1 ORDER BY mo_number DESC LIMIT 1`;

    try {
        const result = queryClient ? await queryClient.query(sql, [`${prefix}%`]) : await db.query(sql, [`${prefix}%`]);
        const row = queryClient ? result.rows[0] : result.rows[0];
        let nextSequence = 1;
        if (row) {
            const lastSequence = parseInt(row.mo_number.replace(prefix, ''), 10);
            nextSequence = lastSequence + 1;
        }
        return `${prefix}${String(nextSequence).padStart(4, '0')}`;
    } catch (err) {
        throw err;
    }
};

// POST: สร้างใบสั่งผลิตจาก Sales Order
router.post('/from-so', async (req, res) => {
    const { so_id } = req.body;
    if (!so_id) return res.status(400).json({ error: 'Sales Order ID is required' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const getItemsSql = `SELECT item_code, quantity FROM sales_order_items WHERE so_id = $1`;
        const itemsRes = await client.query(getItemsSql, [so_id]);
        const items = itemsRes.rows;

        if (items.length === 0) {
            await client.query('ROLLBACK');
            return res.status(500).json({ error: `Failed to get items or no items found.` });
        }

        const soDetailsRes = await client.query('SELECT due_date FROM sales_orders WHERE id = $1', [so_id]);
        const soDetails = soDetailsRes.rows[0];

        if (!soDetails) {
            await client.query('ROLLBACK');
            return res.status(500).json({ error: `Failed to get SO details` });
        }

        for (const item of items) {
            const bomRes = await client.query(`SELECT id FROM boms WHERE product_part_number = $1 AND is_active = 1 LIMIT 1`, [item.item_code]);
            const bom = bomRes.rows[0];

            if (!bom) throw new Error(`ไม่พบ BOM ที่ใช้งานได้สำหรับสินค้า ${item.item_code}`);

            const mo_number = await getNextMoNumber(client);

            const params = [mo_number, so_id, item.item_code, item.quantity, bom.id, soDetails.due_date, 'pending'];
            await client.query(`INSERT INTO manufacturing_orders (mo_number, so_id, item_code, quantity_to_produce, bom_id, due_date, status) VALUES ($1, $2, $3, $4, $5, $6, $7)`, params);
        }

        await client.query(`UPDATE sales_orders SET status = 'in_production' WHERE id = $1`, [so_id]);

        await client.query('COMMIT');
        res.status(201).json({ message: 'สร้างใบสั่งผลิตสำเร็จ!' });

    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// PUT /:id/schedule - บันทึกแผนการผลิตสำหรับ MO
router.put('/:id/schedule', async (req, res) => {
    const moId = req.params.id;
    const { machine_id, planned_start_time, planned_end_time } = req.body;

    if (!machine_id || !planned_start_time || !planned_end_time) {
        return res.status(400).json({ error: 'ข้อมูลการวางแผนไม่ครบถ้วน' });
    }

    const sql = `
        UPDATE manufacturing_orders
        SET
            machine_id = $1,
            planned_start_time = $2,
            planned_end_time = $3
        WHERE id = $4
    `;

    try {
        const result = await db.runAsync(sql, [machine_id, planned_start_time, planned_end_time, moId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "MO not found" });
        }
        res.json({ message: 'บันทึกแผนการผลิตสำเร็จ' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /:id/status - อัปเดตสถานะของ MO และจัดการสต็อก/เวลาจริง
router.put('/:id/status', async (req, res) => {
    const moId = req.params.id;
    const { newStatus } = req.body;
    const validStatuses = ['in_progress', 'completed', 'cancelled'];

    if (!newStatus || !validStatuses.includes(newStatus)) {
        return res.status(400).json({ error: 'Invalid or missing new status' });
    }

    if (newStatus === 'in_progress' || newStatus === 'cancelled') {
        let sql = '';
        let params = [];
        const time = new Date().toISOString();

        if (newStatus === 'in_progress') {
            sql = `UPDATE manufacturing_orders SET status = $1, actual_start_time = $2 WHERE id = $3`;
            params = [newStatus, time, moId];
        } else { // cancelled
            sql = `UPDATE manufacturing_orders SET status = $1 WHERE id = $2`;
            params = [newStatus, moId];
        }

        try {
            const result = await db.runAsync(sql, params);
            if (result.rowCount === 0) return res.status(404).json({ error: "MO not found" });
            res.json({ message: `สถานะอัปเดตเป็น ${newStatus} สำเร็จ` });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
        return;
    }

    if (newStatus === 'completed') {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const getDataSql = `
                SELECT
                    mo.id, mo.mo_number, mo.item_code as finished_good_code, mo.bom_id,
                    COALESCE((SELECT SUM(pr.good_quantity) FROM production_records pr WHERE pr.mo_id = mo.id), 0) as actual_produced_quantity,
                    i.part_weight_gram
                FROM manufacturing_orders mo
                JOIN items i ON mo.item_code = i.item_code
                WHERE mo.id = $1`;

            const moDataRes = await client.query(getDataSql, [moId]);
            const moData = moDataRes.rows[0];

            if (!moData) {
                await client.query('ROLLBACK');
                return res.status(500).json({ error: 'MO not found' });
            }

            if (moData.actual_produced_quantity <= 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'ไม่สามารถจบการผลิตได้เนื่องจากยังไม่มีการบันทึกยอดผลิต (งานดี)' });
            }

            const materialsSql = `
                SELECT
                    bi.material_code,
                    (i.part_weight_gram * $1 * (bi.mixing_ratio / 100.0)) / 1000.0 AS required_kg
                FROM bom_items bi
                JOIN manufacturing_orders mo ON bi.bom_id = mo.bom_id
                JOIN items i ON mo.item_code = i.item_code
                WHERE mo.id = $2`;

            const materialsRes = await client.query(materialsSql, [moData.actual_produced_quantity, moId]);
            const materials = materialsRes.rows;

            console.log(`[MO Complete] Processing MO ID: ${moId} (${moData.mo_number})`);
            console.log(`[MO Complete] Finished Good: ${moData.finished_good_code}, Qty to receive: ${moData.actual_produced_quantity}`);
            console.log(`[MO Complete] Raw Materials to issue:`, materials);

            for (const mat of materials) {
                if (mat.required_kg > 0) {
                    console.log(`[MO Complete] Issuing RM: ${mat.material_code}, Qty: ${-Math.abs(mat.required_kg)}`);
                    await inventoryService.createTransaction(
                        mat.material_code, 'production_issue', -Math.abs(mat.required_kg),
                        'MO', moId, `Used for ${moData.mo_number}`,
                        client
                    );
                }
            }

            console.log(`[MO Complete] Receiving FG: ${moData.finished_good_code}, Qty: ${moData.actual_produced_quantity}`);
            await inventoryService.createTransaction(
                moData.finished_good_code, 'production_receipt', moData.actual_produced_quantity,
                'MO', moId, `Produced from ${moData.mo_number}`,
                client
            );

            const endTime = new Date().toISOString();
            const updateMoSql = `UPDATE manufacturing_orders SET status = 'completed', actual_end_time = $1 WHERE id = $2`;
            await client.query(updateMoSql, [endTime, moId]);

            await client.query('COMMIT');
            res.json({ message: "การผลิตเสร็จสิ้นและอัปเดตสต็อกเรียบร้อยแล้ว!" });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error(`[MO Complete] FAILED for MO ID ${moId}. Rolling back. Error:`, error.message);
            res.status(500).json({ error: `Transaction failed: ${error.message}` });
        } finally {
            client.release();
        }
    }
});

// GET: ดึงข้อมูลใบสั่งผลิตทั้งหมด
router.get('/', async (req, res) => {
    const sql = `
        SELECT
            mo.id, mo.mo_number, mo.item_code, i.item_name,
            mo.quantity_to_produce, mo.status,
            (SELECT SUM(pr.good_quantity) FROM production_records pr WHERE pr.mo_id = mo.id) as total_good_quantity,
            mc.machine_code
        FROM manufacturing_orders mo
        LEFT JOIN items i ON mo.item_code = i.item_code
        LEFT JOIN machines mc ON mo.machine_id = mc.id
        ORDER BY mo.id DESC
    `;
    try {
        const rows = await db.allAsync(sql);
        res.json({ data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /:id/adjust - ปรับยอดและเหตุผลในการผลิต
router.put('/:id/adjust', async (req, res) => {
    const moId = req.params.id;
    const { new_quantity, reason } = req.body;

    if (!new_quantity || !reason || reason.trim() === '') {
        return res.status(400).json({ error: 'กรุณาระบุจำนวนใหม่และเหตุผลให้ครบถ้วน' });
    }

    if (isNaN(new_quantity) || new_quantity < 0) {
        return res.status(400).json({ error: 'จำนวนใหม่ต้องเป็นตัวเลขเท่านั้น' });
    }

    const sql = `
        UPDATE manufacturing_orders
        SET quantity_to_produce = $1,
            adjustment_reason = $2
        WHERE id = $3 AND status = 'pending'
    `;

    try {
        const result = await db.runAsync(sql, [new_quantity, reason, moId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "ไม่พบใบสั่งผลิต หรือใบสั่งผลิตได้เริ่มผลิตไปแล้วจึงไม่สามารถแก้ไขได้" });
        }
        res.json({ message: 'ปรับยอดการผลิตสำเร็จ' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// GET /:id - ดึงข้อมูล MO เดียวแบบละเอียด
router.get('/:id', async (req, res) => {
    const moId = req.params.id;
    const responseData = {};
    const moSql = `
        SELECT
            mo.*, i.item_name, i.part_weight_gram, so.so_number,
            b.version as bom_version,
            COALESCE((
                SELECT SUM(pr.good_quantity)
                FROM production_records pr
                WHERE pr.mo_id = mo.id
            ), 0) as total_good_quantity
        FROM manufacturing_orders mo
        LEFT JOIN items i ON mo.item_code = i.item_code
        LEFT JOIN sales_orders so ON mo.so_id = so.id
        LEFT JOIN boms b ON mo.bom_id = b.id
        WHERE mo.id = $1
    `;

    try {
        const moRow = await db.getAsync(moSql, [moId]);
        if (!moRow) return res.status(404).json({ error: "Manufacturing Order not found" });
        responseData.details = moRow;

        const materialsSql = `
            SELECT
                bi.material_code, bi.material_name, bi.mixing_ratio, bi.unit,
                rm.stock_quantity AS current_stock_kg
            FROM bom_items bi
            LEFT JOIN items rm ON bi.material_code = rm.item_code
            WHERE bi.bom_id = $1
        `;

        // Only fetch materials if bom_id exists
        let materialRows = [];
        if (moRow.bom_id) {
            const rawMaterials = await db.allAsync(materialsSql, [moRow.bom_id]);

            // Calculate required_kg in JavaScript to avoid SQL type headaches
            const partWeight = parseFloat(moRow.part_weight_gram) || 0;
            const qty = parseFloat(moRow.quantity_to_produce) || 0;

            materialRows = rawMaterials.map(m => {
                const ratio = parseFloat(m.mixing_ratio) || 0;
                const currentStock = parseFloat(m.current_stock_kg) || 0;
                // Formula: (PartWeight * Qty * (Ratio/100)) / 1000  => Output in KG
                const reqKg = (partWeight * qty * (ratio / 100.0)) / 1000.0;
                return {
                    ...m,
                    mixing_ratio: ratio,
                    current_stock_kg: currentStock,
                    required_kg: reqKg
                };
            });
        }

        responseData.materials = materialRows;
        res.json({ data: responseData });

    } catch (err) {
        console.error("Error at GET /api/manufacturing-orders/:id :", err);
        res.status(500).json({ error: err.message });
    }
});

// GET: ดึงข้อมูล MO หนึ่งรายการจาก mo_number
router.get('/mo/:moNumber', async (req, res) => {
    const { moNumber } = req.params;
    const sql = `SELECT * FROM manufacturing_orders WHERE mo_number = $1`;

    try {
        const row = await db.getAsync(sql, [moNumber]);
        if (!row) {
            return res.status(404).json({ error: 'Manufacturing Order not found' });
        }
        res.json(row);
    } catch (err) {
        console.error("Error fetching MO by number:", err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;