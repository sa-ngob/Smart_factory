-- Create billing_notes table
CREATE TABLE IF NOT EXISTS billing_notes (
    id SERIAL PRIMARY KEY,
    bn_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES entities(id),
    issue_date TIMESTAMP DEFAULT NOW(),
    due_date TIMESTAMP,
    payment_terms VARCHAR(100),
    total_amount NUMERIC(12, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    remark TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create billing_notes_items table
CREATE TABLE IF NOT EXISTS billing_notes_items (
    id SERIAL PRIMARY KEY,
    bn_id INTEGER NOT NULL REFERENCES billing_notes(id) ON DELETE CASCADE,
    invoice_id INTEGER,
    amount NUMERIC(12, 2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create receipts table
CREATE TABLE IF NOT EXISTS receipts (
    id SERIAL PRIMARY KEY,
    receipt_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES entities(id),
    receipt_date TIMESTAMP DEFAULT NOW(),
    amount NUMERIC(12, 2) DEFAULT 0,
    payment_method VARCHAR(50),
    reference_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'recorded',
    notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create receipt_items table (for linked invoices)
CREATE TABLE IF NOT EXISTS receipt_items (
    id SERIAL PRIMARY KEY,
    receipt_id INTEGER NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    invoice_id INTEGER,
    amount_paid NUMERIC(12, 2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create delivery_orders table (if missing)
CREATE TABLE IF NOT EXISTS delivery_orders (
    id SERIAL PRIMARY KEY,
    do_number VARCHAR(100) UNIQUE NOT NULL,
    so_id INTEGER REFERENCES sales_orders(id),
    customer_id INTEGER REFERENCES entities(id),
    shipping_date TIMESTAMP DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create delivery_order_items table (if missing)
CREATE TABLE IF NOT EXISTS delivery_order_items (
    id SERIAL PRIMARY KEY,
    do_id INTEGER NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
    so_item_id INTEGER,
    quantity_shipped INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create invoice_items table (if missing)
CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    item_code VARCHAR(100),
    description VARCHAR(255),
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC(12, 2),
    total_price NUMERIC(12, 2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create invoice_delivery_orders table (if missing)
CREATE TABLE IF NOT EXISTS invoice_delivery_orders (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    do_id INTEGER REFERENCES delivery_orders(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_billing_notes_bn_number ON billing_notes(bn_number);
CREATE INDEX IF NOT EXISTS idx_billing_notes_customer_id ON billing_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_billing_notes_items_bn_id ON billing_notes_items(bn_id);
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_number ON receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_receipts_customer_id ON receipts(customer_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id ON receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_do_number ON delivery_orders(do_number);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_customer_id ON delivery_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_order_items_do_id ON delivery_order_items(do_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
