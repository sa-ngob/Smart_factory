const db = require('./database');

const PAGE_NAME = 'ตรวจสอบ Parameters';
const PAGE_URL = '/injection-parameter-check.html';

async function registerPage() {
    console.log(`Registering page: ${PAGE_NAME}`);

    const sqlAddPage = `INSERT INTO pages (name, url) VALUES (?, ?)`;
    // We try to insert. If conflict (unique), we ignore/get ID.
    // Since default driver might be sqlite or postgres wrapper, we try generic approach.

    // 1. Check if page exists
    db.get(`SELECT id FROM pages WHERE url = ?`, [PAGE_URL], (err, row) => {
        let pageId;
        if (row) {
            pageId = row.id;
            console.log(`Page exists with ID: ${pageId}`);
            assignRole(pageId);
        } else {
            // Insert
            db.run(sqlAddPage, [PAGE_NAME, PAGE_URL], function (err) {
                if (err) {
                    // If specific database wrapper doesn't use 'this.lastID' identically, we might need lookup
                    console.log("Insert attempted. Looking up ID...");
                    db.get(`SELECT id FROM pages WHERE url = ?`, [PAGE_URL], (e, r) => {
                        if (r) {
                            assignRole(r.id);
                        } else {
                            console.error("Failed to insert/find page.");
                        }
                    });
                } else {
                    pageId = this.lastID; // Works for sqlite3
                    console.log(`Page inserted with ID: ${pageId}`);
                    assignRole(pageId);
                }
            });
        }
    });
}

function assignRole(pageId) {
    if (!pageId) return;

    // Assign to admin, user, qc
    const roles = ['admin', 'qc', 'user'];

    roles.forEach(roleName => {
        db.get(`SELECT id FROM roles WHERE name = ?`, [roleName], (err, roleRow) => {
            if (roleRow) {
                const sqlAssign = `INSERT INTO role_pages (role_id, page_id) VALUES (?, ?)`;
                db.run(sqlAssign, [roleRow.id, pageId], (err) => {
                    if (!err) console.log(`Assigned to role: ${roleName}`);
                    else console.log(`Already assigned or error for ${roleName}`);
                });
            }
        });
    });
}

registerPage();
