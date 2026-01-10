const db = require('./database.js');

async function checkPermissions() {
    try {
        console.log("Checking roles...");
        const roles = await db.allAsync("SELECT * FROM roles");
        console.log("Roles:", roles);

        console.log("\nChecking 'user' role permissions...");
        const sql = `
            SELECT r.name as role_name, p.name as page_name, p.url 
            FROM role_pages rp
            JOIN roles r ON rp.role_id = r.id
            JOIN pages p ON rp.page_id = p.id
            WHERE r.name = 'user'
        `;
        const userPerms = await db.allAsync(sql);
        console.log(`Found ${userPerms.length} permissions for 'user'.`);
        userPerms.forEach(p => console.log(` - ${p.page_name} (${p.url})`));

        if (userPerms.length === 0) {
            console.log("\n⚠️ NO permissions found for role 'user'. This is why the sidebar is empty.");
        }

    } catch (err) {
        console.error("Error:", err);
    }
}

setTimeout(checkPermissions, 1000);
