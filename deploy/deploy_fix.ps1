Rename-Item app.py app.py.bak -Force
Copy-Item app_fixed.py -Destination app.py -Force
Write-Host "File updated. internal server service might need restart."
