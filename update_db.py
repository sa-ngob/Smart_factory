import sqlite3
import os

DB_FILE_NAME = 'smart_factory.db'
TABLE_TO_UPDATE = 'machine_data'

# รายการคอลัมน์ทั้งหมดที่ app.py ต้องการ
COLUMNS_TO_ADD = {
    'cycle_time_sec': 'REAL',
    'material_dry_temp': 'REAL',
    'mo_number': 'TEXT',
    'item_name': 'TEXT'  # <-- คอลัมน์ที่ขาดหายไป
}

db_path = os.path.join(os.path.dirname(__file__), DB_FILE_NAME)
print(f"Connecting to database: {db_path}")

if not os.path.exists(db_path):
    print(f"❌ ERROR: Database file not found.")
else:
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        print("Connection successful.")

        cursor.execute(f"PRAGMA table_info({TABLE_TO_UPDATE});")
        existing_columns = [row[1] for row in cursor.fetchall()]
        print(f"Existing columns: {existing_columns}")

        for column_name, column_type in COLUMNS_TO_ADD.items():
            if column_name not in existing_columns:
                print(f"-> Attempting to add column '{column_name}'...")
                cursor.execute(f"ALTER TABLE {TABLE_TO_UPDATE} ADD COLUMN {column_name} {column_type};")
                print(f"✅ Successfully added column '{column_name}'.")
            else:
                print(f"👍 Column '{column_name}' already exists.")

        conn.commit()
        conn.close()
        print("--- Database update process finished successfully. ---")

    except sqlite3.Error as e:
        print(f"❌ An error occurred: {e}")