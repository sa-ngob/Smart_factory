import sqlite3
import time
import argparse
import sys
import random
import os # <<< เพิ่ม import os

# --- การตั้งค่า ---
# --- แก้ไข: ใช้ Absolute Path เพื่อระบุตำแหน่งไฟล์ฐานข้อมูล ---
# os.path.dirname(__file__) คือการหาตำแหน่งของไฟล์ .py ที่กำลังรันอยู่
# os.path.join(...) คือการนำชื่อโฟลเดอร์และชื่อไฟล์มาต่อกันอย่างถูกต้อง
try:
    # This works when running as a script
    DB_PATH = os.path.join(os.path.dirname(__file__), 'smart_factory.db')
except NameError:
    # This is a fallback for some environments like interactive shells
    DB_PATH = os.path.join(os.getcwd(), 'smart_factory.db')

POLLING_INTERVAL_SECONDS = 5

def generate_mock_data(last_data):
    new_count = last_data['mold_count'] + random.choice([0, 1, 2, 3,4, 5])
    # แก้ไข: เปลี่ยนค่าสถานะให้ตรงกับมาตรฐาน 0=Stop, 1=Running, 2=Alarm
    new_status = random.choices([0, 1, 2], weights=[8, 90, 2], k=1)[0]
    new_temp_core = round(last_data['mold_temp_core'] + random.uniform(-0.5, 0.5), 2)
    new_temp_cavity = round(last_data['mold_temp_cavity'] + random.uniform(-0.5, 0.5), 2)
    new_temp_core = max(60, min(95, new_temp_core))
    new_temp_cavity = max(60, min(95, new_temp_cavity))
    return {
        'mold_count': new_count,
        'machine_status': new_status,
        'mold_temp_core': new_temp_core,
        'mold_temp_cavity': new_temp_cavity
    }

def main_poller(machine_id, mo_number):
    print(f"▶️  MOCKUP Poller starting for Machine: [{machine_id}], MO: [{mo_number}]")
    print(f"DEBUG: Attempting to write to database at: {DB_PATH}")

    current_data = {
        'mold_count': random.randint(1000, 5000),
        'machine_status': 1,
        'mold_temp_core': random.uniform(75.0, 85.0),
        'mold_temp_cavity': random.uniform(75.0, 85.0),
    }

    while True:
        db_conn = None # ตั้งค่าเริ่มต้น
        try:
            current_data = generate_mock_data(current_data)
            
            # --- เพิ่มการจัดการ Error ของ Database ---
            db_conn = sqlite3.connect(DB_PATH, timeout=10) 
            cursor = db_conn.cursor()

            # ✅ FIX: แก้ไข SQL Query ให้ใช้ REPLACE INTO
            # วิธีนี้จะทำให้ข้อมูลล่าสุดของ machine_id ถูกเขียนทับลงไปได้เสมอ
            # โดยไม่เกิด Error "UNIQUE constraint failed"
            # (ต้องมั่นใจว่าตาราง machine_data มี machine_id เป็น PRIMARY KEY)
            cursor.execute(
                "REPLACE INTO machine_data (timestamp, machine_id, mold_count, machine_status, mold_temp_core, mold_temp_cavity, mo_number) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (time.strftime('%Y-%m-%d %H:%M:%S'), machine_id, current_data['mold_count'], current_data['machine_status'], current_data['mold_temp_core'], current_data['mold_temp_cavity'], mo_number)
            )
            db_conn.commit()
            
            # ✅ DEBUG: พิมพ์ข้อมูลที่ถูกบันทึกและข้อความยืนยัน
            print(
                f"    [{machine_id}] MOCK DATA: "
                f"Count={current_data['mold_count']}, "
                f"Status={current_data['machine_status']}, "
                f"Core={current_data['mold_temp_core']:.1f}, "
                f"Cavity={current_data['mold_temp_cavity']:.1f}, "
                f"MO='{mo_number}'"
                f" -> ✅ DB Write OK"
            )

        except sqlite3.Error as e:
            # หากเกิด Error เกี่ยวกับ SQLite จะพิมพ์ออกมาให้เห็นทันที
            print(f"    [{machine_id}] ❌ DATABASE ERROR: {e}")
        except Exception as e:
            print(f"    [{machine_id}] ❌ GENERAL ERROR: {e}")
        
        finally:
            if db_conn:
                db_conn.close()
            time.sleep(POLLING_INTERVAL_SECONDS)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Mockup Data Poller for a single machine.")
    parser.add_argument('--machine', type=str, required=True, help='The machine_id to simulate')
    parser.add_argument('--mo', type=str, required=True, help='The Manufacturing Order number')
    args = parser.parse_args()

    try:
        main_poller(args.machine, args.mo)
    except KeyboardInterrupt:
        print(f"\n🛑 Mockup poller for [{args.machine}] stopped.")