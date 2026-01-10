const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./smart_factory.db');

db.all("SELECT id, name, branch_code, branch_name FROM entities ORDER BY id DESC LIMIT 5", [], (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.table(rows);
    }
    db.close();
});
