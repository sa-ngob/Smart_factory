#!/usr/bin/env python
"""Debug script for PLC connectivity and data reading"""

import sys
import json
import time
from pymodbus.client import ModbusTcpClient
from pymodbus.exceptions import ConnectionException

# PLC Configuration
PLC_CONFIGS = [
    {'ip': '192.168.2.101', 'port': 2022, 'name': 'PLC_Machine_1'},
]

# Modbus Address Configuration
COIL_X_START_ADDR = 0
COIL_X_COUNT = 18
COIL_Y_START_ADDR = 10000
COIL_Y_COUNT = 18
COIL_M_START_ADDR = 30000
COIL_M_COUNT = 21
HOLDING_REG_START_ADDR = 41000
HOLDING_REG_COUNT = 65

def test_plc_connection(plc_config):
    """Test connection to a single PLC"""
    print(f"\n{'='*60}")
    print(f"Testing PLC: {plc_config['name']}")
    print(f"IP: {plc_config['ip']}, Port: {plc_config['port']}")
    print(f"{'='*60}")

    try:
        client = ModbusTcpClient(plc_config['ip'], port=plc_config['port'], timeout=5)
        print("[1] Attempting connection...")

        if not client.connect():
            print("    ERROR: Failed to connect!")
            return False

        print("    OK: Connected successfully")

        # Test reading coils
        print("\n[2] Testing Coil X reading (addr 0-17)...")
        coils_x = client.read_coils(COIL_X_START_ADDR, count=COIL_X_COUNT)
        if coils_x.isError():
            print(f"    ERROR: {coils_x}")
        else:
            print(f"    OK: Read {len(coils_x.bits)} bits")
            print(f"    Values: {coils_x.bits}")

        # Test reading holding registers
        print("\n[3] Testing Holding Register reading (addr 41000-41064)...")
        response = client.read_holding_registers(HOLDING_REG_START_ADDR, count=HOLDING_REG_COUNT)
        if response.isError():
            print(f"    ERROR: {response}")
        else:
            print(f"    OK: Read {len(response.registers)} registers")
            print(f"    First 10 values: {response.registers[:10]}")

        # Test writing (optional)
        print("\n[4] Testing single coil write...")
        write_result = client.write_coil(10000, True)
        if write_result.isError():
            print(f"    ERROR: {write_result}")
        else:
            print("    OK: Write successful")

        client.close()
        return True

    except Exception as e:
        print(f"    EXCEPTION: {type(e).__name__}: {e}")
        return False

def check_plc_availability():
    """Check which PLCs are available"""
    print("\n" + "="*60)
    print("PLC AVAILABILITY CHECK")
    print("="*60)

    available_plcs = []
    for plc_config in PLC_CONFIGS:
        if test_plc_connection(plc_config):
            available_plcs.append(plc_config['name'])

    print(f"\n\nSummary:")
    print(f"  Total PLCs configured: {len(PLC_CONFIGS)}")
    print(f"  Available PLCs: {len(available_plcs)}")
    if available_plcs:
        for name in available_plcs:
            print(f"    - {name}")
    else:
        print("    NONE - Check IP addresses and network connectivity!")

    return len(available_plcs) > 0

def check_api_data():
    """Check what data the API is returning"""
    print("\n" + "="*60)
    print("FLASK API DATA CHECK")
    print("="*60)

    try:
        import urllib.request
        import json

        response = urllib.request.urlopen('http://localhost:5000/api/data', timeout=5)
        data = json.loads(response.read().decode())

        print("\nCurrent API Response:")
        print(json.dumps(data, indent=2))

        # Check for errors
        for plc_name, plc_data in data.items():
            if 'error' in plc_data:
                print(f"\n[ERROR] {plc_name}: {plc_data['error']}")
            elif plc_data.get('is_connected'):
                print(f"\n[OK] {plc_name} is connected")
                if 'decoded_tags' in plc_data:
                    print(f"     Decoded tags: {plc_data['decoded_tags']}")
                if 'raw_holdings' in plc_data:
                    print(f"     Holding registers: {plc_data['raw_holdings'][:10]}...")

    except Exception as e:
        print(f"ERROR: Could not connect to Flask API: {e}")
        print("Make sure Flask app is running on localhost:5000")

def check_tag_mappings():
    """Check configured tag mappings"""
    print("\n" + "="*60)
    print("TAG MAPPINGS CHECK")
    print("="*60)

    try:
        import urllib.request
        import json

        response = urllib.request.urlopen('http://localhost:5000/api/mappings', timeout=5)
        mappings = json.loads(response.read().decode())

        print(f"\nTotal mappings: {len(mappings)}")
        for mapping in mappings[:10]:  # Show first 10
            print(f"\n  Tag: {mapping.get('tag_name')}")
            print(f"    PLC: {mapping.get('plc_name')}")
            print(f"    Type: {mapping.get('data_type')}")
            print(f"    Address: {mapping.get('address')}")
            if mapping.get('length'):
                print(f"    Length: {mapping.get('length')}")

        if len(mappings) > 10:
            print(f"\n  ... and {len(mappings) - 10} more mappings")

    except Exception as e:
        print(f"ERROR: Could not fetch mappings: {e}")

if __name__ == '__main__':
    print("\n" + "*"*60)
    print("*" + " "*58 + "*")
    print("*" + " PLC DEBUG SCRIPT ".center(58) + "*")
    print("*" + " "*58 + "*")
    print("*"*60)

    # Run all checks
    plc_available = check_plc_availability()
    check_api_data()
    check_tag_mappings()

    print("\n" + "="*60)
    print("RECOMMENDATIONS:")
    print("="*60)
    if not plc_available:
        print("\n1. Check PLC network connectivity:")
        print("   - Verify PLC IP address: 192.168.2.101")
        print("   - Check if PLC is powered on")
        print("   - Verify network cable connections")
        print("   - Try: ping 192.168.2.101")
        print("\n2. Check PLC Modbus configuration:")
        print("   - Verify Modbus TCP port: 2022")
        print("   - Check if Modbus TCP is enabled on PLC")
        print("\n3. Check firewall settings:")
        print("   - Allow TCP connections on port 2022")
    else:
        print("\n- PLC is connected successfully")
        print("- Check tag mappings and data types")
        print("- Verify addresses match PLC configuration")

    print("\n" + "*"*60 + "\n")
