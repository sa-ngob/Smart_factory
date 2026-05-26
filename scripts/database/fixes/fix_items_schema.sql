-- Add missing columns to items table
ALTER TABLE items
ADD COLUMN IF NOT EXISTS customer_id INTEGER,
ADD COLUMN IF NOT EXISTS model VARCHAR(255),
ADD COLUMN IF NOT EXISTS material_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS grade VARCHAR(100),
ADD COLUMN IF NOT EXISTS colour VARCHAR(100),
ADD COLUMN IF NOT EXISTS part_weight_gram DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS cycle_time_sec DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS item_type VARCHAR(50) DEFAULT 'raw_material',
ADD COLUMN IF NOT EXISTS uom VARCHAR(20) DEFAULT 'pc',
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS image_path VARCHAR(500),
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 0;

-- Update sample data with realistic values
UPDATE items SET
    item_type = CASE
        WHEN item_code LIKE 'FG-%' THEN 'finished_good'
        WHEN item_code LIKE 'RM-%' THEN 'raw_material'
        WHEN item_code LIKE 'PKG-%' THEN 'consumable'
        ELSE 'raw_material'
    END,
    uom = 'pc',
    status = 'active',
    stock_quantity = CASE
        WHEN item_code LIKE 'FG-%' THEN 500
        WHEN item_code LIKE 'RM-%' THEN 2000
        ELSE 1000
    END,
    min_stock = 100,
    selling_price = CASE
        WHEN item_code LIKE 'FG-%' THEN 250.00
        ELSE 50.00
    END,
    cost_price = CASE
        WHEN item_code LIKE 'FG-%' THEN 150.00
        ELSE 25.00
    END
WHERE status IS NULL OR status = 'active';
