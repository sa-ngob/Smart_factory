// routes/permissions.js
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

router.use(isAdmin);

// POST /api/permissions
router.post('/', async (req, res) => {
    const { permissions } = req.body; // expected format: [{role_id: 1, page_id: 1}, ...]

    try {
        await db.runAsync("BEGIN");

        // Clear existing permissions
        await db.runAsync("DELETE FROM role_pages");

        if (permissions && permissions.length > 0) {
            // Deduplicate incoming permissions to prevent "duplicate key value" errors
            const uniquePermissions = [];
            const seen = new Set();
            for (const p of permissions) {
                const key = `${p.role_id}-${p.page_id}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniquePermissions.push(p);
                }
            }

            // Construct Bulk Insert Statement to avoid race conditions
            const values = [];
            const placeholders = [];
            let paramIndex = 1;

            for (const p of uniquePermissions) {
                placeholders.push(`($${paramIndex++}, $${paramIndex++})`);
                values.push(p.role_id, p.page_id);
            }

            if (placeholders.length > 0) {
                const sql = `INSERT INTO role_pages (role_id, page_id) VALUES ${placeholders.join(', ')}`;
                await db.runAsync(sql, values);
            }
        }

        await db.runAsync("COMMIT");
        res.json({ success: true, message: "Permissions updated successfully." });

    } catch (err) {
        console.error("Error updating permissions:", err);
        try { await db.runAsync("ROLLBACK"); } catch (rollbackErr) { console.error("Rollback failed:", rollbackErr); }
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;