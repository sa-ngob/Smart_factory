// 🚀 New File: routes/roles.js
const express = require('express');
const db = require('../database.js');
const router = express.Router();

// Middleware ตรวจสอบ Admin
const isAdmin = (req, res, next) => {
    if (req.session.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
};

router.use(isAdmin); // ใช้ middleware กับทุก route ในไฟล์นี้

// GET /api/roles
router.get('/', async (req, res) => {
    try {
        const rows = await db.allAsync("SELECT * FROM roles ORDER BY name");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/roles
router.post('/', async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Role name is required' });

    try {
        // Postgres syntax
        const result = await db.query(`INSERT INTO roles (name) VALUES ($1) RETURNING id`, [name]);
        const newId = result.rows[0].id;
        res.status(201).json({ id: newId, name: name });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;