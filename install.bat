@echo off
echo ====================================================================
echo.
echo           SMART FACTORY APPLICATION - INSTALLATION SCRIPT
echo.
echo ====================================================================
echo.
echo This script will install and configure the application.
echo Please ensure Node.js and Python are installed on this machine.
echo.
pause
echo.

:: Step 1: Install Node.js dependencies
echo [1/5] Installing Node.js dependencies (npm install)...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Node.js dependencies.
    pause
    exit /b
)
echo    ... Node.js dependencies installed successfully.
echo.

:: Step 2: Install Python dependencies
echo [2/5] Installing Python dependencies (pip install)...
call pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Python dependencies.
    pause
    exit /b
)
echo    ... Python dependencies installed successfully.
echo.

:: Step 3: Install PM2 globally
echo [3/5] Installing PM2 Process Manager globally...
call npm install pm2 -g
if %errorlevel% neq 0 (
    echo ERROR: Failed to install PM2.
    pause
    exit /b
)
echo    ... PM2 installed successfully.
echo.

:: Step 4: Start applications with PM2
echo [4/5] Starting Node.js and Python servers with PM2...
call pm2 start ecosystem.config.js --env production
if %errorlevel% neq 0 (
    echo ERROR: Failed to start applications with PM2.
    pause
    exit /b
)
echo    ... Applications started. Use 'pm2 list' to check status.
echo.

:: Step 5: Configure PM2 to start on boot
echo [5/5] Configuring PM2 to start automatically on system startup...
call pm2 startup
call pm2 save
echo    ... PM2 startup configured.
echo.

echo ====================================================================
echo.
echo           INSTALLATION COMPLETE!
echo.
echo The application is now running in the background.
echo You can access it at: http://localhost:3000
echo.
echo Useful commands:
echo   - pm2 list       (Check application status)
echo   - pm2 logs       (View live logs)
echo   - pm2 restart all(Restart applications)
echo   - pm2 stop all   (Stop applications)
echo.
echo ====================================================================
echo.
pause
