@echo off
setlocal
chcp 65001 >nul
set "PYTHONUTF8=1"
pushd "%~dp0"
if not exist "backend\.venv\Scripts\python.exe" python -m venv "backend\.venv"
if errorlevel 1 goto failed
"backend\.venv\Scripts\python.exe" -m pip install -r "backend\requirements-dev.txt"
if errorlevel 1 goto failed
"backend\.venv\Scripts\python.exe" -m pytest backend/tests -q
if errorlevel 1 goto failed
pushd frontend
call npm ci --include=dev
if errorlevel 1 goto frontend_failed
call npm run test:core
if errorlevel 1 goto frontend_failed
call npm test
if errorlevel 1 goto frontend_failed
call npm run build
if errorlevel 1 goto frontend_failed
popd
echo.
echo Все запущенные этой командой проверки прошли.
pause
popd
exit /b 0
:frontend_failed
popd
:failed
echo.
echo Проверка остановлена на ошибке выше. Не игнорируйте ее перед демо.
pause
popd
exit /b 1
