@echo off
setlocal
cd /d "%~dp0"
set "PYTHON_EXE="
set "PYTHON_ARGS="
where py >nul 2>nul
if not errorlevel 1 (
    set "PYTHON_EXE=py"
    set "PYTHON_ARGS=-3"
) else (
    where python >nul 2>nul
    if not errorlevel 1 (
        set "PYTHON_EXE=python"
    )
)
if defined PYTHON_EXE goto run_uninstall
for %%P in ("%LocalAppData%\Programs\Python\Python*\python.exe") do (
    if exist "%%~fP" set "PYTHON_EXE=%%~fP"
)
if not defined PYTHON_EXE (
    echo Khong tim thay Python 3 trong PATH hoac thu muc cai dat cua user.
    goto done
)
:run_uninstall
"%PYTHON_EXE%" %PYTHON_ARGS% "%~dp0tik_native_host.py" --uninstall
:done
echo.
pause
