@echo off
setlocal
chcp 65001 >nul
set "PYTHONUTF8=1"
pushd "%~dp0"
echo.
echo SHABYT - установка, сборка и запуск сайта
where python >nul 2>&1
if errorlevel 1 goto missing_python
python -c "import sys; sys.exit(sys.version_info < (3,11))" >nul 2>&1
if errorlevel 1 goto missing_python
where npm >nul 2>&1
if errorlevel 1 goto missing_node
if not exist "backend\.venv\Scripts\python.exe" (
    python -m venv "backend\.venv"
    if errorlevel 1 goto failed
)
"backend\.venv\Scripts\python.exe" -m pip install -r "backend\requirements.txt"
if errorlevel 1 goto failed
set "VITE_SEARCH_MODE=api"
set "VITE_API_BASE_URL=/api"
set "VITE_BASE_PATH=/"
pushd frontend
call npm ci --include=dev
if errorlevel 1 (
    popd
    goto failed
)
call npm run build
if errorlevel 1 (
    popd
    goto failed
)
popd
echo.
echo Откройте в браузере: http://127.0.0.1:8000/
echo Не закрывайте это окно, пока пользуетесь сайтом.
echo Остановка: Ctrl+C. API-ключ для первого запуска не нужен.
echo.
"backend\.venv\Scripts\python.exe" -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000
if errorlevel 1 goto failed
popd
pause
exit /b 0
:missing_python
echo Нужен Python 3.11 или новее. Проверьте: python --version
pause
popd
exit /b 1
:missing_node
echo Нужен Node.js: версия из frontend/package.json. Проверьте: node --version
pause
popd
exit /b 1
:failed
echo.
echo Запуск остановлен. Причина указана выше: сохраните текст ошибки.
echo Если порт 8000 занят, остановите старый uvicorn через Ctrl+C.
echo При ошибке npm не открывайте старую страницу - сначала устраните ошибку сборки.
pause
popd
exit /b 1
