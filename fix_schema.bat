@echo off
echo ==========================================
echo      Fixing Database Schema (Date -> Timestamp)
echo ==========================================
echo.

echo Updating 'production_records' table...
docker exec -i smart_factory_postgres psql -U postgres -d smart_factory -c "ALTER TABLE production_records ALTER COLUMN record_date TYPE TIMESTAMP;"

echo Updating 'manufacturing_orders' table...
docker exec -i smart_factory_postgres psql -U postgres -d smart_factory -c "ALTER TABLE manufacturing_orders ALTER COLUMN actual_start_time TYPE TIMESTAMP;"
docker exec -i smart_factory_postgres psql -U postgres -d smart_factory -c "ALTER TABLE manufacturing_orders ALTER COLUMN actual_end_time TYPE TIMESTAMP;"

echo.
echo ==========================================
echo      SCHEMA FIXED
echo ==========================================
echo Please try recording a NEW production result to verify the time.
pause
