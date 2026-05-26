CREATE TABLE IF NOT EXISTS item_vendors (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES items(id),
    vendor_id INTEGER NOT NULL REFERENCES entities(id),
    UNIQUE(item_id, vendor_id)
);

CREATE INDEX IF NOT EXISTS idx_item_vendors_item_id ON item_vendors(item_id);
CREATE INDEX IF NOT EXISTS idx_item_vendors_vendor_id ON item_vendors(vendor_id);

\d item_vendors
