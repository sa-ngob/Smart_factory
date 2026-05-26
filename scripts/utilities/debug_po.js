
const db = require('./database.js');

async function test() {
    try {
        console.log("Testing DB connection...");
        const date = new Date();
        const prefix = `PO-${date.getFullYear().toString().slice(-2)}${(date.getMonth() + 1).toString().padStart(2, '0')}-`;
        console.log("Prefix:", prefix);

        // Wait a bit for pool to connect if needed (though require should trigger init)
        setTimeout(async () => {
            try {
                const result = await db.query(`SELECT po_number FROM purchase_orders WHERE po_number LIKE $1 ORDER BY id DESC LIMIT 1`, [`${prefix}%`]);
                console.log("Query Result:", result);
                if (result.rows && result.rows.length > 0) {
                    console.log("Last PO:", result.rows[0]);
                } else {
                    console.log("No PO found.");
                }
            } catch (err) {
                console.error("Query Error:", err);
            }
        }, 1000);
    } catch (e) {
        console.error("Setup Error:", e);
    }
}

test();
