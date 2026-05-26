import sqlite3
import os

# --- Configuration ---
# Get the directory where the script is located
basedir = os.path.abspath(os.path.dirname(__file__))
# Define the path to the database file
DB_FILE = os.path.join(basedir, 'smart_factory.db')
TABLE_TO_RECREATE = 'tag_mapping'

def recreate_table():
    """
    Connects to the database, drops the specified table if it exists,
    and informs the user about the next steps.
    """
    print(f"--- Recreating Table: {TABLE_TO_RECREATE} ---")
    
    if not os.path.exists(DB_FILE):
        print(f"❌ ERROR: Database file not found at '{DB_FILE}'.")
        print("Please make sure the script is in the same directory as your 'app.py' and 'smart_factory.db'.")
        return

    conn = None
    try:
        # Connect to the SQLite database
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        print(f"✅ Connected to database: {DB_FILE}")
        
        # Drop the table
        print(f"Attempting to drop table '{TABLE_TO_RECREATE}'...")
        cursor.execute(f"DROP TABLE IF EXISTS {TABLE_TO_RECREATE};")
        
        conn.commit()
        
        print(f"✅ Success! Table '{TABLE_TO_RECREATE}' has been dropped.")
        print("\n--- Next Steps ---")
        print("1. Now, run your main 'app.py' file.")
        print("2. The application will automatically create the '{TABLE_TO_RECREATE}' table with the new, correct structure.")
        print("3. You will need to re-enter your tag mappings.")

    except Exception as e:
        print(f"❌ An error occurred: {e}")
    finally:
        if conn:
            conn.close()
            print("🔒 Database connection closed.")

if __name__ == '__main__':
    recreate_table()