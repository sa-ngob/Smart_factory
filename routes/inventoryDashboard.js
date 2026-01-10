// routes/inventoryDashboard.js
const express = require('express');
const router = express.Router();
const { pool, ...db } = require('../database.js');

router.get('/', async (req, res) => {
    try {
        const responseData = {
            total_value: 0,
            total_sku: 0,
            low_stock_count: 0,
            type_breakdown: { labels: [], series: [] },
            low_stock_items: []
        };

        if (pool) {
            // Postgres Implementation
            // Use try-catch for each optional column query to prevent total failure
            let resTotalValue = { rows: [{ total: 0 }] };
            try {
                resTotalValue = await pool.query(`SELECT SUM(stock_quantity * COALESCE(cost_price, 0)) as total FROM items`);
            } catch (e) { console.warn("Missing cost_price?", e.message); }

            let resTotalSku = { rows: [{ count: 0 }] };
            try {
                resTotalSku = await pool.query(`SELECT COUNT(id) as count FROM items`);
            } catch (e) { console.warn("Error counting items", e.message); }

            let resTypeBreakdown = { rows: [] };
            try {
                resTypeBreakdown = await pool.query(`SELECT item_type, COUNT(id) as count FROM items GROUP BY item_type`);
            } catch (e) { console.warn("Error breakdown", e.message); }

            let resLowStock = { rows: [{ count: 0 }] };
            let resLowStockItems = { rows: [] };
            try {
                // Check if min_stock exists first or just try query
                resLowStock = await pool.query(`SELECT COUNT(id) as count FROM items WHERE stock_quantity <= COALESCE(min_stock, 0)`);
                resLowStockItems = await pool.query(`SELECT item_code, item_name, stock_quantity, uom FROM items WHERE stock_quantity <= COALESCE(min_stock, 0) ORDER BY stock_quantity ASC LIMIT 5`);
            } catch (e) { console.warn("Missing min_stock?", e.message); }

            responseData.total_value = parseFloat(resTotalValue.rows[0].total) || 0;
            responseData.total_sku = parseInt(resTotalSku.rows[0].count) || 0;
            responseData.low_stock_count = parseInt(resLowStock.rows[0].count) || 0;

            const rawBreakdown = resTypeBreakdown.rows;
            responseData.type_breakdown.labels = rawBreakdown.map(t => t.item_type || 'Unknown');
            responseData.type_breakdown.series = rawBreakdown.map(t => parseInt(t.count));

            responseData.low_stock_items = resLowStockItems.rows;

        } else {
            // SQLite Fallback (Optional, but kept for compatibility logic structure)
            const all = (sql, params = []) => new Promise((resolve, reject) => {
                db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows); });
            });
            const get = (sql, params = []) => new Promise((resolve, reject) => {
                db.get(sql, params, (err, row) => { if (err) reject(err); else resolve(row); });
            });

            const totalVal = await get(`SELECT SUM(stock_quantity * cost_price) as total FROM items`);
            const totalSku = await get(`SELECT COUNT(id) as count FROM items`);
            const typeBreakdown = await all(`SELECT item_type, COUNT(id) as count FROM items GROUP BY item_type`);
            const lowStockCount = await get(`SELECT COUNT(id) as count FROM items WHERE stock_quantity <= min_stock`);
            const lowStockItems = await all(`SELECT item_code, item_name, stock_quantity, uom FROM items WHERE stock_quantity <= min_stock ORDER BY stock_quantity ASC LIMIT 5`);

            responseData.total_value = totalVal?.total || 0;
            responseData.total_sku = totalSku?.count || 0;
            responseData.low_stock_count = lowStockCount?.count || 0;
            responseData.type_breakdown.labels = typeBreakdown.map(t => t.item_type || 'Unknown');
            responseData.type_breakdown.series = typeBreakdown.map(t => t.count);
            responseData.low_stock_items = lowStockItems;
        }

        res.json({ success: true, data: responseData });

    } catch (error) {
        console.error("Inventory Dashboard API Error:", error.message);
        res.status(500).json({ success: false, error: "Error fetching inventory dashboard data" });
    }
});

module.exports = router;