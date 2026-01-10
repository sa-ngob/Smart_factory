@echo off
echo Debugging Sales SQL...
docker cp debug_sales.js smart_factory_web:/home/node/app/
docker exec -i smart_factory_web node debug_sales.js
pause
