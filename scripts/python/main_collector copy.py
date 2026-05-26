import sqlite3
import time
import argparse  # Library สำหรับรับค่าจาก Command Line
import sys
from pymodbus.client import ModbusTcpClient
from pymodbus.payload import BinaryPayloadDecoder
from pymodbus.constants import Endian

# --- การตั้งค่า ---
DB_FILE = 'smart_factory.db'
PLC_PORT = 2022  # Port ที่ใช้เชื่อมต่อ PLC
POLLING_INTERVAL_SECONDS = 5
START_ADDRESS = 99  # 40100 -> address = 99
REGISTER_COUNT = 6

# Dictionary สำหรับแปลง machine_id เป็น IP Address
# คุณต้องเพิ่ม IP ของเครื่องจักรจริงของคุณที่นี่
machines_ip_map = {
    'MC-01': '192.168.2.1',
    'MC-02': '192.168.2.2',
    'MC-03': '192.168.2.3',
    'MC-04': '192.168.2.4',
    'MC-05': '192.168.2.5',
    'MC-06': '192.168.2.6',
    # เพิ่ม IP ของเครื่องจักรอื่นๆ ตามต้องการ
}

def main_poller(machine_id, mo_number):
    """
    ฟังก์ชันหลักสำหรับดึงข้อมูลจาก PLC หนึ่งเครื่องแบบวนลูป
    """
    machine_ip = machines_ip_map.get(machine_id)
    if not machine_ip:
        print(f"❌ ERROR: IP address for machine '{machine_id}' not found in configuration.")
        sys.exit(1)

    print(f"▶️  Poller starting for Machine: [{machine_id}], MO: [{mo_number}], IP: [{machine_ip}]")
    client = ModbusTcpClient(machine_ip, port=PLC_PORT)

    while True:
        try:
            client.connect()
            response = client.read_holding_registers(address=START_ADDRESS, count=REGISTER_COUNT, slave=1)

            if not response.isError():
                decoder = BinaryPayloadDecoder.fromRegisters(response.registers, byteorder=Endian.Big, wordorder=Endian.Little)
                
                mold_count = decoder.decode_16bit_int()
                machine_status = decoder.decode_16bit_int()
                mold_temp_core = round(decoder.decode_32bit_float(), 2)
                mold_temp_cavity = round(decoder.decode_32bit_float(), 2)
                
                print(f"    [{machine_id}] Data: Count={mold_count}, Status={machine_status}, Core={mold_temp_core}°C")
                
                # บันทึกข้อมูลลง SQLite พร้อม mo_number
                db_conn = sqlite3.connect(DB_FILE, timeout=10)
                cursor = db_conn.cursor()
                cursor.execute(
                    "INSERT INTO machine_data (timestamp, machine_id, mold_count, machine_status, mold_temp_core, mold_temp_cavity, mo_number) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (
                        time.strftime('%Y-%m-%d %H:%M:%S'),
                        machine_id,
                        mold_count,
                        machine_status,
                        mold_temp_core,
                        mold_temp_cavity,
                        mo_number  # << เพิ่ม mo_number ที่ได้รับมา
                    )
                )
                db_conn.commit()
                db_conn.close()
            else:
                print(f"    [{machine_id}] ERROR: Could not read from PLC. {response}")
        
        except Exception as e:
            print(f"    [{machine_id}] EXCEPTION: An error occurred: {e}")
        
        finally:
            if client.is_socket_open():
                client.close()
            time.sleep(POLLING_INTERVAL_SECONDS)

if __name__ == '__main__':
    # --- ส่วนรับค่า Argument จาก Command Line ---
    parser = argparse.ArgumentParser(description="Modbus Poller for a single machine.")
    parser.add_argument('--machine', type=str, required=True, help='The machine_id to poll (e.g., MC-01)')
    parser.add_argument('--mo', type=str, required=True, help='The Manufacturing Order number for this job')
    args = parser.parse_args()

    try:
        main_poller(args.machine, args.mo)
    except KeyboardInterrupt:
        print(f"\n🛑 Poller for [{args.machine}] stopped by user.")
    except Exception as e:
        print(f"❌ A fatal error occurred in poller for [{args.machine}]: {e}")