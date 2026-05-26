from sqlalchemy import create_engine, text
import os

# Connection string matching app.py
DATABASE_URL = 'postgresql://postgres:postgres123@postgres:5432/smart_factory'

def delete_data():
    try:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as conn:
            print("Starting deletion...")
            
            # 1. Delete from machine_data
            sql1 = text("DELETE FROM machine_data WHERE machine_id = 'TEST-001' OR mo_number = 'TEST-MO-999'")
            res1 = conn.execute(sql1)
            print(f"Deleted {res1.rowcount} rows from machine_data")

            # 2. Delete from production_records (if linked to MO)
            # First get MO ID
            get_mo_id = text("SELECT id FROM manufacturing_orders WHERE mo_number = 'TEST-MO-999'")
            mo_res = conn.execute(get_mo_id).fetchone()
            
            if mo_res:
                mo_id = mo_res[0]
                sql_recs = text("DELETE FROM production_records WHERE mo_id = :mid")
                res_recs = conn.execute(sql_recs, {"mid": mo_id})
                print(f"Deleted {res_recs.rowcount} rows from production_records")

            # 3. Delete from manufacturing_orders
            sql2 = text("DELETE FROM manufacturing_orders WHERE mo_number = 'TEST-MO-999'")
            res2 = conn.execute(sql2)
            print(f"Deleted {res2.rowcount} rows from manufacturing_orders")
            
            # 4. Delete from machines
            sql3 = text("DELETE FROM machines WHERE machine_code = 'TEST-001'")
            res3 = conn.execute(sql3)
            print(f"Deleted {res3.rowcount} rows from machines")

            conn.commit()
            print("Deletion completed successfully.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    delete_data()
