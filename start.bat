@echo off
title Collaborative IDE Launcher

echo ========================================
echo   Collaborative IDE Launcher
echo ========================================
echo.

:: Проверяем наличие node_modules в backend
if not exist "backend\node_modules" (
    echo Installing backend dependencies...
    cd backend
    call npm install
    cd ..
)

:: Проверяем наличие node_modules в frontend
if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

echo.
echo Starting services...
echo.

:: Запускаем бэкенд в новом окне
start "Backend Server" cmd /k "cd backend && npm run dev"

:: Ждем 3 секунды
timeout /t 3 /nobreak > nul

:: Запускаем фронтенд в новом окне
start "Frontend Client" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo   Services started!
echo   Backend:  http://localhost:3002
echo   Frontend: http://localhost:5173
echo ========================================
echo.
echo Press any key to close this window...
pause > nul