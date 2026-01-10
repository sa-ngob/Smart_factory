const db = require('./database.js');

async function probe() {
    console.log("Checking DB Connection...");
    try {
        // Check users table columns
        console.log("Querying one user to see columns...");
        // Use * to see all columns
        const users = await db.allAsync('SELECT * FROM users LIMIT 1');
        if (users.length > 0) {
            console.log("User columns:", Object.keys(users[0]));
        } else {
            console.log("No users found, cannot determine columns easily via SELECT *.");
            // Try explicit column select to see what errors
            try {
                await db.allAsync('SELECT full_name FROM users LIMIT 1');
                console.log("Column 'full_name' EXISTS.");
            } catch (e) {
                console.log("Column 'full_name' DOES NOT exist.", e.message);
            }
            try {
                await db.allAsync('SELECT fullName FROM users LIMIT 1');
                console.log("Column 'fullName' EXISTS.");
            } catch (e) {
                console.log("Column 'fullName' DOES NOT exist.", e.message);
            }
        }
    } catch (err) {
        console.error("Probe failed:", err);
    }
}

probe();
