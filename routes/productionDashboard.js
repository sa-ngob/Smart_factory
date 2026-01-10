// routes/productionDashboard.js
const express = require('express');
const router = express.Router();
const db = require('../database.js');

const all = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows); });
});

router.get('/', async (req, res) => {
    try {
        const latestMachineDataSQL = `
            SELECT t1.* FROM machine_data t1 INNER JOIN (
                SELECT machine_id, MAX(timestamp) as max_timestamp FROM machine_data GROUP BY machine_id
            ) t2 ON t1.machine_id = t2.machine_id AND t1.timestamp = t2.max_timestamp
            ORDER BY t1.machine_id;`;

        const machines = await all(latestMachineDataSQL);

        const kpis = {
            total_machines: machines.length,
            running: machines.filter(m => +m.machine_status === 1).length,
            stop: machines.filter(m => +m.machine_status === 0).length,
            alarm: machines.filter(m => +m.machine_status === 2).length,
        };
        console.log("Production Dashboard Debug -> Machines:", machines.length, "KPIs:", kpis);

        res.json({ success: true, data: { kpis, machine_list: machines } });
    } catch (error) {
        console.error("Production Dashboard API Error:", error.message);
        res.status(500).json({ success: false, error: "Error fetching production dashboard data" });
    }
});

module.exports = router;