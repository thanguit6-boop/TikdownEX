@echo off
setlocal
cd /d "%~dp0"
if exist "%~dp0tik_native_host.exe" goto run_uninstall
echo Khong thay tik_native_host.exe trong thu muc nay.
echo Neu truoc do cai bang ban Python thi chay uninstall_native_host.bat.
goto done
:run_uninstall
"%~dp0tik_native_host.exe" --uninstall
:done
echo.
pause
