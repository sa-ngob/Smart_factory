import time
import json
import threading
import traceback
import math
import os
import sqlite3
from flask import Flask, render_template, request, jsonify
from pymodbus.client import ModbusTcpClient
from pymodbus.exceptions import ConnectionException
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from datetime import datetime, timezone, timedelta
from flask_cors import CORS

# --- 1. การตั้งค่า ---
PLC_CONFIGS = [
    {'ip': '192.168.2.101', 'port': 2022, 'name': 'PLC_Machine_1'},
    {'ip': '192.168.2.102', 'port': 2022, 'name': 'PLC_Machine_2'}, # ✅ FIX: คืนค่า PLC_Machine_2 กลับมา
]
# Address Constants
COIL_X_START_ADDR = 0
COIL_X_COUNT = 18
COIL_Y_START_ADDR = 10000
COIL_Y_COUNT = 18
COIL_M_START_ADDR = 30100
COIL_M_COUNT = 21
HOLDING_REG_START_ADDR = 41000
HOLDING_REG_COUNT = 65

# --- 2. สร้าง Flask App และเชื่อมต่อ Database ---
SMART_FACTORY_DB_PATH = os.path.join(os.path.dirname(__file__), 'smart_factory.db')
app = Flask(__name__, template_folder='template')
CORS(app, supports_credentials=True)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + SMART_FACTORY_DB_PATH
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- 3. สร้างตัวแปร Lock และตัวแปร Global ---
latest_plc_data = {}
data_lock = threading.Lock()
last_known_statuses = {}
plc_communication_lock = threading.Lock()

# --- 4. Database Models (โครงสร้างตาราง) ---
class LoggedData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    tag_name = db.Column(db.String(100))
    value = db.Column(db.String(255))

class TagMapping(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    plc_name = db.Column(db.String(50), nullable=False)
    tag_name = db.Column(db.String(100), nullable=False, unique=True)
    address = db.Column(db.Integer, nullable=False)
    data_type = db.Column(db.String(20), nullable=False)
    length = db.Column(db.Integer)
    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}

class MachineStatusLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    machine_id = db.Column(db.String(50), nullable=False) # (ควรจะเป็น machine_code)
    status = db.Column(db.Integer, nullable=False)
    start_time = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    end_time = db.Column(db.DateTime)
    duration_seconds = db.Column(db.Integer)

# --- 5. ฟังก์ชัน Helper และ Business Logic ---
def decode_registers_to_string(registers):
    byte_string = b"".join(reg.to_bytes(2, 'big') for reg in registers)
    return byte_string.decode('utf-8', errors='ignore').rstrip('\x00')

def encode_string_to_registers(text, fixed_char_length):
    # ✅ FIX: คืนค่าฟังก์ชัน encode_string_to_registers กลับมา
    padded_text = text.ljust(fixed_char_length, '\x00') # Pad with null characters
    if len(padded_text) % 2 != 0: padded_text += '\x00'
    registers = []
    for i in range(0, len(padded_text), 2):
        char1, char2 = padded_text[i], padded_text[i+1]
        register_value = (ord(char1) << 8) | ord(char2)
        registers.append(register_value)
    return registers

def print_debug_info(plc_name, coils_x, coils_y, coils_m, holdings, error=None):
    print(f"\n---------- DEBUG: RAW DATA FROM {plc_name} ----------")
    if error:
        print(f"[ERROR]: {error}")
    else:
        print(f"[COILS_X]: {coils_x.bits[:COIL_X_COUNT] if coils_x and not coils_x.isError() else 'Error'}")
        print(f"[COILS_Y]: {coils_y.bits[:COIL_Y_COUNT] if coils_y and not coils_y.isError() else 'Error'}")
        print(f"[COILS_M]: {coils_m.bits[:COIL_M_COUNT] if coils_m and not coils_m.isError() else 'Error'}")
        print(f"[HOLDING_REGS]: {holdings if holdings else 'Error'}")
    print("----------------------------------------------------")

def update_smart_factory_db(machine_id, decoded_tags):
    """
    [ฟังก์ชันที่ 1 - แก้ไขแล้ว]
    บันทึกข้อมูลลงตาราง machine_data
    """
    # Map ชื่อ PLC (machine_id) ไปยัง Machine Code จริง
    PLC_TO_MACHINE_CODE_MAP = {
        'PLC_Machine_1': 'MC-001', # (ถ้าชื่อเดียวกัน)
        'PLC_Machine_2': 'MC-002', # (ถ้าชื่อเดียวกัน)
        # หรือ 'PLC_Machine_1': 'MC-001',
        # 'PLC_Machine_2': 'MC-002',
    }
    
    # ดึง Machine Code ที่ถูกต้อง, ถ้าไม่เจอก็ใช้ชื่อ PLC เดิม
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

    required_tag_names = ['machine_status', 'mold_count'] 
    if not all(tag in decoded_tags for tag in required_tag_names):
        # print(f"    [{machine_code}] Skipping DB sync: Missing one of {required_tag_names}")
        return

    try:
        ict_tz = timezone(timedelta(hours=7))
        current_ict_time = datetime.now(ict_tz).strftime('%Y-%m-%d %H:%M:%S')

        sql = text("""
            INSERT INTO machine_data (
                machine_id, timestamp, machine_status, mold_count, 
                mold_temp_core, mold_temp_cavity, cycle_time_sec, material_dry_temp,
                mo_number, item_name
            )
            VALUES (
                :machine_id, :timestamp, :status, :count, 
                :core, :cavity, :cycle_time, :dry_temp,
                :mo_number, :item_name
            )
        """)

        params = {
            "machine_id": machine_code, # ใช้ machine_code ที่แปลงแล้ว
            "timestamp": current_ict_time,
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

        print(
            f"    [{machine_code}] Data: MO={params['mo_number']}, Item={params['item_name']}, Count={params['count']} -> Synced to smart_factory.db"
        )
        
        # เรียกใช้ log_machine_status_change ที่นี่หลังจาก commit
        if 'machine_status' in decoded_tags:
            log_machine_status_change(machine_code, decoded_tags['machine_status'])

    except Exception as e:
        db.session.rollback()
        print(f"    [{machine_code}] -> ❌ FAILED during DB operation: {e}")
        traceback.print_exc()

def log_machine_status_change(machine_code, current_status):
    """
    [ฟังก์ชันที่ 2]
    บันทึกการเปลี่ยนสถานะ (ใช้ sqlite3 connection แยกเพื่อป้องกัน session conflict)
    """
    global last_known_statuses
    last_status = last_known_statuses.get(machine_code)
    if current_status == last_status:
        return

    now_utc = datetime.now(timezone.utc)
    now_str = now_utc.strftime('%Y-%m-%d %H:%M:%S')
    conn = None
    try:
        conn = sqlite3.connect(SMART_FACTORY_DB_PATH, timeout=10)
        cursor = conn.cursor()
        
        last_log = cursor.execute(
            "SELECT id, start_time FROM machine_status_logs WHERE machine_id = ? AND end_time IS NULL ORDER BY start_time DESC LIMIT 1",
            (machine_code,)
        ).fetchone()
        
        if last_log:
            log_id, start_time_str = last_log
            start_time_dt = datetime.strptime(start_time_str, '%Y-%m-%d %H:%M:%S').replace(tzinfo=timezone.utc)
            duration = int((now_utc - start_time_dt).total_seconds())
            cursor.execute(
                "UPDATE machine_status_logs SET end_time = ?, duration_sec = ? WHERE id = ?",
                (now_str, duration, log_id)
            )

        cursor.execute(
            "INSERT INTO machine_status_logs (machine_id, status, start_time) VALUES (?, ?, ?)",
            (machine_code, current_status, now_str)
        )
        conn.commit()
        last_known_statuses[machine_code] = current_status
    except sqlite3.Error as e:
        print(f"    [{machine_code}] -> ❌ FAILED to write status log: {e}")
    finally:
        if conn: conn.close()

# --- 6. Background Polling Thread ---
def poll_single_plc(plc_config):
    """
    [ฟังก์ชันที่ 3 - แก้ไขแล้ว (Bug `item_name` อยู่ตรงนี้)]
    อ่านค่าจาก PLC, บันทึกลง logged_data, และส่งค่าต่อไปยัง machine_data
    """
    plc_name = plc_config['name']
    while True:
        try:
            # --- 1. อ่านข้อมูลจาก PLC ---
            with plc_communication_lock:
                client = ModbusTcpClient(plc_config['ip'], port=plc_config['port'], timeout=2)
                if not client.connect(): raise ConnectionException("Connection failed")
                coils_x = client.read_coils(COIL_X_START_ADDR, count=COIL_X_COUNT, device_id=1)
                coils_y = client.read_coils(COIL_Y_START_ADDR, count=COIL_Y_COUNT, device_id=1)
                coils_m = client.read_coils(COIL_M_START_ADDR, count=COIL_M_COUNT, device_id=1)
                response = client.read_holding_registers(HOLDING_REG_START_ADDR, count=HOLDING_REG_COUNT, device_id=1)
                client.close()
            
            holdings_list = None if response.isError() else response.registers
            # print_debug_info(plc_name, coils_x, coils_y, coils_m, holdings_list, response if response.isError() else None)
            
            with app.app_context():
                # --- 2. แปลงข้อมูลตาม Tag Mapping ---
                decoded_values = {} # สร้าง Dictionary ว่าง
                
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
                            if 0 <= idx < len(holdings_list): value_to_log = holdings_list[idx]
                        
                        elif m.data_type == 'coil_x' and coils_x and not coils_x.isError():
                            idx = m.address - COIL_X_START_ADDR
                            if 0 <= idx < len(coils_x.bits): value_to_log = int(coils_x.bits[idx])
                        
                        elif m.data_type == 'coil_y' and coils_y and not coils_y.isError():
                            idx = m.address - COIL_Y_START_ADDR
                            if 0 <= idx < len(coils_y.bits): value_to_log = int(coils_y.bits[idx])
                        
                        elif m.data_type == 'coil_m' and coils_m and not coils_m.isError():
                            idx = m.address - COIL_M_START_ADDR
                            if 0 <= idx < len(coils_m.bits): value_to_log = int(coils_m.bits[idx])

                        # --- 3. ✅✅✅ นี่คือจุดที่แก้ไข Bug ✅✅✅ ---
                        if value_to_log is not None:
                            # 3a. เก็บค่าลง Dictionary (ที่ขาดไป)
                            decoded_values[m.tag_name] = value_to_log
                            
                            # 3b. บันทึกลง logged_data (ที่คุณเห็นว่าถูกต้อง)
                            log_entry = LoggedData(tag_name=m.tag_name, value=str(value_to_log))
                            db.session.add(log_entry)
                            
                    except Exception as e:
                        print(f"Error processing mapping for tag '{m.tag_name}': {e}")
                
                # 4. บันทึก logged_data ลงฐานข้อมูล
                db.session.commit() 

                # --- 5. ส่งต่อข้อมูลไปยังฟังก์ชันอื่นๆ ---
                with data_lock:
                    latest_plc_data[plc_name] = {'plc_name': plc_name, 'is_connected': True, 'decoded_tags': decoded_values}
                
                # 5a. ส่ง decoded_values (ที่มี 'item_name': 'ITEM-A' แล้ว)
                #     ไปยังฟังก์ชัน update_smart_factory_db
                update_smart_factory_db(plc_name, decoded_values)
                
                # (ย้าย log_machine_status_change ไปไว้ใน update_smart_factory_db
                #  เพื่อให้แน่ใจว่ามันถูกเรียกหลังจาก commit)

        except Exception as e:
            print(f"\n--- ERROR processing {plc_name}: {e} ---")
            with data_lock:
                latest_plc_data[plc_name] = {'plc_name': plc_name, 'is_connected': False, 'error': str(e)}
        time.sleep(5)



        

# --- 7. Flask API Endpoints (ส่วนที่คืนค่ากลับมา) ---
@app.route('/')
def index():
    return "<h1>PLC Dashboard is running.</h1><p>Go to <a href='/test'>/test</a> for the test UI or <a href='/mapping'>/mapping</a> to configure tags.</p>"

@app.route('/test')
def test_ui():
    # ✅ FIX: คืนค่า Endpoint '/test' กลับมา
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
    # ✅ FIX: คืนค่า Endpoint '/api/write' กลับมา
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
        with plc_communication_lock:
            client = ModbusTcpClient(plc_config['ip'], port=plc_config['port'], timeout=2)
            if not client.connect():
                raise ConnectionException("Connection failed")

            if data_type == 'coil':
                result = client.write_coil(address, value, device_id=1)
            elif data_type == 'register':
                result = client.write_register(address, value, device_id=1)
            else:
                return jsonify({'status': 'error', 'message': "Invalid type: must be 'coil' or 'register'"}), 400

            client.close()

        if result.isError():
            raise Exception(f"Modbus Error: {result}")

        return jsonify({'status': 'success', 'message': f"Successfully wrote {value} to {data_type} {address} on {plc_name}"})

    except Exception as e:
        error_message = f"Failed to write to {plc_name}: {e}"
        print(error_message)
        traceback.print_exc()
        return jsonify({'status': 'error', 'message': error_message}), 500

@app.route('/api/write_string', methods=['POST'])
def api_write_string():
    # ✅ FIX: คืนค่า Endpoint '/api/write_string' กลับมา
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
        with plc_communication_lock:
            client = ModbusTcpClient(plc_config['ip'], port=plc_config['port'], timeout=2)
            if not client.connect():
                raise ConnectionException("Connection failed")

            result = client.write_registers(start_address, registers_to_write, device_id=1)
            client.close()

        if result.isError():
            raise Exception(f"Modbus Error: {result}")

        return jsonify({'status': 'success', 'message': f"Successfully wrote string '{text}' to {plc_name}"})

    except Exception as e:
        error_message = f"Failed to write string to {plc_name}: {e}"
        print(error_message)
        traceback.print_exc()
        return jsonify({'status': 'error', 'message': error_message}), 500


@app.route('/api/mappings', methods=['GET', 'POST'])
def handle_mappings():
    if request.method == 'POST':
        data = request.json
        # (Validation)
        existing = TagMapping.query.filter_by(tag_name=data['tag_name']).first()
        if existing:
            return jsonify({'status': 'error', 'message': f"Tag name '{data['tag_name']}' already exists."}), 409

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
    # ✅ FIX: คืนค่า Endpoint '/api/mappings/apply' กลับมา
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
            existing_target_tags = {m.tag_name for m in TagMapping.query.filter_by(plc_name=target).all()}
            for source_map in source_mappings:
                if source_map.tag_name not in existing_target_tags:
                    new_map = TagMapping(
                        plc_name=target,
                        tag_name=source_map.tag_name,
                        address=source_map.address,
                        data_type=source_map.data_type,
                        length=source_map.length
                    )
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
    for config in PLC_CONFIGS:
        thread = threading.Thread(target=poll_single_plc, args=(config,), daemon=True)
        thread.start()
        print(f"Started polling thread for {config['name']}...")
    app.run(host='0.0.0.0', port=5000, debug=False)
