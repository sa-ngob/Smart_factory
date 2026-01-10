import time
import struct
import math
import sys
import traceback
from flask import Flask, render_template_string, jsonify, request
from flask_cors import CORS
from pymodbus.client import ModbusTcpClient
from pymodbus.exceptions import ConnectionException
from datetime import datetime

# ==============================================================================
# 1. ส่วนตั้งค่า (CONFIGURATION)
# ==============================================================================

# สร้าง Flask App และเปิด CORS
app = Flask(__name__)
CORS(app)

# --- การตั้งค่า PLC (เหมือนใน app.py) ---
PLC_CONFIGS = [
    {'ip': '192.168.2.101', 'port': 2022, 'name': 'PLC_Machine_1'},
    {'ip': '192.168.2.102', 'port': 2022, 'name': 'PLC_Machine_2'},
]

# --- Address Constants (เหมือนใน app.py) ---
HOLDING_REG_START_ADDR = 40000
COIL_M_START_ADDR = 30000

# --- Handshake Addresses ---
ADDR_TARGET_QTY = 1014
ADDR_MO_NUMBER = 1016
ADDR_ITEM_NAME = 1026
COIL_APP_NEW_DATA = 120  # M120
COIL_PLC_ACK = 121       # M121

# --- Force Status Address (ตัวอย่าง, ต้องมี mapping จริง) ---
ADDR_MACHINE_STATUS = 1000 # สมมติว่า machine_status อยู่ที่ D1000 (41000)

# Log สำหรับเก็บประวัติการทำงาน
debug_log = []

# ==============================================================================
# 2. ฟังก์ชัน Helper สำหรับคุยกับ PLC (ยกมาจาก app.py)
# ==============================================================================

def log_message(message):
    """Helper function to log messages with timestamps."""
    timestamp = datetime.now().strftime('%H:%M:%S.%f')[:-3]
    entry = f"[{timestamp}] {message}"
    debug_log.insert(0, entry)
    if len(debug_log) > 100:
        debug_log.pop()
    print(entry)

def string_to_registers(text, fixed_char_length):
    padded_text = text.ljust(fixed_char_length, '\x00')
    encoded_bytes = padded_text.encode('utf-8')
    num_registers = math.ceil(len(encoded_bytes) / 2)
    return list(struct.unpack(f'>{num_registers}H', encoded_bytes.ljust(num_registers * 2, b'\x00')))

def decode_registers_to_string(registers):
    """Helper to decode registers back to a string."""
    byte_string = b"".join(reg.to_bytes(2, 'big') for reg in registers)
    return byte_string.decode('utf-8', errors='ignore').rstrip('\x00')

def dint_to_registers(value):
    b = struct.pack('>i', int(value))
    return struct.unpack('>HH', b)

def registers_to_dint(registers):
    """Helper to decode 2 registers back to a DINT."""
    b = struct.pack('>HH', registers[0], registers[1])
    return struct.unpack('>i', b)[0]

# ==============================================================================
# 3. HTML Template สำหรับหน้า UI
# ==============================================================================

HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en" data-bs-theme="dark">
<head>
    <meta charset="UTF-8">
    <title>PLC Communication Tester</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { font-family: monospace; }
        .log-console { background-color: #111; color: #0f0; height: 60vh; overflow-y: auto; padding: 1rem; border-radius: 5px; white-space: pre-wrap; word-break: break-all; }
        .form-control, .form-select { background-color: #333; color: #fff; border-color: #555; }
    </style>
</head>
<body>
    <div class="container mt-4">
        <h1 class="text-center mb-4 text-info">PLC Communication Tester</h1>
        
        <div class="row g-3">
            <!-- 1. Write Job Form -->
            <div class="col-md-6">
                <div class="card border-primary mb-4">
                    <div class="card-header"><h5>1. Write Job to PLC</h5></div>
                    <div class="card-body">
                        <form id="write-job-form">
                            <div class="mb-3">
                                <label for="plc-name-job" class="form-label">Target PLC</label>
                                <select id="plc-name-job" class="form-select">
                                    {% for plc in plc_configs %}
                                    <option value="{{ plc.name }}">{{ plc.name }} ({{ plc.ip }})</option>
                                    {% endfor %}
                                </select>
                            </div>
                            <div class="mb-3"><label for="mo-number" class="form-label">MO Number</label><input type="text" id="mo-number" class="form-control" value="MO-12345"></div>
                            <div class="mb-3"><label for="item-name" class="form-label">Item Name</label><input type="text" id="item-name" class="form-control" value="ITEM-ABC"></div>
                            <div class="mb-3"><label for="quantity" class="form-label">Target Quantity</label><input type="number" id="quantity" class="form-control" value="1000"></div>
                            <button type="submit" class="btn btn-primary w-100">Send Job</button>
                        </form>
                    </div>
                </div>
            </div>

            <!-- 2. Force Status Form -->
            <div class="col-md-6">
                <div class="card border-warning mb-4">
                    <div class="card-header"><h5>2. Force Machine Status</h5></div>
                    <div class="card-body">
                        <form id="force-status-form">
                            <div class="mb-3">
                                <label for="plc-name-status" class="form-label">Target PLC</label>
                                <select id="plc-name-status" class="form-select">
                                    {% for plc in plc_configs %}
                                    <option value="{{ plc.name }}">{{ plc.name }} ({{ plc.ip }})</option>
                                    {% endfor %}
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Status</label>
                                <select id="status" class="form-select">
                                    <option value="0">0: Stop</option>
                                    <option value="1" selected>1: Running</option>
                                    <option value="2">2: Alarm</option>
                                </select>
                            </div>
                            <button type="submit" class="btn btn-warning w-100">Force Status</button>
                        </form>
                    </div>
                </div>
            </div>

            <!-- 3. Read Job Form -->
            <div class="col-md-12">
                <div class="card border-success mb-4">
                    <div class="card-header"><h5>3. Read Job from PLC</h5></div>
                    <div class="card-body">
                        <form id="read-job-form">
                            <div class="row align-items-end">
                                <div class="col-md-4">
                                    <label for="plc-name-read" class="form-label">Target PLC</label>
                                    <select id="plc-name-read" class="form-select">
                                        {% for plc in plc_configs %}
                                        <option value="{{ plc.name }}">{{ plc.name }} ({{ plc.ip }})</option>
                                        {% endfor %}
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <button type="submit" class="btn btn-success w-100">Read Job Data</button>
                                </div>
                                <div id="read-results" class="col-md-4 font-monospace"></div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <!-- Debug Console -->
        <div class="card border-info">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5>Debug Console</h5>
                <button class="btn btn-sm btn-outline-danger" onclick="clearLog()">Clear Log</button>
            </div>
            <div class="card-body">
                <div id="log-console" class="log-console"></div>
            </div>
        </div>
    </div>

    <script>
        const logConsole = document.getElementById('log-console');

        async function updateLog() {
            const response = await fetch('/api/log');
            const data = await response.json();
            logConsole.textContent = data.log.join('\\n');
        }

        async function clearLog() {
            await fetch('/api/clear-log', { method: 'POST' });
            updateLog();
        }

        document.getElementById('write-job-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = {
                plc_name: document.getElementById('plc-name-job').value,
                mo_number: document.getElementById('mo-number').value,
                item_name: document.getElementById('item-name').value,
                quantity: parseInt(document.getElementById('quantity').value, 10)
            };
            await fetch('/send-job', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
        });

        document.getElementById('force-status-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = {
                plc_name: document.getElementById('plc-name-status').value,
                status: parseInt(document.getElementById('status').value, 10)
            };
            await fetch('/force-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
        });

        document.getElementById('read-job-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const plcName = document.getElementById('plc-name-read').value;
            const resultsDiv = document.getElementById('read-results');
            resultsDiv.innerHTML = '<span class="text-muted">Reading...</span>';

            const response = await fetch('/read-job', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plc_name: plcName })
            });
            const result = await response.json();
            if (result.status === 'success') {
                resultsDiv.innerHTML = `<strong>MO:</strong> ${result.data.mo_number}<br><strong>Item:</strong> ${result.data.item_name}<br><strong>Qty:</strong> ${result.data.quantity}`;
            } else {
                resultsDiv.innerHTML = `<span class="text-danger">Error: ${result.message}</span>`;
            }
        });


        setInterval(updateLog, 1000);
        window.onload = updateLog;
    </script>
</body>
</html>
"""

# ==============================================================================
# 4. API Endpoints สำหรับ UI
# ==============================================================================

@app.route('/')
def index():
    return render_template_string(HTML_TEMPLATE, plc_configs=PLC_CONFIGS)

@app.route('/api/log', methods=['GET'])
def get_log():
    return jsonify({"log": debug_log})

@app.route('/api/clear-log', methods=['POST'])
def clear_log_endpoint():
    debug_log.clear()
    log_message("Log cleared.")
    return jsonify({"status": "success"})

@app.route('/send-job', methods=['POST'])
def send_job_endpoint():
    data = request.get_json()
    plc_name = data.get('plc_name')
    mo_number = data.get('mo_number', '')
    item_name = data.get('item_name', '')
    quantity = data.get('quantity', 0)

    plc_config = next((p for p in PLC_CONFIGS if p['name'] == plc_name), None)
    if not plc_config:
        log_message(f"ERROR: PLC '{plc_name}' not found in config.")
        return jsonify({'status': 'error', 'message': 'PLC not found'}), 404

    log_message("="*50)
    log_message(f"Starting 'Write Job' sequence for {plc_name} at {plc_config['ip']}")
    log_message(f"  - MO: {mo_number}, Item: {item_name}, Qty: {quantity}")

    try:
        log_message("Step 1: Preparing data...")
        mo_regs = string_to_registers(mo_number, 20)
        item_regs = string_to_registers(item_name, 20)
        qty_regs = dint_to_registers(quantity)
        log_message(f"  - MO Registers: {mo_regs}")
        log_message(f"  - Item Registers: {item_regs}")
        log_message(f"  - Qty Registers: {qty_regs}")

        log_message(f"Step 2: Connecting to PLC at {plc_config['ip']}:{plc_config['port']}...")
        with ModbusTcpClient(plc_config['ip'], port=plc_config['port'], timeout=3) as client:
            if not client.connect():
                raise ConnectionException("Failed to connect to PLC")
            log_message("  - Connection successful.")

            log_message("Step 3: Writing data to Holding Registers...")
            client.write_registers(ADDR_MO_NUMBER + HOLDING_REG_START_ADDR, mo_regs, device_id=1)
            log_message(f"  - Wrote MO to D{ADDR_MO_NUMBER} (Addr: {ADDR_MO_NUMBER + HOLDING_REG_START_ADDR})")
            client.write_registers(ADDR_ITEM_NAME + HOLDING_REG_START_ADDR, item_regs, device_id=1)
            log_message(f"  - Wrote Item to D{ADDR_ITEM_NAME} (Addr: {ADDR_ITEM_NAME + HOLDING_REG_START_ADDR})")
            client.write_registers(ADDR_TARGET_QTY + HOLDING_REG_START_ADDR, qty_regs, device_id=1)
            log_message(f"  - Wrote Qty to D{ADDR_TARGET_QTY} (Addr: {ADDR_TARGET_QTY + HOLDING_REG_START_ADDR})")

            # --- เพิ่มขั้นตอนการตรวจสอบข้อมูล ---
            log_message("Step 3.5: Verifying written data...")
            read_mo_regs = client.read_holding_registers(ADDR_MO_NUMBER + HOLDING_REG_START_ADDR, count=len(mo_regs), device_id=1).registers
            if read_mo_regs != mo_regs:
                raise ValueError(f"MO verification failed! Expected {mo_regs}, got {read_mo_regs}")
            log_message("  - MO data verified.")

            read_item_regs = client.read_holding_registers(ADDR_ITEM_NAME + HOLDING_REG_START_ADDR, count=len(item_regs), device_id=1).registers
            if read_item_regs != item_regs:
                raise ValueError(f"Item verification failed! Expected {item_regs}, got {read_item_regs}")
            log_message("  - Item data verified.")

            read_qty_regs = client.read_holding_registers(ADDR_TARGET_QTY + HOLDING_REG_START_ADDR, count=len(qty_regs), device_id=1).registers
            if read_qty_regs != list(qty_regs):
                raise ValueError(f"Quantity verification failed! Expected {qty_regs}, got {read_qty_regs}")
            log_message("  - Quantity data verified.")

            log_message(f"Step 4: Starting Handshake. Setting M{COIL_APP_NEW_DATA} (Addr: {COIL_APP_NEW_DATA + COIL_M_START_ADDR}) to ON.")
            client.write_coil(COIL_APP_NEW_DATA + COIL_M_START_ADDR, True, device_id=1)

        log_message(f"Step 5: Waiting for PLC acknowledgment on M{COIL_PLC_ACK}...")
        ack_received = False
        for i in range(10): # รอสูงสุด 10 วินาที
            time.sleep(1)
            with ModbusTcpClient(plc_config['ip'], port=plc_config['port'], timeout=2) as client:
                if not client.connect():
                    log_message(f"  - Reconnect attempt {i+1} failed.")
                    continue
                ack_response = client.read_coils(COIL_PLC_ACK + COIL_M_START_ADDR, count=1, device_id=1)
                if not ack_response.isError() and ack_response.bits[0]:
                    ack_received = True
                    log_message("  - SUCCESS: PLC Acknowledgment received!")
                    break
                else:
                    log_message(f"  - Still waiting... (Attempt {i+1}/10)")

        log_message("Step 6: Finalizing Handshake...")
        with ModbusTcpClient(plc_config['ip'], port=plc_config['port'], timeout=3) as client:
            if not client.connect():
                raise ConnectionException("Failed to connect for final step.")
            log_message(f"  - Setting M{COIL_APP_NEW_DATA} (Addr: {COIL_APP_NEW_DATA + COIL_M_START_ADDR}) to OFF.")
            client.write_coil(COIL_APP_NEW_DATA + COIL_M_START_ADDR, False, device_id=1)

        if not ack_received:
            raise TimeoutError("PLC did not acknowledge in time.")

        log_message("✅ Sequence Completed Successfully.")
        return jsonify({'status': 'success'})

    except Exception as e:
        log_message(f"❌ ERROR: {e}")
        log_message(traceback.format_exc())
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/force-status', methods=['POST'])
def force_status_endpoint():
    data = request.get_json()
    plc_name = data.get('plc_name')
    status = data.get('status')

    plc_config = next((p for p in PLC_CONFIGS if p['name'] == plc_name), None)
    if not plc_config:
        log_message(f"ERROR: PLC '{plc_name}' not found in config.")
        return jsonify({'status': 'error', 'message': 'PLC not found'}), 404

    log_message("="*50)
    log_message(f"Starting 'Force Status' for {plc_name} at {plc_config['ip']}")
    log_message(f"  - Status to force: {status}")

    try:
        log_message(f"Step 1: Connecting to PLC at {plc_config['ip']}:{plc_config['port']}...")
        with ModbusTcpClient(plc_config['ip'], port=plc_config['port'], timeout=3) as client:
            if not client.connect():
                raise ConnectionException("Failed to connect to PLC")
            log_message("  - Connection successful.")
            
            address_to_write = ADDR_MACHINE_STATUS + HOLDING_REG_START_ADDR
            log_message(f"Step 2: Writing value {status} to D{ADDR_MACHINE_STATUS} (Addr: {address_to_write})...")
            result = client.write_register(address_to_write, status, device_id=1)
            
            if result.isError():
                raise Exception(f"Modbus Error: {result}")
            
            log_message("✅ Force Status Completed Successfully.")
            return jsonify({'status': 'success'})

    except Exception as e:
        log_message(f"❌ ERROR: {e}")
        log_message(traceback.format_exc())
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/read-job', methods=['POST'])
def read_job_endpoint():
    data = request.get_json()
    plc_name = data.get('plc_name')

    plc_config = next((p for p in PLC_CONFIGS if p['name'] == plc_name), None)
    if not plc_config:
        log_message(f"ERROR: PLC '{plc_name}' not found for reading.")
        return jsonify({'status': 'error', 'message': 'PLC not found'}), 404

    log_message("="*50)
    log_message(f"Starting 'Read Job' sequence for {plc_name} at {plc_config['ip']}")

    try:
        with ModbusTcpClient(plc_config['ip'], port=plc_config['port'], timeout=3) as client:
            if not client.connect():
                raise ConnectionException("Failed to connect to PLC")
            log_message("  - Connection successful.")

            log_message("Step 1: Reading data from Holding Registers...")
            mo_regs = client.read_holding_registers(ADDR_MO_NUMBER + HOLDING_REG_START_ADDR, count=10, device_id=1).registers
            item_regs = client.read_holding_registers(ADDR_ITEM_NAME + HOLDING_REG_START_ADDR, count=10, device_id=1).registers
            qty_regs = client.read_holding_registers(ADDR_TARGET_QTY + HOLDING_REG_START_ADDR, count=2, device_id=1).registers

            log_message("Step 2: Decoding data...")
            mo_number = decode_registers_to_string(mo_regs)
            item_name = decode_registers_to_string(item_regs)
            quantity = registers_to_dint(qty_regs)

            log_message(f"  - Decoded MO: {mo_number}")
            log_message(f"  - Decoded Item: {item_name}")
            log_message(f"  - Decoded Qty: {quantity}")
            log_message("✅ Read Sequence Completed Successfully.")

            return jsonify({'status': 'success', 'data': {'mo_number': mo_number, 'item_name': item_name, 'quantity': quantity}})

    except Exception as e:
        log_message(f"❌ ERROR during read: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

# ==============================================================================
# 5. Main Execution
# ==============================================================================

if __name__ == '__main__':
    port = 5001 # ใช้พอร์ตอื่นที่ไม่ใช่ 5000 เพื่อไม่ให้ชนกับ app.py
    print("="*50)
    print("🚀 Starting PLC Communication Tester...")
    print(f"   Access the UI at: http://127.0.0.1:{port}")
    print("="*50)
    app.run(host='0.0.0.0', port=port, debug=False)
