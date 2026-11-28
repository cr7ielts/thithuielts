@echo off
chcp 65001 >nul
title Cai lich tu cap nhat de
cd /d "%~dp0"
rem ======================================================================
rem  Bam dup mot lan: Windows se tu chay cap-nhat-de.cmd moi toi luc 21:07
rem  (may phai bat; neu luc do may tat, Windows chay bu khi mo may lai).
rem  Go lich: cai-tu-dong.cmd /go
rem ======================================================================
set TASK=IELTS - Cap nhat de moi
if /i "%~1"=="/go" (
  schtasks /delete /tn "%TASK%" /f
  echo  Da go lich tu dong.
  pause & exit /b 0
)
schtasks /create /tn "%TASK%" /sc daily /st 21:07 /tr "\"%~dp0cap-nhat-de.cmd\" /auto" /f
if errorlevel 1 (
  echo  [LOI] Khong tao duoc lich. Thu bam chuot phai file nay - Run as administrator.
  pause & exit /b 1
)
rem chay bu khi may tat dung gio hen
powershell -NoProfile -Command "$s = Get-ScheduledTask -TaskName '%TASK%'; $s.Settings.StartWhenAvailable = $true; Set-ScheduledTask -InputObject $s | Out-Null" 2>nul
echo.
echo  [XONG] Moi toi 21:07 may se tu chay cap-nhat-de.cmd.
echo         Ket qua ghi vao cap-nhat-de.log trong thu muc nay.
echo         Muon go lich: chay "cai-tu-dong.cmd /go".
echo.
pause
