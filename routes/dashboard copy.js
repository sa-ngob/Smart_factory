const express = require('express');
const router = express.Router();
const db = require('../database.js');

// Helper function for running DB queries with Promises
const all = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows); });
});

// Helper function to create date conditions for queries
const getDateCondition = (period, dateColumn) => {
    const now = new Date();
    let startDate;
    if (period === 'daily') {
        startDate = new Date(now.setHours(0, 0, 0, 0));
    } else if (period === 'monthly') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'yearly') {
        startDate = new Date(now.getFullYear(), 0, 1);
    }
    return startDate ? ` AND ${dateColumn} >= '${startDate.toISOString().slice(0, 19).replace('T', ' ')}'` : '';
};

// ✅ FIX: 1. (เพิ่มใหม่) Helper ใหม่สำหรับกรอง Downtime Log (รองรับ SQLite)
const getDowntimeDateFilter = (period = 'daily') => {
    switch (period) {
        case 'weekly':
            // 7 วันย้อนหลัง (รวมวันนี้)
            return " AND l.start_time >= strftime('%Y-%m-%d 00:00:00', 'now', 'localtime', 'start of day', '-6 days') ";
        case 'monthly':
            // เดือนนี้
            return " AND strftime('%Y-%m', l.start_time) = strftime('%Y-%m', 'now', 'localtime') ";
        case 'yearly':
            // ปีนี้
            return " AND strftime('%Y', l.start_time) = strftime('%Y', 'now', 'localtime') ";
        case 'daily':
        default:
            // วันนี้
            return " AND strftime('%Y-%m-%d', l.start_time) = strftime('%Y-%m-%d', 'now', 'localtime') ";
    }
};

//==============================================================================
// MAIN DASHBOARD API (คงไว้)
//==============================================================================
router.get('/main-data', async (req, res) => {
    try {
        const { period = 'monthly' } = req.query;
        const invoiceDateFilter = getDateCondition(period, 'inv.issue_date');
        const soDateFilter = getDateCondition(period, 'so.order_date');
        const promises = {
            kpi_sales: all(`SELECT SUM(grand_total) as total FROM invoices inv WHERE 1=1 ${invoiceDateFilter}`),
            kpi_in_progress_mo: all(`SELECT COUNT(mo.id) as count FROM manufacturing_orders mo JOIN sales_orders so ON mo.so_id = so.id WHERE mo.status = 'in_progress' ${soDateFilter}`),
            kpi_machines: all(`SELECT status, COUNT(id) as count FROM machines GROUP BY status`),
            quality_stats: all(`SELECT CAST(IFNULL(SUM(good_quantity), 0) AS REAL) as total_good, CAST(IFNULL(SUM(total_scrap_quantity), 0) AS REAL) as total_scrap FROM production_records`),
            top_defects: all(`SELECT dc.code, dc.description, SUM(sr.quantity) as quantity FROM scrap_records sr JOIN defect_codes dc ON sr.defect_code_id = dc.id GROUP BY sr.defect_code_id ORDER BY quantity DESC LIMIT 5`),
            sales_kpi_orders: all(`SELECT COUNT(id) as count FROM sales_orders so WHERE 1=1 ${soDateFilter}`),
            inventory_summary: all(`SELECT item_type, stock_quantity, status, item_code, item_name, uom FROM items`),
        };
        const results = await Promise.all(Object.values(promises).map(p => p.catch(e => e)));
        const [
            kpi_sales, kpi_in_progress_mo, kpi_machines, quality_stats, top_defects,
            sales_kpi_orders, inventory_summary
        ] = results;
        if (kpi_sales instanceof Error) console.error("Sales KPI failed:", kpi_sales);
        const totalGood = quality_stats[0]?.total_good || 0;
        const totalScrap = quality_stats[0]?.total_scrap || 0;
        const totalProduction = totalGood + totalScrap;
        const qualityPercent = totalProduction > 0 ? (totalGood / totalProduction) * 100 : 100;
        const machineStatus = { running: 0, idle: 0, down: 0 };
        if (!(kpi_machines instanceof Error)) {
            kpi_machines.forEach(row => { machineStatus[row.status] = row.count; });
        }
        const inventoryValue = 0;
        const inventoryByType = inventory_summary instanceof Error ? {} : inventory_summary.reduce((acc, item) => {
            const key = item.item_type || 'unknown'; acc[key] = (acc[key] || 0) + 1; return acc;
        }, {});
        const responseData = {
            overview: {
                kpi_in_progress_mo: kpi_in_progress_mo[0]?.count || 0,
                machine_status: machineStatus,
                oee: { overall: 82.5, availability: 95.0, performance: 90.5, quality: qualityPercent },
                quality: { scrap_rate: totalProduction > 0 ? (totalScrap / totalProduction) * 100 : 0, total_scrap: totalScrap, top_defects },
            },
            sales: {
                total_sales: kpi_sales[0]?.total || 0, new_quotes: 0, new_orders: sales_kpi_orders[0]?.count || 0, quote_table: []
            },
            inventory: {
                total_value: inventoryValue,
                total_sku: inventory_summary instanceof Error ? 0 : inventory_summary.length,
                type_breakdown: { labels: Object.keys(inventoryByType), series: Object.values(inventoryByType) },
                low_stock_items: inventory_summary instanceof Error ? [] : inventory_summary.filter(item => item.status === 'low_stock').slice(0, 5)
            }
        };
        res.json({ success: true, data: responseData });
    } catch (error) {
        console.error("Dashboard API Unhandled Error:", error.message);
        res.status(500).json({ success: false, error: "เกิดข้อผิดพลาดรุนแรงในการดึงข้อมูล Dashboard" });
    }
});

// ==============================================================================
// REAL-TIME PRODUCTION DASHBOARD API (คงไว้)
// ==============================================================================
router.get('/production-data', async (req, res) => {
    try {
        const latestMachineDataSQL = `
            SELECT
                machine_id,
                timestamp,
                machine_status,
                mold_count,
                mold_temp_core,
                mold_temp_cavity,
                cycle_time_sec AS cycle_time,
                material_dry_temp,
                mo_number,
                item_name
            FROM machine_data
            ORDER BY machine_id;
        `;
        
        const machines = await all(latestMachineDataSQL);
        const production_kpis = {
            total_machines: machines.length,
            running: machines.filter(m => m.machine_status === 1).length,
            stop: machines.filter(m => m.machine_status === 0).length,
            alarm: machines.filter(m => m.machine_status === 2).length,
        };
        res.json({ success: true, data: { kpis: production_kpis, machine_list: machines } });
    } catch (error) {
        console.error("Production Data API Error:", error.message);
        res.status(500).json({ success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูลการผลิต" });
    }
});


//==============================================================================
// OPERATOR INTERFACE & MACHINE VIEW APIs (คงไว้)
//==============================================================================
router.get('/machines', async (req, res) => {
    try {
        const machines = await all("SELECT id, machine_code, machine_name FROM machines ORDER BY machine_code");
        res.json({ success: true, data: machines });
    } catch (error) { res.status(500).json({ success: false, error: "ไม่สามารถดึงข้อมูลเครื่องจักรได้" }); }
});

router.get('/machine-view/:machineCode', async (req, res) => {
    const { machineCode } = req.params;
    try {
        const machineInfo = await all("SELECT * FROM machines WHERE machine_code = ?", [machineCode]);
        if (machineInfo.length === 0) return res.status(404).json({ success: false, error: 'ไม่พบเครื่องจักรนี้' });
        const machineId = machineInfo[0].id;
        const inProgressJob = await all(`
            SELECT mo.*, i.item_name,
            (SELECT SUM(IFNULL(good_quantity, 0)) FROM production_records WHERE mo_id = mo.id) as total_good,
            (SELECT SUM(IFNULL(total_scrap_quantity, 0)) FROM production_records WHERE mo_id = mo.id) as total_scrap
            FROM manufacturing_orders mo JOIN items i ON mo.item_code = i.item_code
            WHERE mo.machine_id = ? AND mo.status = 'in_progress'`, [machineId]);
        const pendingJobs = await all(`
            SELECT mo.mo_number, mo.item_code, mo.quantity_to_produce, i.item_name
            FROM manufacturing_orders mo JOIN items i ON mo.item_code = i.item_code
            WHERE mo.machine_id = ? AND mo.status = 'pending' ORDER BY mo.due_date ASC LIMIT 10;`, [machineId]);
        res.json({ success: true, data: { machine: machineInfo[0], inProgressJob: inProgressJob[0] || null, pendingJobs }});
    } catch (error) {
        console.error("API /machine-view Error:", error);
        res.status(500).json({ success: false, error: "API Error in /machine-view" });
    }
});

router.post('/start-specific-job', async (req, res) => {
    const { mo_number, machine_id } = req.body;
    try {
        const runningJob = await all("SELECT * FROM manufacturing_orders WHERE machine_id = ? AND status = 'in_progress'", [machine_id]);
        if (runningJob.length > 0) return res.status(409).json({ success: false, error: `เครื่องจักรกำลังทำงาน ${runningJob[0].mo_number} อยู่` });
        db.run(`UPDATE manufacturing_orders SET status = 'in_progress', machine_id = ?, actual_start_time = datetime('now', 'localtime') WHERE mo_number = ? AND status = 'pending'`,
        [machine_id, mo_number], function(err) {
            if (err) return res.status(500).json({ success: false, error: "DB Error" });
            if (this.changes === 0) return res.status(404).json({ success: false, error: "ไม่พบ MO หรือ MO ไม่ได้อยู่ในสถานะ Pending" });
            res.json({ success: true, message: `เริ่มงาน ${mo_number} สำเร็จ` });
        });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/stop-job', (req, res) => {
    const { mo_number } = req.body;
    db.run("UPDATE manufacturing_orders SET status = 'completed', actual_end_time = datetime('now', 'localtime') WHERE mo_number = ?", [mo_number], function(err) {
        if(err) return res.status(500).json({success: false, error: err.message});
        res.json({ success: true, message: `หยุดงาน ${mo_number} สำเร็จ`});
    });
});

router.post('/record-production', async (req, res) => {
    const { mo_number, good_quantity, scraps, operator_name } = req.body;
    if (!mo_number || good_quantity === undefined || !scraps || !operator_name) {
        return res.status(400).json({ success: false, error: "ข้อมูลไม่ครบถ้วน" });
    }
    try {
        const mo_info = await all("SELECT id FROM manufacturing_orders WHERE mo_number = ?", [mo_number]);
        if (mo_info.length === 0) return res.status(404).json({ success: false, error: "ไม่พบ MO" });
        const mo_id = mo_info[0].id;
        const total_scrap = scraps.reduce((sum, s) => sum + s.quantity, 0);
        const record_id = await new Promise((resolve, reject) => {
             db.run(
                "INSERT INTO production_records (mo_id, record_date, shift, operator_name, good_quantity, total_scrap_quantity, created_at) VALUES (?, date('now'), ?, ?, ?, ?, datetime('now', 'localtime'))",
                [mo_id, new Date().getHours() < 20 ? 'day' : 'night', operator_name, good_quantity, total_scrap],
                function(err) { if (err) reject(err); else resolve(this.lastID); }
            );
        });
        for (const scrap of scraps) {
            if (scrap.quantity > 0) {
                await all("INSERT INTO scrap_records (record_id, defect_code_id, quantity) VALUES (?, ?, ?)", [record_id, scrap.defect_id, scrap.quantity]);
            }
        }
        res.json({ success: true, message: "บันทึกผลผลิตสำเร็จ" });
    } catch (e) {
        console.error("API /record-production Error:", e);
        res.status(500).json({ success: false, error: "เกิดข้อผิดพลาดในการบันทึกผลผลิต" });
    }
});

router.get('/production-records/defect-codes', async (req, res) => {
    try {
        const defects = await all("SELECT id, code, description FROM defect_codes WHERE is_active = 1 ORDER BY code");
        res.json({ success: true, data: defects });
    } catch (error) {
        res.status(500).json({ success: false, error: 'ไม่สามารถดึงข้อมูลประเภทของเสียได้' });
    }
});

//==============================================================================
// MO ANALYSIS & OEE DASHBOARD APIs (คงไว้)
//==============================================================================
router.get('/manufacturing-orders', async (req, res) => {
    try {
        const mos = await all(`SELECT mo_number, item_code, status FROM manufacturing_orders ORDER BY created_at DESC`);
        res.json({ success: true, data: mos });
    } catch (error) {
        res.status(500).json({ success: false, error: "ไม่สามารถดึงข้อมูลใบสั่งผลิตได้" });
    }
});

router.get('/mo-details/:moNumber', async (req, res) => {
    const { moNumber } = req.params;
    try {
        const summary = await all(`
            SELECT mo.*, i.item_name, m.machine_code
            FROM manufacturing_orders mo
            LEFT JOIN items i ON mo.item_code = i.item_code
            LEFT JOIN machines m ON mo.machine_id = m.id
            WHERE mo.mo_number = ?`, [moNumber]);
        if (summary.length === 0) return res.status(404).json({ success: false, error: 'ไม่พบใบสั่งผลิตนี้' });
        const time_series_data = await all(`SELECT * FROM machine_data WHERE mo_number = ? ORDER BY timestamp ASC`, [moNumber]);
        const production_records = await all(`
            SELECT * FROM production_records
            WHERE mo_id = (SELECT id FROM manufacturing_orders WHERE mo_number = ?)
            ORDER BY record_date DESC, created_at DESC`, [moNumber]);
        res.json({
            success: true,
            data: { summary: summary[0], time_series: time_series_data, production_records: production_records }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูล MO' });
    }
});

router.get('/advanced-oee', async (req, res) => {
    try {
        const { period = 'week', machine = 'all' } = req.query;
        const now = new Date();
        let startDate = new Date();
        if (period === 'day') startDate.setDate(now.getDate() - 1);
        if (period === 'week') startDate.setDate(now.getDate() - 7);
        if (period === 'month') startDate.setMonth(now.getMonth() - 1);
        const startDateString = startDate.toISOString().split('T')[0] + ' 00:00:00';
        let machineFilter = '';
        if (machine !== 'all') {
            machineFilter = `AND m.machine_code = '${machine}'`;
        }
        const dailyOeeSQL = `
            SELECT
                DATE(mo.actual_start_time) as oee_date, m.machine_code, i.cycle_time_sec,
                SUM(CAST(JULIANDAY(mo.actual_end_time) - JULIANDAY(mo.actual_start_time) AS REAL) * 24 * 3600) AS total_actual_run_time_sec,
                SUM(CAST(JULIANDAY(mo.planned_end_time) - JULIANDAY(mo.planned_start_time) AS REAL) * 24 * 3600) AS total_planned_run_time_sec,
                SUM(pr.good_quantity) as total_good, SUM(pr.total_scrap_quantity) as total_scrap
            FROM manufacturing_orders mo
            JOIN machines m ON mo.machine_id = m.id
            JOIN items i ON mo.item_code = i.item_code
            LEFT JOIN production_records pr ON pr.mo_id = mo.id
            WHERE mo.status = 'completed' AND mo.actual_start_time >= ? ${machineFilter}
            GROUP BY oee_date, m.machine_code;`;
        const dailyData = await all(dailyOeeSQL, [startDateString]);
        const calculatedDailyData = dailyData.map(row => {
            const total_produced = (row.total_good || 0) + (row.total_scrap || 0);
            if (total_produced === 0 || !row.total_actual_run_time_sec || row.total_actual_run_time_sec <= 0 || !row.total_planned_run_time_sec || row.total_planned_run_time_sec <= 0) return null;
            const availability = Math.min(100, (row.total_actual_run_time_sec / row.total_planned_run_time_sec) * 100);
            const performance = Math.min(100, ((total_produced * row.cycle_time_sec) / row.total_actual_run_time_sec) * 100);
            const quality = Math.min(100, (row.total_good / total_produced) * 100);
            const oee = (availability / 100) * (performance / 100) * (quality / 100) * 100;
            return { ...row, availability, performance, quality, oee };
        }).filter(d => d !== null);
        const average = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
        const currentOee = average(calculatedDailyData.map(d => d.oee));
        const trend = {};
        calculatedDailyData.forEach(d => {
            if (!trend[d.oee_date]) trend[d.oee_date] = { oee: [], availability: [], performance: [], quality: [] };
            trend[d.oee_date].oee.push(d.oee);
            trend[d.oee_date].availability.push(d.availability);
            trend[d.oee_date].performance.push(d.performance);
            trend[d.oee_date].quality.push(d.quality);
        });
        const oeeMetrics = Object.keys(trend).sort().map(date => ({
            date: date,
            oee: average(trend[date].oee),
            availability: average(trend[date].availability),
            performance: average(trend[date].performance),
            quality: average(trend[date].quality),
        }));
        const machineSummary = {};
        calculatedDailyData.forEach(d => {
            if (!machineSummary[d.machine_code]) machineSummary[d.machine_code] = { oee: [], availability: [], performance: [], quality: [] };
            machineSummary[d.machine_code].oee.push(d.oee);
            machineSummary[d.machine_code].availability.push(d.availability);
            machineSummary[d.machine_code].performance.push(d.performance);
            machineSummary[d.machine_code].quality.push(d.quality);
        });
        const activeMachines = Object.keys(machineSummary).map(code => ({
            machine_code: code,
            oee: average(machineSummary[code].oee),
            availability: average(machineSummary[code].availability),
            performance: average(machineSummary[code].performance),
            quality: average(machineSummary[code].quality)
        }));
        res.json({ success: true, data: { currentOee, oeeMetrics, activeMachines } });
    } catch (error) {
        console.error("Advanced OEE API Error:", error.message);
        res.status(500).json({ success: false, error: "Error calculating advanced OEE data" });
    }
});

router.get('/machines/:id/latest-schedule', async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT MAX(planned_end_time) as latest_end_time
            FROM manufacturing_orders
            WHERE machine_id = ? AND status IN ('pending', 'in_progress');`;
        const result = await all(query, [id]);
        res.json({ success: true, data: { latest_end_time: result[0]?.latest_end_time || null } });
    } catch (error) {
        console.error("API /latest-schedule Error:", error.message);
        res.status(500).json({ success: false, error: "ไม่สามารถดึงข้อมูลตารางเวลาได้" });
    }
});

router.get('/machines-overview', async (req, res) => {
    try {
        const query = `
            SELECT
                m.id, m.machine_code, m.machine_name, m.status as machine_status,
                mo.mo_number, mo.item_code, mo.quantity_to_produce,
                (SELECT SUM(IFNULL(pr.good_quantity, 0)) + SUM(IFNULL(pr.total_scrap_quantity, 0))
                 FROM production_records pr WHERE pr.mo_id = mo.id) as total_produced
            FROM machines m
            LEFT JOIN manufacturing_orders mo ON m.id = mo.machine_id AND mo.status = 'in_progress'
            ORDER BY m.machine_code ASC;`;
        const overviewData = await all(query);
        res.json({ success: true, data: overviewData });
    } catch (error) {
        console.error("API /machines-overview Error:", error.message);
        res.status(500).json({ success: false, error: "ไม่สามารถดึงข้อมูลภาพรวมเครื่องจักรได้" });
    }
});


// ==============================================================================
// DOWNTIME LOG & SUMMARY APIs
// ==============================================================================

// ✅ FIX: 2. (แก้ไข) API เดิมสำหรับตาราง ให้รับ "period" ด้วย
router.get('/downtime-logs', async (req, res) => {
    try {
        const { machine_id, period = 'daily' } = req.query; // รับค่า period
        const params = [];

        // สร้าง Date Filter
        const dateFilter = getDowntimeDateFilter(period);
        
        // สร้าง Machine Filter
        let machineFilter = '';
        if (machine_id && machine_id !== 'all') {
            machineFilter = ' AND l.machine_id = ?';
            params.push(machine_id);
        }

        const query = `
            SELECT 
                l.id, l.machine_id, l.status, l.start_time, l.end_time, l.duration_sec,
                l.reason_id, l.notes, m.machine_name,
                r.reason_code, r.description AS reason_description
            FROM machine_status_logs l
            LEFT JOIN downtime_reasons r ON l.reason_id = r.id
            LEFT JOIN machines m ON l.machine_id = m.machine_code
            WHERE 
                l.status <> 1 
                ${dateFilter}        -- <-- ใช้งาน Date Filter
                ${machineFilter}     -- <-- ใช้งาน Machine Filter
            ORDER BY l.start_time DESC
            LIMIT 100
        `;
        
        const logs = await all(query, params);
        res.json({ success: true, data: logs });

    } catch (error) {
        console.error("Downtime Logs API Error:", error.message);
        res.status(500).json({ success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูล Downtime" });
    }
});

// ✅ FIX: 3. (เพิ่มใหม่) API ใหม่สำหรับสรุปผลกราฟ
router.get('/downtime-summary', async (req, res) => {
    try {
        const { machine_id, period = 'daily' } = req.query; // รับค่า period
        const params = [];

        // สร้าง Date Filter
        const dateFilter = getDowntimeDateFilter(period);

        // สร้าง Machine Filter
        let machineFilter = '';
        if (machine_id && machine_id !== 'all') {
            machineFilter = ' AND l.machine_id = ?';
            params.push(machine_id);
        }

        // SQL สำหรับสรุปผล (Group By Reason)
        const query = `
            SELECT
                COALESCE(r.reason_code, 'N/A') as reason_code,
                COALESCE(r.description, 'Unassigned') as reason_description,
                SUM(l.duration_sec) as total_duration
            FROM machine_status_logs l
            LEFT JOIN downtime_reasons r ON l.reason_id = r.id
            WHERE 
                l.status <> 1
                ${dateFilter}
                ${machineFilter}
            GROUP BY 
                l.reason_id, r.reason_code, r.description
            ORDER BY 
                total_duration DESC
        `;

        const summaryData = await all(query, params);
        res.json({ success: true, data: summaryData });

    } catch (error) {
        console.error("Downtime Summary API Error:", error.message);
        res.status(500).json({ success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูลสรุป" });
    }
});


// ✅ (คงไว้) API สำหรับ Assign Reason
router.get('/downtime-reasons', async (req, res) => {
    try {
        const reasons = await all("SELECT id, reason_code, description FROM downtime_reasons ORDER BY reason_code");
        res.json({ success: true, data: reasons });
    } catch (error) {
        res.status(500).json({ success: false, error: "ไม่สามารถดึงข้อมูล Downtime Reasons ได้" });
    }
});

router.post('/assign-downtime-reason', async (req, res) => {
    const { log_id, reason_id, notes } = req.body;
    if (!log_id || !reason_id) {
        return res.status(400).json({ success: false, error: "ข้อมูลไม่ครบถ้วน" });
    }
    try {
        await all("UPDATE machine_status_logs SET reason_id = ?, notes = ? WHERE id = ?", [reason_id, notes, log_id]);
        res.json({ success: true, message: "บันทึกเหตุผลสำเร็จ" });
    } catch (error) {
        res.status(500).json({ success: false, error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
    }
});
// ✅ END: เพิ่ม API สำหรับ Assign Reason

module.exports = router;