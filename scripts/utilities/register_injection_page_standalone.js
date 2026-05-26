const sqlite3 = require('sqlite3').verbose();
const DB_PATH = './smart_factory.db';
const db = new sqlite3.Database(DB_PATH);

const PAGE_NAME = 'ตรวจสอบ Parameters';
const PAGE_URL = '/injection-parameter-check.html';

db.serialize(() => {
    // 1. Insert Page
    db.run(`INSERT OR IGNORE INTO pages (name, url) VALUES (?, ?)`, [PAGE_NAME, PAGE_URL], function (err) {
        if (err) console.error(err.message);
        else console.log("Page inserted/ensured.");

        // 2. Get Page ID
        db.get(`SELECT id FROM pages WHERE url = ?`, [PAGE_URL], (err, row) => {
            if (row) {
                const pageId = row.id;
                // 3. Assign Roles
                const roles = ['admin', 'qc', 'user'];
                roles.forEach(role => {
                    db.get(`SELECT id FROM roles WHERE name = ?`, [role], (err, roleRow) => {
                        if (roleRow) {
                            db.run(`INSERT OR IGNORE INTO role_pages (role_id, page_id) VALUES (?, ?)`, [roleRow.id, pageId], (err) => {
                                if (!err) console.log(`Assigned to ${role}`);
                            });
                        }
                    });
                });
            }
        });
    });
});
