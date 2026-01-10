const express = require('express');
const router = express.Router();
const db = require('../database.js');
const multer = require('multer');
const fs = require('fs');

// --- การตั้งค่า Multer สำหรับจัดการไฟล์อัปโหลด ---
const uploadDir = 'public/uploads/projects';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `project-${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage: storage });

// --- Task Templates ---
const taskTemplates = {
    'new_mold': ['ออกแบบแม่พิมพ์', 'สั่งของ', 'ออกแบบ CAD/CAM', 'Process CNC', 'EDM Wirecut', 'Assembly', 'Testing QC', 'Sample', 'Improve T0', 'T1', 'T2'],
    'repair_mold': ['วางแผนการซ่อมแม่พิมพ์', 'สั่งของ', 'ออกแบบ CAD/CAM', 'Process CNC', 'EDM Wirecut', 'Assembly', 'Testing QC', 'Sample'],
    'part_making': ['ออกแบบ', 'สั่งของ', 'ออกแบบ CAD/CAM', 'Process CNC', 'EDM Wirecut', 'Assembly', 'Testing QC', 'Sample']
};

// --- API สำหรับจัดการโปรเจกต์ ---

// READ: ดึงข้อมูลโปรเจกต์ทั้งหมด
router.get('/', (req, res) => {
    const sql = `
        SELECT p.*, e.name as customer_name 
        FROM projects p
        LEFT JOIN entities e ON p.customer_id = e.id
        ORDER BY p.created_at DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ "error": err.message });
        res.json({ data: rows });
    });
});

// READ: ดึงข้อมูลโปรเจกต์เดียวแบบละเอียด (พร้อม Tasks)
router.get('/:id', (req, res) => {
    const projectId = req.params.id;
    const responseData = {};
    const sqlProject = `SELECT p.*, e.name as customer_name FROM projects p LEFT JOIN entities e ON p.customer_id = e.id WHERE p.id = ?`;
    
    db.get(sqlProject, [projectId], (err, project) => {
        if (err) return res.status(500).json({ "error": err.message });
        if (!project) return res.status(404).json({ "error": "Project not found" });
        
        responseData.project = project;
        const sqlTasks = `SELECT * FROM project_tasks WHERE project_id = ? ORDER BY id`;
        db.all(sqlTasks, [projectId], (err, tasks) => {
            if (err) return res.status(500).json({ "error": err.message });
            responseData.tasks = tasks;
            res.json(responseData);
        });
    });
});

// CREATE: สร้างโปรเจกต์ใหม่
router.post('/', upload.fields([
    { name: 'partImage', maxCount: 1 },
    { name: 'technicalDrawing', maxCount: 1 }
]), (req, res) => {
    const data = req.body;
    const files = req.files;
    const part_image_path = files && files.partImage ? `/${uploadDir.replace('public', '')}/${files.partImage[0].filename}` : null;
    const drawing_path = files && files.technicalDrawing ? `/${uploadDir.replace('public', '')}/${files.technicalDrawing[0].filename}` : null;

    const sql = `INSERT INTO projects (project_name, project_type, customer_id, model_name, part_name, part_code, start_date, target_date, part_image_path, drawing_path, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`;
    const params = [data.projectName, data.projectType, data.customerId, data.modelName, data.partName, data.partCode, data.startDate, data.targetDate, part_image_path, drawing_path, new Date().toISOString()];
    
    db.run(sql, params, function(err) {
        if (err) return res.status(400).json({ "error": err.message });
        
        const projectId = this.lastID;
        const tasks = taskTemplates[data.projectType] || [];
        if (tasks.length > 0) {
            const stmt = db.prepare('INSERT INTO project_tasks (project_id, task_name, start_date, end_date) VALUES (?, ?, ?, ?)');
            const start = new Date(data.startDate);
            const end = new Date(data.targetDate);
            const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            const daysPerTask = Math.max(1, Math.floor(totalDays / tasks.length));

            tasks.forEach((taskName, index) => {
                const taskStart = new Date(start);
                taskStart.setDate(start.getDate() + (index * daysPerTask));
                const taskEnd = new Date(taskStart);
                taskEnd.setDate(taskStart.getDate() + daysPerTask - 1);
                stmt.run(projectId, taskName, taskStart.toISOString().split('T')[0], taskEnd.toISOString().split('T')[0]);
            });
            stmt.finalize();
        }
        res.json({ "message": "success", "id": projectId });
    });
});

// UPDATE: อัปเดต Task ของโปรเจกต์
router.put('/tasks/:taskId', (req, res) => {
    const { status, progress, start_date, end_date, project_id } = req.body;
    const sql = `UPDATE project_tasks SET status = ?, progress = ?, start_date = ?, end_date = ? WHERE id = ?`;
    db.run(sql, [status, progress, start_date, end_date, req.params.taskId], function(err) {
        if (err) return res.status(400).json({ "error": err.message });

        const updateProjectProgressSql = `
            UPDATE projects 
            SET progress = (SELECT CAST(AVG(progress) AS INTEGER) FROM project_tasks WHERE project_id = ?),
                status = CASE WHEN (SELECT MIN(status) FROM project_tasks WHERE project_id = ?) = 'completed' THEN 'Complete' ELSE 'In Process' END
            WHERE id = ?
        `;
        db.run(updateProjectProgressSql, [project_id, project_id, project_id], (err) => {
            if (err) console.error("Failed to update overall project progress:", err);
            res.json({ message: "Task updated successfully" });
        });
    });
});

// DELETE: ลบโปรเจกต์
router.delete('/:id', (req, res) => {
    const sql = 'DELETE FROM projects WHERE id = ?';
    db.run(sql, req.params.id, function (err) {
        if (err) return res.status(400).json({ "error": err.message });
        res.json({ "message": "deleted", changes: this.changes });
    });
});

module.exports = router;
