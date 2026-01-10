const express = require('express');
const router = express.Router();
const db = require('../database.js');

// GET /api/schedule/gantt-data - ดึงข้อมูลทั้งหมดสำหรับ Gantt Chart (เวอร์ชันแก้ไขที่ถูกต้อง)
router.get('/gantt-data', (req, res) => {
    // ปรับปรุง SQL Query ให้ดึงข้อมูลที่จำเป็นทั้งหมด
    // - mo.quantity_to_produce: ยอดที่ต้องผลิตทั้งหมด
    // - total_good_quantity: ยอดที่ผลิตได้จริง (คำนวณจาก production_records)
    const sql = `
        SELECT 
            mo.id,
            mo.mo_number,
            mo.planned_start_time,
            mo.planned_end_time,
            mo.status,
            mo.quantity_to_produce,
            i.item_name,
            m.id as machine_id,
            m.machine_name,
            IFNULL((
                SELECT SUM(pr.good_quantity)
                FROM production_records pr
                WHERE pr.mo_id = mo.id
            ), 0) AS total_good_quantity
        FROM manufacturing_orders mo
        JOIN items i ON mo.item_code = i.item_code
        JOIN machines m ON mo.machine_id = m.id
        WHERE mo.machine_id IS NOT NULL AND mo.planned_start_time IS NOT NULL
        ORDER BY m.id, mo.planned_start_time
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // จัดกลุ่มข้อมูล MO ตามเครื่องจักร
        const machinesData = {};
        rows.forEach(row => {
            if (!machinesData[row.machine_id]) {
                machinesData[row.machine_id] = {
                    machine_id: row.machine_id,
                    machine_name: row.machine_name,
                    tasks: []
                };
            }

            // คำนวณ progress จากยอดผลิตจริง
            let progress = 0;
            if (row.status === 'completed') {
                progress = 100;
            } else if (row.quantity_to_produce > 0) {
                // คำนวณเปอร์เซ็นต์จริงและตรวจสอบว่าไม่เกิน 100
                progress = Math.min((row.total_good_quantity / row.quantity_to_produce) * 100, 100);
            }

            // สร้าง task object ให้สมบูรณ์สำหรับ Frappe Gantt
            machinesData[row.machine_id].tasks.push({
                id: `mo_${row.id}`, // ใช้ ID ที่ไม่ซ้ำกัน
                mo_id: row.id,      // เพิ่ม mo_id สำหรับการทำ link
                name: `${row.mo_number} (${row.item_name})`,
                start: row.planned_start_time.split(' ')[0], // Format: YYYY-MM-DD
                end: row.planned_end_time.split(' ')[0],
                progress: progress,
                custom_class: `gantt-${row.status}` // Class สำหรับเปลี่ยนสีใน CSS
            });
        });

        // แปลง object เป็น array เพื่อส่งกลับ
        const result = Object.values(machinesData);
        res.json({ data: result });
    });
});

module.exports = router;