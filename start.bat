@echo off
title Realtime Code Platform - Запуск всех сервисов
echo ==========================================
echo Запуск всех сервисов платформы
echo ==========================================
echo.

:: Проверка Docker
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo [ОШИБКА] Docker не найден. Установите Docker Desktop.
    pause
    exit /b 1
)

:: Проверка Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ОШИБКА] Node.js не найден. Установите Node.js.
    pause
    exit /b 1
)


:: Также удаляем контейнер по имени, если он есть
docker stop sandbox >nul 2>nul
docker rm sandbox >nul 2>nul

:: 1. AI сервис (запускается в фоне)
echo [1/4] Запуск AI сервиса (порт 3001)...
start "AI Service" cmd /k "cd backend\ai && npm install && npm run dev"

:: 2. Realtime сервис
echo [2/4] Запуск Realtime сервиса (порт 3002)...
start "Realtime Service" cmd /k "cd backend\realtime && npm install && npm run dev"

:: 3. Sandbox (Docker) – с контролем сборки
echo [3/4] Сборка Docker образа sandbox...
cd backend\sandbox

:: Удаляем старый контейнер, если есть (чтобы не было конфликтов портов)
docker stop sandbox-container >nul 2>nul
docker rm sandbox-container >nul 2>nul

:: Сборка образа
docker build --no-cache -t sandbox .
if %errorlevel% neq 0 (
    echo [ОШИБКА] Не удалось собрать образ sandbox. Проверьте Dockerfile и интернет.
    pause
    exit /b 1
)

:: Запуск контейнера с явным именем (чтобы потом легко остановить)
echo Запуск контейнера sandbox (порт 3003)...
start "Sandbox" cmd /k "docker run --name sandbox -p 3003:3003 -v //var/run/docker.sock:/var/run/docker.sock sandbox"
cd ..\..

:: 4. Frontend
echo [4/4] Запуск Frontend (порт 5173)...
start "Frontend" cmd /k "cd frontend && npm install && npm run dev"

echo Ожидание запуска сервисов...
timeout /t 5 /nobreak >nul


echo Открытие браузера...
start http://localhost:5173

echo.
echo ==========================================
echo Все сервисы запущены.
echo Для остановки закройте окна.
echo Если нужно перезапустить sandbox, выполните:
echo   docker stop sandbox-container && docker rm sandbox-container
echo ==========================================
pause