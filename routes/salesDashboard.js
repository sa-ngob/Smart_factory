// routes/salesDashboard.js
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
        startDate = new Date(now.setHours(0, 0, 0, 0));
    } else if (period === 'monthly') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'yearly') {
        startDate = new Date(now.getFullYear(), 0, 1);
    }
    return startDate ? ` AND ${dateColumn} >= '${startDate.toISOString().slice(0, 19).replace('T', ' ')}'` : '';
};

router.get('/', async (req, res) => {
    try {
        const { period = 'monthly' } = req.query;
        const invoiceDateFilter = getDateCondition(period, 'inv.issue_date');
        const soDateFilter = getDateCondition(period, 'so.order_date');

        const promises = {
            total_sales: all(`SELECT SUM(grand_total) as total FROM invoices inv WHERE inv.status != 'cancelled' ${invoiceDateFilter}`),
            sales_kpi: all(`SELECT COUNT(id) as count, SUM(total_amount) as total_value FROM sales_orders so WHERE 1=1 ${soDateFilter}`),
            latest_sales_orders: all(`
                SELECT so.so_number, so.order_date, so.total_amount, so.status, e.name as customer_name
                FROM sales_orders so JOIN entities e ON so.customer_id = e.id
                WHERE 1=1 ${soDateFilter} ORDER BY so.order_date DESC LIMIT 5`),
            sales_by_customer: all(`
                SELECT e.name as customer_name, SUM(inv.grand_total) as total_sales
                FROM invoices inv JOIN entities e ON inv.customer_id = e.id
                WHERE inv.status != 'cancelled' ${invoiceDateFilter}
                GROUP BY e.name ORDER BY total_sales DESC LIMIT 10`)
        };

        const results = await Promise.all(Object.values(promises).map(p => p.catch(e => e)));
        const [total_sales_res, sales_kpi_res, latest_sales_orders_res, sales_by_customer_res] = results;

        // Helper to extract data or default
        const getVal = (res, def) => (res instanceof Error ? (console.error("Query Error:", res.message), def) : res);

        const total_sales = getVal(total_sales_res, [{ total: 0 }]);
        const sales_kpi = getVal(sales_kpi_res, [{ count: 0, total_value: 0 }]);
        const latest_sales_orders = getVal(latest_sales_orders_res, []);
        const sales_by_customer = getVal(sales_by_customer_res, []);

        const responseData = {
            total_sales: total_sales[0]?.total || 0,
            new_orders_value: sales_kpi[0]?.total_value || 0,
            new_orders_count: sales_kpi[0]?.count || 0,
            latest_orders_table: latest_sales_orders,
            sales_by_customer: sales_by_customer
        };

        res.json({ success: true, data: responseData });
    } catch (error) {
        console.error("Sales Dashboard API Error:", error.message);
        res.status(500).json({ success: false, error: "Error fetching sales dashboard data" });
    }
});

module.exports = router;