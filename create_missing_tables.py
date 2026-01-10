import sqlite3
import datetime

db_path = 'smart_factory.db'

def create_tables():
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        tables_sql = [
            """CREATE TABLE IF NOT EXISTS purchase_orders ( id INTEGER PRIMARY KEY AUTOINCREMENT, po_number TEXT UNIQUE NOT NULL, vendor_id INTEGER, order_date TEXT, total_amount REAL, quotation_ref TEXT, created_by INTEGER, status TEXT DEFAULT 'pending', expect_delivery_date TEXT, created_at TEXT DEFAULT (datetime('now', 'localtime')), FOREIGN KEY (vendor_id) REFERENCES entities(id) )""",
            """CREATE TABLE IF NOT EXISTS purchase_order_items ( id INTEGER PRIMARY KEY AUTOINCREMENT, po_id INTEGER NOT NULL, item_code TEXT, item_name TEXT, quantity INTEGER, unit_price REAL, total_price REAL, FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE )""",

            """CREATE TABLE IF NOT EXISTS delivery_orders ( id INTEGER PRIMARY KEY AUTOINCREMENT, do_number TEXT UNIQUE NOT NULL, customer_id INTEGER, shipping_date TEXT, shipping_address TEXT, status TEXT DEFAULT 'pending', created_by INTEGER, created_at TEXT DEFAULT (datetime('now', 'localtime')), FOREIGN KEY (customer_id) REFERENCES entities(id) )""",
            """CREATE TABLE IF NOT EXISTS delivery_order_items ( id INTEGER PRIMARY KEY AUTOINCREMENT, do_id INTEGER NOT NULL, so_item_id INTEGER, item_code TEXT, quantity_shipped INTEGER, FOREIGN KEY (do_id) REFERENCES delivery_orders(id) ON DELETE CASCADE )""",

            """CREATE TABLE IF NOT EXISTS invoices ( id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_number TEXT UNIQUE NOT NULL, customer_id INTEGER, customer_po_number TEXT, issue_date TEXT, due_date TEXT, sub_total REAL, tax_amount REAL, grand_total REAL, status TEXT DEFAULT 'pending_issue', created_by INTEGER, created_at TEXT DEFAULT (datetime('now', 'localtime')), FOREIGN KEY (customer_id) REFERENCES entities(id) )""",
            """CREATE TABLE IF NOT EXISTS invoice_items ( id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_id INTEGER NOT NULL, item_code TEXT, description TEXT, quantity INTEGER, unit_price REAL, total_price REAL, FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE )""",
            """CREATE TABLE IF NOT EXISTS invoice_delivery_orders ( invoice_id INTEGER NOT NULL, do_id INTEGER NOT NULL, PRIMARY KEY (invoice_id, do_id), FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE, FOREIGN KEY (do_id) REFERENCES delivery_orders(id) )""",

            """CREATE TABLE IF NOT EXISTS billing_notes ( id INTEGER PRIMARY KEY AUTOINCREMENT, bn_number TEXT UNIQUE NOT NULL, customer_id INTEGER, issue_date TEXT, due_date TEXT, payment_terms TEXT, total_amount REAL, remark TEXT, status TEXT DEFAULT 'billed', created_by INTEGER, created_at TEXT DEFAULT (datetime('now', 'localtime')), FOREIGN KEY (customer_id) REFERENCES entities(id) )""",
            """CREATE TABLE IF NOT EXISTS billing_note_invoices ( billing_note_id INTEGER NOT NULL, invoice_id INTEGER NOT NULL, PRIMARY KEY (billing_note_id, invoice_id), FOREIGN KEY (billing_note_id) REFERENCES billing_notes(id) ON DELETE CASCADE, FOREIGN KEY (invoice_id) REFERENCES invoices(id) )""",

            """CREATE TABLE IF NOT EXISTS receipts ( id INTEGER PRIMARY KEY AUTOINCREMENT, receipt_number TEXT UNIQUE NOT NULL, customer_id INTEGER, payment_date TEXT, payment_method TEXT, total_amount_paid REAL, notes TEXT, status TEXT DEFAULT 'pending_confirmation', created_by INTEGER, created_at TEXT DEFAULT (datetime('now', 'localtime')), FOREIGN KEY (customer_id) REFERENCES entities(id) )""",
            """CREATE TABLE IF NOT EXISTS receipt_billing_notes ( receipt_id INTEGER NOT NULL, billing_note_id INTEGER NOT NULL, PRIMARY KEY (receipt_id, billing_note_id), FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE, FOREIGN KEY (billing_note_id) REFERENCES billing_notes(id) )"""
        ]

        for sql in tables_sql:
            cursor.execute(sql)
            print(f"Executed: {sql[:50]}...")
        
        conn.commit()
        print("✅ Tables created/verified successfully.")
        conn.close()
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    create_tables()
