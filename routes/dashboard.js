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
                overview: { kpi_in_progress_mo: parseInt(kpi_in_progress_mo[0]?.count || 0), machine_status: machineStatus, oee: { overall: 82.5 }, quality: { scrap_rate: totalProduction > 0 ? (totalScrap / totalProduction) * 100 : 0, total_scrap: totalScrap, top_defects: top_defects || [] } },
                sales: { total_sales: parseFloat(kpi_sales[0]?.total || 0), new_orders: parseInt(sales_kpi_orders[0]?.count || 0), sales_trend: sales_trend || [], top_mos: top_mos || [] },
                inventory: { total_sku: inventory_summary.length, low_stock_items: inventory_summary.filter(item => item.status === 'low_stock').slice(0, 5) }
            }
        });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

router.get('/production-data', async (req, res) => {
    try {
        const machines = await all(`
            SELECT DISTINCT ON (md.machine_id)
                md.machine_id, md.timestamp, md.machine_status, md.mold_count,
                md.mold_temp_core, md.mold_temp_cavity, md.cycle_time_sec AS cycle_time,
                md.material_dry_temp, md.mo_number,
                COALESCE(i.item_name, 'N/A') as item_name
            FROM machine_data md
            LEFT JOIN manufacturing_orders mo ON md.mo_number = mo.mo_number
            LEFT JOIN items i ON mo.item_code = i.item_code
            ORDER BY md.machine_id, md.timestamp DESC
        `);
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
            "INSERT INTO production_records (mo_id, record_date, shift, operator_name, good_quantity, waste_quantity) VALUES ($1, NOW(), 'day', $2, $3, $4) RETURNING id",
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

router.get('/machines', async (req, res) => { try { res.json({ success: true, data: await all("SELECT id, machine_code FROM machines ORDER BY machine_code") }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
router.get('/machine-view/:machineCode', async (req, res) => {
    try {
        const info = await all("SELECT * FROM machines WHERE machine_code = $1", [req.params.machineCode]);
        if (!info.length) return res.status(404).json({ error: 'Not found' });

        // Updated Query to get Cavity and Shot Count
        const job = await all(`
            SELECT
                mo.*,
                i.item_name,
                (SELECT COALESCE(SUM(good_quantity), 0) FROM production_records pr WHERE pr.mo_id = mo.id) as total_good,
                (SELECT COALESCE(SUM(waste_quantity), 0) FROM production_records pr WHERE pr.mo_id = mo.id) as total_scrap,
                
                -- Helper: Get Cavity
                (SELECT m.cavity FROM boms b JOIN molds m ON b.mold_id = m.id WHERE b.id = mo.bom_id LIMIT 1) as cavity,
                
                -- Helper: Get Shot Count for this MO (Realtime from Machine Data)
                (SELECT MAX(mold_count) - MIN(mold_count) FROM machine_data md WHERE md.mo_number = mo.mo_number) as shot_count_val

            FROM manufacturing_orders mo 
            JOIN items i ON mo.item_code = i.item_code 
            WHERE mo.machine_id = $1 AND mo.status = 'in_progress'
        `, [info[0].id]);

        // Process Total Produced Logic
        if (job[0]) {
            const cavity = parseInt(job[0].cavity || 1); // Default cavity 1 if not set
            const shotCount = parseInt(job[0].shot_count_val || 0);

            console.log(`[MachineView] MO: ${job[0].mo_number}, Cavity: ${cavity}, ShotCount: ${shotCount}, RawTotalGood: ${job[0].total_good}`);

            // If we have valid shot count (even if 0 difference initially, if machines data exists we might want to trust it? 
            // but usually difference > 0 means machine started).
            // Let's stick strictly to: if we have tracking data, use it.
            if (shotCount >= 0 && job[0].shot_count_val !== null) {
                job[0].calculated_total_produced = shotCount * cavity;
                job[0].is_auto_count = true;
            } else {
                job[0].calculated_total_produced = parseInt(job[0].total_good || 0) + parseInt(job[0].total_scrap || 0);
                job[0].is_auto_count = false;
            }
        }

        const pending = await all(`SELECT mo.mo_number, mo.item_code, mo.quantity_to_produce, i.item_name FROM manufacturing_orders mo JOIN items i ON mo.item_code = i.item_code WHERE mo.machine_id = $1 AND mo.status = 'pending' ORDER BY mo.due_date ASC LIMIT 10`, [info[0].id]);

        res.json({ success: true, data: { machine: info[0], inProgressJob: job[0] || null, pendingJobs: pending } });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
router.get('/machines-overview', async (req, res) => { try { res.json({ success: true, data: await all(`SELECT m.id, m.machine_code, m.status as machine_status, mo.mo_number, mo.item_code, mo.quantity_to_produce, (SELECT SUM(COALESCE(pr.good_quantity, 0)) FROM production_records pr WHERE pr.mo_id = mo.id) as total_produced FROM machines m LEFT JOIN manufacturing_orders mo ON m.id = mo.machine_id AND mo.status = 'in_progress' ORDER BY m.machine_code ASC`) }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });

router.get('/running-mo/:machineId', async (req, res) => {
    try {
        const { machineId } = req.params;
        const result = await all("SELECT mo_number, item_code FROM manufacturing_orders WHERE machine_id = $1 AND status = 'in_progress'", [machineId]);
        res.json({ success: true, data: result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
router.post('/start-specific-job', async (req, res) => {
    const client = await pool.connect();
    try {
        const { machine_id, mo_number } = req.body;

        // 1. Get Machine Info
        console.log(`[Start-Job] Processing for Machine ID: ${machine_id}, MO: ${mo_number}`);
        const machineRes = await client.query("SELECT machine_code FROM machines WHERE id = $1", [machine_id]);
        if (machineRes.rows.length === 0) throw new Error("Machine not found");

        const machine_code = machineRes.rows[0].machine_code;
        const plc_name = MACHINE_CODE_TO_PLC_NAME[machine_code];

        // 2. Get Job Details (Item Name, Quantity, Item Code)
        const jobRes = await client.query(`
            SELECT mo.quantity_to_produce, i.item_name 
            FROM manufacturing_orders mo
            JOIN items i ON mo.item_code = i.item_code
            WHERE mo.mo_number = $1
        `, [mo_number]);

        if (jobRes.rows.length === 0) throw new Error(`Job ${mo_number} not found`);
        const { item_name, quantity_to_produce } = jobRes.rows[0];

        // 3. Call PLC to Write Job Data (Handshake handled by Python service)
        // Endpoint: /api/plc/write-job from the Python App reference
        if (plc_name) {
            console.log(`[Backend-PLC] Sending Job to ${plc_name} (${machine_code})...`);
            console.log(`[Backend-PLC] Payload: MO=${mo_number}, Item=${item_name}, Qty=${quantity_to_produce}`);

            await axios.post(`${FLASK_API_URL}/api/plc/write-job`, {
                plc_name: plc_name,
                mo_number: mo_number,
                item_name: item_name,
                quantity: quantity_to_produce
            });
            console.log(`[Backend-PLC] ${plc_name} Confirmed Job Write.`);
        } else {
            console.warn(`[Backend-PLC] No PLC Mapping for ${machine_code}. skipping PLC.`);
        }

        // 4. Update Database
        await client.query('BEGIN');
        await client.query(
            "UPDATE manufacturing_orders SET status = 'in_progress', machine_id = $1, actual_start_time = NOW() WHERE mo_number = $2",
            [machine_id, mo_number]
        );
        await client.query('COMMIT');

        res.json({ success: true, message: "Production Started (PLC & DB Synced)" });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Start Job Error:", e.message);

        let errMsg = e.message;
        if (e.response) {
            // Extract detailed error from Flask response if available
            const flaskErr = e.response.data ? (e.response.data.message || JSON.stringify(e.response.data)) : e.response.statusText;
            errMsg = `PLC Error (${e.response.status}): ${flaskErr}`;
        }
        res.status(500).json({ success: false, error: errMsg });
    } finally {
        client.release();
    }
});
router.post('/stop-job', async (req, res) => { try { await pool.query("UPDATE manufacturing_orders SET status = 'completed', actual_end_time = NOW() WHERE mo_number = $1", [req.body.mo_number]); res.json({ success: true, message: "Stopped" }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
router.get('/production-records/defect-codes', async (req, res) => { try { res.json({ success: true, data: await all("SELECT code, name, description FROM defect_types ORDER BY code") }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
router.get('/downtime-reasons', async (req, res) => { try { res.json({ success: true, data: await all("SELECT id, reason_code, description FROM downtime_reasons ORDER BY reason_code ASC") }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
router.get('/downtime-logs', async (req, res) => { try { const { machine_id, period = 'daily' } = req.query; const params = []; let filter = getDowntimeDateFilter(period); if (machine_id && machine_id !== 'all') { filter += ' AND l.machine_id = $1'; params.push(machine_id); } const logs = await all(`SELECT l.id, l.machine_id, l.status, l.start_time, l.end_time, l.duration_sec, l.reason_id, l.notes, m.machine_code, r.reason_code, r.description AS reason_description FROM machine_status_logs l LEFT JOIN downtime_reasons r ON l.reason_id = r.id LEFT JOIN machines m ON l.machine_id = m.machine_code WHERE l.status <> 1 ${filter} ORDER BY l.start_time DESC LIMIT 100`, params); res.json({ success: true, data: logs }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
router.get('/downtime-summary', async (req, res) => { try { const { machine_id, period = 'daily' } = req.query; const params = []; let filter = getDowntimeDateFilter(period); if (machine_id && machine_id !== 'all') { filter += ' AND l.machine_id = $1'; params.push(machine_id); } const summary = await all(`SELECT COALESCE(r.reason_code, 'N/A') as reason_code, COALESCE(r.description, 'Unassigned') as reason_description, SUM(l.duration_sec) as total_duration FROM machine_status_logs l LEFT JOIN downtime_reasons r ON l.reason_id = r.id WHERE l.status <> 1 ${filter} GROUP BY r.reason_code, r.description ORDER BY total_duration DESC`, params); res.json({ success: true, data: summary }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
router.post('/assign-downtime-reason', async (req, res) => { try { await pool.query("UPDATE machine_status_logs SET reason_id = $1, notes = $2 WHERE id = $3", [req.body.reason_id, req.body.notes, req.body.log_id]); res.json({ success: true, message: "Saved" }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
router.get('/manufacturing-orders', async (req, res) => { try { const { machine_id, period = 'daily' } = req.query; let query = "SELECT mo_number, item_code, status, actual_start_time FROM manufacturing_orders WHERE 1=1"; const params = []; if (machine_id && machine_id !== 'all') { query += ` AND machine_id = $1`; params.push(machine_id); } if (period === 'daily') query += " AND actual_start_time::date = CURRENT_DATE"; else if (period === 'weekly') query += " AND actual_start_time >= NOW() - INTERVAL '7 days'"; else if (period === 'monthly') query += " AND to_char(actual_start_time, 'YYYY-MM') = to_char(NOW(), 'YYYY-MM')"; query += " ORDER BY created_at DESC LIMIT 100"; res.json({ success: true, data: await all(query, params) }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
router.get('/mo-details/:moNumber', async (req, res) => {
    try {
        const job = await all("SELECT mo.*, i.item_name, m.machine_code FROM manufacturing_orders mo LEFT JOIN items i ON mo.item_code = i.item_code LEFT JOIN machines m ON mo.machine_id = m.id WHERE mo.mo_number = $1", [req.params.moNumber]); if (!job.length) return res.status(404).json({ error: 'Not Found' }); const records = await all("SELECT * FROM production_records WHERE mo_id = $1 ORDER BY record_date DESC", [job[0].id]); const scraps = await all(`SELECT dt.name as defect_description, SUM(sr.quantity) as total_quantity FROM scrap_records sr JOIN production_records pr ON sr.record_id = pr.id JOIN defect_types dt ON sr.defect_code = dt.code WHERE pr.mo_id = $1 GROUP BY dt.code, dt.name`, [job[0].id]); const timeSeries = await all("SELECT timestamp, mold_temp_core, mold_temp_cavity, mold_count, material_dry_temp, cycle_time_sec FROM machine_data WHERE mo_number = $1 ORDER BY timestamp ASC LIMIT 500", [req.params.moNumber]); const cycleSeries = await all("SELECT DISTINCT ON (mold_count) timestamp, mold_count, cycle_time_sec FROM machine_data WHERE mo_number = $1 AND mold_count IS NOT NULL ORDER BY mold_count ASC, timestamp DESC", [req.params.moNumber]);
        const shiftSeries = await all(`
        SELECT
            CASE
                WHEN (timestamp::time >= '07:30:00' AND timestamp::time < '19:30:00') THEN timestamp::date
                WHEN (timestamp::time >= '19:30:00') THEN timestamp::date
                ELSE (timestamp::date - 1)
            END as shift_date,
            CASE
                WHEN (timestamp::time >= '07:30:00' AND timestamp::time < '19:30:00') THEN 'Day'
                ELSE 'Night'
            END as shift_name,
            MAX(mold_count) - MIN(mold_count) as produced_qty
        FROM machine_data
        WHERE mo_number = $1
        GROUP BY 1, 2
        ORDER BY 1 ASC, 2 ASC
    `, [req.params.moNumber]);
        res.json({ success: true, data: { summary: job[0], production_records: records, scrap_details: scraps, time_series: timeSeries, cycle_series: cycleSeries, shift_series: shiftSeries } });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});
router.get('/advanced-oee', async (req, res) => { res.json({ success: true, data: { currentOee: 82.5, oeeMetrics: [], activeMachines: [] } }); });
router.post('/force-status', async (req, res) => { try { await axios.post(`${FLASK_API_URL}/api/plc/force-status`, { plc_name: MACHINE_CODE_TO_PLC_NAME[req.body.machine_code], status: req.body.status }); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });

module.exports = router;
