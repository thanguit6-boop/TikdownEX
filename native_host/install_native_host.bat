@echo off
setlocal
cd /d "%~dp0"
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
if defined PYTHON_EXE goto start_install
echo Khong tim thay Python. Cai Python 3 va bat tuy chon "Add Python to PATH",
echo sau do chay lai file nay.
echo.
pause
exit /b 1
:start_install
echo ==============================================================
echo  Cai dat cau noi "Mo app sua video" cho Tik Video Toolkit
echo ==============================================================
echo.
echo Luu y: hay nap extension vao Chrome truoc (chrome://extensions).
echo.
"%PYTHON_EXE%" %PYTHON_ARGS% "%~dp0tik_native_host.py" --install
if not "%errorlevel%"=="2" goto done
echo.
echo Neu da nap extension ma van khong tim thay, hay copy dong "ID" cua
echo Tik Video Toolkit o chrome://extensions roi dan vao day.
set "EXT_ID="
set /p "EXT_ID=ID extension (de trong de thoat): "
if not defined EXT_ID goto done
"%PYTHON_EXE%" %PYTHON_ARGS% "%~dp0tik_native_host.py" --install %EXT_ID%
:done
echo.
pause
