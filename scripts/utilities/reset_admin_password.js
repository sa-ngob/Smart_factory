const db = require('./database.js');
const bcrypt = require('bcrypt');

const util = require('util');

async function resetAdminPassword() {
    try {
        const email = 'admin@local';
        const newPassword = 'admin';
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        console.log(`Resetting password for '${email}' to '${newPassword}'...`);

        // Check if we are in Postgres mode (db has query method) or SQLite mode (db is sqlite3 instance)
        if (db.query) {
            // Postgres Mode
            const checkRes = await db.query("SELECT * FROM users WHERE email = $1", [email]);
            if (checkRes.rows && checkRes.rows.length > 0) {
                await db.query("UPDATE users SET password = $1 WHERE email = $2", [hashedPassword, email]);
                console.log("✅ Password updated successfully (Postgres).");
            } else {
                console.log("User not found. Creating admin user...");
                await db.query(
                    "INSERT INTO users (full_name, email, password, role, status) VALUES ($1, $2, $3, $4, 'active')",
                    ['Administrator', email, hashedPassword, 'admin']
                );
                console.log("✅ Admin user created successfully (Postgres).");
            }

        } else {
            // SQLite Mode
            // Promisify methods for easier async/await usage
            const get = util.promisify(db.get.bind(db));
            const run = util.promisify(db.run.bind(db));

            const user = await get("SELECT * FROM users WHERE email = ?", [email]);
            if (user) {
                await run("UPDATE users SET password = ? WHERE email = ?", [hashedPassword, email]);
                console.log("✅ Password updated successfully (SQLite).");
            } else {
                console.log("User not found. Creating admin user...");
                await run(
                    "INSERT INTO users (fullName, email, password, role, status) VALUES (?, ?, ?, ?, 'active')",
                    ['Administrator', email, hashedPassword, 'admin']
                );
                console.log("✅ Admin user created successfully (SQLite).");
            }
        }

        process.exit(0);
    } catch (err) {
        console.error("❌ Error resetting password:", err);
        process.exit(1);
    }
}

// Allow a moment for DB connection to establish if database.js does async init
setTimeout(resetAdminPassword, 3000);
