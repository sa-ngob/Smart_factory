// routes/quality.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool, ...db } = require('../database.js');

// --- Multer Setup ---
const uploadDir = 'public/uploads/quality_drawings/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage: storage }).any();

// --- Schema Initialization ---
const initializeQualityTables = async () => {
    const client = await pool.connect();
    try {
        console.log("Checking Quality Control Tables...");
        await client.query('BEGIN');

        // 1. Product Standards
        await client.query(`
            CREATE TABLE IF NOT EXISTS product_standards (
                id SERIAL PRIMARY KEY,
                product_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
                standard_name VARCHAR(255) NOT NULL,
                version VARCHAR(50) DEFAULT '1.0',
                is_active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Standard Categories
        await client.query(`
            CREATE TABLE IF NOT EXISTS standard_categories (
                id SERIAL PRIMARY KEY,
                product_standard_id INTEGER NOT NULL REFERENCES product_standards(id) ON DELETE CASCADE,
                category_name VARCHAR(255) NOT NULL,
                drawing_image_path VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 3. Inspection Points
        await client.query(`
            CREATE TABLE IF NOT EXISTS inspection_points (
                id SERIAL PRIMARY KEY,
                standard_category_id INTEGER NOT NULL REFERENCES standard_categories(id) ON DELETE CASCADE,
                point_number INTEGER NOT NULL,
                pos_x NUMERIC(10, 2),
                pos_y NUMERIC(10, 2),
                name VARCHAR(255),
                method VARCHAR(100),
                standard_value VARCHAR(100),
                tolerance VARCHAR(100),
                upper_limit VARCHAR(100),
                lower_limit VARCHAR(100),
                unit VARCHAR(50),
                tool_used VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Ensure existing tables have enough precision for coordinates
        await client.query(`ALTER TABLE inspection_points ALTER COLUMN pos_x TYPE NUMERIC(10, 2)`);
        await client.query(`ALTER TABLE inspection_points ALTER COLUMN pos_y TYPE NUMERIC(10, 2)`);

        // 4. Inspection Logs
        await client.query(`
            CREATE TABLE IF NOT EXISTS inspection_logs (
                id SERIAL PRIMARY KEY,
                production_order_id INTEGER REFERENCES manufacturing_orders(id),
                inspection_point_id INTEGER REFERENCES inspection_points(id),
                inspection_result VARCHAR(10) CHECK (inspection_result IN ('PASS', 'FAIL')),
                measured_value VARCHAR(100),
                notes TEXT,
                inspector_id VARCHAR(100),
                inspected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 5. Generic General Records (for sections without specific tables)
        await client.query(`
            CREATE TABLE IF NOT EXISTS quality_general_records (
                id VARCHAR(50) PRIMARY KEY,
                section_name VARCHAR(100) NOT NULL,
                data_json JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await client.query('COMMIT');
        console.log("Quality Tables Verified/Created.");
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Failed to initialize Quality Tables:", error);
    } finally {
        client.release();
    }
};

// Run initialization
initializeQualityTables();

// ==========================================================
// APIs for Generic Sections (Incoming, PRE-USE, Maintenance, etc.)
// ==========================================================

// GET: Fetch records for a specific section
router.get('/general/:section', async (req, res) => {
    try {
        const { section } = req.params;
        const result = await db.allAsync('SELECT * FROM quality_general_records WHERE section_name = $1 ORDER BY created_at DESC', [section]);

        // Map back to flat object structure for frontend
        const data = result.map(row => ({
            id: row.id,
            ...row.data_json
        }));

        res.json({ success: true, data: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST: Create or Update record
router.post('/general', async (req, res) => {
    try {
        const { action, section, data } = req.body;

        if (action === 'delete') {
            await pool.query('DELETE FROM quality_general_records WHERE id = $1', [data.id]);
            return res.json({ success: true, message: 'Deleted successfully' });
        }

        // For Create/Update
        const id = data.id || `gen-${Date.now()}`;
        const dataJson = { ...data, id: id }; // Ensure ID is in JSON

        if (action === 'create' || action === 'update') {
            // Upsert logic
            const sql = `
                INSERT INTO quality_general_records (id, section_name, data_json, updated_at)
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (id) DO UPDATE 
                SET data_json = $3, updated_at = NOW()
            `;
            await pool.query(sql, [id, section, dataJson]);
        }

        res.json({ success: true, message: 'Saved successfully' });
    } catch (error) {
        console.error("General Save Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================================
// APIs for Phase 1: Standard Management
// ==========================================================

// GET: ดึงรายการ Standard ทั้งหมด
router.get('/standards', async (req, res) => {
    try {
        const sql = `
            SELECT ps.id, ps.standard_name, ps.version, ps.is_active, ps.created_at, i.item_code, i.item_name
            FROM product_standards ps
            JOIN items i ON ps.product_id = i.id
            ORDER BY ps.id DESC
        `;
        const rows = await db.allAsync(sql);
        res.json(rows);
    } catch (error) {
        console.error("Get Standards Error:", error.message);
        res.status(500).json({ error: 'Failed to retrieve standards.' });
    }
});

// GET: ดึงข้อมูล Standard 1 ชุดแบบละเอียด
router.get('/standards/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const sqlStandard = `SELECT ps.*, i.item_code, i.item_name FROM product_standards ps JOIN items i ON ps.product_id = i.id WHERE ps.id = $1`;
        const standardRow = await db.getAsync(sqlStandard, [id]);

        if (!standardRow) return res.status(404).json({ error: 'Standard not found' });

        const sqlCategories = `
            SELECT sc.id, sc.category_name, sc.drawing_image_path,
                   json_agg(
                       json_build_object('id', ip.id, 'point_number', ip.point_number, 'pos_x', ip.pos_x, 'pos_y', ip.pos_y, 'name', ip.name, 'method', ip.method, 'standard_value', ip.standard_value, 'tolerance', ip.tolerance, 'upper_limit', ip.upper_limit, 'lower_limit', ip.lower_limit, 'unit', ip.unit, 'tool_used', ip.tool_used)
                   ) as points
            FROM standard_categories sc
            LEFT JOIN inspection_points ip ON sc.id = ip.standard_category_id
            WHERE sc.product_standard_id = $1
            GROUP BY sc.id
        `;
        const categoryRows = await db.allAsync(sqlCategories, [id]);

        const categories = categoryRows.map(cat => {
            // PostgreSQL json_agg returns array of objects, but if left join is null, it might return [null] or empty array depending on implementation.
            // However, json_agg usually aggregates nulls if not filtered.
            // Let's check if points contains nulls.
            let points = cat.points || [];
            if (points.length === 1 && points[0].id === null) points = []; // Handle case where left join produced a null record
            // Also filter out any nulls just in case
            points = points.filter(p => p !== null && p.id !== null);

            return { ...cat, points };
        });

        res.json({ ...standardRow, categories });
    } catch (error) {
        console.error("Get Standard by ID Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// [แก้ไข] API: ดึง "รายการ" มาตรฐานที่มีอยู่ทั้งหมดสำหรับ MO Number
router.get('/standards-list/mo/:moNumber', async (req, res) => {
    try {
        const { moNumber } = req.params;
        const moSql = `SELECT item_code FROM manufacturing_orders WHERE mo_number = $1`;
        const moRow = await db.getAsync(moSql, [moNumber]);
        if (!moRow) return res.status(404).json({ error: 'Manufacturing Order not found.' });

        const itemSql = `SELECT id as product_id FROM items WHERE item_code = $1`;
        const itemRow = await db.getAsync(itemSql, [moRow.item_code]);
        if (!itemRow) return res.status(404).json({ error: `Item code ${moRow.item_code} not found.` });

        const standardsSql = `SELECT id, standard_name FROM product_standards WHERE product_id = $1 AND is_active = 1 ORDER BY standard_name`;
        const standards = await db.allAsync(standardsSql, [itemRow.product_id]);

        if (standards.length === 0) {
            return res.status(404).json({ error: 'No active QC Standards found for this product.' });
        }
        res.json(standards); // คืนค่าเป็น Array ของ {id, standard_name}
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

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const standardResult = await client.query(`INSERT INTO product_standards (product_id, standard_name) VALUES ($1, $2) RETURNING id`, [product_id, standard_name]);
            const standardId = standardResult.rows[0].id;

            for (const [index, cat] of categories.entries()) {
                const file = req.files.find(f => f.fieldname === `drawing_cat_${index}`);
                if (!file) throw new Error(`Drawing for category "${cat.category_name}" is missing.`);

                const imagePath = file.path.replace(/\\/g, "/").replace('public/', '');
                const categoryResult = await client.query(`INSERT INTO standard_categories (product_standard_id, category_name, drawing_image_path) VALUES ($1, $2, $3) RETURNING id`, [standardId, cat.category_name, imagePath]);
                const categoryId = categoryResult.rows[0].id;

                if (cat.points && cat.points.length > 0) {
                    for (const point of cat.points) {
                        await client.query(`INSERT INTO inspection_points (standard_category_id, point_number, pos_x, pos_y, name, method, standard_value, tolerance, upper_limit, lower_limit, unit, tool_used) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                            [categoryId, point.point_number, point.pos_x, point.pos_y, point.name, point.method, point.standard_value, point.tolerance, point.upper_limit, point.lower_limit, point.unit, point.tool_used]);
                    }
                }
            }

            await client.query('COMMIT');
            res.status(201).json({ message: 'Standard created successfully', standard_id: standardId });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error("Create Transaction failed:", error);
            res.status(500).json({ error: `Create Transaction failed: ${error.message}` });
        } finally {
            client.release();
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

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            await client.query(`UPDATE product_standards SET product_id = $1, standard_name = $2 WHERE id = $3`, [product_id, standard_name, id]);
            await client.query(`DELETE FROM standard_categories WHERE product_standard_id = $1`, [id]);

            let fileCounter = 0;
            for (const cat of categories) {
                let imagePath = cat.existing_image_path;
                const newFile = req.files.find(f => f.fieldname === `drawing_cat_${fileCounter}`);

                if (newFile) {
                    imagePath = newFile.path.replace(/\\/g, "/").replace('public/', '');
                    fileCounter++;
                }

                if (!imagePath) {
                    throw new Error(`Image is missing for category "${cat.category_name}"`);
                }

                const categoryResult = await client.query(`INSERT INTO standard_categories (product_standard_id, category_name, drawing_image_path) VALUES ($1, $2, $3) RETURNING id`, [id, cat.category_name, imagePath]);
                const categoryId = categoryResult.rows[0].id;

                if (cat.points && cat.points.length > 0) {
                    for (const point of cat.points) {
                        await client.query(`INSERT INTO inspection_points (standard_category_id, point_number, pos_x, pos_y, name, method, standard_value, tolerance, upper_limit, lower_limit, unit, tool_used) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                            [categoryId, point.point_number, point.pos_x, point.pos_y, point.name, point.method, point.standard_value, point.tolerance, point.upper_limit, point.lower_limit, point.unit, point.tool_used]);
                    }
                }
            }

            await client.query('COMMIT');
            res.status(200).json({ message: 'Standard updated successfully', standard_id: id });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error("Update Transaction failed:", error);
            res.status(500).json({ error: `Update failed: ${error.message}` });
        } finally {
            client.release();
        }
    });
});


// ==========================================================
// APIs for Phase 2: Daily Inspection & Dashboard
// ==========================================================
router.get('/inspection-data/mo/:moNumber', async (req, res) => {
    try {
        const { moNumber } = req.params;
        const moSql = `SELECT id as mo_id, mo_number, item_code FROM manufacturing_orders WHERE mo_number = $1`;
        const moRow = await db.getAsync(moSql, [moNumber]);
        if (!moRow) return res.status(404).json({ error: 'Manufacturing Order not found.' });

        const itemSql = `SELECT id as product_id, item_name FROM items WHERE item_code = $1`;
        const itemRow = await db.getAsync(itemSql, [moRow.item_code]);
        if (!itemRow) return res.status(404).json({ error: `Item code ${moRow.item_code} not found.` });

        const standardSql = `SELECT * FROM product_standards WHERE product_id = $1 AND is_active = 1 ORDER BY id DESC LIMIT 1`;
        const standardRow = await db.getAsync(standardSql, [itemRow.product_id]);
        if (!standardRow) return res.status(404).json({ error: 'No active QC Standard found for this product.' });

        const categoriesSql = `
            SELECT sc.id, sc.category_name, sc.drawing_image_path,
                   json_agg(
                       json_build_object('id', ip.id, 'point_number', ip.point_number, 'pos_x', ip.pos_x, 'pos_y', ip.pos_y, 'name', ip.name, 'method', ip.method, 'standard_value', ip.standard_value, 'tolerance', ip.tolerance, 'upper_limit', ip.upper_limit, 'lower_limit', ip.lower_limit, 'unit', ip.unit, 'tool_used', ip.tool_used)
                   ) as points
            FROM standard_categories sc
            LEFT JOIN inspection_points ip ON sc.id = ip.standard_category_id
            WHERE sc.product_standard_id = $1 GROUP BY sc.id`;
        const categoryRows = await db.allAsync(categoriesSql, [standardRow.id]);
        const categories = categoryRows.map(cat => {
            let points = cat.points || [];
            if (points.length === 1 && points[0].id === null) points = [];
            points = points.filter(p => p !== null && p.id !== null);
            return { ...cat, points };
        });

        const responseData = {
            mo_id: moRow.mo_id, mo_number: moRow.mo_number, item_code: moRow.item_code, item_name: itemRow.item_name,
            standard: { id: standardRow.id, name: standardRow.standard_name, categories: categories }
        };
        res.json(responseData);
    } catch (error) {
        console.error("Get Inspection Data Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

router.post('/logs', async (req, res) => {
    try {
        const { mo_id, inspection_point_id, inspection_result, measured_value, notes, inspector_id } = req.body;
        if (!mo_id || !inspection_point_id || !inspection_result || !inspector_id) {
            return res.status(400).json({ error: "Missing required fields for logging." });
        }
        const sql = `INSERT INTO inspection_logs (production_order_id, inspection_point_id, inspection_result, measured_value, notes, inspector_id, inspected_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id`;
        const result = await db.query(sql, [mo_id, inspection_point_id, inspection_result, measured_value, notes, inspector_id]);
        res.status(201).json({ message: "Log saved successfully.", log_id: result.rows[0].id });
    } catch (error) {
        console.error("Insert Log Error:", error.message);
        res.status(500).json({ error: "Failed to save inspection log." });
    }
});

router.get('/dashboard-data', async (req, res) => {
    try {
        const { date, mo, machine, inspector, stage } = req.query;

        let whereClauses = ["1=1"];
        let params = [];
        let paramIdx = 1;

        if (date) {
            whereClauses.push(`DATE(il.inspected_at) = $${paramIdx++}`);
            params.push(date);
        } else if (!mo && !machine && !inspector && !stage) {
            // Default to today if no filters at all
            whereClauses.push(`DATE(il.inspected_at) = CURRENT_DATE`);
        }

        if (mo) {
            whereClauses.push(`mo.mo_number ILIKE $${paramIdx++}`);
            params.push(`%${mo}%`);
        }

        if (machine) {
            whereClauses.push(`m.machine_code ILIKE $${paramIdx++}`);
            params.push(`%${machine}%`);
        }

        if (inspector) {
            // Assuming users table has username or full_name
            // Safe cast check: if inspector_id is integer
            whereClauses.push(`(u.username ILIKE $${paramIdx} OR u.display_name ILIKE $${paramIdx})`);
            params.push(`%${inspector}%`);
            paramIdx++;
        }

        if (stage) {
            whereClauses.push(`ps.standard_name ILIKE $${paramIdx++}`);
            params.push(`%${stage}%`);
        }

        const whereSql = whereClauses.join(' AND ');

        // Common Join Structure
        const joins = `
            LEFT JOIN manufacturing_orders mo ON il.production_order_id = mo.id
            LEFT JOIN machines m ON mo.machine_id = m.id
            LEFT JOIN inspection_points ip ON il.inspection_point_id = ip.id
            LEFT JOIN standard_categories sc ON ip.standard_category_id = sc.id
            LEFT JOIN product_standards ps ON sc.product_standard_id = ps.id
            LEFT JOIN users u ON (il.inspector_id ~ '^[0-9]+$' AND il.inspector_id::integer = u.id)
        `;

        const kpiSql = `
            SELECT
                COUNT(*) as total,
                COUNT(DISTINCT il.production_order_id) as po_count,
                SUM(CASE WHEN il.inspection_result = 'PASS' THEN 1 ELSE 0 END) as pass_count,
                SUM(CASE WHEN il.inspection_result = 'FAIL' THEN 1 ELSE 0 END) as fail_count
            FROM inspection_logs il
            ${joins}
            WHERE ${whereSql}`;

        const kpiData = await db.getAsync(kpiSql, params);

        const defectsSql = `
            SELECT ip.name as problem, COUNT(il.id) as count
            FROM inspection_logs il
            ${joins}
            WHERE il.inspection_result = 'FAIL' AND ${whereSql}
            GROUP BY ip.name ORDER BY count DESC LIMIT 5`;

        // Use identical params for defects query
        const topDefects = await db.allAsync(defectsSql, params);

        res.json({
            kpi: { total: kpiData?.total || 0, po: kpiData?.po_count || 0, pass: kpiData?.pass_count || 0, fail: kpiData?.fail_count || 0 },
            top_defects: topDefects
        });
    } catch (error) {
        console.error("Dashboard data error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

router.get('/filter-options', async (req, res) => {
    try {
        // 1. Inspectors (Users)
        // Try to fetch from users table, fallback to distinct inspector_id from logs if users table issues
        let inspectors = [];
        try {
            // Check if users table has specific columns
            const userSql = `SELECT id, username, display_name FROM users ORDER BY username`;
            inspectors = await db.allAsync(userSql);
        } catch (e) {
            console.warn("Could not fetch users for filter:", e.message);
            // Fallback: Get distinct IDs from logs (just raw IDs implies we can't show names easily without user table)
        }

        // 2. Machines
        let machines = [];
        try {
            const machineSql = `SELECT id, machine_code FROM machines ORDER BY machine_code`;
            machines = await db.allAsync(machineSql);
        } catch (e) { console.warn("Could not fetch machines:", e.message); }

        // 3. MO Numbers (Recent 100)
        let mos = [];
        try {
            const moSql = `SELECT id, mo_number FROM manufacturing_orders ORDER BY id DESC LIMIT 100`;
            mos = await db.allAsync(moSql);
        } catch (e) { console.warn("Could not fetch MOs:", e.message); }

        res.json({ inspectors, machines, mos });
    } catch (error) {
        console.error("Filter Options Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;