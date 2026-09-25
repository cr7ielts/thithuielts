@echo off
chcp 65001 >nul
title Cap nhat web IELTS Mock
cd /d "%~dp0"
set FIREBASE=%APPDATA%\npm\firebase.cmd
echo.
echo  Dang dua ban moi nhat len https://xamenglish-d8ebd.web.app ...
echo.
call "%FIREBASE%" deploy --only hosting,firestore,storage
if not errorlevel 1 goto ok

echo.
echo  [!] Lan 1 khong xong (thuong do mang chap chon). Thu lai sau 8 giay...
timeout /t 8 /nobreak >nul
echo.
call "%FIREBASE%" deploy --only hosting,firestore,storage
if not errorlevel 1 goto ok

echo.
echo  [LOI] Cap nhat that bai sau 2 lan thu.
echo        - Kiem tra mang, tat VPN neu co, roi chay lai file nay.
echo        - Van loi thi chup man hinh cua so nay gui cho Claude.
echo.
pause
exit /b 1

:ok
echo.
echo  [XONG] Web da duoc cap nhat. Hoc sinh tai lai trang la thay ban moi.
echo.
pause
