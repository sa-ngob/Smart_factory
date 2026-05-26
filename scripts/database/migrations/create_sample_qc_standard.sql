INSERT INTO product_standards (product_id, standard_name, is_active)
VALUES ((SELECT id FROM items WHERE item_code = 'FG-0002'), 'Standard FG-0002 v1.0', 1)
RETURNING id, standard_name;

INSERT INTO standard_categories (product_standard_id, category_name, drawing_image_path)
VALUES (CURRVAL('product_standards_id_seq'), 'Dimension Check', '/uploads/quality_drawings/sample.jpg')
RETURNING id;

INSERT INTO inspection_points (standard_category_id, point_number, name, method, standard_value, unit)
VALUES (CURRVAL('standard_categories_id_seq'), 1, 'Length', 'Caliper', '100mm', 'mm'),
       (CURRVAL('standard_categories_id_seq'), 2, 'Width', 'Caliper', '50mm', 'mm');

SELECT 'QC Standards created successfully' as status;
