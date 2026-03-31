# API Contract

## AI

POST /ai-review

Request:
{ "code": "string" }

Response:
{
  "issues": [
    { "type": "warning", "message": "string", "line": number }
  ]
}