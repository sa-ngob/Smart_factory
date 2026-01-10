@echo off
echo Running Check Data Script...
docker cp check_data.js smart_factory_web:/home/node/app/
docker exec -i smart_factory_web node check_data.js
pause
