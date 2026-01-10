
const db = require('./database');

const createTableSql = `
CREATE TABLE IF NOT EXISTS injection_parameter_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id INTEGER,
    mo_number TEXT,
    check_date TEXT DEFAULT (datetime('now', 'localtime')),
    inspector_id INTEGER,
    
    -- Store all screen data as JSON structure
    -- { "Temperature": {...}, "Charge": {...}, ... }
    parameter_data TEXT, 
    
    -- Paths to uploaded reference images (optional)
    image_paths TEXT,
    
    notes TEXT
);
`;

// Helper for PostgreSQL compatibility if needed (adjusting syntax)
// But broadly, TEXT and INTEGER work in both for simple cases (Postgres uses SERIAL for AutoInc usually, but let's stick to the db.run abstraction)
// Ideally, if it's Postgres, the ID should be SERIAL. 
// Given the generic database.js wrapper, I'll try to detect or just run a safe command.
// Actually, 'INTEGER PRIMARY KEY AUTOINCREMENT' is SQLite specific. 
// Postgres uses 'SERIAL PRIMARY KEY'.

async function createTable() {
    try {
        console.log("Creating injection_parameter_checks table...");
        // This is a simplified check. Real production code would handle DB types better.
        // Assuming SQLite for this specific environment as per previous 'database.js' logic mostly defaulting there for local dev.
        // If Postgres, this might fail on 'AUTOINCREMENT'.
        
        // Let's allow for a resilient script:
        try {
            await db.runAsync(createTableSql);
            console.log("Table created (SQLite syntax).");
        } catch (err) {
            if (err.message.includes('syntax error')) {
                console.log("SQLite syntax failed, trying PostgreSQL syntax...");
                const pgSql = `
                CREATE TABLE IF NOT EXISTS injection_parameter_checks (
                    id SERIAL PRIMARY KEY,
                    machine_id INTEGER,
                    mo_number TEXT,
                    check_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    inspector_id INTEGER,
                    parameter_data TEXT,
                    image_paths TEXT,
                    notes TEXT
                );
                `;
                await db.runAsync(pgSql);
                console.log("Table created (PostgreSQL syntax).");
            } else {
                throw err;
            }
        }
        
    } catch (error) {
        console.error("Error creating table:", error);
    }
}

createTable();
