const express = require('express');
const router = express.Router();
const db = require('../database.js');

// GET: ดึงข้อมูลเครื่องจักรทั้งหมด
router.get('/', async (req, res) => {
    const sql = "SELECT * FROM machines ORDER BY machine_code";
    try {
        const rows = await db.allAsync(sql);
        res.json({ data: rows });
    } catch (err) {
        res.status(500).json({ "error": err.message });
    }
});

// POST: สร้างเครื่องจักรใหม่
router.post('/', async (req, res) => {
    const { machine_code, machine_name, machine_type, notes } = req.body;
    if (!machine_code || !machine_name) {
        return res.status(400).json({ error: "Machine code and name are required." });
    }
    const sql = `INSERT INTO machines (machine_code, machine_name, machine_type, status, notes) VALUES ($1, $2, $3, 'idle', $4) RETURNING id`;
    try {
        const result = await db.query(sql, [machine_code, machine_name, machine_type, notes]);
        res.status(201).json({ "id": result.rows[0].id });
    } catch (err) {
        res.status(400).json({ "error": err.message });
    }
});

// PUT: อัปเดตข้อมูลเครื่องจักร (แก้ไขชื่อเครื่องจักร ฯลฯ)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { machine_name, machine_type, notes } = req.body;

    if (!machine_name) {
        return res.status(400).json({ error: "Machine name is required." });
    }

    const sql = `UPDATE machines SET machine_name = $1, machine_type = $2, notes = $3 WHERE id = $4`;

    try {
        const result = await db.query(sql, [machine_name, machine_type, notes, id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Machine not found" });
        }
        res.json({ success: true, message: "Machine updated successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
