import sqlite3
import threading
import time
import random

# ==============================================================================
# 1. ส่วนตั้งค่า (CONFIGURATION)
# ==============================================================================
DB_FILE = 'smart_factory.db'
POLLING_INTERVAL_SECONDS = 5 # สร้างข้อมูลใหม่ทุกๆ 5 วินาที

# รายการเครื่องจักรจำลอง
machines_config = [
    {'id': 'Molder_001', 'ip': 'mock_192.168.2.1'},
    {'id': 'Molder_002', 'ip': 'mock_192.168.2.2'},
    {'id': 'Molder_003', 'ip': 'mock_192.168.2.3'},
    {'id': 'Molder_004', 'ip': 'mock_192.168.2.4'},
    {'id': 'Molder_005', 'ip': 'mock_192.168.2.5'},
    {'id': 'Molder_006', 'ip': 'mock_192.168.2.6'},
]

# ==============================================================================
# 2. ฟังก์ชันสำหรับสร้างตารางในฐานข้อมูล (เหมือนเดิม)
# ==============================================================================
def setup_database():
    """สร้างตารางใน SQLite หากยังไม่มี"""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS machine_data (
            timestamp TEXT NOT NULL,
            machine_id TEXT NOT NULL, 
            mold_count INTEGER,
            machine_status INTEGER,
            mold_temp_core REAL,
            mold_temp_cavity REAL,
            mo_number TEXT,
            PRIMARY KEY (timestamp, machine_id) -- mo_number is not part of the key
        )
    ''')
    conn.commit()
    conn.close()
    print(f"Database '{DB_FILE}' is ready for mockup data.")

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
    """ฟังก์ชันสำหรับสร้างข้อมูลจำลองของเครื่องจักรหนึ่งเครื่องและบันทึกลง DB"""
    machine_id = machine_info['id']
    
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
                f"[{machine_id}] MOCK DATA: "
                f"Count={current_data['mold_count']}, "
                f"Status={current_data['machine_status']}, "
                f"Core={current_data['mold_temp_core']:.2f}°C, "
                f"Cavity={current_data['mold_temp_cavity']:.2f}°C"
            )
            
            # บันทึกข้อมูลลง SQLite
            db_conn = sqlite3.connect(DB_FILE, timeout=10) 
            cursor = db_conn.cursor()
            # --- FIX: ปรับ SQL INSERT ให้รองรับ 7 คอลัมน์ (เพิ่ม mo_number เป็น NULL) ---
            cursor.execute(
                "INSERT INTO machine_data (timestamp, machine_id, mold_count, machine_status, mold_temp_core, mold_temp_cavity, mo_number) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    time.strftime('%Y-%m-%d %H:%M:%S'),
                    machine_id,
                    current_data['mold_count'],
                    current_data['machine_status'],
                    current_data['mold_temp_core'],
                    current_data['mold_temp_cavity'],
                    None # สำหรับ mo_number ในโหมด mockup
                )
            )
            db_conn.commit()
            db_conn.close()

        except Exception as e:
            print(f"[{machine_id}] EXCEPTION: An error occurred: {e}")
        
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
        print(f"Starting mockup generator for {machine['id']}...")

    print(f"\nAll {len(threads)} mockup threads have been started. Press Ctrl+C to stop.")

    # 3. ทำให้โปรแกรมหลักทำงานไปเรื่อยๆ
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping mockup generator...")