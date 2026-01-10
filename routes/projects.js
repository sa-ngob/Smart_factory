const express = require('express');
const router = express.Router();
const { pool, ...db } = require('../database.js');
const multer = require('multer');
const fs = require('fs');

// --- Multer Config ---
const uploadDir = 'public/uploads/projects';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `project-${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage: storage });

// --- Database Initialization ---
const initializeProjectTables = async () => {
    if (!pool) return;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Projects Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS projects (
                id SERIAL PRIMARY KEY,
                project_name VARCHAR(255) NOT NULL,
                project_type VARCHAR(50),
                customer_id INTEGER REFERENCES entities(id),
                model_name VARCHAR(255),
                part_name VARCHAR(255),
                part_code VARCHAR(100),
                start_date DATE,
                target_date DATE,
                status VARCHAR(50) DEFAULT 'In Process',
                progress INTEGER DEFAULT 0,
                part_image_path VARCHAR(500),
                drawing_path VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Project Tasks Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS project_tasks (
                id SERIAL PRIMARY KEY,
                project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                task_name VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                progress INTEGER DEFAULT 0,
                start_date DATE,
                end_date DATE
            );
        `);

        await client.query('COMMIT');
        console.log("Project tables verified/created.");
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Failed to initialize project tables:", error);
    } finally {
        client.release();
    }
};

initializeProjectTables();

// --- Task Templates ---
const taskTemplates = {
    'new_mold': ['ออกแบบแม่พิมพ์', 'สั่งของ', 'ออกแบบ CAD/CAM', 'Process CNC', 'EDM Wirecut', 'Assembly', 'Testing QC', 'Sample', 'Improve T0', 'T1', 'T2'],
    'repair_mold': ['วางแผนการซ่อมแม่พิมพ์', 'สั่งของ', 'ออกแบบ CAD/CAM', 'Process CNC', 'EDM Wirecut', 'Assembly', 'Testing QC', 'Sample'],
    'part_making': ['ออกแบบ', 'สั่งของ', 'ออกแบบ CAD/CAM', 'Process CNC', 'EDM Wirecut', 'Assembly', 'Testing QC', 'Sample']
};

const parseNumber = (value) => (value === '' || value === undefined || value === null) ? null : Number(value);

// READ: Get all projects
router.get('/', async (req, res) => {
    const sql = `
        SELECT p.*, e.name as customer_name 
        FROM projects p
        LEFT JOIN entities e ON p.customer_id = e.id
        ORDER BY p.created_at DESC
    `;
    try {
        let rows;
        if (pool) {
            const result = await pool.query(sql);
            rows = result.rows;
        } else {
            // SQLite fallback
            rows = await new Promise((resolve, reject) => {
                db.all(sql, [], (err, rows) => {
                    if (err) reject(err); else resolve(rows);
                });
            });
        }
        res.json({ data: rows });
    } catch (err) {
        res.status(500).json({ "error": err.message });
    }
});

// READ: Get Single Project with Tasks
router.get('/:id', async (req, res) => {
    const projectId = req.params.id;
    const responseData = {};
    const sqlProject = `SELECT p.*, e.name as customer_name FROM projects p LEFT JOIN entities e ON p.customer_id = e.id WHERE p.id = $1`;
    const sqlTasks = `SELECT * FROM project_tasks WHERE project_id = $1 ORDER BY id`;

    try {
        let project, tasks;

        if (pool) { // Postgres
            const projectRes = await pool.query(sqlProject, [projectId]);
            if (projectRes.rows.length === 0) return res.status(404).json({ "error": "Project not found" });
            project = projectRes.rows[0];

            const tasksRes = await pool.query(sqlTasks, [projectId]);
            tasks = tasksRes.rows;
        } else { // SQLite
            // Assuming db.get/all are callback based, wrap them or use async if available. 
            // Ideally we should use the same async wrapper pattern as other routes.
            // For now, let's just stick to Postgres implementation as it is the active one.
            return res.status(500).json({ error: "SQLite implementation pending for deep nested queries in this refactor." });
        }

        responseData.project = project;
        responseData.tasks = tasks;
        res.json(responseData);

    } catch (err) {
        res.status(500).json({ "error": err.message });
    }
});

// CREATE: New Project
router.post('/', upload.fields([
    { name: 'partImage', maxCount: 1 },
    { name: 'technicalDrawing', maxCount: 1 }
]), async (req, res) => {
    const data = req.body;
    const files = req.files;
    const part_image_path = files && files.partImage ? `/${uploadDir.replace('public/', '').replace('public\\', '')}/${files.partImage[0].filename}` : null;
    const drawing_path = files && files.technicalDrawing ? `/${uploadDir.replace('public/', '').replace('public\\', '')}/${files.technicalDrawing[0].filename}` : null;

    if (!pool) return res.status(500).json({ error: "PostgreSQL required for this operation" });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const insertProjectSql = `
            INSERT INTO projects (project_name, project_type, customer_id, model_name, part_name, part_code, start_date, target_date, part_image_path, drawing_path, created_at) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP) 
            RETURNING id
        `;
        const params = [data.projectName, data.projectType, parseNumber(data.customerId), data.modelName, data.partName, data.partCode, data.startDate, data.targetDate, part_image_path, drawing_path];

        const resProject = await client.query(insertProjectSql, params);
        const projectId = resProject.rows[0].id;

        const tasks = taskTemplates[data.projectType] || [];
        if (tasks.length > 0) {
            const start = new Date(data.startDate);
            const end = new Date(data.targetDate);
            const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            const daysPerTask = Math.max(1, Math.floor(totalDays / tasks.length));

            const insertTaskSql = 'INSERT INTO project_tasks (project_id, task_name, start_date, end_date) VALUES ($1, $2, $3, $4)';

            for (let index = 0; index < tasks.length; index++) {
                const taskName = tasks[index];
                const taskStart = new Date(start);
                taskStart.setDate(start.getDate() + (index * daysPerTask));
                const taskEnd = new Date(taskStart);
                taskEnd.setDate(taskStart.getDate() + daysPerTask - 1);

                await client.query(insertTaskSql, [
                    projectId,
                    taskName,
                    taskStart.toISOString().split('T')[0],
                    taskEnd.toISOString().split('T')[0]
                ]);
            }
        }

        await client.query('COMMIT');
        res.json({ "message": "success", "id": projectId });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ "error": err.message });
    } finally {
        client.release();
    }
});

// UPDATE: Edit Project
router.put('/:id', upload.fields([
    { name: 'partImage', maxCount: 1 },
    { name: 'technicalDrawing', maxCount: 1 }
]), async (req, res) => {
    const projectId = req.params.id;
    const data = req.body;
    const files = req.files;

    if (!pool) return res.status(500).json({ error: "PostgreSQL required" });

    try {
        const oldProjectRes = await pool.query('SELECT part_image_path, drawing_path FROM projects WHERE id = $1', [projectId]);
        if (oldProjectRes.rows.length === 0) return res.status(404).json({ "error": "Project not found" });
        const oldProject = oldProjectRes.rows[0];

        const part_image_path = files && files.partImage ? `/${uploadDir.replace('public/', '').replace('public\\', '')}/${files.partImage[0].filename}` : oldProject.part_image_path;
        const drawing_path = files && files.technicalDrawing ? `/${uploadDir.replace('public/', '').replace('public\\', '')}/${files.technicalDrawing[0].filename}` : oldProject.drawing_path;

        const sql = `
            UPDATE projects 
            SET project_name = $1, project_type = $2, customer_id = $3, model_name = $4, part_name = $5, 
                part_code = $6, start_date = $7, target_date = $8, part_image_path = $9, drawing_path = $10 
            WHERE id = $11
        `;
        const params = [data.projectName, data.projectType, parseNumber(data.customerId), data.modelName, data.partName, data.partCode, data.startDate, data.targetDate, part_image_path, drawing_path, projectId];

        await pool.query(sql, params);
        res.json({ message: "success" });

    } catch (err) {
        res.status(400).json({ "error": err.message });
    }
});

// UPDATE: Update Task
router.put('/tasks/:taskId', async (req, res) => {
    const { status, progress, start_date, end_date, project_id } = req.body;
    const sql = `UPDATE project_tasks SET status = $1, progress = $2, start_date = $3, end_date = $4 WHERE id = $5`;

    if (!pool) return res.status(500).json({ error: "PostgreSQL required" });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(sql, [status, progress, start_date, end_date, req.params.taskId]);

        // Recalculate Project Progress
        const updateProjectProgressSql = `
            UPDATE projects 
            SET progress = (SELECT CAST(AVG(progress) AS INTEGER) FROM project_tasks WHERE project_id = $1),
                status = CASE 
                           WHEN (SELECT COUNT(*) FROM project_tasks WHERE project_id = $1 AND status != 'completed') = 0 THEN 'Complete' 
                           ELSE 'In Process' 
                         END
            WHERE id = $1
        `;
        await client.query(updateProjectProgressSql, [project_id]);

        await client.query('COMMIT');
        res.json({ message: "Task updated successfully" });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ "error": err.message });
    } finally {
        client.release();
    }
});

// DELETE: Project
router.delete('/:id', async (req, res) => {
    const sql = 'DELETE FROM projects WHERE id = $1';
    if (!pool) return res.status(500).json({ error: "PostgreSQL required" });

    try {
        await pool.query(sql, [req.params.id]);
        res.json({ "message": "deleted" });
    } catch (err) {
        res.status(400).json({ "error": err.message });
    }
});

module.exports = router;
