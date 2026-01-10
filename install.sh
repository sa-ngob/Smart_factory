#!/bin/bash

# ===================================================================
#
#   SMART FACTORY APPLICATION - LINUX INSTALLATION SCRIPT
#   Designed for Debian/Ubuntu-based systems.
#
# ===================================================================

# Function to print styled headers
print_header() {
    echo ""
    echo "===================================================================="
    echo " $1"
    echo "===================================================================="
    echo ""
}

# --- Step 0: Check for root/sudo privileges ---
if [ "$EUID" -ne 0 ]; then
  echo "ERROR: This script must be run with sudo privileges."
  echo "Please run it as: sudo ./install.sh"
  exit 1
fi

print_header "SMART FACTORY - LINUX INSTALLATION SCRIPT"
echo "This script will install and configure the application."
read -p "Press Enter to continue..."

# --- Step 1: Update package lists ---
print_header "[1/7] Updating package lists (apt update)..."
apt-get update -y
echo "  -> Package lists updated."

# --- Step 2: Install prerequisites (curl, python, pip) ---
print_header "[2/7] Installing prerequisites (curl, python3, pip)..."
apt-get install -y curl python3 python3-pip
echo "  -> Prerequisites installed."

# --- Step 3: Install Node.js (LTS version via NodeSource) ---
print_header "[3/7] Installing Node.js (LTS)..."
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt-get install -y nodejs
echo "  -> Node.js installed successfully. Versions:"
node -v
npm -v

# --- Step 4: Install Node.js dependencies ---
print_header "[4/7] Installing Node.js application dependencies (npm install)..."
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install Node.js dependencies."
    exit 1
fi
echo "  -> Node.js dependencies installed successfully."

# --- Step 5: Install Python dependencies ---
print_header "[5/7] Installing Python dependencies (pip install)..."
pip3 install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install Python dependencies."
    exit 1
fi
echo "  -> Python dependencies installed successfully."

# --- Step 6: Install and start applications with PM2 ---
print_header "[6/7] Installing PM2 and starting applications..."
npm install pm2 -g
pm2 start ecosystem.config.js --env production
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to start applications with PM2."
    exit 1
fi
echo "  -> Applications started. Use 'pm2 list' to check status."

# --- Step 7: Configure PM2 to start on boot ---
print_header "[7/7] Configuring PM2 to start automatically on system startup..."
pm2 startup | tail -n 1 | bash -
pm2 save
echo "  -> PM2 startup configured."

print_header "INSTALLATION COMPLETE!"
echo "The application is now running in the background."
echo "You can access it at: http://<your-server-ip>:3000"
echo ""
echo "Useful commands:"
echo "  - pm2 list         (Check application status)"
echo "  - pm2 logs         (View live logs for all apps)"
echo "  - pm2 restart all  (Restart applications)"
echo "  - pm2 stop all     (Stop applications)"
echo ""
echo "===================================================================="

```

#### 2. วิธีการนำไปใช้งานบนเครื่อง Linux (เช่น Ubuntu Server)

1.  **คัดลอกโปรเจกต์:** คัดลอกโฟลเดอร์โปรเจกต์ทั้งหมด (ที่มีไฟล์ `install.sh` ที่เพิ่งสร้าง) ไปยังเครื่อง Server ปลายทาง

2.  **กำหนดสิทธิ์ให้สคริปต์:** เปิด Terminal บนเครื่อง Server แล้วใช้คำสั่ง `cd` เพื่อเข้าไปยังโฟลเดอร์โปรเจกต์ จากนั้นรันคำสั่งนี้เพื่อให้สิทธิ์ในการรันไฟล์สคริปต์:
   ```bash
   chmod +x install.sh
   ```

3.  **รันสคริปต์ติดตั้ง:** รันสคริปต์ด้วยสิทธิ์ `sudo` ดังนี้:
   ```bash
   sudo ./install.sh
   ```

หลังจากรันคำสั่งนี้ สคริปต์จะเริ่มทำงาน, ถามเพื่อยืนยัน, และจากนั้นจะทำการติดตั้งทุกอย่างที่จำเป็นให้โดยอัตโนมัติ เมื่อเสร็จสิ้น ระบบ Smart Factory ของคุณก็จะพร้อมใช้งานบนเครื่อง Linux Server ทันทีครับ
