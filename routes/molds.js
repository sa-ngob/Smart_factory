const express = require('express');
const router = express.Router();
const db = require('../database.js');
const multer = require('multer');
const fs = require('fs');

// --- การตั้งค่า Multer (เหมือนเดิม) ---
const uploadDir = 'public/uploads/molds';
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir, { recursive: true }); }
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `mold-${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage: storage });

// --- API เดิมสำหรับจัดการแม่พิมพ์ ---
router.get('/next-code', async (req, res) => {
    const prefix = 'MOLD-';
    const sql = `SELECT mold_code FROM molds WHERE mold_code LIKE $1 ORDER BY id DESC LIMIT 1`;
    try {
        const row = await db.getAsync(sql, [`${prefix}%`]);
        let nextSequence = 1;
        if (row) {
            const lastSequence = parseInt(row.mold_code.replace(prefix, ''), 10);
            nextSequence = lastSequence + 1;
        }
        const nextMoldCode = `${prefix}${String(nextSequence).padStart(4, '0')}`;
        res.json({ mold_code: nextMoldCode });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/', async (req, res) => {
    const sql = `SELECT m.*, e.name as customer_name FROM molds m LEFT JOIN entities e ON m.customer_id = e.id ORDER BY m.id DESC`;
    try {
        const rows = await db.allAsync(sql);
        res.json({ data: rows });
    } catch (err) {
        res.status(500).json({ "error": err.message });
    }
});

router.get('/:id', async (req, res) => {
    const sql = `SELECT m.*, e.name as customer_name FROM molds m LEFT JOIN entities e ON m.customer_id = e.id WHERE m.id = $1`;
    try {
        const row = await db.getAsync(sql, [req.params.id]);
        if (!row) return res.status(404).json({ "error": "Mold not found" });
        res.json({ data: row });
    } catch (err) {
        res.status(500).json({ "error": err.message });
    }
});

router.post('/', upload.fields([{ name: 'core_image', maxCount: 1 }, { name: 'cavity_image', maxCount: 1 }, { name: 'part_image', maxCount: 1 }]), async (req, res) => {
    const data = req.body;
    const files = req.files;
    const core_image_path = files && files.core_image ? `/uploads/molds/${files.core_image[0].filename}` : null;
    const cavity_image_path = files && files.cavity_image ? `/uploads/molds/${files.cavity_image[0].filename}` : null;
    const part_image_path = files && files.part_image ? `/uploads/molds/${files.part_image[0].filename}` : null;
    const sql = `INSERT INTO molds (mold_code, mold_name, customer_id, received_date, status, storage_location, notes, mold_type, runner_system, gate_type, size_w, size_l, size_h, weight, cavity, core_image_path, cavity_image_path, part_image_path) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id`;
    const params = [data.mold_code, data.mold_name, data.customer_id, data.received_date, data.status, data.storage_location, data.notes, data.mold_type, data.runner_system, data.gate_type, data.size_w, data.size_l, data.size_h, data.weight, data.cavity, core_image_path, cavity_image_path, part_image_path];

    try {
        const result = await db.query(sql, params);
        res.json({ "message": "success", "id": result.rows[0].id });
    } catch (err) {
        res.status(400).json({ "error": err.message });
    }
});

router.put('/:id', upload.fields([{ name: 'core_image', maxCount: 1 }, { name: 'cavity_image', maxCount: 1 }, { name: 'part_image', maxCount: 1 }]), async (req, res) => {
    const data = req.body;
    const files = req.files;
    const moldId = req.params.id;

    try {
        const oldMold = await db.getAsync('SELECT core_image_path, cavity_image_path, part_image_path FROM molds WHERE id = $1', [moldId]);
        if (!oldMold) return res.status(404).json({ "error": "Mold not found" });

        const core_image_path = files && files.core_image ? `/uploads/molds/${files.core_image[0].filename}` : oldMold.core_image_path;
        const cavity_image_path = files && files.cavity_image ? `/uploads/molds/${files.cavity_image[0].filename}` : oldMold.cavity_image_path;
        const part_image_path = files && files.part_image ? `/uploads/molds/${files.part_image[0].filename}` : oldMold.part_image_path;

        const sql = `UPDATE molds SET mold_code = $1, mold_name = $2, customer_id = $3, received_date = $4, status = $5, storage_location = $6, notes = $7, mold_type = $8, runner_system = $9, gate_type = $10, size_w = $11, size_l = $12, size_h = $13, weight = $14, cavity = $15, shot_counter = $16, core_image_path = $17, cavity_image_path = $18, part_image_path = $19 WHERE id = $20`;
        const params = [data.mold_code, data.mold_name, data.customer_id, data.received_date, data.status, data.storage_location, data.notes, data.mold_type, data.runner_system, data.gate_type, data.size_w, data.size_l, data.size_h, data.weight, data.cavity, data.shot_counter, core_image_path, cavity_image_path, part_image_path, moldId];

        const result = await db.runAsync(sql, params);
        res.json({ message: "success", changes: result.rowCount });
    } catch (err) {
        res.status(400).json({ "error": err.message });
    }
});

router.delete('/:id', async (req, res) => {
    const sql = 'DELETE FROM molds WHERE id = $1';
    try {
        const result = await db.runAsync(sql, [req.params.id]);
        res.json({ "message": "deleted", changes: result.rowCount });
    } catch (err) {
        res.status(400).json({ "error": err.message });
    }
});


// --- API ใหม่สำหรับจัดการ Part List ---

// READ: ดึง Part List ทั้งหมดของแม่พิมพ์ใบเดียว
// GET /api/molds/:moldId/parts
router.get('/:moldId/parts', async (req, res) => {
    const sql = `SELECT * FROM mold_parts WHERE mold_id = $1 ORDER BY part_number`;
    try {
        const rows = await db.allAsync(sql, [req.params.moldId]);
        res.json({ data: rows });
    } catch (err) {
        res.status(500).json({ "error": err.message });
    }
});

// CREATE: เพิ่ม Part ใหม่ลงในแม่พิมพ์
// POST /api/molds/parts
router.post('/parts', async (req, res) => {
    const { mold_id, part_number, part_name, quantity, material, notes } = req.body;
    const sql = `INSERT INTO mold_parts (mold_id, part_number, part_name, quantity, material, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`;
    const params = [mold_id, part_number, part_name, quantity, material, notes];
    try {
        const result = await db.query(sql, params);
        res.json({ "message": "success", "id": result.rows[0].id });
    } catch (err) {
        res.status(400).json({ "error": err.message });
    }
});

// UPDATE: แก้ไขข้อมูล Part
// PUT /api/molds/parts/:partId
router.put('/parts/:partId', async (req, res) => {
    const { part_number, part_name, quantity, material, notes } = req.body;
    const sql = `UPDATE mold_parts SET part_number = $1, part_name = $2, quantity = $3, material = $4, notes = $5 WHERE id = $6`;
    const params = [part_number, part_name, quantity, material, notes, req.params.partId];
    try {
        const result = await db.runAsync(sql, params);
        res.json({ message: "success", changes: result.rowCount });
    } catch (err) {
        res.status(400).json({ "error": err.message });
    }
});

// DELETE: ลบ Part
// DELETE /api/molds/parts/:partId
router.delete('/parts/:partId', async (req, res) => {
    const sql = `DELETE FROM mold_parts WHERE id = $1`;
    try {
        const result = await db.runAsync(sql, [req.params.partId]);
        res.json({ "message": "deleted", changes: result.rowCount });
    } catch (err) {
        res.status(400).json({ "error": err.message });
    }
});


module.exports = router;
