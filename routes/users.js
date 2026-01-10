const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../database.js');
const router = express.Router();

const isAdmin = (req, res, next) => {
    if (req.session.role === 'admin') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Forbidden: Admins only' });
    }
};

// API Endpoint สำหรับดึงข้อมูลผู้ใช้ทั้งหมด
// ปรับปรุง: ดึงเฉพาะคอลัมน์ที่จำเป็น เพื่อป้องกัน error หากคอลัมน์ 'status' ไม่มีอยู่
router.get('/', isAdmin, async (req, res) => {
    const sql = 'SELECT id, full_name as "fullName", email, role FROM users';
    try {
        const rows = await db.allAsync(sql);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error fetching users:', err.message);
        res.status(500).json({ success: false, message: "Failed to retrieve users." });
    }
});

// API Endpoint สำหรับดึงข้อมูลผู้ใช้รายบุคคล
// ปรับปรุง: ดึงเฉพาะคอลัมน์ที่จำเป็น เพื่อป้องกัน error หากคอลัมน์ 'status' ไม่มีอยู่
router.get('/:id', isAdmin, async (req, res) => {
    const sql = 'SELECT id, full_name as "fullName", email, role FROM users WHERE id = $1';
    try {
        const row = await db.getAsync(sql, [req.params.id]);
        if (!row) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, data: row });
    } catch (err) {
        console.error('Error fetching user by ID:', err.message);
        res.status(500).json({ success: false, message: "Failed to retrieve user." });
    }
});

// API Endpoint สำหรับสร้างผู้ใช้ใหม่
// ไม่ต้องแก้ไข เนื่องจากในโค้ดมีการกำหนดค่า status เป็น 'active' อยู่แล้ว
router.post('/', isAdmin, async (req, res) => {
    const { fullName, email, password, role } = req.body;
    if (!fullName || !email || !password || !role) {
        return res.status(400).json({ success: false, message: "Please provide all required fields." });
    }
    const saltRounds = 10;
    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const sql = `INSERT INTO users (full_name, email, password, role, status) VALUES ($1, $2, $3, $4, 'active') RETURNING id`;
        const result = await db.query(sql, [fullName, email, hashedPassword, role]);
        res.status(201).json({ success: true, id: result.rows[0].id });
    } catch (err) {
        console.error('Error creating user:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

// API Endpoint สำหรับอัปเดตข้อมูลผู้ใช้
router.put('/:id', isAdmin, async (req, res) => {
    const { fullName, email, role, password } = req.body;
    const { id } = req.params;

    console.log(`[UPDATE USER] Attempting to update user ID: ${id}`);
    console.log(`[UPDATE USER] Data: fullName=${fullName}, email=${email}, role=${role}, hasPassword=${!!password}`);

    if (!fullName || !email || !role) {
        return res.status(400).json({ success: false, message: "Full name, email, and role are required." });
    }

    try {
        let result;
        if (password) {
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            const sql = `UPDATE users SET full_name = $1, email = $2, role = $3, password = $4 WHERE id = $5`;
            result = await db.runAsync(sql, [fullName, email, role, hashedPassword, id]);
        } else {
            const sql = `UPDATE users SET full_name = $1, email = $2, role = $3 WHERE id = $4`;
            result = await db.runAsync(sql, [fullName, email, role, id]);
        }

        console.log(`[UPDATE USER] Result: rowCount=${result.rowCount}`);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "User not found or no changes made (ID may be incorrect)." });
        }

        res.json({ success: true, message: "User updated successfully." });
    } catch (err) {
        console.error('Error updating user:', err.message);
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// API Endpoint สำหรับลบผู้ใช้
router.delete('/:id', isAdmin, async (req, res) => {
    if (req.session.userId == req.params.id) {
        return res.status(400).json({ success: false, message: "You cannot delete your own account." });
    }
    const sql = 'DELETE FROM users WHERE id = $1';
    try {
        const result = await db.runAsync(sql, [req.params.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "User not found." });
        }
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
        console.error('Error deleting user:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;