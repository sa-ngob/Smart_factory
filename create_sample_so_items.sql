-- Insert Sales Order Items
INSERT INTO sales_order_items (so_id, item_code, quantity)
VALUES
  (1, 'FG-0001', 10),
  (1, 'FG-0002', 5)
RETURNING so_id, item_code, quantity;

-- Verify items inserted
SELECT * FROM sales_order_items WHERE so_id = 1;
