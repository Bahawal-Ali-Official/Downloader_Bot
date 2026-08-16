@echo off
echo ===================================================
echo Uploading latest code to Oracle VM...
echo ===================================================
scp -i "C:\Users\cheater\Desktop\Oracle VM\ssh-key-2026-08-07.key" "C:\Users\cheater\Desktop/cookies.txt*" ubuntu@51.170.90.0:/home/ubuntu/Desktop/Downloader_Bot/

echo.
echo ===================================================
echo Upload Complete! You can now use connect.bat
echo ===================================================
pause
