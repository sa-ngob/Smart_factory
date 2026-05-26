import psycopg2
import sys

# Extended list of common passwords
passwords = ['', 'admin123', 'admin', '123456', 'postgres', 'root', '1234', 'password', 'Password123', 'Postgres123']

print("Testing PostgreSQL connection on localhost:5432...")
print("=" * 50)

for pwd in passwords:
    try:
        pwd_display = "''" if pwd == '' else f"'{pwd}'"
        print(f"Testing password: {pwd_display}...", end=" ")
        
        if pwd == '':
            conn = psycopg2.connect(
                dbname='postgres',
                user='postgres',
                host='localhost',
                port='5432'
            )
        else:
            conn = psycopg2.connect(
                dbname='postgres',
                user='postgres',
                password=pwd,
                host='localhost',
                port='5432'
            )
        
        print("✅ SUCCESS!")
        print(f"\n{'='*50}")
        print(f"FOUND WORKING PASSWORD: {pwd_display}")
        print(f"{'='*50}")
        conn.close()
        
        # Write to file for easy reference
        with open('.postgres_password.txt', 'w') as f:
            f.write(pwd)
        
        sys.exit(0)
    except Exception as e:
        print(f"❌ Failed")

print(f"\n{'='*50}")
print("ALL PASSWORDS FAILED")
print("Please check your PostgreSQL installation or provide the correct password.")
print(f"{'='*50}")
sys.exit(1)
