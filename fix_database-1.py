import sqlite3

DB_FILE = 'smart_factory.db'

def fix_my_table():
    print("🚀 Attempting to fix the 'machine_data' table...")
    conn = None
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        print("Checking for 'mo_number' column...")
        # Add the mo_number column to the machine_data table
        cursor.execute("ALTER TABLE machine_data ADD COLUMN mo_number TEXT;")
        
        conn.commit()
        print("✅ Success! The 'mo_number' column has been added to 'machine_data'.")

    except sqlite3.OperationalError as e:
        if "duplicate column name: mo_number" in str(e):
            print("🟡 The 'mo_number' column already exists. No changes needed.")
        else:
            print(f"❌ An unexpected database error occurred: {e}")
    except Exception as e:
        print(f"❌ An error occurred: {e}")
    finally:
        if conn:
            conn.close()
            print("🔒 Database connection closed.")

if __name__ == '__main__':
    fix_my_table()