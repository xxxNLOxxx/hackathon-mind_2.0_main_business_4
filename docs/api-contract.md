# API Contract

## REST API

### POST `/run`

Запуск кода и получение результата выполнения.

**Request (JSON):**

```json
{
  "roomId": "string",
  "code": "string",
  "language": "ts",
  "stdin": "string",
  "timeoutMs": 3000
}
```

**Response (200, JSON):**

```json
{
  "stdout": "string",
  "stderr": "string",
  "exitCode": 0,
  "durationMs": 123,
  "meta": {
    "roomId": "string",
    "language": "ts"
  }
}
```

### POST `/ai-review`

AI‑ревью кода.

**Request (JSON):**

```json
{
  "roomId": "string",
  "code": "string",
  "language": "ts",
  "cursorPosition": {
    "line": 10,
    "column": 5
  },
  "instructions": "string"
}
```

**Response (200, JSON):**

```json
{
  "summary": "string",
  "comments": [
    {
      "message": "string",
      "severity": "info",
      "range": {
        "start": { "line": 5, "column": 2 },
        "end": { "line": 5, "column": 15 }
      },
      "suggestion": "string"
    }
  ]
}
```

### Формат ошибок (общий для REST)

```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "string",
    "details": {}
  }
}
```

---

## WebSocket API

Все сообщения передаются в формате:

```json
{
  "type": "string",
  "roomId": "string",
  "userId": "string",
  "payload": {}
}
```

### `join_room`

Клиент → сервер:

```json
{
  "type": "join_room",
  "roomId": "string",
  "userId": "string",
  "payload": {
    "name": "Alice",
    "avatar": "string",
    "role": "editor"
  }
}
```

Сервер → всем в комнате:

```json
{
  "type": "user_joined",
  "roomId": "string",
  "userId": "string",
  "payload": {
    "name": "Alice",
    "avatar": "string",
    "role": "editor",
    "users": [
      {
        "userId": "string",
        "name": "string",
        "avatar": "string",
        "role": "editor"
      }
    ]
  }
}
```

### `leave_room`

Клиент → сервер:

```json
{
  "type": "leave_room",
  "roomId": "string",
  "userId": "string",
  "payload": {}
}
```

Сервер → всем в комнате:

```json
{
  "type": "user_left",
  "roomId": "string",
  "userId": "string",
  "payload": {
    "users": []
  }
}
```

### `code_update`

Простой вариант без Yjs (полный текст/патч):

Клиент → сервер:

```json
{
  "type": "code_update",
  "roomId": "string",
  "userId": "string",
  "payload": {
    "docId": "main.ts",
    "fullText": "string",
    "version": 2
  }
}
```

Сервер → остальным в комнате:

```json
{
  "type": "code_update",
  "roomId": "string",
  "userId": "string",
  "payload": {
    "docId": "main.ts",
    "fullText": "string",
    "version": 2
  }
}
```

Вариант с Yjs:

```json
{
  "type": "code_update",
  "roomId": "string",
  "userId": "string",
  "payload": {
    "docId": "main.ts",
    "update": "base64-encoded-yjs-update"
  }
}
```

### `cursor_update`

Клиент → сервер:

```json
{
  "type": "cursor_update",
  "roomId": "string",
  "userId": "string",
  "payload": {
    "docId": "main.ts",
    "position": {
      "line": 10,
      "column": 5
    },
    "selection": {
      "start": { "line": 10, "column": 5 },
      "end": { "line": 12, "column": 3 }
    },
    "color": "#FF5722"
  }
}
```

Сервер → остальным в комнате:

```json
{
  "type": "cursor_update",
  "roomId": "string",
  "userId": "string",
  "payload": {
    "docId": "main.ts",
    "position": {
      "line": 10,
      "column": 5
    },
    "selection": {
      "start": { "line": 10, "column": 5 },
      "end": { "line": 12, "column": 3 }
    },
    "color": "#FF5722"
  }
}
```

### Дополнительные события сервера

`room_state`:

```json
{
  "type": "room_state",
  "roomId": "string",
  "payload": {
    "users": [],
    "documents": []
  }
}
```

`error`:

```json
{
  "type": "error",
  "roomId": "string",
  "payload": {
    "code": "ROOM_NOT_FOUND",
    "message": "Room does not exist"
  }
}
```