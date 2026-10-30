@echo off
rem Chrome chay file nay (xem "path" trong com.tik_video_toolkit.editor_bridge.json).
rem Chi la lop vo goi tik_native_host.py bang Python.
rem TUYET DOI khong echo/in gi ra stdout o day: stdout la kenh tra loi cho Chrome.
setlocal
set "HOST_PY=%~dp0tik_native_host.py"
set "PYTHON_EXE="
set "PYTHON_ARGS="
where py >nul 2>nul
if not errorlevel 1 (
    set "PYTHON_EXE=py"
    set "PYTHON_ARGS=-3"
) else (
    where python >nul 2>nul
    if not errorlevel 1 set "PYTHON_EXE=python"
)
if defined PYTHON_EXE goto run_host
for %%P in ("%LocalAppData%\Programs\Python\Python*\python.exe") do (
    if exist "%%~fP" set "PYTHON_EXE=%%~fP"
)
if not defined PYTHON_EXE exit /b 1
:run_host
"%PYTHON_EXE%" %PYTHON_ARGS% "%HOST_PY%" %*
exit /b %errorlevel%
