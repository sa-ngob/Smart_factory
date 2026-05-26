CREATE TABLE IF NOT EXISTS molds (
    id SERIAL PRIMARY KEY,
    mold_code VARCHAR(100) UNIQUE NOT NULL,
    mold_name VARCHAR(255) NOT NULL,
    customer_id INTEGER REFERENCES entities(id),
    received_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    storage_location VARCHAR(255),
    notes TEXT,
    mold_type VARCHAR(100),
    runner_system VARCHAR(100),
    gate_type VARCHAR(100),
    size_w DECIMAL(10,2),
    size_l DECIMAL(10,2),
    size_h DECIMAL(10,2),
    weight DECIMAL(10,2),
    cavity INTEGER,
    shot_counter INTEGER DEFAULT 0,
    cycle_time_sec DECIMAL(10,2),
    core_image_path VARCHAR(500),
    cavity_image_path VARCHAR(500),
    part_image_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_molds_mold_code ON molds(mold_code);
CREATE INDEX IF NOT EXISTS idx_molds_customer_id ON molds(customer_id);

\d molds
