import sqlite3
import subprocess
import time
import sys
from datetime import datetime

# --- Settings ---
DB_FILE = 'smart_factory.db'
POLLER_SCRIPT_PATH = 'main_collector.py'
LOOP_INTERVAL_SECONDS = 15

def get_active_jobs(cursor):
    print("DEBUG: Querying for active jobs...")
    query = """
        SELECT
            mo.mo_number,
            m.machine_code,
            mo.actual_start_time
        FROM manufacturing_orders mo
        JOIN machines m ON mo.machine_id = m.id
        WHERE mo.status = 'in_progress' AND mo.machine_id IS NOT NULL;
    """
    cursor.execute(query)
    jobs = cursor.fetchall()
    print(f"DEBUG: Found jobs -> {jobs}")
    return jobs

def main():
    print("🧠 Starting IoT Controller Script in DEBUG MODE...")
    running_pollers = {}

    try:
        while True:
            print("\n-------------------------------------------")
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Controller loop starting...")
            
            conn = sqlite3.connect(DB_FILE, timeout=10)
            cursor = conn.cursor()

            active_jobs_from_db = get_active_jobs(cursor)
            
            should_be_running = {job[1]: job[0] for job in active_jobs_from_db}
            print(f"DEBUG: Dictionary of jobs that should be running -> {should_be_running}")

            for machine_code, mo_number in should_be_running.items():
                # --- Type and Value Check ---
                print(f"DEBUG: Checking machine_code: '{machine_code}' (type: {type(machine_code)})")
                
                if machine_code not in running_pollers:
                    print(f"🚀 Attempting to start poller for Machine [{machine_code}]...")
                    
                    command = [
                        sys.executable, 
                        POLLER_SCRIPT_PATH,
                        '--machine', str(machine_code), # Forcefully cast to string
                        '--mo', str(mo_number)      # Forcefully cast to string
                    ]
                    
                    print(f"DEBUG: Executing command -> {command}")
                    
                    try:
                        process = subprocess.Popen(
                            command, 
                            stdout=sys.stdout,
                            stderr=sys.stdout,
                            text=True,
                            bufsize=1,
                            universal_newlines=True
                        )
                        running_pollers[machine_code] = {'process': process, 'mo_number': mo_number}
                        print(f"SUCCESS: Poller for [{machine_code}] started.")
                    except Exception as e:
                        print(f"FATAL DEBUG ERROR during Popen: {e}")

            # (The rest of the script for stopping pollers remains the same)
            currently_running_ids = list(running_pollers.keys())
            for machine_code in currently_running_ids:
                if machine_code not in should_be_running:
                    print(f"🛑 Stopping poller for Machine [{machine_code}]...")
                    process_info = running_pollers.pop(machine_code)
                    process_info['process'].terminate()
                    
            conn.close()
            print(f"Currently running pollers: {list(running_pollers.keys())}")
            print(f"Controller will sleep for {LOOP_INTERVAL_SECONDS} seconds...")
            time.sleep(LOOP_INTERVAL_SECONDS)

    except Exception as e:
        print(f"❌ An unexpected error occurred in the controller: {e}")
        # Add cleanup for any running pollers on error
        for machine_id, process_info in running_pollers.items():
            process_info['process'].terminate()
            print(f"Cleaned up poller for {machine_id}")

if __name__ == '__main__':
    main()