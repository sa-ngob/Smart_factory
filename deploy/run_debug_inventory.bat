@echo off
echo Debugging Inventory SQL...
docker cp debug_inventory.js smart_factory_web:/home/node/app/
docker exec -i smart_factory_web node debug_inventory.js
pause
