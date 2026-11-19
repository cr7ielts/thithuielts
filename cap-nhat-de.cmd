@echo off
chcp 65001 >nul
title Cap nhat de moi len web IELTS
cd /d "%~dp0"
rem ======================================================================
rem  CAP NHAT DE MOI: bo de vao thu muc DE MOI roi bam dup file nay.
rem    C:\Users\Admin\OneDrive\2. IELTS\DE MOI\READING\<ten de>\     de + dap an
rem    C:\Users\Admin\OneDrive\2. IELTS\DE MOI\LISTENING\<ten de>\   de + dap an + 4 file audio (Part 1..4)
rem  Ten thu muc kieu "Vol 10 Test 1" -> hien la "Actual Test Vol 10 - Test 1".
rem  Nhap xong: thu muc de chuyen sang DE MOI\_DA NHAP\<ngay>; bai loi giu lai, xem bao cao.
rem ======================================================================
set PYTHONUTF8=1
set PATH=%PATH%;%ProgramFiles%\Git\mingw64\bin;%ProgramFiles%\Git\usr\bin
set INBOX=C:\Users\Admin\OneDrive\2. IELTS\DE MOI
set LOG=%~dp0cap-nhat-de.log

where python >nul 2>nul
if errorlevel 1 (
  echo  [LOI] May chua co Python. Cai tu https://www.python.org/downloads/ ^(tick "Add python.exe to PATH"^).
  pause & exit /b 1
)
where pdftotext >nul 2>nul
if errorlevel 1 echo  [!] Khong thay pdftotext ^(di kem Git for Windows^) - de dang .pdf se khong doc duoc, de .docx van duoc.

echo.
echo  [1/5] Lay ban moi nhat tu GitHub...
for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set BRANCH=%%b
git pull --ff-only origin %BRANCH%
if errorlevel 1 (
  echo  [LOI] Khong lay duoc ban moi tu GitHub. Chup man hinh gui Claude.
  pause & exit /b 1
)

echo.
echo  [2/5] Doc de moi trong "%INBOX%"...
echo ===== %date% %time% ===== >> "%LOG%"
python tools\import_new.py --save --inbox "%INBOX%" > "%TEMP%\cap-nhat-de.txt" 2>&1
set RC=%errorlevel%
type "%TEMP%\cap-nhat-de.txt"
type "%TEMP%\cap-nhat-de.txt" >> "%LOG%"
if not "%RC%"=="0" (
  echo.
  echo  [LOI] Script nhap de bi dung. Gui file cap-nhat-de.log cho Claude.
  pause & exit /b 1
)

git status --porcelain js/data | findstr /r "." >nul
if errorlevel 1 (
  echo.
  echo  Khong co bai moi nao duoc nhap - khong can cap nhat web.
  echo  ^(Bai bao LOI o tren: sua theo goi y hoac gui cap-nhat-de.log cho Claude.^)
  echo.
  pause & exit /b 0
)

echo.
echo  [3/5] Dung ban lam tren may + cap nhat danh sach...
python tools\gen_interactive.py
python tools\gen_explain.py

echo.
echo  [4/5] Day len GitHub...
git add js/data tools/interactive tools/txt
git commit -m "Nhap de moi bang cap-nhat-de.cmd"
git push origin %BRANCH%
if errorlevel 1 echo  [!] Chua day len GitHub duoc - web van duoc cap nhat, lan sau chay lai se day tiep.

echo.
echo  [5/5] Dua len web...
call "%~dp0deploy.cmd"
