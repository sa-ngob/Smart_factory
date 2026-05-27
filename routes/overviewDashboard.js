// routes/overviewDashboard.js
const express = require('express');
const router = express.Router();
const db = require('../database.js');

const all = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows); });
});

const getDateCondition = (period, dateColumn) => {
    const now = new Date();
    let startDate;
    if (period === 'daily') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'monthly') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'yearly') {
        startDate = new Date(now.getFullYear(), 0, 1);
    }
    // Correctly format for SQLite
    return startDate ? ` AND ${dateColumn} >= '${startDate.toISOString().split('T')[0]} 00:00:00'` : '';
};

router.get('/', async (req, res) => {
    try {
        const { period = 'monthly' } = req.query;
        const invoiceDateFilter = getDateCondition(period, 'inv.issue_date');
        const soDateFilter = getDateCondition(period, 'so.order_date');

        const isPostgres = !!db.pool;
        const dateSelect = isPostgres
            ? "TO_CHAR(inv.issue_date, 'YYYY-MM-DD')"
            : "STRFTIME('%Y-%m-%d', inv.issue_date)";

        const promises = {
            total_sales: all(`SELECT SUM(grand_total) as total FROM invoices inv WHERE inv.status != 'cancelled' ${invoiceDateFilter}`),
            in_progress_mo: all(`SELECT COUNT(id) as count FROM manufacturing_orders WHERE status = 'in_progress'`),
            quality_stats: all(`SELECT CAST(COALESCE(SUM(good_quantity), 0) AS REAL) as total_good, CAST(COALESCE(SUM(waste_quantity), 0) AS REAL) as total_scrap FROM production_records pr`),
            running_machines: all(`
                SELECT COUNT(*) as count 
                FROM machine_data t1 
                JOIN (
                    SELECT machine_id, MAX(timestamp) as ts 
                    FROM machine_data 
                    GROUP BY machine_id
                ) t2 ON t1.machine_id = t2.machine_id AND t1.timestamp = t2.ts 
                WHERE CAST(t1.machine_status AS INTEGER) = 1
            `),
            sales_trend: all(`
                SELECT ${dateSelect} as date, SUM(inv.grand_total) as daily_sales
                FROM invoices inv
                WHERE inv.status != 'cancelled' ${invoiceDateFilter}
                GROUP BY date
                ORDER BY date ASC
            `),
            top_mos: all(`
                SELECT mo.mo_number, i.item_name, mo.quantity_to_produce, mo.due_date
                FROM manufacturing_orders mo
                JOIN items i ON mo.item_code = i.item_code
                WHERE mo.status = 'in_progress'
                ORDER BY mo.due_date ASC
                LIMIT 5
            `)
        };

        const results = await Promise.all(
            Object.entries(promises).map(([key, p]) =>
                p.catch(e => {
                    console.error(`Query failed: ${key}`, e.message);
                    return [];
                })
            )
        );
        const [
            total_sales, in_progress_mo, quality_stats, running_machines, sales_trend, top_mos
        ] = results;

        const totalGood = quality_stats[0]?.total_good || 0;
        const totalScrap = quality_stats[0]?.total_scrap || 0;
        const totalProduction = totalGood + totalScrap;
        const scrap_rate = totalProduction > 0 ? (totalScrap / totalProduction) * 100 : 0;

        res.json({
            success: true,
            data: {
                kpis: {
                    total_sales: total_sales[0]?.total || 0,
                    in_progress_mo_count: in_progress_mo[0]?.count || 0,
                    scrap_rate: scrap_rate,
                    running_machines: parseInt(running_machines[0]?.count) || 0
                },
                sales_trend: sales_trend || [],
                top_mos: top_mos || []
            }
        });
    } catch (error) {
        console.error("Overview Dashboard API Error:", error.message);
        res.status(500).json({ success: false, error: "Error fetching overview dashboard data" });
    }
});

module.exports = router;