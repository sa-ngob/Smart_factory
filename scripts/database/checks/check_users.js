const db = require('./database.js');
const bcrypt = require('bcrypt');

async function checkUsers() {
    try {
        console.log("Checking users in database...");
        // Wait a bit for DB connection
        await new Promise(resolve => setTimeout(resolve, 2000));

        const users = await db.allAsync('SELECT * FROM users');
        console.log(`Found ${users.length} users:`);
        users.forEach(u => {
            console.log(`- ID: ${u.id}, Name: ${u.fullName}, Email: ${u.email}, Role: ${u.role}, PasswordHash: ${u.password.substring(0, 10)}...`);
        });

        const admin = users.find(u => u.email === 'admin@local');
        if (admin) {
            console.log("\nVerifying admin password 'admin'...");
            const match = await bcrypt.compare('admin', admin.password);
            console.log(`Password match: ${match}`);

            if (!match) {
                console.log("Resetting admin password to 'admin'...");
                const newHash = await bcrypt.hash('admin', 10);
                await db.runAsync('UPDATE users SET password = $1 WHERE id = $2', [newHash, admin.id]);
                console.log("Password reset successfully.");
            }
        } else {
            console.log("\nAdmin user not found! Creating one...");
            const newHash = await bcrypt.hash('admin', 10);
            await db.runAsync(`INSERT INTO users (full_name, email, password, role) VALUES ($1, $2, $3, $4)`,
                ['Administrator', 'admin@local', newHash, 'admin']);
            console.log("Admin user created.");
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit(0);
    }
}

checkUsers();
