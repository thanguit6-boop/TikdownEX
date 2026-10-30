@echo off
setlocal
cd /d "%~dp0"
echo ==============================================================
echo  Dong goi tik_native_host.py thanh tik_native_host.exe
echo  Chi chay file nay 1 LAN tren may cua ban, KHONG phai may user.
echo ==============================================================
echo.
set "PYTHON_EXE="
set "PYTHON_ARGS="
where py >nul 2>nul
if not errorlevel 1 (
    set "PYTHON_EXE=py"
    set "PYTHON_ARGS=-3"
)
if not defined PYTHON_EXE (
    where python >nul 2>nul
    if not errorlevel 1 set "PYTHON_EXE=python"
)
if not defined PYTHON_EXE (
    for %%P in ("%LocalAppData%\Programs\Python\Python*\python.exe") do (
        if exist "%%~fP" set "PYTHON_EXE=%%~fP"
    )
)
if defined PYTHON_EXE goto have_python
echo Khong tim thay Python 3. Cai Python 3 va bat tuy chon "Add Python to PATH",
echo sau do chay lai file nay.
echo.
pause
exit /b 1
:have_python
"%PYTHON_EXE%" %PYTHON_ARGS% -m PyInstaller --version >nul 2>nul
if not errorlevel 1 goto have_pyinstaller
echo Chua co PyInstaller, dang cai bang pip. Can ket noi Internet...
"%PYTHON_EXE%" %PYTHON_ARGS% -m pip install pyinstaller
if errorlevel 1 goto fail_pip
:have_pyinstaller
if exist "%~dp0tik_native_host.exe" del /q "%~dp0tik_native_host.exe" >nul 2>nul
if exist "%~dp0tik_native_host.exe" goto fail_locked
echo.
echo Dang dong goi, co the mat khoang 1 phut...
"%PYTHON_EXE%" %PYTHON_ARGS% -m PyInstaller --noconfirm --clean --onefile --console --noupx --hidden-import winreg --hidden-import msvcrt --name tik_native_host --distpath "%~dp0." --workpath "%~dp0build_tmp\work" --specpath "%~dp0build_tmp" "%~dp0tik_native_host.py"
if errorlevel 1 goto fail_build
if exist "%~dp0build_tmp" rmdir /s /q "%~dp0build_tmp"
if not exist "%~dp0tik_native_host.exe" goto fail_build
echo.
echo ==============================================================
echo  XONG: %~dp0tik_native_host.exe
echo ==============================================================
echo.
echo Kiem tra nhanh file .exe vua tao:
"%~dp0tik_native_host.exe" --status
echo.
echo Buoc tiep theo:
echo   - May cua ban: chay install_native_host_exe.bat de Chrome dung ban .exe.
echo   - May user: gui ca thu muc native_host, khong can tik_native_host.py va build_exe.bat.
echo.
pause
exit /b 0
:fail_pip
echo.
echo Cai PyInstaller that bai. Kiem tra ket noi Internet roi chay lai.
goto fail_end
:fail_locked
echo.
echo Khong xoa duoc tik_native_host.exe cu, co the Chrome dang giu file.
echo Hay dong het Chrome roi chay lai file nay.
goto fail_end
:fail_build
echo.
echo Dong goi THAT BAI. Xem thong bao loi cua PyInstaller o phia tren.
:fail_end
echo.
pause
exit /b 1
