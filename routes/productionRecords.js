const express = require('express');
const router = express.Router();
const { pool } = require('../database.js');

// 1. GET /api/production-records/defect-types
// ดึงข้อมูลประเภทของเสีย (สำหรับ Dropdown)
router.get('/defect-types', async (req, res) => {
    try {
        // ดึงจากตาราง defect_types ที่เราเพิ่งสร้าง
        const result = await pool.query("SELECT code, name, category, description FROM defect_types ORDER BY category, code");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 2. GET /api/production-records/downtime-reasons
// ดึงข้อมูลสาเหตุการหยุดเครื่อง (สำหรับ Dropdown)
router.get('/downtime-reasons', async (req, res) => {
    try {
        // ดึงจากตาราง downtime_codes ที่เราเพิ่งสร้าง
        const result = await pool.query("SELECT code, name, category FROM downtime_codes ORDER BY category, code");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 3. GET /api/production-records/by-mo/:moId
// ดึงประวัติการบันทึกของ MO นี้
router.get('/by-mo/:moId', async (req, res) => {
    try {
        const sql = "SELECT * FROM production_records WHERE mo_id = $1 ORDER BY record_date DESC";
        const result = await pool.query(sql, [req.params.moId]);
        res.json({ data: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 4. POST /api/production-records
// บันทึกผลการผลิต (รองรับ shift และ total_scrap_quantity)
router.post('/', async (req, res) => {
    const { mo_id, record_date, shift, operator_name, good_quantity, scrap_details, notes } = req.body;

    if (!mo_id || !record_date) {
        return res.status(400).json({ error: 'ข้อมูลสำคัญไม่ครบ (MO ID หรือ วันที่)' });
    }

    // คำนวณยอดเสียรวม
    const total_scrap_quantity = scrap_details
        ? scrap_details.reduce((sum, item) => sum + parseInt(item.quantity || 0, 10), 0)
        : 0;

    // Fix Time Component: If record_date is Today, append current time (BKK)
    let final_record_date = record_date;
    try {
        const now = new Date();
        // Get "YYYY-MM-DD HH:mm:ss" in BKK Time
        const bkkNowStr = now.toLocaleString('en-CA', { timeZone: 'Asia/Bangkok', hour12: false }).replace(',', '');
        const todayBKK = bkkNowStr.split(' ')[0];

        if (record_date === todayBKK) {
            final_record_date = bkkNowStr;
        }
    } catch (e) {
        console.error("Time conversion error", e);
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Insert ลงตารางหลัก (ใช้ waste_quantity และ shift ให้ตรงกับ DB)
        const mainSql = `
            INSERT INTO production_records
            (mo_id, record_date, operator_name, good_quantity, waste_quantity)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `;

        const mainParams = [mo_id, final_record_date, operator_name, good_quantity || 0, total_scrap_quantity];
        const recordRes = await client.query(mainSql, mainParams);
        const record_id = recordRes.rows[0].id;

        // บันทึกรายละเอียดของเสีย (Scrap Details)
        if (scrap_details && scrap_details.length > 0) {
            // สร้างตารางลูกถ้ายังไม่มี (ปรับให้ Link กับ defect_types)
            await client.query(`
                CREATE TABLE IF NOT EXISTS scrap_records (
                    id SERIAL PRIMARY KEY,
                    record_id INTEGER NOT NULL,
                    defect_code VARCHAR(50) NOT NULL,
                    quantity INTEGER NOT NULL,
                    FOREIGN KEY (record_id) REFERENCES production_records(id) ON DELETE CASCADE,
                    FOREIGN KEY (defect_code) REFERENCES defect_types(code)
                );
            `);

            for (const detail of scrap_details) {
                // detail.defect_code คือรหัส เช่น 'DF-001'
                await client.query(
                    `INSERT INTO scrap_records (record_id, defect_code, quantity) VALUES ($1, $2, $3)`,
                    [record_id, detail.defect_code, detail.quantity]
                );
            }
        }

        await client.query('COMMIT');
        res.status(201).json({ message: "บันทึกผลผลิตสำเร็จ", id: record_id });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error creating production record:", err);
        res.status(500).json({ error: `บันทึกไม่สำเร็จ: ${err.message}` });
    } finally {
        client.release();
    }
});

module.exports = router;
