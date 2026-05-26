import psycopg2
from psycopg2 import sql
import threading
import time
import random
import os
from datetime import datetime

# ==============================================================================
# 1. ส่วนตั้งค่า (CONFIGURATION)
# ==============================================================================
# PostgreSQL Connection
DB_CONFIG = {
    'host': os.environ.get('DB_HOST', 'localhost'),
    'port': os.environ.get('DB_PORT', '5433'),
    'database': os.environ.get('DB_NAME', 'smart_factory'),
    'user': os.environ.get('DB_USER', 'postgres'),
    'password': os.environ.get('DB_PASSWORD', 'postgres123')
}

POLLING_INTERVAL_SECONDS = 5  # สร้างข้อมูลใหม่ทุกๆ 5 วินาที

# รายการเครื่องจักรจำลอง (ใช้ machine_code ที่มีอยู่ในฐานข้อมูล)
machines_config = [
    {'machine_code': 'MC-001'},
    {'machine_code': 'MC-002'},
    {'machine_code': 'MC-003'},
]

# ==============================================================================
# 2. ฟังก์ชันสำหรับสร้างตารางในฐานข้อมูล
# ==============================================================================
def setup_database():
    """ตรวจสอบการเชื่อมต่อ PostgreSQL และสร้างตาราง machine_data"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        # สร้างตาราง machine_data หากไม่มี
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS machine_data (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
                machine_id VARCHAR(100) NOT NULL,
                mold_count INTEGER,
                machine_status INTEGER,
                mold_temp_core REAL,
                mold_temp_cavity REAL,
                mo_number VARCHAR(100),
                cycle_time_sec REAL,
                material_dry_temp REAL
            )
        """)
        conn.commit()
        print("[OK] machine_data table ready in PostgreSQL")

        cursor.close()
        conn.close()
        print("[OK] Connected to PostgreSQL: {0}:{1}/{2}".format(
            DB_CONFIG['host'], DB_CONFIG['port'], DB_CONFIG['database']))
    except Exception as e:
        print("[ERROR] PostgreSQL Connection Error: {0}".format(e))
        raise

# ==============================================================================
# 3. ฟังก์ชันจำลองข้อมูล (MOCKUP DATA GENERATOR)
# ==============================================================================
def generate_mock_data(last_data):
    """สร้างข้อมูลจำลองที่ดูสมจริง โดยอ้างอิงจากข้อมูลล่าสุด"""
    # Mold Count จะเพิ่มขึ้นเรื่อยๆ
    new_count = last_data['mold_count'] + random.choice([0, 1, 1, 1, 2]) # ส่วนใหญ่จะเพิ่มทีละ 1

    # --- FIX: เปลี่ยนสถานะเป็น 0=Stop, 1=Running, 2=Alarm ---
    new_status = random.choices([0, 1, 2], weights=[8, 90, 2], k=1)[0]
    
    # อุณหภูมิจะเปลี่ยนแปลงเล็กน้อยจากค่าล่าสุด
    new_temp_core = round(last_data['mold_temp_core'] + random.uniform(-0.5, 0.5), 2)
    new_temp_cavity = round(last_data['mold_temp_cavity'] + random.uniform(-0.5, 0.5), 2)

    # คุมไม่ให้อุณหภูมิสูงหรือต่ำเกินไป
    new_temp_core = max(60, min(95, new_temp_core))
    new_temp_cavity = max(60, min(95, new_temp_cavity))

    return {
        'mold_count': new_count,
        'machine_status': new_status,
        'mold_temp_core': new_temp_core,
        'mold_temp_cavity': new_temp_cavity
    }


# ==============================================================================
# 4. ฟังก์ชัน Worker ที่แต่ละ Thread จะทำงาน (ปรับมาใช้ข้อมูลจำลอง)
# ==============================================================================
def poll_machine_mockup(machine_info):
    """ฟังก์ชันสำหรับสร้างข้อมูลจำลองของเครื่องจักรหนึ่งเครื่องและบันทึกลง PostgreSQL"""
    machine_code = machine_info['machine_code']

    # สร้างข้อมูลเริ่มต้นสำหรับเครื่องนี้
    current_data = {
        'mold_count': random.randint(1000, 5000),
        'machine_status': 1,
        'mold_temp_core': random.uniform(75.0, 85.0),
        'mold_temp_cavity': random.uniform(75.0, 85.0),
    }

    while True:
        try:
            # สร้างข้อมูลใหม่โดยอ้างอิงจากข้อมูลล่าสุด
            current_data = generate_mock_data(current_data)

            print(
                f"[{machine_code}] MOCK DATA: "
                f"Count={current_data['mold_count']}, "
                f"Status={current_data['machine_status']}, "
                f"Core={current_data['mold_temp_core']:.2f}°C, "
                f"Cavity={current_data['mold_temp_cavity']:.2f}°C"
            )

            # บันทึกข้อมูลลง PostgreSQL
            conn = psycopg2.connect(**DB_CONFIG)
            cursor = conn.cursor()

            cursor.execute(
                """INSERT INTO machine_data
                   (timestamp, machine_id, mold_count, machine_status, mold_temp_core, mold_temp_cavity, mo_number)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (
                    datetime.now(),
                    machine_code,
                    current_data['mold_count'],
                    current_data['machine_status'],
                    current_data['mold_temp_core'],
                    current_data['mold_temp_cavity'],
                    None  # สำหรับ mo_number ในโหมด mockup
                )
            )
            conn.commit()
            cursor.close()
            conn.close()

        except Exception as e:
            print(f"[{machine_code}] EXCEPTION: {e}")

        finally:
            # หน่วงเวลาก่อนสร้างข้อมูลรอบใหม่
            time.sleep(POLLING_INTERVAL_SECONDS)

# ==============================================================================
# 5. ส่วน Main ของโปรแกรม
# ==============================================================================
if __name__ == "__main__":
    # 1. เตรียมฐานข้อมูล
    setup_database()

    threads = []

    # 2. สร้างและเริ่มการทำงานของ Thread สำหรับแต่ละเครื่องจักรจำลอง
    for machine in machines_config:
        thread = threading.Thread(target=poll_machine_mockup, args=(machine,), daemon=True)
        threads.append(thread)
        thread.start()
        print(f"Starting mockup generator for {machine['machine_code']}...")

    print("\n[OK] All {0} mockup threads have been started.".format(len(threads)))
    print("[INFO] Generating mock machine data every 5 seconds...")
    print("Press Ctrl+C to stop.\n")

    # 3. ทำให้โปรแกรมหลักทำงานไปเรื่อยๆ
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[STOP] Stopping mockup generator...")