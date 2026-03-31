# Realtime Code Platform

## Структура проекта

- frontend — клиент (React)
- backend/realtime — WebSocket сервер
- backend/sandbox — выполнение кода
- backend/ai — AI-ревьюер
- shared — общие типы и константы
- docs — документация

## Запуск сервисов

### AI
- cd backend/ai
- npm install
- npm run dev

### Realtime
- cd backend/realtime
- npm install
- npm run dev

### Sandbox
- cd backend/sandbox
- docker build --no-cache -t sandbox .
- docker run -p 3003:3003 -v //var/run/docker.sock:/var/run/docker.sock sandbox

### Frontend
- cd frontend
- npm install
- npm run dev

## Порты

- Frontend: 5173
- AI: 3001
- Realtime: 3002
- Sandbox: 3003
# Realtime Code Platform

## Структура

- frontend — клиент
- backend/realtime — WebSocket сервер
- backend/sandbox — выполнение кода
- backend/ai — AI-ревьюер
- shared — общие файлы
- docs — документация

## Примечание
Пока только структура проекта. Код будет добавляться по модулям.
