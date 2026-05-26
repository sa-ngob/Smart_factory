CREATE TABLE IF NOT EXISTS inventory_transactions (
    id SERIAL PRIMARY KEY,
    item_code VARCHAR(100) NOT NULL REFERENCES items(item_code),
    transaction_type VARCHAR(50) NOT NULL,
    quantity_change DECIMAL(15,2) NOT NULL,
    new_quantity DECIMAL(15,2) NOT NULL,
    reference_type VARCHAR(50),
    reference_id INTEGER,
    notes TEXT,
    transaction_date TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_code ON inventory_transactions(item_code);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_transaction_date ON inventory_transactions(transaction_date);

\d inventory_transactions
