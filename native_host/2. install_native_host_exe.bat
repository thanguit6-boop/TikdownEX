@echo off
setlocal
cd /d "%~dp0"
if exist "%~dp0tik_native_host.exe" goto start_install
echo Khong thay tik_native_host.exe trong thu muc nay.
echo - Neu ban la nguoi dong goi: chay build_exe.bat truoc.
echo - Neu ban la nguoi dung: hay giai nen du ca thu muc native_host.
echo.
pause
exit /b 1
:start_install
echo ==============================================================
echo  Cai dat cau noi "Mo app sua video" cho Tik Video Toolkit
echo  Ban .exe: may nay KHONG can cai Python.
echo ==============================================================
echo.
echo Luu y: hay nap extension vao Chrome truoc, o chrome://extensions
echo.
"%~dp0tik_native_host.exe" --install
if not "%errorlevel%"=="2" goto done
echo.
echo Neu da nap extension ma van khong tim thay, hay copy dong "ID" cua
echo Tik Video Toolkit o chrome://extensions roi dan vao day.
set "EXT_ID="
set /p "EXT_ID=ID extension (de trong de thoat): "
if not defined EXT_ID goto done
"%~dp0tik_native_host.exe" --install %EXT_ID%
:done
echo.
pause
