-- Drop the old unique constraint
ALTER TABLE boms DROP CONSTRAINT boms_product_part_number_unique;

-- Add new unique constraint on (product_part_number, version)
ALTER TABLE boms ADD CONSTRAINT boms_product_part_number_version_unique UNIQUE (product_part_number, version);

-- Verify the constraint
\d boms
