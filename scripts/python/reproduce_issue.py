import requests
import json
import time

BASE_URL = 'http://localhost:3000'
LOGIN_URL = f'{BASE_URL}/auth/login'
USERS_URL = f'{BASE_URL}/api/users'

def reproduce():
    session = requests.Session()
    
    # 1. Login
    print("Logging in...")
    login_payload = {
        'email': 'admin@local',
        'password': 'admin'
    }
    try:
        res = session.post(LOGIN_URL, json=login_payload)
    except requests.exceptions.ConnectionError:
        print("Could not connect to server. Is it running?")
        return

    if res.status_code != 200:
        # Maybe already logged in or seeded differently? Try a different credential if needed.
        # But for now, assume admin/admin works as per seed.
        print(f"Login failed: {res.status_code} {res.text}")
        # Try 'Administrator' ? No the seed uses 'admin@local' / 'admin'
        return
    print("Login successful.")

    # 2. Get Users
    print("Fetching users...")
    res = session.get(USERS_URL)
    if res.status_code != 200:
        print(f"Failed to fetch users: {res.status_code} {res.text}")
        return
    
    users = res.json().get('data', [])
    if not users:
        print("No users found.")
        return

    target_user = users[0]
    user_id = target_user['id']
    original_name = target_user.get('fullname') or target_user.get('fullName')
    print(f"Targeting user ID: {user_id}, Current Name: {original_name}")

    if original_name == 'Administrator':
        # Don't rename admin if possible, or rename back. 
        new_name = 'Administrator Updated'
    else:
        new_name = f"Updated User {int(time.time())}"

    # 3. Attempt Update
    update_payload = {
        'fullName': new_name,
        'email': target_user['email'],
        'role': target_user['role']
    }
    
    print(f"Sending PUT to {USERS_URL}/{user_id} with data: {update_payload}")
    res = session.put(f"{USERS_URL}/{user_id}", json=update_payload)
    
    print(f"Update Response: {res.status_code} {res.text}")

    # 4. Verify
    print("Fetching user again to verify...")
    res = session.get(f"{USERS_URL}/{user_id}")
    if res.status_code == 200:
        updated_user = res.json().get('data')
        current_name_db = updated_user.get('fullname') or updated_user.get('fullName')
        print(f"Name in DB: {current_name_db}")
        if current_name_db == new_name:
            print("SUCCESS: User was updated.")
        else:
            print("FAILURE: User was NOT updated.")
    else:
        print("Failed to fetch user for verification.")

if __name__ == '__main__':
    reproduce()
