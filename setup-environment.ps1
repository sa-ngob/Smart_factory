# ===================================================================
#
#   SMART FACTORY - MASTER INSTALLATION SCRIPT (PowerShell)
#
#   This script automates the installation of prerequisites
#   (Node.js, Python) and then runs the application installer.
#
# ===================================================================

# Step 1: Check for Administrator privileges
Write-Host "Step 1: Checking for Administrator privileges..." -ForegroundColor Yellow
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: This script must be run as Administrator." -ForegroundColor Red
    Write-Host "Please right-click the PowerShell window and select 'Run as Administrator'."
    Read-Host "Press Enter to exit..."
    exit 1
}
Write-Host "  -> Success: Running with Administrator privileges."

# Step 2: Install Chocolatey (Windows Package Manager)
Write-Host "`nStep 2: Checking and installing Chocolatey package manager..." -ForegroundColor Yellow
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "  -> Chocolatey not found. Installing..."
    Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
} else {
    Write-Host "  -> Chocolatey is already installed."
}

# Step 3: Install Node.js LTS
Write-Host "`nStep 3: Installing Node.js (LTS)..." -ForegroundColor Yellow
choco install nodejs-lts -y
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install Node.js." -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    exit 1
}
Write-Host "  -> Node.js installed successfully."

# Step 4: Install Python
Write-Host "`nStep 4: Installing Python (includes adding to PATH)..." -ForegroundColor Yellow
choco install python -y
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install Python." -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    exit 1
}
Write-Host "  -> Python installed successfully."

# Step 5: Navigate to the script's directory and run the application installer
Write-Host "`nStep 5: Running the application installation script (install.bat)..." -ForegroundColor Yellow
$PSScriptRoot = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
Set-Location -Path $PSScriptRoot

# Execute the batch file
cmd /c ".\install.bat"

Write-Host "`n===================================================================" -ForegroundColor Green
Write-Host "  MASTER INSTALLATION SCRIPT COMPLETED!" -ForegroundColor Green
Write-Host "==================================================================="
Read-Host "Press Enter to close this window..."

