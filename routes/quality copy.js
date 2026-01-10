// routes/quality.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// --- Database Connection ---
const dbPath = path.resolve(__dirname, '../smart_factory.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error connecting to DB in quality.js:", err.message);
    } else {
        console.log("quality.js connected to the database.");
    }
});

// --- Multer Setup ---
const uploadDir = 'public/uploads/quality_drawings/';
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage: storage }).any();

// --- Helper for async DB calls ---
const run = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
    });
});
const get = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
    });
});
const all = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
    });
});

// --- API Endpoints ---

// GET: ดึงรายการ Standard ทั้งหมด
router.get('/standards', async (req, res) => {
    try {
        const sql = `
            SELECT ps.id, ps.standard_name, ps.version, ps.is_active, ps.created_at, i.item_code, i.item_name
            FROM product_standards ps
            JOIN items i ON ps.product_id = i.id
            ORDER BY ps.id DESC
        `;
        const rows = await all(sql);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve standards.' });
    }
});

// GET: ดึงข้อมูล Standard 1 ชุดแบบละเอียด
router.get('/standards/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const sqlStandard = `SELECT ps.*, i.item_code, i.item_name FROM product_standards ps JOIN items i ON ps.product_id = i.id WHERE ps.id = ?`;
        const standardRow = await get(sqlStandard, [id]);

        if (!standardRow) return res.status(404).json({ error: 'Standard not found' });

        const sqlCategories = `
            SELECT sc.id, sc.category_name, sc.drawing_image_path,
                   json_group_array(
                       json_object('id', ip.id, 'point_number', ip.point_number, 'pos_x', ip.pos_x, 'pos_y', ip.pos_y, 'name', ip.name, 'method', ip.method, 'standard_value', ip.standard_value, 'tolerance', ip.tolerance, 'upper_limit', ip.upper_limit, 'lower_limit', ip.lower_limit, 'unit', ip.unit, 'tool_used', ip.tool_used)
                   ) as points
            FROM standard_categories sc
            LEFT JOIN inspection_points ip ON sc.id = ip.standard_category_id
            WHERE sc.product_standard_id = ?
            GROUP BY sc.id
        `;
        const categoryRows = await all(sqlCategories, [id]);

        const categories = categoryRows.map(cat => {
            let points = JSON.parse(cat.points || '[]');
            if (points.length === 1 && points[0].id === null) points = [];
            return { ...cat, points };
        });

        res.json({ ...standardRow, categories });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST: สร้าง Standard ใหม่
router.post('/standards', (req, res) => {
    upload(req, res, async function (err) {
        if (err) return res.status(500).json({ error: `File upload error: ${err.message}` });
        
        const { product_id, standard_name, categories_data } = req.body;
        if (!product_id || !standard_name || !categories_data) return res.status(400).json({ error: 'Missing required fields' });

        let categories;
        try { categories = JSON.parse(categories_data); } 
        catch (e) { return res.status(400).json({ error: 'Invalid categories JSON format.' }); }

        try {
            await run('BEGIN TRANSACTION');
            const standardResult = await run(`INSERT INTO product_standards (product_id, standard_name) VALUES (?, ?)`, [product_id, standard_name]);
            const standardId = standardResult.lastID;

            for (const [index, cat] of categories.entries()) {
                const file = req.files.find(f => f.fieldname === `drawing_cat_${index}`);
                if (!file) throw new Error(`Drawing for category "${cat.category_name}" is missing.`);
                
                const imagePath = file.path.replace(/\\/g, "/").replace('public/', '');
                const categoryResult = await run(`INSERT INTO standard_categories (product_standard_id, category_name, drawing_image_path) VALUES (?, ?, ?)`, [standardId, cat.category_name, imagePath]);
                const categoryId = categoryResult.lastID;

                if (cat.points && cat.points.length > 0) {
                    for (const point of cat.points) {
                        await run(`INSERT INTO inspection_points (standard_category_id, point_number, pos_x, pos_y, name, method, standard_value, tolerance, upper_limit, lower_limit, unit, tool_used) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                        [categoryId, point.point_number, point.pos_x, point.pos_y, point.name, point.method, point.standard_value, point.tolerance, point.upper_limit, point.lower_limit, point.unit, point.tool_used]);
                    }
                }
            }

            await run('COMMIT');
            res.status(201).json({ message: 'Standard created successfully', standard_id: standardId });
        } catch (error) {
            await run('ROLLBACK');
            console.error("Create Transaction failed:", error);
            res.status(500).json({ error: `Create Transaction failed: ${error.message}` });
        }
    });
});

// PUT: อัปเดต Standard ที่มีอยู่
router.put('/standards/:id', (req, res) => {
    upload(req, res, async function (err) {
        if (err) return res.status(500).json({ error: `File upload error: ${err.message}` });
        
        const { id } = req.params;
        const { product_id, standard_name, categories_data } = req.body;

        let categories;
        try { categories = JSON.parse(categories_data); } 
        catch (e) { return res.status(400).json({ error: 'Invalid categories JSON format.' }); }

        try {
            await run('BEGIN TRANSACTION');

            await run(`UPDATE product_standards SET product_id = ?, standard_name = ? WHERE id = ?`, [product_id, standard_name, id]);
            await run(`DELETE FROM standard_categories WHERE product_standard_id = ?`, [id]);
            
            let fileCounter = 0;
            for (const cat of categories) {
                let imagePath = cat.existing_image_path;
                const newFile = req.files.find(f => f.fieldname === `drawing_cat_${fileCounter}`);

                if (newFile) {
                    imagePath = newFile.path.replace(/\\/g, "/").replace('public/', '');
                    fileCounter++;
                }

                if (!imagePath) {
                    // This was the error source. It should not happen if frontend is correct.
                    throw new Error(`Image is missing for category "${cat.category_name}"`);
                }

                const categoryResult = await run(`INSERT INTO standard_categories (product_standard_id, category_name, drawing_image_path) VALUES (?, ?, ?)`, [id, cat.category_name, imagePath]);
                const categoryId = categoryResult.lastID;

                if (cat.points && cat.points.length > 0) {
                    for (const point of cat.points) {
                         await run(`INSERT INTO inspection_points (standard_category_id, point_number, pos_x, pos_y, name, method, standard_value, tolerance, upper_limit, lower_limit, unit, tool_used) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                        [categoryId, point.point_number, point.pos_x, point.pos_y, point.name, point.method, point.standard_value, point.tolerance, point.upper_limit, point.lower_limit, point.unit, point.tool_used]);
                    }
                }
            }

            await run('COMMIT');
            res.status(200).json({ message: 'Standard updated successfully', standard_id: id });
        } catch (error) {
            await run('ROLLBACK');
            console.error("Update Transaction failed:", error);
            res.status(500).json({ error: `Update failed: ${error.message}` });
        }
    });
});

module.exports = router;