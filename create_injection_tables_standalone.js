
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = './smart_factory.db';
const db = new sqlite3.Database(DB_PATH);

const createTableSql = `
CREATE TABLE IF NOT EXISTS injection_parameter_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id INTEGER,
    mo_number TEXT,
    check_date TEXT DEFAULT (datetime('now', 'localtime')),
    inspector_id INTEGER,
    parameter_data TEXT, 
    image_paths TEXT,
    notes TEXT
);
`;

db.serialize(() => {
    console.log("Creating table in SQLite...");
    db.run(createTableSql, (err) => {
        if (err) {
            console.error("Error creating table:", err.message);
        } else {
            console.log("Table 'injection_parameter_checks' created successfully.");
        }
    });
});

db.close();
