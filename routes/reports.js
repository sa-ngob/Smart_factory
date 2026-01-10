// file: reports.js (ฉบับแก้ไข)
const express = require('express');
const router = express.Router();
const db = require('../database.js');

const all = (sql, params = []) => new Promise((resolve, reject) => { db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows); }); });

router.get('/financial-logbook', async (req, res) => {
    try {
        // *** จุดที่แก้ไข: เพิ่มการ SELECT receipt_id และใช้ receipt_id ที่ผูกกับ billing_note โดยตรง ***
        const sql = `
            SELECT
                bn.id,
                bn.bn_number,
                bn.issue_date AS billing_date,
                bn.total_amount,
                bn.status,
                e.name AS customer_name,
                r.payment_date,
                r.receipt_number,
                r.id as receipt_id,
                r.status as receipt_status
            FROM
                billing_notes bn
            LEFT JOIN
                entities e ON bn.customer_id = e.id
            LEFT JOIN
                receipts r ON bn.receipt_id = r.id
            ORDER BY
                bn.issue_date DESC;
        `;
        const logs = await all(sql);
        res.json({ success: true, data: logs });
    } catch (error) {
        console.error("Error fetching financial logbook:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;