@echo off
chcp 65001 >nul
title Cap nhat web IELTS Mock
cd /d "%~dp0"
set FIREBASE=%APPDATA%\npm\firebase.cmd
rem Tai khoan Google so huu Firebase project xamenglish-d8ebd (may co the dang nhap nhieu tai khoan cung luc)
set ACCOUNT=nguyennhatkha812@gmail.com

rem ---- Lay ban moi nhat tu GitHub (dung nhanh dang mo) truoc khi deploy ----
where git >nul 2>nul
if errorlevel 1 goto nogit
if not exist ".git" goto nogit
echo.
echo  Dang lay ban moi nhat tu GitHub...
for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set BRANCH=%%b
echo  Nhanh: %BRANCH%
rem Tat tu don .git (Windows hay khoa thu muc -> hoi "Deletion of directory ... failed")
git config gc.auto 0
set GIT_ASK_YESNO=false
git -c gc.auto=0 pull --ff-only origin %BRANCH%
if errorlevel 1 goto pullfail
goto deploy

:nogit
echo.
echo  [!] Khong tim thay Git hoac thu muc nay khong phai ban tai tu GitHub
echo      - se dua len web dung cac file dang co trong thu muc nay.
goto deploy

:pullfail
echo.
echo  [LOI] Khong lay duoc ban moi tu GitHub (xem dong bao loi o tren).
echo        Chua dua gi len web. Chup man hinh cua so nay gui cho Claude.
echo.
pause
exit /b 1

:deploy
call "%FIREBASE%" login:list 2>nul | findstr /i /c:"%ACCOUNT%" >nul
if not errorlevel 1 goto deploy2
echo.
echo  Chua dang nhap tai khoan %ACCOUNT% tren may nay.
echo  Trinh duyet se mo: chon dung tai khoan %ACCOUNT%. Tai khoan cu van giu nguyen.
call "%FIREBASE%" login:add %ACCOUNT%

:deploy2
echo.
echo  Dang dua ban moi nhat len https://xamenglish-d8ebd.web.app ...
echo.
call "%FIREBASE%" deploy --only hosting,firestore,storage --account %ACCOUNT%
if not errorlevel 1 goto ok

echo.
echo  [!] Lan 1 khong xong (thuong do mang chap chon). Thu lai sau 8 giay...
timeout /t 8 /nobreak >nul
echo.
call "%FIREBASE%" deploy --only hosting,firestore,storage --account %ACCOUNT%
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
