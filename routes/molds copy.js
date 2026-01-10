const express = require('express');
const router = express.Router();
const db = require('../database.js');
const multer = require('multer');
const fs = require('fs');

// --- การตั้งค่า Multer ---
const uploadDir = 'public/uploads/molds';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `mold-${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage: storage });

// --- API สำหรับสร้างรหัสแม่พิมพ์อัตโนมัติ ---
router.get('/next-code', (req, res) => {
    const prefix = 'MOLD-';
    const sql = `SELECT mold_code FROM molds WHERE mold_code LIKE ? ORDER BY id DESC LIMIT 1`;
    db.get(sql, [`${prefix}%`], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        let nextSequence = 1;
        if (row) {
            const lastSequence = parseInt(row.mold_code.replace(prefix, ''), 10);
            nextSequence = lastSequence + 1;
        }
        const nextMoldCode = `${prefix}${String(nextSequence).padStart(4, '0')}`;
        res.json({ mold_code: nextMoldCode });
    });
});

// --- API CRUD สำหรับจัดการประวัติแม่พิมพ์ ---

// READ: ดึงข้อมูลแม่พิมพ์ทั้งหมด
router.get('/', (req, res) => {
    const sql = `SELECT m.*, e.name as customer_name FROM molds m LEFT JOIN entities e ON m.customer_id = e.id ORDER BY m.id DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ "error": err.message });
        res.json({ data: rows });
    });
});

// READ: ดึงข้อมูลแม่พิมพ์ใบเดียว
router.get('/:id', (req, res) => {
    const sql = `SELECT m.*, e.name as customer_name FROM molds m LEFT JOIN entities e ON m.customer_id = e.id WHERE m.id = ?`;
    db.get(sql, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ "error": err.message });
        if (!row) return res.status(404).json({ "error": "Mold not found" });
        res.json({ data: row });
    });
});

// CREATE: สร้างประวัติแม่พิมพ์ใหม่
router.post('/', upload.fields([
    { name: 'core_image', maxCount: 1 },
    { name: 'cavity_image', maxCount: 1 },
    { name: 'part_image', maxCount: 1 }
]), (req, res) => {
    const data = req.body;
    const files = req.files;
    
    const core_image_path = files && files.core_image ? `/uploads/molds/${files.core_image[0].filename}` : null;
    const cavity_image_path = files && files.cavity_image ? `/uploads/molds/${files.cavity_image[0].filename}` : null;
    const part_image_path = files && files.part_image ? `/uploads/molds/${files.part_image[0].filename}` : null;

    const sql = `INSERT INTO molds (mold_code, mold_name, customer_id, received_date, status, storage_location, notes, mold_type, runner_system, gate_type, size_w, size_l, size_h, weight, cavity, core_image_path, cavity_image_path, part_image_path) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    const params = [data.mold_code, data.mold_name, data.customer_id, data.received_date, data.status, data.storage_location, data.notes, data.mold_type, data.runner_system, data.gate_type, data.size_w, data.size_l, data.size_h, data.weight, data.cavity, core_image_path, cavity_image_path, part_image_path];
    
    db.run(sql, params, function(err) {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ "message": "success", "id": this.lastID });
    });
});

// UPDATE: แก้ไขข้อมูลแม่พิมพ์
router.put('/:id', upload.fields([
    { name: 'core_image', maxCount: 1 },
    { name: 'cavity_image', maxCount: 1 },
    { name: 'part_image', maxCount: 1 }
]), (req, res) => {
    const data = req.body;
    const files = req.files;
    const moldId = req.params.id;

    db.get('SELECT core_image_path, cavity_image_path, part_image_path FROM molds WHERE id = ?', [moldId], (err, oldMold) => {
        if (err) return res.status(500).json({ "error": err.message });
        if (!oldMold) return res.status(404).json({ "error": "Mold not found" });

        const core_image_path = files && files.core_image ? `/uploads/molds/${files.core_image[0].filename}` : oldMold.core_image_path;
        const cavity_image_path = files && files.cavity_image ? `/uploads/molds/${files.cavity_image[0].filename}` : oldMold.cavity_image_path;
        const part_image_path = files && files.part_image ? `/uploads/molds/${files.part_image[0].filename}` : oldMold.part_image_path;

        const sql = `UPDATE molds SET 
            mold_code = ?, mold_name = ?, customer_id = ?, received_date = ?, 
            status = ?, storage_location = ?, notes = ?, mold_type = ?, 
            runner_system = ?, gate_type = ?, size_w = ?, size_l = ?, 
            size_h = ?, weight = ?, cavity = ?, shot_counter = ?,
            core_image_path = ?, cavity_image_path = ?, part_image_path = ?
            WHERE id = ?`;
        
        const params = [
            data.mold_code, data.mold_name, data.customer_id, data.received_date, 
            data.status, data.storage_location, data.notes, data.mold_type, 
            data.runner_system, data.gate_type, data.size_w, data.size_l, 
            data.size_h, data.weight, data.cavity, data.shot_counter,
            core_image_path, cavity_image_path, part_image_path,
            moldId
        ];
        
        db.run(sql, params, function (err) {
            if (err) return res.status(400).json({ "error": err.message });
            res.json({ message: "success", changes: this.changes });
        });
    });
});

// DELETE: ลบข้อมูลแม่พิมพ์
router.delete('/:id', (req, res) => {
    const sql = 'DELETE FROM molds WHERE id = ?';
    db.run(sql, req.params.id, function (err) {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ "message": "deleted", changes: this.changes });
    });
});

module.exports = router;
