const express = require('express');
const router = express.Router();
const db = require('../database.js');

// GET /api/schedule/gantt-data - ดึงข้อมูลทั้งหมดสำหรับ Gantt Chart
router.get('/gantt-data', (req, res) => {
    // ดึงข้อมูล MO ทั้งหมดที่มีการวางแผนแล้ว (มี machine_id และ planned_start_time)
    const sql = `
        SELECT 
            mo.id,
            mo.mo_number,
            mo.planned_start_time,
            mo.planned_end_time,
            mo.status,
            i.item_name,
            m.id as machine_id,
            m.machine_name
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

            // คำนวณ progress
            let progress = 0;
            if (row.status === 'in_progress') {
                progress = 50;
            } else if (row.status === 'completed') {
                progress = 100;
            }

            machinesData[row.machine_id].tasks.push({
                id: row.mo_number,
                name: `${row.mo_number} (${row.item_name})`,
                start: row.planned_start_time.replace(' ', 'T'), // Format ให้ถูกต้อง
                end: row.planned_end_time.replace(' ', 'T'),
                progress: progress
            });
        });

        // แปลง object เป็น array เพื่อส่งกลับ
        const result = Object.values(machinesData);
        res.json({ data: result });
    });
});
// GET /api/schedule/gantt-data - ดึงข้อมูลทั้งหมดสำหรับ Gantt Chart
router.get('/gantt-data', (req, res) => {
    const sql = `
        SELECT 
            mo.id, mo.mo_number, mo.planned_start_time, mo.planned_end_time,
            mo.status, mo.actual_start_time, mo.actual_end_time,
            i.item_name, m.id as machine_id, m.machine_name
        FROM manufacturing_orders mo
        JOIN items i ON mo.item_code = i.item_code
        JOIN machines m ON mo.machine_id = m.id
        WHERE mo.machine_id IS NOT NULL AND mo.planned_start_time IS NOT NULL
        ORDER BY m.id, mo.planned_start_time
    `;

    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const machinesData = {};
        rows.forEach(row => {
            if (!machinesData[row.machine_id]) {
                machinesData[row.machine_id] = {
                    machine_id: row.machine_id,
                    machine_name: row.machine_name,
                    tasks: []
                };
            }

            // === จุดที่แก้ไข: คำนวณ progress จากเวลาจริง ===
            let progress = 0;
            if (row.status === 'completed' || row.actual_end_time) {
                progress = 100;
            } else if (row.status === 'in_progress' || row.actual_start_time) {
                progress = 50; // สามารถคำนวณแบบไดนามิกได้ แต่ 50% ก็เห็นภาพชัดเจน
            }

            machinesData[row.machine_id].tasks.push({
                id: row.mo_number,
                name: `${row.mo_number} (${row.item_name})`,
                start: row.planned_start_time.replace(' ', 'T'),
                end: row.planned_end_time.replace(' ', 'T'),
                progress: progress,
                // เพิ่ม custom class สำหรับเปลี่ยนสี
                custom_class: `gantt-${row.status}`
            });
        });

        const result = Object.values(machinesData);
        res.json({ data: result });
    });
});
// GET /api/schedule/gantt-data - ดึงข้อมูลทั้งหมดสำหรับ Gantt Chart
router.get('/gantt-data', (req, res) => {
    const sql = `
        SELECT 
            mo.id, mo.mo_number, mo.planned_start_time, mo.planned_end_time,
            mo.status, mo.actual_start_time, mo.actual_end_time,
            i.item_name, m.id as machine_id, m.machine_name
        FROM manufacturing_orders mo
        JOIN items i ON mo.item_code = i.item_code
        JOIN machines m ON mo.machine_id = m.id
        WHERE mo.machine_id IS NOT NULL AND mo.planned_start_time IS NOT NULL
        ORDER BY m.id, mo.planned_start_time
    `;

    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const machinesData = {};
        rows.forEach(row => {
            if (!machinesData[row.machine_id]) {
                machinesData[row.machine_id] = {
                    machine_id: row.machine_id,
                    machine_name: row.machine_name,
                    tasks: []
                };
            }

            let progress = 0;
            if (row.status === 'completed' || row.actual_end_time) {
                progress = 100;
            } else if (row.status === 'in_progress' || row.actual_start_time) {
                progress = 50;
            }

            machinesData[row.machine_id].tasks.push({
                // === จุดที่แก้ไข: เพิ่ม mo_id เข้าไปใน task object ===
                mo_id: row.id, 
                id: row.mo_number,
                name: `${row.mo_number} (${row.item_name})`,
                start: row.planned_start_time.replace(' ', 'T'),
                end: row.planned_end_time.replace(' ', 'T'),
                progress: progress,
                custom_class: `gantt-${row.status}`
            });
        });

        const result = Object.values(machinesData);
        res.json({ data: result });
    });
});


module.exports = router;
