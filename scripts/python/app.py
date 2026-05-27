import time
import json
import threading
import traceback
import math
import struct

from flask import Flask, render_template, request, jsonify
from pymodbus.client import ModbusTcpClient
from pymodbus.exceptions import ConnectionException
from flask_sqlalchemy import SQLAlchemy

# --- FIX: เพิ่มการ import library 'requests' ที่นี่ ---
try:
    import requests
except ImportError:
    print("\nERROR: The 'requests' library is not installed. Please run 'pip install requests'.\n")
    requests = None # ตั้งค่าเป็น None เพื่อให้โปรแกรมทำงานต่อได้โดยไม่ crash

from datetime import datetime, timezone, timedelta
import os
from flask_cors import CORS

# --- 1. การตั้งค่า ---
PLC_CONFIGS = [
    {'ip': '192.168.2.101', 'port': 2022, 'name': 'PLC_Machine_1'},
    # {'ip': '192.168.2.102', 'port': 2022, 'name': 'PLC_Machine_2'},
    # {'ip': '192.168.2.103', 'port': 2022, 'name': 'PLC_Machine_3'},
    # {'ip': '192.168.2.104', 'port': 2022, 'name': 'PLC_Machine_4'},
    # {'ip': '192.168.2.105', 'port': 2022, 'name': 'PLC_Machine_5'},
    # {'ip': '192.168.2.106', 'port': 2022, 'name': 'PLC_Machine_6'},

]
# Address Constants
COIL_X_START_ADDR = 0
COIL_X_COUNT = 18
COIL_Y_START_ADDR = 10000
COIL_Y_COUNT = 18
COIL_M_START_ADDR = 30000
COIL_M_COUNT = 21
NODEJS_API_URL = os.environ.get('NODEJS_API_URL', "http://web:3000") # ปรับเป็น web:3000 เพื่อความชัวร์ใน Docker

# --- FIX: สร้าง Map สำหรับส่งให้ Frontend ---
MACHINE_CODE_TO_PLC_NAME_MAP = {
    'MC-001': 'PLC_Machine_1',
    'MC-002': 'PLC_Machine_2',
    'MC-003': 'PLC_Machine_3',
    'MC-004': 'PLC_Machine_4',
    'MC-005': 'PLC_Machine_5',
    'MC-006': 'PLC_Machine_6',
}

# --- FIX: แยก Address สำหรับการอ่านและการเขียนออกจากกัน ---
# สำหรับการอ่านข้อมูลใน Background Polling (ต้องใช้ 41000)
HOLDING_REG_START_ADDR = 41000
# สำหรับการเขียนข้อมูล Job Order (ต้องใช้ 40000 เพื่อให้ Handshake ทำงาน)
WRITE_REG_START_ADDR = 40000
HOLDING_REG_COUNT = 65

# --- 2. สร้างตัวแปร Lock และฟังก์ชัน Helper ---
latest_plc_data = {}
data_lock = threading.Lock()
last_known_statuses = {}
# สร้าง Dictionary ของ Lock โดยใช้ชื่อ PLC เป็น Key
plc_communication_locks = {plc['name']: threading.Lock() for plc in PLC_CONFIGS}

def log_message(message):
    """Helper function to log messages with timestamps."""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
    entry = f"[{timestamp}] {message}"
    print(entry)

def print_debug_info(plc_name, coils_x, coils_y, coils_m, holdings_list, error=None):
    # ปิด print debug เพื่อให้ log ไม่รก (เปิดได้ถ้าต้องการ)
    # print(f"\n---------- DEBUG: RAW DATA FROM {plc_name} ----------")
    if error:
        print(f"[ERROR] {plc_name}: {error}")

def encode_string_to_registers(text, fixed_char_length):
    """Helper to encode a string into a list of registers (big-endian)."""
    padded_text = text.ljust(fixed_char_length, '\x00')
    encoded_bytes = padded_text.encode('utf-8')
    # Ensure byte string length is even for struct unpacking
    if len(encoded_bytes) % 2 != 0:
        encoded_bytes += b'\x00'
    num_registers = len(encoded_bytes) // 2
    return list(struct.unpack(f'>{num_registers}H', encoded_bytes))

def decode_registers_to_string(registers):
    """Helper to decode registers back to a string."""
    byte_string = b"".join(reg.to_bytes(2, 'big') for reg in registers)
    return byte_string.decode('utf-8', errors='ignore').rstrip('\x00')

# --- 3. Flask Web Server & Database Setup ---
# Get the project root directory
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
template_folder_path = os.path.join(project_root, 'template')
app = Flask(__name__, template_folder=template_folder_path)
CORS(app, supports_credentials=True)
# Priority: Environment Variable > Default Localhost
# --- FIX: แก้ Database URL เป็น postgres:5432 ---
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres123@localhost:5433/smart_factory')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- 4. Database Models (ปรับปรุง) ---
class TagMapping(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    plc_name = db.Column(db.String(50), nullable=False)
    tag_name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.Integer, nullable=False)
    data_type = db.Column(db.String(20), nullable=False)
    length = db.Column(db.Integer, nullable=True) # เพิ่มคอลัมน์ length สำหรับ string

    # --- FIX: เปลี่ยน UNIQUE constraint ---
    # เปลี่ยนจากการบังคับให้ tag_name ต้องไม่ซ้ำกันเลยในทั้งตาราง
    # มาเป็นการบังคับให้ "คู่ของ plc_name และ tag_name" ต้องไม่ซ้ำกัน
    __table_args__ = (db.UniqueConstraint('plc_name', 'tag_name', name='_plc_tag_uc'),)

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}

class LoggedData(db.Model):
    __tablename__ = 'logged_data'
    id = db.Column(db.Integer, primary_key=True)
    tag_name = db.Column(db.String(100), nullable=False)
    # เปลี่ยนจาก Float เป็น String เพื่อรองรับทั้งตัวเลขและข้อความ
    value = db.Column(db.String(255), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.now)

class MachineStatusLog(db.Model):
    __tablename__ = 'machine_status_logs'
    id = db.Column(db.Integer, primary_key=True)
    machine_id = db.Column(db.String(50), nullable=False)
    status = db.Column(db.Integer, nullable=False)
    start_time = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    end_time = db.Column(db.DateTime)
    duration_sec = db.Column(db.Integer)
    # เพิ่ม reason_id และ notes ให้ตรงกับ schema ของ Node.js
    reason_id = db.Column(db.Integer, nullable=True)
    notes = db.Column(db.Text, nullable=True)

# --- START: เพิ่ม Model ที่ขาดหายไป ---
class Item(db.Model):
    __tablename__ = 'items'
    id = db.Column(db.Integer, primary_key=True)
    item_code = db.Column(db.String, unique=True, nullable=False)
    item_name = db.Column(db.String, nullable=False)
    # สามารถเพิ่มคอลัมน์อื่นๆ ของตาราง items ได้ที่นี่

class Machine(db.Model):
    __tablename__ = 'machines'
    id = db.Column(db.Integer, primary_key=True)
    machine_code = db.Column(db.String, unique=True, nullable=False)
    # สามารถเพิ่มคอลัมน์อื่นๆ ของตาราง machines ได้ที่นี่

class ManufacturingOrder(db.Model):
    __tablename__ = 'manufacturing_orders'
    id = db.Column(db.Integer, primary_key=True)
    mo_number = db.Column(db.String, unique=True, nullable=False)
    item_code = db.Column(db.String, db.ForeignKey('items.item_code'), nullable=False)
    quantity_to_produce = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String, default='pending')
    machine_id = db.Column(db.Integer, db.ForeignKey('machines.id'))
    item = db.relationship('Item', backref='manufacturing_orders')
# --- END: เพิ่ม Model ที่ขาดหายไป ---

# --- 5. Background Polling (ปรับปรุง) ---
def poll_single_plc(plc_config):
    plc_name = plc_config['name']
    
    # รอ DB
    time.sleep(5)

    while True:
        try:
            # ใช้ Lock ที่ถูกต้องสำหรับ PLC เครื่องนี้
            with plc_communication_locks[plc_name]:
                client = ModbusTcpClient(plc_config['ip'], port=plc_config['port'], timeout=2)
                if not client.connect(): raise ConnectionException(f"Connection failed")
                
                # --- FIX: ลบ device_id=1 ออก ---
                coils_x = client.read_coils(COIL_X_START_ADDR, count=COIL_X_COUNT)
                coils_y = client.read_coils(COIL_Y_START_ADDR, count=COIL_Y_COUNT)
                coils_m = client.read_coils(COIL_M_START_ADDR, count=COIL_M_COUNT)
                # อ่านข้อมูล Holding Register ทั้งหมดในครั้งเดียว
                response = client.read_holding_registers(HOLDING_REG_START_ADDR, count=HOLDING_REG_COUNT)
                client.close()

            holdings_list, read_error = None, None
            if response.isError():
                read_error = response
                # raise Exception(f"Failed to read holding registers: {read_error}")
            else:
                holdings_list = response.registers

            print_debug_info(plc_name, coils_x, coils_y, coils_m, holdings_list, read_error)

            # --- ส่วนประมวลผลและบันทึกข้อมูล (ปรับปรุง) ---
            decoded_values = {} # สร้าง dict สำหรับเก็บค่าที่ถอดรหัสแล้ว
            with app.app_context():
                current_mappings = TagMapping.query.filter_by(plc_name=plc_name).all()
                for m in current_mappings:
                    value_to_log = None
                    try:
                        if m.data_type == 'string' and holdings_list and m.length:
                            start_idx = m.address - HOLDING_REG_START_ADDR
                            num_regs = math.ceil(m.length / 2)
                            if 0 <= start_idx and (start_idx + num_regs) <= len(holdings_list):
                                registers_for_string = holdings_list[start_idx : start_idx + num_regs]
                                value_to_log = decode_registers_to_string(registers_for_string)
                        elif m.data_type == 'holding_register' and holdings_list:
                            idx = m.address - HOLDING_REG_START_ADDR
                            if 0 <= idx < len(holdings_list):
                                value_to_log = holdings_list[idx]
                        elif m.data_type == 'coil_x' and coils_x and not coils_x.isError():
                            idx = m.address - COIL_X_START_ADDR
                            if 0 <= idx < len(coils_x.bits):
                                value_to_log = int(coils_x.bits[idx])
                        elif m.data_type == 'coil_y' and coils_y and not coils_y.isError():
                            idx = m.address - COIL_Y_START_ADDR
                            if 0 <= idx < len(coils_y.bits):
                                value_to_log = int(coils_y.bits[idx])
                        elif m.data_type == 'coil_m' and coils_m and not coils_m.isError():
                            idx = m.address - COIL_M_START_ADDR
                            if 0 <= idx < len(coils_m.bits):
                                value_to_log = int(coils_m.bits[idx])

                        if value_to_log is not None:
                            decoded_values[m.tag_name] = value_to_log
                            # --- FIX: เพิ่มคำสั่งบันทึกข้อมูลกลับเข้ามา (ส่วนนี้ถูกต้องแล้ว) ---
                            # log_entry = LoggedData(tag_name=m.tag_name, value=str(value_to_log))
                            # db.session.add(log_entry) # 1. เพิ่มข้อมูลเข้าสู่ session
                    except Exception as e:
                        print(f"Error processing mapping for tag '{m.tag_name}': {e}")
                
                # db.session.commit() # 2. บันทึกข้อมูลทั้งหมดลง database

            # --- ส่วนอัปเดตข้อมูลสำหรับ UI (ปรับปรุง) ---
            mapped_data = {
                'plc_name': plc_name, 'is_connected': True,
                'raw_coils_x': coils_x.bits[:COIL_X_COUNT] if coils_x and not coils_x.isError() else [],
                'raw_coils_y': coils_y.bits[:COIL_Y_COUNT] if coils_y and not coils_y.isError() else [],
                'raw_coils_m': coils_m.bits[:COIL_M_COUNT] if coils_m and not coils_m.isError() else [],
                'raw_holdings': holdings_list,
                'decoded_tags': decoded_values # ส่งค่าที่ถอดรหัสแล้วไปด้วย
            }
            # --- FIX: เรียกใช้ฟังก์ชันเพื่ออัปเดตตาราง machine_data ---
            update_smart_factory_db(plc_name, decoded_values)
            with data_lock:
                latest_plc_data[plc_name] = mapped_data

        except Exception as e:
            # print(f"\n--- ERROR processing {plc_name}: {e} ---")
            with data_lock:
                latest_plc_data[plc_name] = {'plc_name': plc_name, 'is_connected': False, 'error': str(e)}
        
        time.sleep(5)

def update_smart_factory_db(machine_id, decoded_tags): # decoded_tags ที่ได้รับมาไม่มี mo_number
    from sqlalchemy import text

    PLC_TO_MACHINE_CODE_MAP = {
        'PLC_Machine_1': 'MC-001',
        'PLC_Machine_2': 'MC-002',
        'PLC_Machine_3': 'MC-003',
        'PLC_Machine_4': 'MC-004',
        'PLC_Machine_5': 'MC-005',
        'PLC_Machine_6': 'MC-006',
    } 
    machine_code = PLC_TO_MACHINE_CODE_MAP.get(machine_id, machine_id)
    
    required_tags_map = {
        'status': 'machine_status',
        'count': 'mold_count',
        'core_temp': 'mold_temp_core',
        'cavity_temp': 'mold_temp_cavity',
        'cycle_time': 'cycle_time',
        'dry_temp': 'dry_temp',
        'mo_number': 'mo_number',
        'item_name': 'item_name'
    }
    # !!! บังคับว่าต้องมี Tag เหล่านี้ถึงจะบันทึก !!!
    required_tag_names = ['machine_status', 'mold_count'] 
    if not all(tag in decoded_tags for tag in required_tag_names):
        return
    try:
        with app.app_context():
            ict_tz = timezone(timedelta(hours=7))
            current_ict_time = datetime.now(ict_tz).strftime('%Y-%m-%d %H:%M:%S')
            sql = text("""
                INSERT INTO machine_data (
                    machine_id, timestamp, machine_status, mold_count, 
                    mold_temp_core, mold_temp_cavity, cycle_time_sec, material_dry_temp,
                    mo_number, item_name
                ) VALUES (
                    :machine_id, :timestamp, :status, :count, 
                    :core, :cavity, :cycle_time, :dry_temp,
                    :mo_number, :item_name
                ) ON CONFLICT (machine_id) DO UPDATE SET
                    timestamp = :timestamp, machine_status = :status, mold_count = :count,
                    mold_temp_core = :core, mold_temp_cavity = :cavity,
                    cycle_time_sec = :cycle_time, material_dry_temp = :dry_temp,
                    mo_number = :mo_number, item_name = :item_name
            """)
            params = {
                "machine_id": machine_code, "timestamp": current_ict_time,
                "status": decoded_tags.get(required_tags_map['status']),
                "count": decoded_tags.get(required_tags_map['count']),
                "core": decoded_tags.get(required_tags_map['core_temp']),
                "cavity": decoded_tags.get(required_tags_map['cavity_temp']),
                "cycle_time": decoded_tags.get(required_tags_map['cycle_time']),
                "dry_temp": decoded_tags.get(required_tags_map['dry_temp']),
                "mo_number": decoded_tags.get(required_tags_map['mo_number']),
                "item_name": decoded_tags.get(required_tags_map['item_name'])
            }
            db.session.execute(sql, params)
            db.session.commit()
            print(f"    [{machine_code}] Data: MO={params['mo_number']}, Item={params['item_name']}, Count={params['count']} -> Synced to smart_factory.db")
            if 'machine_status' in decoded_tags:
                log_machine_status_change(machine_code, decoded_tags['machine_status'])
    except Exception as e:
        with app.app_context():
            db.session.rollback()
        print(f"    [{machine_code}] -> ❌ FAILED during DB operation: {e}")
        # traceback.print_exc()

def log_machine_status_change(machine_code, current_status):
    # This function uses SQLAlchemy to write to PostgreSQL
    global last_known_statuses
    last_status = last_known_statuses.get(machine_code)

    try: current_status = int(current_status)
    except (ValueError, TypeError): return 

    if current_status == last_status: return

    now_local = datetime.now()
    # now_str = now_local.strftime('%Y-%m-%d %H:%M:%S') # SQLAlchemy handles datetime objects

    try:
        with app.app_context():
            # Find the last open log
            last_log = MachineStatusLog.query.filter_by(machine_id=machine_code, end_time=None).order_by(MachineStatusLog.start_time.desc()).first()
            
            if last_log:
                duration = int((now_local - last_log.start_time).total_seconds())
                last_log.end_time = now_local
                last_log.duration_sec = duration
                db.session.add(last_log)

            # Create new log
            new_log = MachineStatusLog(machine_id=machine_code, status=current_status, start_time=now_local)
            db.session.add(new_log)

            # Update machine status
            status_map = {0: 'idle', 1: 'running', 2: 'down'}
            new_status_text = status_map.get(current_status, 'idle')
            
            # Assuming Machine model exists and has machine_code
            machine = Machine.query.filter_by(machine_code=machine_code).first()
            if machine:
                machine.status = new_status_text # You might need to add 'status' column to Machine model if not exists
                db.session.add(machine)
            else:
                # Fallback if Machine model doesn't have status or isn't queryable this way, use raw SQL or ignore
                from sqlalchemy import text
                db.session.execute(text("UPDATE machines SET status = :status WHERE machine_code = :code"), {"status": new_status_text, "code": machine_code})

            db.session.commit()
            
    except Exception as e:
        print(f"    [{machine_code}] -> ❌ FAILED to write status log: {e}")
        traceback.print_exc()

    last_known_statuses[machine_code] = current_status
    print(f"    [{machine_code}] Status changed from {last_status} to {current_status}. Logged.")

# --- 6. Flask Routes (เหมือนเดิม ยกเว้นส่วนที่เกี่ยวกับ Mapping) ---
@app.route('/')
def index():
    return "<h1>PLC Dashboard is running.</h1><p>Go to <a href='/test'>/test</a> for the test UI or <a href='/mapping'>/mapping</a> to configure tags.</p>"

@app.route('/test')
def test_ui():
    return render_template('test_ui.html')

@app.route('/mapping')
def mapping_ui():
    return render_template('mapping.html')

@app.route('/api/data')
def api_data():
    with data_lock:
        return jsonify(latest_plc_data)

@app.route('/api/write', methods=['POST'])
def api_write():
    data = request.json
    plc_name = data.get('plc_name')
    address = data.get('address')
    value = data.get('value')
    data_type = data.get('type')

    if None in [plc_name, address, value, data_type]:
        return jsonify({'status': 'error', 'message': 'Missing parameters (plc_name, address, value, type)'}), 400

    try:
        address = int(address)
        if data_type == 'coil':
            value = bool(int(value))
        else:
            value = int(value)
    except (ValueError, TypeError):
        return jsonify({'status': 'error', 'message': 'Invalid address or value format'}), 400

    plc_config = next((p for p in PLC_CONFIGS if p['name'] == plc_name), None)
    if not plc_config:
        return jsonify({'status': 'error', 'message': f"PLC '{plc_name}' not found"}), 404

    try:
        with plc_communication_locks[plc_name]:
            client = ModbusTcpClient(plc_config['ip'], port=plc_config['port'], timeout=2)
            if not client.connect():
                raise ConnectionException("Connection failed")

            # --- FIX: ลบ device_id=1 ออก ---
            if data_type == 'coil':
                result = client.write_coil(address, value)
            elif data_type == 'register':
                result = client.write_register(address, value)
            else:
                return jsonify({'status': 'error', 'message': "Invalid type: must be 'coil' or 'register'"}), 400

            client.close()

        # if result.isError():
        #     raise Exception(f"Modbus Error: {result}")

        return jsonify({'status': 'success', 'message': f"Successfully wrote {value} to {data_type} {address} on {plc_name}"})

    except Exception as e:
        error_message = f"Failed to write to {plc_name}: {e}"
        print(error_message)
        traceback.print_exc()
        return jsonify({'status': 'error', 'message': error_message}), 500

@app.route('/api/write_string', methods=['POST'])
def api_write_string():
    data = request.json
    plc_name = data.get('plc_name')
    start_address = data.get('address')
    text = data.get('text', '')
    char_length = data.get('length')

    if None in [plc_name, start_address, char_length]:
        return jsonify({'status': 'error', 'message': 'Missing parameters (plc_name, address, text, length)'}), 400

    try:
        start_address = int(start_address)
        char_length = int(char_length)
    except (ValueError, TypeError):
        return jsonify({'status': 'error', 'message': 'address and length must be integers'}), 400

    plc_config = next((p for p in PLC_CONFIGS if p['name'] == plc_name), None)
    if not plc_config:
        return jsonify({'status': 'error', 'message': f"PLC '{plc_name}' not found"}), 404

    try:
        registers_to_write = encode_string_to_registers(text, char_length)
        with plc_communication_locks[plc_name]:
            client = ModbusTcpClient(plc_config['ip'], port=plc_config['port'], timeout=2)
            if not client.connect():
                raise ConnectionException("Connection failed")

            # --- FIX: ลบ device_id=1 ออก ---
            result = client.write_registers(start_address, registers_to_write)
            client.close()

        # if result.isError():
        #     raise Exception(f"Modbus Error: {result}")

        return jsonify({'status': 'success', 'message': f"Successfully wrote string '{text}' to {plc_name}"})

    except Exception as e:
        error_message = f"Failed to write string to {plc_name}: {e}"
        print(error_message)
        traceback.print_exc()
        return jsonify({'status': 'error', 'message': error_message}), 500

def dint_to_registers(value):
    """Helper to encode a 32-bit integer (DINT) into two 16-bit registers."""
    b = struct.pack('>i', int(value))
    return struct.unpack('>HH', b)

def string_to_registers(text, fixed_char_length):
    """Helper to encode a string into a list of registers (big-endian)."""
    padded_text = text.ljust(fixed_char_length, '\x00')
    encoded_bytes = padded_text.encode('utf-8')
    num_registers = math.ceil(len(encoded_bytes) / 2)
    return list(struct.unpack(f'>{num_registers}H', encoded_bytes.ljust(num_registers * 2, b'\x00')))

@app.route('/api/plc/write-job', methods=['POST'])
def write_job_to_plc():
    data = request.get_json()
    plc_name = data.get('plc_name')
    mo_number = data.get('mo_number', '')
    item_name = data.get('item_name', '')
    quantity = data.get('quantity', 0)

    plc_config = next((p for p in PLC_CONFIGS if p['name'] == plc_name), None)
    if not plc_config:
        return jsonify({'status': 'error', 'message': f"PLC '{plc_name}' not found"}), 404

    # --- Handshake Addresses ---
    ADDR_TARGET_QTY = 1014
    ADDR_MO_NUMBER = 1016
    ADDR_ITEM_NAME = 1026
    COIL_APP_NEW_DATA = 120  # M120
    COIL_PLC_ACK = 121       # M121

    log_message("="*50)
    log_message(f"Starting 'Write Job' sequence for {plc_name} at {plc_config['ip']}")
    log_message(f"  - MO: {mo_number}, Item: {item_name}, Qty: {quantity}")

    try:
        log_message("Step 1: Preparing data...")
        mo_regs = string_to_registers(mo_number, 20)
        item_regs = string_to_registers(item_name, 20)
        qty_regs = dint_to_registers(quantity)
        log_message(f"  - MO Registers: {mo_regs}, Item Registers: {item_regs}, Qty Registers: {qty_regs}")

        # Use the global lock to ensure exclusive access to the PLC
        with plc_communication_locks[plc_name]:
            print(f"[{plc_name}] Locked communication for writing job.")
            with ModbusTcpClient(plc_config['ip'], port=plc_config['port'], timeout=3) as client:
                if not client.connect():
                    raise ConnectionException("Failed to connect to PLC")
                
                # --- Handshake Addresses (ย้ายมาไว้ตรงนี้เพื่อให้ชัดเจน) ---
                ADDR_TARGET_QTY = 1014
                ADDR_MO_NUMBER = 1016
                ADDR_ITEM_NAME = 1026
                COIL_APP_NEW_DATA = 120  # M120
                COIL_PLC_ACK = 121       # M121
                
                # Step 2: Write data
                log_message("Step 2: Writing data to Holding Registers...")
                # --- FIX: ลบ device_id=1 ออก ---
                client.write_registers(ADDR_MO_NUMBER + WRITE_REG_START_ADDR, mo_regs)
                client.write_registers(ADDR_ITEM_NAME + WRITE_REG_START_ADDR, item_regs)
                client.write_registers(ADDR_TARGET_QTY + WRITE_REG_START_ADDR, qty_regs)

                # Step 3: Verify written data
                log_message("Step 3: Verifying written data...")
                # --- FIX: ลบ device_id=1 ออก ---
                read_mo_regs = client.read_holding_registers(ADDR_MO_NUMBER + WRITE_REG_START_ADDR, count=len(mo_regs)).registers
                if read_mo_regs != mo_regs:
                    raise ValueError(f"MO verification failed! Expected {mo_regs}, got {read_mo_regs}")
                log_message("  - MO data verified.")
                read_item_regs = client.read_holding_registers(ADDR_ITEM_NAME + WRITE_REG_START_ADDR, count=len(item_regs)).registers
                if read_item_regs != item_regs:
                    raise ValueError(f"Item verification failed! Expected {item_regs}, got {read_item_regs}")
                log_message("  - Item data verified.")
                read_qty_regs = client.read_holding_registers(ADDR_TARGET_QTY + WRITE_REG_START_ADDR, count=len(qty_regs)).registers
                if read_qty_regs != list(qty_regs):
                    raise ValueError(f"Quantity verification failed! Expected {list(qty_regs)}, got {read_qty_regs}")
                
                log_message("  - Quantity data verified.")

                # Step 4: Start Handshake
                log_message(f"Step 4: Starting Handshake. Setting M{COIL_APP_NEW_DATA} (Addr: {COIL_APP_NEW_DATA + COIL_M_START_ADDR}) to ON.")
                # --- FIX: ลบ device_id=1 ออก ---
                client.write_coil(COIL_APP_NEW_DATA + COIL_M_START_ADDR, True)

        # The lock is released here, polling thread can resume.
        log_message(f"Step 5: Waiting for PLC acknowledgment on M{COIL_PLC_ACK}...")

        # Step 5: Wait for PLC acknowledgment (polling outside the main lock)
        ack_received = False
        for i in range(10): # Wait up to 10 seconds
            time.sleep(1)
            with plc_communication_locks[plc_name]:
                with ModbusTcpClient(plc_config['ip'], port=plc_config['port'], timeout=2) as client:
                    if client.connect():
                        # --- FIX: ลบ device_id=1 ออก ---
                        ack_response = client.read_coils(COIL_PLC_ACK + COIL_M_START_ADDR, count=1)
                        if not ack_response.isError() and ack_response.bits[0]:
                            ack_received = True
                            log_message("  - SUCCESS: PLC Acknowledgment received!")
                            break
            if not ack_received:
                log_message(f"  - Still waiting... (Attempt {i+1}/10)")

        # Step 6: Finalize Handshake
        log_message("Step 6: Finalizing Handshake...")
        with plc_communication_locks[plc_name]:
            with ModbusTcpClient(plc_config['ip'], port=plc_config['port'], timeout=3) as client:
                if client.connect():
                    log_message(f"  - Setting M{COIL_APP_NEW_DATA} (Addr: {COIL_APP_NEW_DATA + COIL_M_START_ADDR}) to OFF.")
                    # --- FIX: ลบ device_id=1 ออก ---
                    client.write_coil(COIL_APP_NEW_DATA + COIL_M_START_ADDR, False)
        

        if not ack_received:
            raise TimeoutError("PLC did not acknowledge in time.")

        # --- FIX: เพิ่มการหน่วงเวลาเล็กน้อยเพื่อให้ Polling Thread อ่านข้อมูลที่ถูกต้อง ---
        time.sleep(5) # หน่วงเวลา 2 วินาที

        log_message("✅ Write Job Sequence Completed Successfully.")
        return jsonify({'status': 'success', 'message': 'Job data sent and acknowledged by PLC.'})

    except Exception as e:
        log_message(f"❌ ERROR during write job sequence for {plc_name}: {e}")
        traceback.print_exc()
        return jsonify({'status': 'error', 'message': str(e)}), 500

def write_job_queue_to_plc_logic(plc_name, pending_jobs):
    """
    Logic สำหรับเขียน "คิวงาน" (Pending Jobs) ไปยัง PLC
    - plc_name: ชื่อของ PLC เป้าหมาย
    - pending_jobs: list ของ object งาน (mo_number, item_name, quantity_to_produce)
    """
    plc_config = next((p for p in PLC_CONFIGS if p['name'] == plc_name), None)
    if not plc_config:
        raise ValueError(f"PLC '{plc_name}' not found")

    # --- Memory Map สำหรับคิวงาน (ตามดีไซน์ใหม่: 100 Registers ต่อ Slot) ---
    QUEUE_START_ADDR_OFFSET = 1100  # เริ่มต้นที่ D1100
    JOB_BLOCK_SIZE = 100            # แต่ละ Slot ห่างกัน 100 registers
    MAX_QUEUE_SLOTS = 5

    # Offset ภายในแต่ละ Job block (ตำแหน่งสำหรับเขียนข้อมูล ยังคงเหมือนเดิม)
    OFFSET_MO = 0      # MO Number เริ่มที่ +0
    OFFSET_ITEM = 10   # Item Name เริ่มที่ +10
    OFFSET_QTY = 20    # Target Qty เริ่มที่ +20

    log_message("="*50)
    log_message(f"Starting 'Write Job Queue' sequence for {plc_name}")

    with plc_communication_locks[plc_name]:
        with ModbusTcpClient(plc_config['ip'], port=plc_config['port'], timeout=3) as client:
            if not client.connect():
                raise ConnectionException("Failed to connect to PLC for queue writing")

            # วนลูปเพื่อเขียนข้อมูลคิวงานตามลำดับ
            for i in range(MAX_QUEUE_SLOTS):
                block_start_addr = QUEUE_START_ADDR_OFFSET + (i * JOB_BLOCK_SIZE)
                
                if i < len(pending_jobs):
                    # ถ้ามีข้อมูลงานในคิว ให้เขียนข้อมูลนั้น
                    job = pending_jobs[i]
                    mo_number = job.get('mo_number', '')
                    item_name = job.get('item_name', '')
                    quantity = job.get('quantity_to_produce', 0)
                    log_message(f"  - Writing Slot {i+1}: MO={mo_number}, Qty={quantity}")
                else:
                    # ถ้าไม่มีข้อมูลแล้ว ให้เขียนค่าว่างเพื่อล้าง Slot นั้นๆ
                    mo_number = ''
                    item_name = ''
                    quantity = 0
                    log_message(f"  - Clearing Slot {i+1}")

                # แปลงข้อมูลเป็น Registers
                mo_regs = string_to_registers(mo_number, 20)
                item_regs = string_to_registers(item_name, 20)
                qty_regs = dint_to_registers(quantity)

                # เขียนข้อมูลไปยัง Address ที่ถูกต้อง
                # --- FIX: ลบ device_id=1 ออก ---
                client.write_registers(block_start_addr + OFFSET_MO + WRITE_REG_START_ADDR, mo_regs)
                client.write_registers(block_start_addr + OFFSET_ITEM + WRITE_REG_START_ADDR, item_regs)
                client.write_registers(block_start_addr + OFFSET_QTY + WRITE_REG_START_ADDR, qty_regs)

    log_message(f"✅ Write Job Queue Sequence for {plc_name} Completed Successfully.")
    return {'status': 'success', 'message': f'Successfully sent {len(pending_jobs)} pending jobs to PLC.'}

@app.route('/api/plc/send-pending-queue', methods=['POST'])
def send_pending_queue():
    """
    API Endpoint ที่ถูกเรียกจากหน้าเว็บ
    - ดึงข้อมูล Pending Jobs จาก DB
    - เรียก Logic เพื่อเขียนข้อมูลไปยัง PLC
    """
    data = request.get_json()
    machine_id = data.get('machine_id') # รับ machine_id (e.g., 1, 2)
    plc_name = data.get('plc_name')

    if not machine_id or not plc_name:
        return jsonify({'status': 'error', 'message': 'Missing machine_id or plc_name'}), 400

    try:
        # ดึงข้อมูล Pending Jobs จาก DB (เหมือนที่ทำใน Node.js)
        # from models import ManufacturingOrder # <--- ลบการ import ที่ไม่จำเป็นออก
        pending_jobs = ManufacturingOrder.query.filter_by(machine_id=machine_id, status='pending').order_by(ManufacturingOrder.id).limit(5).all()
        pending_jobs_dict = [{'mo_number': j.mo_number, 'item_name': j.item.item_name, 'quantity_to_produce': j.quantity_to_produce} for j in pending_jobs]
        
        result = write_job_queue_to_plc_logic(plc_name, pending_jobs_dict)
        return jsonify(result)
    except Exception as e:
        log_message(f"❌ ERROR during send pending queue for {plc_name}: {e}")
        traceback.print_exc()
        return jsonify({'status': 'error', 'message': str(e)}), 500

# --- 7. API for Mappings (ปรับปรุง) ---
@app.route('/api/mappings', methods=['GET', 'POST'])
def handle_mappings():
    if request.method == 'POST':
        data = request.json
        required_fields = ['plc_name', 'tag_name', 'address', 'data_type']
        if not all(k in data for k in required_fields):
            return jsonify({'status': 'error', 'message': 'Missing required fields.'}), 400
        
        if data['data_type'] == 'string' and 'length' not in data:
            return jsonify({'status': 'error', 'message': "Field 'length' is required for data type 'string'."}), 400

        # --- FIX: ตรวจสอบความซ้ำซ้อนตามเงื่อนไขใหม่ (ทั้ง plc_name และ tag_name) ---
        existing_tag = TagMapping.query.filter_by(
            plc_name=data['plc_name'], tag_name=data['tag_name']
        ).first()
        if existing_tag:
            return jsonify({'status': 'error', 'message': f"Tag name '{data['tag_name']}' already exists for PLC '{data['plc_name']}'."}), 409

        new_mapping = TagMapping(
            plc_name=data['plc_name'],
            tag_name=data['tag_name'],
            address=int(data['address']),
            data_type=data['data_type'],
            length=int(data['length']) if data['data_type'] == 'string' else None
        )
        db.session.add(new_mapping)
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Mapping created.', 'data': new_mapping.to_dict()}), 201

    # GET
    mappings = TagMapping.query.all()
    return jsonify([m.to_dict() for m in mappings])

@app.route('/api/plc-configs')
def get_plc_configs():
    # Endpoint ใหม่สำหรับให้ Frontend ดึงข้อมูลการจับคู่
    return jsonify(MACHINE_CODE_TO_PLC_NAME_MAP)

@app.route('/api/mappings/<int:mapping_id>', methods=['DELETE'])
def delete_mapping(mapping_id):
    mapping_to_delete = TagMapping.query.get(mapping_id)
    if not mapping_to_delete:
        return jsonify({'status': 'error', 'message': 'Mapping not found.'}), 404

    db.session.delete(mapping_to_delete)
    db.session.commit()
    return jsonify({'status': 'success', 'message': f"Mapping ID {mapping_id} deleted."})

@app.route('/api/mappings/apply', methods=['POST'])
def apply_mappings():
    """
    API Endpoint to copy mappings from a source PLC to a target PLC.
    """
    data = request.json
    source_plc = data.get('source_plc')
    target_plc_name = data.get('target_plc')

    if not source_plc or not target_plc_name:
        return jsonify({'status': 'error', 'message': 'Source and Target PLC must be provided.'}), 400

    try:
        source_mappings = TagMapping.query.filter_by(plc_name=source_plc).all()
        if not source_mappings:
            return jsonify({'status': 'error', 'message': f"No mappings found for source PLC '{source_plc}'."}), 404

        target_plcs = []
        if target_plc_name == '__ALL__':
            target_plcs = [p['name'] for p in PLC_CONFIGS if p['name'] != source_plc]
        else:
            target_plcs = [target_plc_name]

        created_count = 0
        for target in target_plcs:
            # Get existing tag names for the current target PLC to avoid duplicates
            # --- FIX: ดึงเฉพาะ tag_name ของ PLC เป้าหมายเท่านั้น ---
            existing_target_tags = {m.tag_name for m in TagMapping.query.filter_by(plc_name=target).all()}

            for source_map in source_mappings:
                if source_map.tag_name not in existing_target_tags:
                    new_map = TagMapping(plc_name=target, tag_name=source_map.tag_name, address=source_map.address, data_type=source_map.data_type, length=source_map.length)
                    db.session.add(new_map)
                    created_count += 1
        
        db.session.commit()
        return jsonify({'status': 'success', 'message': f"Successfully applied {created_count} new mappings to {len(target_plcs)} PLC(s)."}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': f"An internal error occurred: {e}"}), 500

# --- 8. Main Execution ---
if __name__ == '__main__':
    with app.app_context():
        db.create_all()

    for plc in PLC_CONFIGS:
        thread = threading.Thread(target=poll_single_plc, args=(plc,), daemon=True)
        thread.start()
        print(f"Started polling thread for {plc['name']}...")

    app.run(host='0.0.0.0', port=5000, debug=False)
