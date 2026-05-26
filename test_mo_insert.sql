BEGIN;
INSERT INTO manufacturing_orders (mo_number, so_id, item_code, quantity_to_produce, bom_id, due_date, status)
VALUES ('MO-202605-0001', 1, 'FG-0001', 10, 1, NOW() + INTERVAL '7 days', 'pending');
SELECT count(*) FROM manufacturing_orders WHERE mo_number = 'MO-202605-0001';
ROLLBACK;
