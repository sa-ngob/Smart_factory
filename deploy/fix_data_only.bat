@echo off
echo Executing Data Fix with Local Time Strings...
docker cp reseed_downtime.js smart_factory_web:/home/node/app/
docker exec -i smart_factory_web node reseed_downtime.js
echo Done. Please refresh your browser.
pause
