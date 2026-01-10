const db = require('./database.js');
async function run() {
    try {
        const res = await db.query("SELECT id, name, branch_code, branch_name FROM entities ORDER BY id DESC LIMIT 5");
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
