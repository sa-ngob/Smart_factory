#!/bin/bash

echo "=========================================="
echo "   FORCE UPDATING SMART FACTORY SYSTEM    "
echo "=========================================="

# 1. เขียนไฟล์ Backend (routes/dashboard.js) ใหม่
# เน้น: ใช้ NOW() ในการบันทึกเพื่อบังคับให้มีเวลาเสมอ
echo "[1/3] Updating Backend (routes/dashboard.js)..."
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

const all = async (sql, params = []) => {
    try {
        const result = await pool.query(sql, params);
        return result.rows;
    } catch (err) {
        console.error("SQL Error:", err.message, "Query:", sql);
        throw err;
    }
};

const getDateCondition = (period, dateColumn) => {
    if (period === 'daily') return ` AND ${dateColumn}::date = CURRENT_DATE `;
    if (period === 'monthly') return ` AND to_char(${dateColumn}, 'YYYY-MM') = to_char(NOW(), 'YYYY-MM') `;
    if (period === 'yearly') return ` AND to_char(${dateColumn}, 'YYYY') = to_char(NOW(), 'YYYY') `;
    return '';
};

const getDowntimeDateFilter = (period = 'daily') => {
    if (period === 'weekly') return " AND l.start_time >= NOW() - INTERVAL '7 days' ";
    if (period === 'monthly') return " AND to_char(l.start_time, 'YYYY-MM') = to_char(NOW(), 'YYYY-MM') ";
    return " AND l.start_time::date = CURRENT_DATE ";
};

// --- ROUTES ---

router.get('/main-data', async (req, res) => {
    try {
        const { period = 'monthly' } = req.query;
        const invoiceDateFilter = getDateCondition(period, 'inv.issue_date');
        const soDateFilter = getDateCondition(period, 'so.order_date');

        const [kpi_sales, kpi_in_progress_mo, kpi_machines, quality_stats, top_defects, sales_kpi_orders, inventory_summary, sales_trend, top_mos] = await Promise.all([
            all(`SELECT SUM(grand_total) as total FROM invoices inv WHERE 1=1 ${invoiceDateFilter}`),
            all(`SELECT COUNT(mo.id) as count FROM manufacturing_orders mo WHERE mo.status = 'in_progress'`),
            all(`SELECT status, COUNT(id) as count FROM machines GROUP BY status`),
            all(`SELECT CAST(COALESCE(SUM(good_quantity), 0) AS REAL) as total_good, CAST(COALESCE(SUM(total_scrap_quantity), 0) AS REAL) as total_scrap FROM production_records`),
            all(`SELECT dt.code, dt.name as description, SUM(sr.quantity) as quantity FROM scrap_records sr JOIN defect_types dt ON sr.defect_code = dt.code GROUP BY dt.code, dt.name ORDER BY quantity DESC LIMIT 5`),
            all(`SELECT COUNT(id) as count FROM sales_orders so WHERE 1=1 ${soDateFilter}`),
            all(`SELECT item_type, stock_quantity, status, item_code, item_name, uom FROM items`),
            all(`SELECT to_char(inv.issue_date, 'YYYY-MM-DD') as date, SUM(inv.grand_total) as daily_sales FROM invoices inv WHERE inv.status != 'cancelled' ${invoiceDateFilter} GROUP BY date ORDER BY date ASC`),
            all(`SELECT mo.mo_number, i.item_name, mo.quantity_to_produce, mo.due_date FROM manufacturing_orders mo JOIN items i ON mo.item_code = i.item_code WHERE mo.status = 'in_progress' ORDER BY mo.due_date ASC LIMIT 5`)
        ].map(p => p.catch(e => [])));

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

router.get('/production-data', async (req, res) => {
    try {
        const machines = await all(`SELECT DISTINCT ON (machine_id) machine_id, timestamp, machine_status, mold_count, mold_temp_core, mold_temp_cavity, cycle_time_sec AS cycle_time, material_dry_temp, mo_number, item_name FROM machine_data ORDER BY machine_id, timestamp DESC`);
        res.json({ success: true, data: { kpis: { total_machines: machines.length, running: machines.filter(m => String(m.machine_status) === '1').length, stop: machines.filter(m => String(m.machine_status) === '0').length, alarm: machines.filter(m => String(m.machine_status) === '2').length }, machine_list: machines } });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ✅ RE-IMPLEMENTED: Record Production with NOW()
router.post('/record-production', async (req, res) => {
    try {
        const { mo_number, good_quantity, scraps, operator_name } = req.body;
        console.log(`[API] Recording production for ${mo_number} - Force NOW()`);

        const mo = await all("SELECT id FROM manufacturing_orders WHERE mo_number = $1", [mo_number]);
        if (mo.length === 0) return res.status(404).json({ success: false, error: "MO Not Found" });
        
        // ใช้ NOW() เพื่อบันทึกเวลาปัจจุบันจาก Server (PostgreSQL)
        const result = await pool.query(
            "INSERT INTO production_records (mo_id, record_date, shift, operator_name, good_quantity, total_scrap_quantity) VALUES ($1, NOW(), 'day', $2, $3, $4) RETURNING id", 
            [mo[0].id, operator_name, good_quantity, scraps.reduce((s, i) => s + i.quantity, 0)]
        );
        
        for (const s of scraps) {
            if (s.quantity > 0) await all("INSERT INTO scrap_records (record_id, defect_code, quantity) VALUES ($1, $2, $3)", [result.rows[0].id, s.defect_code, s.quantity]);
        }
        res.json({ success: true, message: "Recorded Successfully" });
    } catch (e) { 
        res.status(500).json({ success: false, error: e.message }); 
    }
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
router.get('/manufacturing-orders', async (req, res) => { try { const { machine_id, period = 'daily' } = req.query; let query = "SELECT mo_number, item_code, status, actual_start_time FROM manufacturing_orders WHERE 1=1"; const params = []; if (machine_id && machine_id !== 'all') { query += ` AND machine_id = $1`; params.push(machine_id); } if (period === 'daily') query += " AND actual_start_time::date = CURRENT_DATE"; else if (period === 'weekly') query += " AND actual_start_time >= NOW() - INTERVAL '7 days'"; else if (period === 'monthly') query += " AND to_char(actual_start_time, 'YYYY-MM') = to_char(NOW(), 'YYYY-MM')"; query += " ORDER BY created_at DESC LIMIT 100"; res.json({ success: true, data: await all(query, params) }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
router.get('/mo-details/:moNumber', async (req, res) => { try { const job = await all("SELECT * FROM manufacturing_orders WHERE mo_number = $1", [req.params.moNumber]); if (!job.length) return res.status(404).json({error:'Not Found'}); const records = await all("SELECT * FROM production_records WHERE mo_id = $1 ORDER BY record_date DESC", [job[0].id]); const scraps = await all(`SELECT dt.name as defect_description, SUM(sr.quantity) as total_quantity FROM scrap_records sr JOIN production_records pr ON sr.record_id = pr.id JOIN defect_types dt ON sr.defect_code = dt.code WHERE pr.mo_id = $1 GROUP BY dt.code, dt.name`, [job[0].id]); const timeSeries = await all("SELECT timestamp, mold_temp_core, mold_temp_cavity, mold_count, material_dry_temp FROM machine_data WHERE mo_number = $1 ORDER BY timestamp ASC LIMIT 500", [req.params.moNumber]); res.json({ success: true, data: { summary: job[0], production_records: records, scrap_details: scraps, time_series: timeSeries } }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
router.get('/advanced-oee', async (req, res) => { res.json({ success: true, data: { currentOee: 82.5, oeeMetrics: [], activeMachines: [] } }); });
router.post('/force-status', async (req, res) => { try { await axios.post(`${FLASK_API_URL}/api/plc/force-status`, { plc_name: MACHINE_CODE_TO_PLC_NAME[req.body.machine_code], status: req.body.status }); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });

module.exports = router;
EOF

# 2. เขียนไฟล์ Frontend (public/mo_dashboard.html) ใหม่
# เน้น: แก้ formatDateTime ให้แสดงเวลาละเอียด (วัน เดือน ปี ชั่วโมง นาที)
echo "[2/3] Updating Frontend (public/mo_dashboard.html)..."
cat << 'EOF' > public/mo_dashboard.html
<!doctype html>
<html lang="th" data-bs-theme="dark">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>MO Dashboard</title>
    <link href="https://cdn.jsdelivr.net/npm/@tabler/core@latest/dist/css/tabler.min.css" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>.kpi-value { font-size: 2rem; font-weight: 600; line-height: 1.2; }</style>
</head>
<body>
    <div class="page">
        <aside class="navbar navbar-vertical navbar-expand-lg" data-bs-theme="dark" id="sidebar"></aside>
        <div class="page-wrapper">
            <div class="page-header d-print-none">
                <div class="container-xl">
                    <div class="row g-2 align-items-center">
                        <div class="col"><h2 class="page-title">วิเคราะห์ใบสั่งผลิต (MO Analysis)</h2></div>
                        <div class="col-auto ms-auto d-print-none">
                            <div class="d-flex">
                                <div class="btn-group me-2" role="group" id="period-filter">
                                    <button type="button" class="btn btn-outline-secondary active" data-period="daily">Today</button>
                                    <button type="button" class="btn btn-outline-secondary" data-period="weekly">Week</button>
                                    <button type="button" class="btn btn-outline-secondary" data-period="monthly">Month</button>
                                </div>
                                <select class="form-select d-inline-block w-auto me-2" id="machine-filter"><option value="all">ทุกเครื่องจักร</option></select>
                                <div style="min-width: 250px;"><select class="form-select" id="mo-select"><option value="">-- เลือกใบสั่งผลิต --</option></select></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="page-body">
                <div class="container-xl">
                    <div id="dashboard-content" class="d-none">
                        <div class="row g-4 mb-4">
                            <div class="col-6 col-lg-3"><div class="card card-body"><div class="subheader">เป้าหมาย (Target)</div><div class="kpi-value text-primary" id="kpi-total-product">0</div></div></div>
                            <div class="col-6 col-lg-3"><div class="card card-body"><div class="subheader">ของดี (Good)</div><div class="kpi-value text-success" id="kpi-total-good">0</div></div></div>
                            <div class="col-6 col-lg-3"><div class="card card-body"><div class="subheader">ของเสีย (Scrap)</div><div class="kpi-value text-danger" id="kpi-total-scrap">0</div></div></div>
                            <div class="col-6 col-lg-3"><div class="card card-body"><div class="subheader">คงเหลือ (Remaining)</div><div class="kpi-value text-warning" id="kpi-diff">0</div></div></div>
                        </div>
                        <div class="row g-4">
                            <div class="col-lg-8">
                                <div class="card mb-4"><div class="card-header"><h3 class="card-title">ข้อมูลใบสั่งผลิต</h3></div><div class="card-body"><div id="summary-container"></div></div></div>
                                <div class="card"><div class="card-header"><h3 class="card-title">บันทึกการผลิต</h3></div><div class="table-responsive"><table class="table card-table table-vcenter"><thead><tr><th>วันที่/เวลา</th><th>ผู้บันทึก</th><th class="text-end">ของดี</th><th class="text-end">ของเสีย</th></tr></thead><tbody id="production-records-table"></tbody></table></div></div>
                            </div>
                            <div class="col-lg-4">
                                <div class="card mb-4"><div class="card-header"><h3 class="card-title">สัดส่วนของเสีย</h3></div><div class="card-body"><div style="height: 280px;"><canvas id="scrapChart"></canvas></div></div></div>
                            </div>
                        </div>
                        <div class="row mt-4"><div class="col-12"><div class="card"><div class="card-header"><h3 class="card-title">กราฟข้อมูลระหว่างการผลิต</h3></div><div class="card-body"><div style="height: 350px;"><canvas id="sensorChart"></canvas></div></div></div></div></div>
                    </div>
                    <div id="placeholder-text" class="text-center text-muted py-5"><h3>กรุณาเลือกใบสั่งผลิตเพื่อดูข้อมูล</h3></div>
                </div>
            </div>
        </div>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@tabler/core@latest/dist/js/tabler.min.js"></script>
    <script src="/js/auth-client.js"></script>
    <script>
        function setActiveMenuItem(id) {}
        document.addEventListener("DOMContentLoaded", async function () {
            let sensorChart, scrapChart;
            const moSelect = document.getElementById('mo-select');
            const machineFilterSelect = document.getElementById('machine-filter');
            const periodFilterButtons = document.getElementById('period-filter');
            let currentPeriod = 'daily';
            let currentMachineId = 'all';

            const formatDateTime = (dateString) => {
                if (!dateString) return '-';
                const date = new Date(dateString);
                return date.toLocaleString('th-TH', { 
                    day: '2-digit', month: 'short', year: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                });
            };

            async function loadMoList() {
                const url = new URL(window.location.origin + '/api/dashboard/manufacturing-orders');
                if (currentMachineId !== 'all') url.searchParams.append('machine_id', currentMachineId);
                url.searchParams.append('period', currentPeriod);
                try {
                    const response = await fetchWithAuth(url);
                    const result = await response.json();
                    moSelect.innerHTML = '<option value="">-- เลือกใบสั่งผลิต --</option>';
                    if (result.success && result.data.length > 0) {
                        result.data.forEach(mo => moSelect.add(new Option(`${mo.mo_number} (${mo.item_code})`, mo.mo_number)));
                        if(moSelect.options.length > 1) { moSelect.selectedIndex = 1; loadMoDetails(moSelect.value); }
                    }
                } catch (e) { console.error(e); }
            }

            async function loadMoDetails(moNumber) {
                if (!moNumber) return;
                try {
                    const res = await fetchWithAuth(`/api/dashboard/mo-details/${moNumber}`);
                    const json = await res.json();
                    if (!json.success) return;
                    document.getElementById('dashboard-content').classList.remove('d-none');
                    document.getElementById('placeholder-text').classList.add('d-none');
                    const { summary, time_series, production_records, scrap_details } = json.data;
                    const totalGood = (production_records||[]).reduce((s, r) => s + (r.good_quantity||0), 0);
                    const totalScrap = (production_records||[]).reduce((s, r) => s + (r.total_scrap_quantity||0), 0);
                    const target = summary.quantity_to_produce || 0;
                    document.getElementById('kpi-total-product').innerText = target.toLocaleString();
                    document.getElementById('kpi-total-good').innerText = totalGood.toLocaleString();
                    document.getElementById('kpi-total-scrap').innerText = totalScrap.toLocaleString();
                    document.getElementById('kpi-diff').innerText = (target - (totalGood+totalScrap)).toLocaleString();
                    const progress = target > 0 ? (((totalGood+totalScrap)/target)*100).toFixed(1) : 0;
                    document.getElementById('summary-container').innerHTML = `<div class="row"><div class="col-6 mb-2"><strong>MO:</strong> ${summary.mo_number}</div><div class="col-6 mb-2"><strong>Item:</strong> ${summary.item_name}</div><div class="col-6 mb-2"><strong>Machine:</strong> ${summary.machine_code}</div><div class="col-6 mb-2"><strong>Status:</strong> <span class="badge bg-blue-lt">${summary.status}</span></div></div><div class="mt-2"><div class="d-flex justify-content-between"><span>Progress</span><span>${progress}%</span></div><div class="progress"><div class="progress-bar" style="width: ${progress}%"></div></div></div>`;
                    document.getElementById('production-records-table').innerHTML = (production_records||[]).map(r => `<tr><td>${formatDateTime(r.record_date)}</td><td>${r.operator_name}</td><td class="text-success text-end">${r.good_quantity}</td><td class="text-danger text-end">${r.total_scrap_quantity}</td></tr>`).join('');
                    updateCharts(time_series, scrap_details);
                } catch (e) { console.error(e); }
            }

            function updateCharts(sensors, scraps) {
                const ctx1 = document.getElementById('sensorChart').getContext('2d');
                if (sensorChart) sensorChart.destroy();
                sensorChart = new Chart(ctx1, { type: 'line', data: { labels: (sensors||[]).map(d => new Date(d.timestamp).toLocaleTimeString('th-TH')), datasets: [{ label: 'Core Temp', data: (sensors||[]).map(d => d.mold_temp_core), borderColor: '#206bc4', tension: 0.4 }, { label: 'Cavity Temp', data: (sensors||[]).map(d => d.mold_temp_cavity), borderColor: '#4299e1', tension: 0.4 }] }, options: { responsive: true, maintainAspectRatio: false } });
                const ctx2 = document.getElementById('scrapChart').getContext('2d');
                if (scrapChart) scrapChart.destroy();
                scrapChart = new Chart(ctx2, { type: 'doughnut', data: { labels: (scraps||[]).map(s => s.defect_description), datasets: [{ data: (scraps||[]).map(s => s.total_quantity), backgroundColor: ['#d63939', '#f59f00', '#206bc4'] }] }, options: { responsive: true, maintainAspectRatio: false } });
            }

            periodFilterButtons.addEventListener('click', e => { if(e.target.tagName === 'BUTTON') { periodFilterButtons.querySelector('.active').classList.remove('active'); e.target.classList.add('active'); currentPeriod = e.target.dataset.period; loadMoList(); } });
            machineFilterSelect.addEventListener('change', e => { currentMachineId = e.target.value; loadMoList(); });
            moSelect.addEventListener('change', e => loadMoDetails(e.target.value));
            loadSidebar().catch(e=>{});
            try { const res = await fetchWithAuth('/api/dashboard/machines'); const json = await res.json(); if(json.success) json.data.forEach(m => machineFilterSelect.add(new Option(m.machine_code, m.id))); } catch(e){}
            loadMoList();
        });
    </script>
</body>
</html>
EOF

# 3. Restart Server (สำคัญมาก!)
echo "[3/3] Restarting Web Server..."
docker compose restart web

echo "✅ DONE! System has been fully updated."
