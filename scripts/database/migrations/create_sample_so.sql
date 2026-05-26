-- Create sample Sales Order
INSERT INTO sales_orders (so_number, order_date, due_date, status)
VALUES ('SO-202605-001', NOW(), NOW() + INTERVAL '7 days', 'pending')
RETURNING id, so_number, due_date;

-- Get the SO ID
SELECT id FROM sales_orders WHERE so_number = 'SO-202605-001' LIMIT 1;
