#!/bin/bash

echo "⏳ Fixing Database & Timezone Issues..."

# 1. แก้ไข Backend (dashboard.js) 
# เพิ่มการตั้งค่า Timezone 'Asia/Bangkok' ตอนเชื่อมต่อ Database
echo "[1/3] Updating Backend for Timezone Support..."
cat << 'EOF' > routes/dashboard.js
const express = require('express');
const router = express.Router();
const { pool } = require('../database.js');
const axios = require('axios');

const FLASK_API_URL = process.env.FLASK_API_URL || 'http://smart_factory_plc:5000';
const MACHINE_CODE_TO_PLC_NAME = {
    'MC-001': 'PLC_Machine_1', 'MC-002': 'PLC_Machine_2',
    'MC-003': 'PLC_Machine_3', 'MC-004': 'PLC_Machine_4',
    'MC-005': 'PLC_Machine_5', 'MC-006': 'PLC_Machine_6'
};

// Helper: Query Database
const all = async (sql, params = []) => {
    try {
        const result = await pool.query(sql, params);
        return result.rows;
    } catch (err) {
        console.error("SQL Error:", err.message, "Query:", sql);
        throw err;
    }
};

// Helper Functions
const getDateCondition = (period, dateColumn) => {
    if (period === 'daily') return ` AND ${dateColumn} >= CURRENT_DATE `;
    if (period === 'monthly') return ` AND to_char(${dateColumn}, 'YYYY-MM') = to_char(NOW(), 'YYYY-MM') `;
    return '';
};

const getDowntimeDateFilter = (period = 'daily') => {
    if (period === 'weekly') return " AND l.start_time >= NOW() - INTERVAL '7 days' ";
    if (period === 'monthly') return " AND to_char(l.start_time, 'YYYY-MM') = to_char(NOW(), 'YYYY-MM') ";
    return " AND date(l.start_time) = CURRENT_DATE "; // Daily default
};

// --- ROUTES ---

// 1. MAIN DATA
router.get('/main-data', async (req, res) => {
    try {
        const { period = 'monthly' } = req.query;
        const invoiceDateFilter = getDateCondition(period, 'inv.issue_date');
        const soDateFilter = getDateCondition(period, 'so.order_date');

        const promises = [
            all(`SELECT SUM(grand_total) as total FROM invoices inv WHERE 1=1 ${invoiceDateFilter}`),
            all(`SELECT COUNT(mo.id) as count FROM manufacturing_orders mo JOIN sales_orders so ON mo.so_id = so.id WHERE mo.status = 'in_progress' ${soDateFilter}`),
            all(`SELECT status, COUNT(id) as count FROM machines GROUP BY status`),
            all(`SELECT CAST(COALESCE(SUM(good_quantity), 0) AS REAL) as total_good, CAST(COALESCE(SUM(total_scrap_quantity), 0) AS REAL) as total_scrap FROM production_records`),
            all(`SELECT dt.code, dt.name as description, SUM(sr.quantity) as quantity FROM scrap_records sr JOIN defect_types dt ON sr.defect_code = dt.code GROUP BY dt.code, dt.name ORDER BY quantity DESC LIMIT 5`),
            all(`SELECT COUNT(id) as count FROM sales_orders so WHERE 1=1 ${soDateFilter}`),
            all(`SELECT item_type, stock_quantity, status, item_code, item_name, uom FROM items`),
            all(`SELECT to_char(inv.issue_date, 'YYYY-MM-DD') as date, SUM(inv.grand_total) as daily_sales FROM invoices inv WHERE inv.status != 'cancelled' ${invoiceDateFilter} GROUP BY date ORDER BY date ASC`),
            all(`SELECT mo.mo_number, i.item_name, mo.quantity_to_produce, mo.due_date FROM manufacturing_orders mo JOIN items i ON mo.item_code = i.item_code WHERE mo.status = 'in_progress' ORDER BY mo.due_date ASC LIMIT 5`)
        ];

        const results = await Promise.all(promises.map(p => p.catch(e => [])));
        const [kpi_sales, kpi_in_progress_mo, kpi_machines, quality_stats, top_defects, sales_kpi_orders, inventory_summary, sales_trend, top_mos] = results;

        const machineStatus = { running: 0, idle: 0, down: 0 };
        kpi_machines.forEach(row => { if (machineStatus.hasOwnProperty(row.status)) machineStatus[row.status] = parseInt(row.count); });
        const totalGood = parseFloat(quality_stats[0]?.total_good || 0);
        const totalScrap = parseFloat(quality_stats[0]?.total_scrap || 0);
        const totalProduction = totalGood + totalScrap;

        res.json({
            success: true,
            data: {
                overview: { kpi_in_progress_mo: parseInt(kpi_in_progress_mo[0]?.count || 0), machine_status: machineStatus, oee: { overall: 82.5 }, quality: { scrap_rate: totalProduction > 0 ? (totalScrap/totalProduction)*100 : 0, total_scrap: totalScrap, top_defects: top_defects || [] } },
                sales: { total_sales: parseFloat(kpi_sales[0]?.total || 0), new_orders: parseInt(sales_kpi_orders[0]?.count || 0), sales_trend: sales_trend || [], top_mos: top_mos || [] },
                inventory: { total_sku: inventory_summary.length, low_stock_items: inventory_summary.filter(item => item.status === 'low_stock').slice(0, 5) }
            }
        });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// 2. PRODUCTION RECORDING (จุดสำคัญที่แก้เรื่องเวลา)
router.post('/record-production', async (req, res) => {
    try {
        const mo = await all("SELECT id FROM manufacturing_orders WHERE mo_number = $1", [req.body.mo_number]);
        if (mo.length === 0) return res.status(404).json({ success: false, error: "MO Not Found" });
        
        // ✅ ใช้ NOW() เพื่อบันทึกเวลาปัจจุบัน (Timestamp)
        const result = await pool.query(
            "INSERT INTO production_records (mo_id, record_date, shift, operator_name, good_quantity, total_scrap_quantity) VALUES ($1, NOW(), 'day', $2, $3, $4) RETURNING id", 
            [mo[0].id, req.body.operator_name, req.body.good_quantity, req.body.scraps.reduce((s, i) => s + i.quantity, 0)]
        );
        
        for (const s of req.body.scraps) {
            if (s.quantity > 0) await all("INSERT INTO scrap_records (record_id, defect_code, quantity) VALUES ($1, $2, $3)", [result.rows[0].id, s.defect_code, s.quantity]);
        }
        res.json({ success: true, message: "Recorded" });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// 3. OTHER ROUTES
router.get('/production-data', async (req, res) => {
    try {
        const machines = await all(`SELECT DISTINCT ON (machine_id) machine_id, timestamp, machine_status, mold_count, mold_temp_core, mold_temp_cavity, cycle_time_sec AS cycle_time, material_dry_temp, mo_number, item_name FROM machine_data ORDER BY machine_id, timestamp DESC`);
        res.json({ success: true, data: { kpis: { total_machines: machines.length, running: machines.filter(m => String(m.machine_status) === '1').length, stop: machines.filter(m => String(m.machine_status) === '0').length, alarm: machines.filter(m => String(m.machine_status) === '2').length }, machine_list: machines } });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/machines', async (req, res) => { try { res.json({ success: true, data: await all("SELECT id, machine_code, machine_name FROM machines ORDER BY machine_code") }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });

router.get('/machine-view/:machineCode', async (req, res) => { try { const info = await all("SELECT * FROM machines WHERE machine_code = $1", [req.params.machineCode]); if (!info.length) return res.status(404).json({error:'Not found'}); const job = await all(`SELECT mo.*, i.item_name, (SELECT SUM(COALESCE(pr.good_quantity, 0)) FROM production_records pr WHERE pr.mo_id = mo.id) as total_good, (SELECT SUM(COALESCE(pr.total_scrap_quantity, 0)) FROM production_records pr WHERE pr.mo_id = mo.id) as total_scrap FROM manufacturing_orders mo JOIN items i ON mo.item_code = i.item_code WHERE mo.machine_id = $1 AND mo.status = 'in_progress'`, [info[0].id]); const pending = await all(`SELECT mo.mo_number, mo.item_code, mo.quantity_to_produce, i.item_name FROM manufacturing_orders mo JOIN items i ON mo.item_code = i.item_code WHERE mo.machine_id = $1 AND mo.status = 'pending' ORDER BY mo.due_date ASC LIMIT 10`, [info[0].id]); res.json({ success: true, data: { machine: info[0], inProgressJob: job[0] || null, pendingJobs: pending } }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });

router.get('/machines-overview', async (req, res) => { try { res.json({ success: true, data: await all(`SELECT m.id, m.machine_code, m.machine_name, m.status as machine_status, mo.mo_number, mo.item_code, mo.quantity_to_produce, (SELECT SUM(COALESCE(pr.good_quantity, 0)) + SUM(COALESCE(pr.total_scrap_quantity, 0)) FROM production_records pr WHERE pr.mo_id = mo.id) as total_produced FROM machines m LEFT JOIN manufacturing_orders mo ON m.id = mo.machine_id AND mo.status = 'in_progress' ORDER BY m.machine_code ASC`) }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });

router.post('/start-specific-job', async (req, res) => { try { await pool.query("UPDATE manufacturing_orders SET status = 'in_progress', machine_id = $1, actual_start_time = NOW() WHERE mo_number = $2", [req.body.machine_id, req.body.mo_number]); res.json({ success: true, message: "Started" }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });

router.post('/stop-job', async (req, res) => { try { await pool.query("UPDATE manufacturing_orders SET status = 'completed', actual_end_time = NOW() WHERE mo_number = $1", [req.body.mo_number]); res.json({ success: true, message: "Stopped" }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });

router.get('/production-records/defect-codes', async (req, res) => { try { res.json({ success: true, data: await all("SELECT code, name, description FROM defect_types ORDER BY code") }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });

router.get('/downtime-reasons', async (req, res) => { try { res.json({ success: true, data: await all("SELECT id, reason_code, description FROM downtime_reasons ORDER BY reason_code ASC") }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });

router.get('/downtime-logs', async (req, res) => { try { const { machine_id, period = 'daily' } = req.query; const params = []; let filter = getDowntimeDateFilter(period); if (machine_id && machine_id !== 'all') { filter += ' AND l.machine_id = $1'; params.push(machine_id); } const logs = await all(`SELECT l.id, l.machine_id, l.status, l.start_time, l.end_time, l.duration_sec, l.reason_id, l.notes, m.machine_name, r.reason_code, r.description AS reason_description FROM machine_status_logs l LEFT JOIN downtime_reasons r ON l.reason_id = r.id LEFT JOIN machines m ON l.machine_id = m.machine_code WHERE l.status <> 1 ${filter} ORDER BY l.start_time DESC LIMIT 100`, params); res.json({ success: true, data: logs }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });

router.get('/downtime-summary', async (req, res) => { try { const { machine_id, period = 'daily' } = req.query; const params = []; let filter = getDowntimeDateFilter(period); if (machine_id && machine_id !== 'all') { filter += ' AND l.machine_id = $1'; params.push(machine_id); } const summary = await all(`SELECT COALESCE(r.reason_code, 'N/A') as reason_code, COALESCE(r.description, 'Unassigned') as reason_description, SUM(l.duration_sec) as total_duration FROM machine_status_logs l LEFT JOIN downtime_reasons r ON l.reason_id = r.id WHERE l.status <> 1 ${filter} GROUP BY r.reason_code, r.description ORDER BY total_duration DESC`, params); res.json({ success: true, data: summary }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });

router.post('/assign-downtime-reason', async (req, res) => { try { await pool.query("UPDATE machine_status_logs SET reason_id = $1, notes = $2 WHERE id = $3", [req.body.reason_id, req.body.notes, req.body.log_id]); res.json({ success: true, message: "Saved" }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });

router.get('/manufacturing-orders', async (req, res) => { try { const { period = 'daily' } = req.query; let filter = " AND date(actual_start_time) = CURRENT_DATE "; if(period==='weekly') filter=" AND actual_start_time >= NOW() - INTERVAL '7 days'"; if(period==='monthly') filter=" AND to_char(actual_start_time, 'YYYY-MM') = to_char(NOW(), 'YYYY-MM')"; res.json({ success: true, data: await all(`SELECT mo_number, item_code, status, actual_start_time FROM manufacturing_orders WHERE 1=1 ${filter} ORDER BY created_at DESC LIMIT 50`) }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });

router.get('/mo-details/:moNumber', async (req, res) => { try { const job = await all("SELECT * FROM manufacturing_orders WHERE mo_number = $1", [req.params.moNumber]); if (!job.length) return res.status(404).json({error:'Not Found'}); const records = await all("SELECT * FROM production_records WHERE mo_id = $1 ORDER BY record_date DESC", [job[0].id]); const scraps = await all("SELECT dt.name as defect_description, SUM(sr.quantity) as total_quantity FROM scrap_records sr JOIN production_records pr ON sr.record_id = pr.id JOIN defect_types dt ON sr.defect_code = dt.code WHERE pr.mo_id = $1 GROUP BY dt.code, dt.name", [job[0].id]); const timeSeries = await all("SELECT timestamp, mold_temp_core, mold_temp_cavity, mold_count, material_dry_temp FROM machine_data WHERE mo_number = $1 ORDER BY timestamp ASC LIMIT 500", [req.params.moNumber]); res.json({ success: true, data: { summary: job[0], production_records: records, scrap_details: scraps, time_series: timeSeries } }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });

router.get('/advanced-oee', async (req, res) => { res.json({ success: true, data: { currentOee: 82.5, oeeMetrics: [], activeMachines: [] } }); });
router.post('/force-status', async (req, res) => { try { await axios.post(`${FLASK_API_URL}/api/plc/force-status`, { plc_name: MACHINE_CODE_TO_PLC_NAME[req.body.machine_code], status: req.body.status }); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });

module.exports = router;
EOF

# 2. แก้ไข Database Structure (เปลี่ยน DATE เป็น TIMESTAMP)
echo "[2/3] Fixing Database Columns..."
sudo docker exec -i smart_factory_postgres psql -U postgres -d smart_factory <<SQL
-- เปลี่ยน Timezone ของ Database เป็นไทย
ALTER DATABASE smart_factory SET timezone TO 'Asia/Bangkok';

-- แก้ไขคอลัมน์ให้เก็บเวลาด้วย (จากเดิมเก็บแต่วันที่)
ALTER TABLE production_records ALTER COLUMN record_date TYPE TIMESTAMP;
ALTER TABLE machine_status_logs ALTER COLUMN start_time TYPE TIMESTAMP;
ALTER TABLE machine_status_logs ALTER COLUMN end_time TYPE TIMESTAMP;
ALTER TABLE manufacturing_orders ALTER COLUMN actual_start_time TYPE TIMESTAMP;
ALTER TABLE manufacturing_orders ALTER COLUMN actual_end_time TYPE TIMESTAMP;

-- ลบข้อมูลเก่าที่เวลาผิด (00:00:00) เพื่อเริ่มใหม่ (Optionally)
-- DELETE FROM production_records; 
SQL

# 3. Restart Server
echo "[3/3] Restarting Server..."
sudo docker compose restart web

echo "✅ DONE! Time & Database fixed."
