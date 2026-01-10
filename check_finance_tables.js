const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./smart_factory.db');

const tables = [
    'purchase_orders',
    'purchase_order_items',
    'delivery_orders',
    'delivery_order_items',
    'invoices',
    'invoice_items',
    'invoice_delivery_orders',
    'billing_notes',
    'billing_note_invoices',
    'receipts',
    'receipt_billing_notes'
];

db.serialize(() => {
    tables.forEach(table => {
        db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [table], (err, row) => {
            if (err) {
                console.error(`Error checking ${table}:`, err.message);
            } else if (row) {
                console.log(`✅ Table '${table}' exists.`);
            } else {
                console.log(`❌ Table '${table}' does NOT exist.`);
            }
        });
    });
});

db.close();
