// routes/items.js
const express = require('express');
const router = express.Router();
const db = require('../database.js');

// --- API Endpoint หลัก ---
// GET: ดึงข้อมูลสินค้าทั้งหมด
router.get('/', (req, res) => {
    const sql = "SELECT * FROM items ORDER BY item_code";
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": rows
        });
    });
});

// --- API Endpoint ที่เราต้องการ ---
// GET: ดึงรายการสินค้าตามประเภท (item_type)
// Endpoint นี้จะถูกเรียกใช้โดยหน้า create-so.html เพื่อดึง 'finished_good'
router.get('/type/:item_type', (req, res) => {
    const itemType = req.params.item_type;
    const sql = `
        SELECT item_code, item_name 
        FROM items 
        WHERE item_type = ? AND status = 'active'
        ORDER BY item_code
    `;
    
    db.all(sql, [itemType], (err, rows) => {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": rows
        });
    });
});

// (สามารถเพิ่ม POST, PUT, DELETE สำหรับจัดการ Item ได้ที่นี่)

module.exports = router;
