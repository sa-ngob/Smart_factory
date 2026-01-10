const express = require('express');
const router = express.Router();
const db = require('../database.js');
const multer = require('multer');
const fs = require('fs');

// --- การตั้งค่า Multer สำหรับจัดการไฟล์รูปภาพสินค้า ---
const uploadDir = 'public/uploads/items';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `item-${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage: storage });


// --- API ใหม่สำหรับสร้างรหัสสินค้าอัตโนมัติ ---
// GET /api/items/next-code?type=finished_good
router.get('/next-code', (req, res) => {
    const itemType = req.query.type;
    let prefix = '';

    switch(itemType) {
        case 'finished_good':
            prefix = 'FG-';
            break;
        case 'semi_good':
            prefix = 'SE-';
            break;
        case 'raw_material':
            prefix = 'RM-';
            break;
        case 'consumable':
            prefix = 'CS-';
            break;
        default:
            return res.status(400).json({ error: 'Invalid item type' });
    }

    const sql = `SELECT item_code FROM items WHERE item_code LIKE ? ORDER BY id DESC LIMIT 1`;
    db.get(sql, [`${prefix}%`], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        
        let nextSequence = 1;
        if (row) {
            const lastSequence = parseInt(row.item_code.replace(prefix, ''), 10);
            nextSequence = lastSequence + 1;
        }
        
        const nextItemCode = `${prefix}${String(nextSequence).padStart(4, '0')}`;
        res.json({ item_code: nextItemCode });
    });
});


// --- API สำหรับจัดการสินค้า (Item Master) ---

// READ: ดึงข้อมูลสินค้าทั้งหมด
router.get('/', (req, res) => {
    const sql = `
        SELECT i.*, e.name as customer_name 
        FROM items i
        LEFT JOIN entities e ON i.customer_id = e.id
        ORDER BY i.item_code
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ "error": err.message });
        res.json({ data: rows });
    });
});

// CREATE: สร้างข้อมูลสินค้าใหม่
router.post('/', upload.single('image'), (req, res) => {
    const data = req.body;
    const image_path = req.file ? `/uploads/items/${req.file.filename}` : null;

    const sql = `INSERT INTO items (
        item_code, customer_id, item_name, model, material_name, grade, colour, 
        part_weight_gram, cycle_time_sec, item_type, uom, stock_quantity, image_path
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    
    const params = [
        data.item_code, data.customer_id, data.item_name, data.model, data.material_name,
        data.grade, data.colour, data.part_weight_gram, data.cycle_time_sec,
        data.item_type, data.uom, data.stock_quantity || 0, image_path
    ];
    
    db.run(sql, params, function(err) {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ "message": "success", "id": this.lastID });
    });
});

// UPDATE: แก้ไขข้อมูลสินค้า
router.put('/:id', upload.single('image'), (req, res) => {
    const data = req.body;
    const itemId = req.params.id;

    db.get('SELECT image_path FROM items WHERE id = ?', [itemId], (err, oldItem) => {
        if (err) return res.status(500).json({ "error": err.message });
        if (!oldItem) return res.status(404).json({ "error": "Item not found" });

        const image_path = req.file ? `/uploads/items/${req.file.filename}` : oldItem.image_path;

        const sql = `UPDATE items SET
            item_code = ?, customer_id = ?, item_name = ?, model = ?, material_name = ?,
            grade = ?, colour = ?, part_weight_gram = ?, cycle_time_sec = ?, item_type = ?,
            uom = ?, stock_quantity = ?, image_path = ?
            WHERE id = ?`;
            
        const params = [
            data.item_code, data.customer_id, data.item_name, data.model, data.material_name,
            data.grade, data.colour, data.part_weight_gram, data.cycle_time_sec,
            data.item_type, data.uom, data.stock_quantity, image_path,
            itemId
        ];

        db.run(sql, params, function (err) {
            if (err) return res.status(400).json({ "error": err.message });
            res.json({ message: "success", changes: this.changes });
        });
    });
});

// DELETE: ลบข้อมูลสินค้า
router.delete('/:id', (req, res) => {
    const sql = 'DELETE FROM items WHERE id = ?';
    db.run(sql, req.params.id, function (err) {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ "message": "deleted", changes: this.changes });
    });
});


module.exports = router;
