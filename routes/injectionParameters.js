const express = require('express');
const router = express.Router();
const db = require('../database');

// Ensure Table Exists (PostgreSQL)
const pgSql = `
    CREATE TABLE IF NOT EXISTS injection_parameter_checks (
        id SERIAL PRIMARY KEY,
        machine_id INTEGER,
        mo_number TEXT,
        check_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        inspector_id INTEGER,
        parameter_data TEXT,
        image_paths TEXT,
        notes TEXT
    );
`;
db.query(pgSql).then(() => console.log("Injection table ensured (PG).")).catch(e => console.error("Error creating injection table:", e));

function ensureAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    res.status(401).json({ success: false, error: 'User not authenticated' });
}

// Save Check Data
router.post('/save', ensureAuthenticated, (req, res) => {
    const { machine_id, mo_number, data, images, notes } = req.body;
    const inspector_id = req.session.userId;

    const json_data = JSON.stringify(data);
    const json_images = JSON.stringify(images || []);
    const params = [machine_id, mo_number, inspector_id, json_data, json_images, notes];

    if (db.pool) {
        // PostgreSQL: Use RETURNING id
        const sql = `
            INSERT INTO injection_parameter_checks 
            (machine_id, mo_number, inspector_id, parameter_data, image_paths, notes) 
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `;
        db.query(sql, params, (err, result) => {
            if (err) {
                console.error("Error saving check (PG):", err);
                return res.status(500).json({ success: false, error: err.message });
            }
            res.json({ success: true, id: result.rows[0].id });
        });
    } else {
        // SQLite
        const sql = `
            INSERT INTO injection_parameter_checks 
            (machine_id, mo_number, inspector_id, parameter_data, image_paths, notes) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        db.run(sql, params, function (err) {
            if (err) {
                console.error("Error saving check (SQLite):", err);
                return res.status(500).json({ success: false, error: err.message });
            }
            res.json({ success: true, id: this.lastID });
        });
    }
});

// Get History for Report
router.get('/history/:mo_number', ensureAuthenticated, (req, res) => {
    const { mo_number } = req.params;
    const sql = `
        SELECT ipc.*, u.fullname as inspector_name, m.machine_code
        FROM injection_parameter_checks ipc
        LEFT JOIN users u ON ipc.inspector_id = u.id
        LEFT JOIN machines m ON ipc.machine_id = m.id
        WHERE ipc.mo_number = $1
        ORDER BY ipc.check_date DESC
    `;

    db.all(sql, [mo_number], (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, data: rows });
    });
});

// Get Latest Check (for comparison)
router.get('/latest/:machine_id', ensureAuthenticated, (req, res) => {
    const { machine_id } = req.params;
    const sql = `
        SELECT * FROM injection_parameter_checks
        WHERE machine_id = $1
        ORDER BY check_date DESC LIMIT 1
    `;
    db.get(sql, [machine_id], (err, row) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, data: row });
    });
});

module.exports = router;
