const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../database.js');
const router = express.Router();

router.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: "กรุณากรอกอีเมลและรหัสผ่าน" });
    }
    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
        if (err) return res.status(500).json({ success: false, message: "Server error" });
        if (!user) return res.status(401).json({ success: false, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });

        bcrypt.compare(password, user.password, (err, result) => {
            if (result) {
                req.session.userId = user.id;
                req.session.role = user.role;
                req.session.name = user.name;
                res.json({ success: true, redirectUrl: '/dashboard.html' });
            } else {
                res.status(401).json({ success: false, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
            }
        });
    });
});

router.post('/register', (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.redirect('/register.html?error=missing_fields');
    }

    const saltRounds = 10;
    bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
        if (err) {
            console.error("Bcrypt hash error:", err);
            return res.status(500).send("Server error during registration.");
        }

        const sql = `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'user')`;
        db.run(sql, [name, email, hashedPassword], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.redirect('/register.html?error=email_exists');
                }
                console.error("Database insert error:", err);
                return res.status(500).send("Could not register user.");
            }
            res.redirect('/login.html?success=registered');
        });
    });
});

router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).send("Could not log out.");
        res.redirect('/login.html');
    });
});

router.get('/me', (req, res) => {
  if (req.session.userId) {
    res.json({
        loggedIn: true,
        id: req.session.userId,
        name: req.session.name,
        role: req.session.role
    });
  } else {
    res.status(401).json({ loggedIn: false });
  }
});

module.exports = router;