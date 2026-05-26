@echo off
echo ==========================================
echo      Smart Factory Repair System
echo ==========================================
echo.

echo [1/4] Configuring Database Timezone (Asia/Bangkok)...
docker exec -i smart_factory_postgres psql -U postgres -d smart_factory -c "ALTER DATABASE smart_factory SET timezone TO 'Asia/Bangkok';"

echo [2/4] Copying fix script to container...
docker cp reseed_downtime.js smart_factory_web:/home/node/app/

echo [3/4] Executing Data Fix (Reseeding Logs)...
docker exec -i smart_factory_web node reseed_downtime.js

echo [4/4] Restarting Web Server...
docker restart smart_factory_web

echo.
echo ==========================================
echo      REPAIR COMPLETE
echo ==========================================
echo Please refresh your browser (Ctrl+F5) to see the changes.
pause
