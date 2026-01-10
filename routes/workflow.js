// routes/workflow.js
const express = require('express');
const router = express.Router();
const db = require('../database.js');

// Helper functions for async/await with sqlite
const all = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
        if (err) reject(err); else resolve(rows);
    });
});

// ----------------------------------------------------------------
//  API Endpoints for Dashboard
// ----------------------------------------------------------------

/**
 * @route   GET /api/workflow/pending-invoices
 * @desc    ดึงข้อมูลใบส่งของ (DO) ที่ส่งแล้วและ 'รอออกใบแจ้งหนี้'
 * @access  Private
 */
router.get('/pending-invoices', async (req, res) => {
    try {
        const sql = `
            SELECT
                d.id,
                d.do_number,
                d.shipping_date,
                e.name as customer_name
            FROM delivery_orders d
            JOIN entities e ON d.customer_id = e.id
            WHERE d.status = 'shipped'
            ORDER BY d.shipping_date ASC;
        `;
        const items = await all(sql);
        res.json({ success: true, data: items });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route   GET /api/workflow/pending-billing
 * @desc    ดึงข้อมูลใบแจ้งหนี้ (Invoices) ที่ 'รอออกใบวางบิล' โดยจัดกลุ่มตามลูกค้า
 * @access  Private
 */
router.get('/pending-billing', async (req, res) => {
    try {
        const sql = `
            SELECT
                inv.customer_id,
                e.name as customer_name,
                COUNT(inv.id) as invoice_count,
                SUM(inv.grand_total) as total_amount
            FROM invoices inv
            JOIN entities e ON inv.customer_id = e.id
            WHERE inv.status = 'pending_issue'
            GROUP BY inv.customer_id, e.name
            ORDER BY e.name;
        `;
        const items = await all(sql);
        res.json({ success: true, data: items });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route   GET /api/workflow/pending-payments
 * @desc    ดึงข้อมูลใบวางบิล (Billing Notes) ที่ 'รอรับชำระ'
 * @access  Private
 */
router.get('/pending-payments', async (req, res) => {
    try {
        const sql = `
            SELECT
                bn.id,
                bn.bn_number,
                bn.due_date,
                bn.total_amount,
                e.name as customer_name
            FROM billing_notes bn
            JOIN entities e ON bn.customer_id = e.id
            WHERE bn.status = 'billed'
            ORDER BY bn.due_date ASC;
        `;
        const items = await all(sql);
        res.json({ success: true, data: items });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✨ --- START: โค้ดที่เพิ่มเข้ามาสำหรับคอลัมน์ "รอตรวจสอบยอดเงิน" --- ✨
/**
 * @route   GET /api/workflow/pending-confirmations
 * @desc    ดึงข้อมูลใบเสร็จ (Receipts) ที่ 'รอตรวจสอบยอดเงิน'
 * @access  Private
 */
router.get('/pending-confirmations', async (req, res) => {
    try {
        // คิวรีหา Receipts ที่มีสถานะเป็น 'pending_confirmation'
        const sql = `
            SELECT
                r.id,
                r.receipt_number,
                r.payment_date,
                r.payment_method,
                r.total_amount_paid,
                e.name as customer_name
            FROM receipts r
            JOIN entities e ON r.customer_id = e.id
            WHERE r.status = 'pending_confirmation'
            ORDER BY r.payment_date ASC;
        `;
        const items = await all(sql);
        res.json({ success: true, data: items });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// ✨ --- END: โค้ดที่เพิ่มเข้ามา --- ✨
// -- (จะเพิ่ม API สำหรับคอลัมน์ที่ 4 ที่นี่ในอนาคต) --
// GET /pending-confirmations


module.exports = router;