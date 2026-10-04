@echo off
chcp 65001 >nul
title Chep loi audio Listening
cd /d "%~dp0"
set PYTHONUTF8=1

where python >nul 2>nul
if errorlevel 1 (
  echo  [LOI] May chua co Python. Cai tu https://www.python.org/downloads/ ^(tick "Add python.exe to PATH"^), roi chay lai file nay.
  pause & exit /b 1
)

echo.
set HASGIT=0
where git >nul 2>nul && if exist ".git" set HASGIT=1
echo  [1/4] Lay ban code moi nhat...
if "%HASGIT%"=="1" (git pull origin firebase-app) else (echo        Khong co Git - dung cac file dang co trong thu muc.)

echo.
echo  [2/4] Cai faster-whisper (lan dau hoi lau, cac lan sau bo qua)...
python -m pip install -q faster-whisper

echo.
echo  [3/4] Chep loi audio. Lan dau tai model ~500MB. Moi bai mat vai phut.
echo        Co the tat giua chung, chay lai se lam tiep phan con thieu.
echo.
python tools\transcribe_listening.py %*
if errorlevel 1 (
  echo.
  echo  [LOI] Chep loi bi dung. Chup man hinh cua so nay gui cho Claude.
  pause & exit /b 1
)

echo.
if "%HASGIT%"=="0" goto nogit
echo  [4/4] Day transcript len GitHub...
git add tools\transcripts
git commit -m "Transcript audio Listening"
git push origin firebase-app
goto done

:nogit
echo  [4/4] Thu muc nay khong co Git nen khong tu day len duoc.
echo        Transcript nam o: %~dp0tools\transcripts
echo        Tai cac file .txt trong do len GitHub: nhanh firebase-app, thu muc tools/transcripts
echo        (github.com/cr7ielts/thithuielts/upload/firebase-app/tools/transcripts)
explorer "%~dp0tools\transcripts"
echo.
pause
exit /b 0

:done

echo.
echo  [XONG] Bao Claude: "transcript da len, viet giai thich Listening".
echo.
pause
