import psycopg2
import sys

passwords = ['admin', '123456', 'postgres', 'root', '1234']

for pwd in passwords:
    try:
        print(f"Testing password: {pwd}")
        conn = psycopg2.connect(f"dbname='smart_factory' user='postgres' password='{pwd}' host='localhost' port='5432'")
        print(f"SUCCESS: Connected with password '{pwd}'!")
        conn.close()
        sys.exit(0)
    except Exception as e:
        print(f"Failed with '{pwd}': {e}")

print("ALL FAILED")
sys.exit(1)