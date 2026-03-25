# 📡 API Reference

## Authentication

Todos os endpoints `/api/*` requerem header de autenticação:

```
Authorization: Bearer {userId}:{role}
```

**Exemplos:**
```
Authorization: Bearer user123:passenger
Authorization: Bearer driver456:driver
Authorization: Bearer admin789:admin
```

---

## Passenger Endpoints

### 1. Create Ride

Criar nova corrida.

```
POST /api/passenger/rides
Content-Type: application/json
Authorization: Bearer {passengerId}:passenger

{
  "pickupLocation": {
    "latitude": -23.5505,
    "longitude": -46.6333
  },
  "dropoffLocation": {
    "latitude": -23.5,
    "longitude": -46.6
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "passengerId": "passenger123",
    "status": "created",
    "pickupLocation": {
      "latitude": -23.5505,
      "longitude": -46.6333
    },
    "dropoffLocation": {
      "latitude": -23.5,
      "longitude": -46.6
    },
    "createdAt": "2024-01-24T10:30:00.000Z",
    "lastStatusUpdate": "2024-01-24T10:30:00.000Z",
    "statusHistory": [
      {
        "status": "created",
        "timestamp": "2024-01-24T10:30:00.000Z",
        "changedBy": "system"
      }
    ]
  }
}
```

**Errors:**
- `400` - VALIDATION_ERROR - Coordenadas inválidas
- `404` - USER_NOT_FOUND - Passageiro não existe

---

### 2. List Rides

Listar todas as corridas do passageiro.

```
GET /api/passenger/rides
Authorization: Bearer {passengerId}:passenger
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "ride123",
      "passengerId": "passenger123",
      "status": "finished",
      "pickupLocation": {...},
      "dropoffLocation": {...},
      "createdAt": "2024-01-24T10:30:00.000Z",
      "finishedAt": "2024-01-24T11:00:00.000Z",
      "lastStatusUpdate": "2024-01-24T11:00:00.000Z",
      "statusHistory": [...]
    },
    ...
  ]
}
```

---

### 3. Get Ride Status

Consultar status específico de uma corrida.

```
GET /api/passenger/rides/{rideId}
Authorization: Bearer {passengerId}:passenger
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "ride123",
    "passengerId": "passenger123",
    "driverId": "driver456",
    "status": "in_progress",
    "pickupLocation": {...},
    "dropoffLocation": {...},
    "createdAt": "2024-01-24T10:30:00.000Z",
    "startedAt": "2024-01-24T10:45:00.000Z",
    "lastStatusUpdate": "2024-01-24T10:45:00.000Z",
    "statusHistory": [...]
  }
}
```

**Errors:**
- `404` - RIDE_NOT_FOUND - Corrida não existe
- `403` - FORBIDDEN - Passageiro não é o dono

---

### 4. Start Matching

Iniciar busca por motorista disponível.

```
POST /api/passenger/rides/{rideId}/start-matching
Authorization: Bearer {passengerId}:passenger
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "ride123",
    "status": "searching_driver",
    "lastStatusUpdate": "2024-01-24T10:31:00.000Z",
    ...
  }
}
```

**Errors:**
- `409` - INVALID_STATE_TRANSITION - Transição de estado inválida
- `404` - RIDE_NOT_FOUND - Corrida não existe

---

### 5. Cancel Ride

Cancelar uma corrida.

```
POST /api/passenger/rides/{rideId}/cancel
Content-Type: application/json
Authorization: Bearer {passengerId}:passenger

{
  "reason": "Mudei de ideia"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "ride123",
    "status": "cancelled_by_passenger",
    "cancelReason": "Mudei de ideia",
    "lastStatusUpdate": "2024-01-24T10:32:00.000Z",
    ...
  }
}
```

**Errors:**
- `409` - INVALID_STATE_TRANSITION - Não pode cancelar de estado final
- `403` - FORBIDDEN - Passageiro não é o dono

---

## Driver Endpoints

### 1. Go Online

Motorista fica online e disponível para corridas.

```
POST /api/driver/status/online
Authorization: Bearer {driverId}:driver
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "driverId": "driver123",
    "status": "online",
    "updatedAt": "2024-01-24T10:30:00.000Z"
  }
}
```

---

### 2. Go Offline

Motorista fica offline.

```
POST /api/driver/status/offline
Authorization: Bearer {driverId}:driver
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "driverId": "driver123",
    "status": "offline",
    "updatedAt": "2024-01-24T10:35:00.000Z"
  }
}
```

---

### 3. Get Driver Status

Consultar status atual do motorista.

```
GET /api/driver/status
Authorization: Bearer {driverId}:driver
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "driverId": "driver123",
    "status": "online",
    "currentRideId": "ride123",
    "lastLocationUpdate": "2024-01-24T10:30:00.000Z",
    "updatedAt": "2024-01-24T10:30:00.000Z"
  }
}
```

---

### 4. Update Location

Atualizar localização atual do motorista.

```
POST /api/driver/location
Content-Type: application/json
Authorization: Bearer {driverId}:driver

{
  "latitude": -23.5505,
  "longitude": -46.6333,
  "accuracy": 10,
  "bearing": 45,
  "speed": 25
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Location updated"
}
```

**Nota:** Enviar periodicamente (recomendado a cada 5-10 segundos durante corrida).

---

### 5. List Driver Rides

Listar todas as corridas do motorista.

```
GET /api/driver/rides
Authorization: Bearer {driverId}:driver
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "ride123",
      "passengerId": "passenger123",
      "driverId": "driver456",
      "status": "finished",
      ...
    },
    ...
  ]
}
```

---

### 6. Accept Ride

Motorista aceita uma corrida atribuída.

```
POST /api/driver/rides/{rideId}/accept
Authorization: Bearer {driverId}:driver
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "ride123",
    "status": "driver_assigned",
    "driverId": "driver456",
    ...
  }
}
```

**Errors:**
- `403` - FORBIDDEN - Motorista não é o atribuído
- `404` - RIDE_NOT_FOUND - Corrida não existe

---

### 7. Start Ride

Motorista inicia corrida (passageiro dentro do carro).

```
POST /api/driver/rides/{rideId}/start
Authorization: Bearer {driverId}:driver
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "ride123",
    "status": "in_progress",
    "startedAt": "2024-01-24T10:45:00.000Z",
    ...
  }
}
```

**Errors:**
- `409` - INVALID_STATE_TRANSITION - Transição inválida
- `403` - FORBIDDEN - Motorista não é o atribuído

---

### 8. Finish Ride

Motorista finaliza corrida.

```
POST /api/driver/rides/{rideId}/finish
Content-Type: application/json
Authorization: Bearer {driverId}:driver

{
  "finalLocation": {
    "latitude": -23.5,
    "longitude": -46.6
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "ride123",
    "status": "finished",
    "finishedAt": "2024-01-24T11:00:00.000Z",
    ...
  }
}
```

---

### 9. Cancel Ride

Motorista cancela uma corrida.

```
POST /api/driver/rides/{rideId}/cancel
Content-Type: application/json
Authorization: Bearer {driverId}:driver

{
  "reason": "Problema mecânico"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "ride123",
    "status": "cancelled_by_driver",
    "cancelReason": "Problema mecânico",
    ...
  }
}
```

---

## Admin Endpoints

### 1. List Active Rides

Listar todas as corridas ativas no sistema.

```
GET /api/admin/rides
Authorization: Bearer {adminId}:admin
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "ride123",
      "passengerId": "passenger123",
      "driverId": "driver456",
      "status": "in_progress",
      ...
    },
    ...
  ]
}
```

---

### 2. List Events

Histórico de eventos do sistema.

```
GET /api/admin/events
Authorization: Bearer {adminId}:admin
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "event123",
      "type": "RIDE_CREATED",
      "aggregateId": "ride123",
      "aggregateType": "ride",
      "timestamp": "2024-01-24T10:30:00.000Z",
      "data": {
        "rideId": "ride123",
        "passengerId": "passenger123"
      }
    },
    ...
  ]
}
```

---

### 3. List Users

Listar todos os usuários do sistema.

```
GET /api/admin/users
Authorization: Bearer {adminId}:admin
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "user123",
      "role": "passenger",
      "name": "João Silva",
      "email": "joao@example.com",
      "phone": "11999999999",
      "createdAt": "2024-01-24T10:00:00.000Z",
      "updatedAt": "2024-01-24T10:00:00.000Z"
    },
    ...
  ]
}
```

---

### 4. Health Check

Verificar saúde do sistema.

```
GET /api/admin/health
Authorization: Bearer {adminId}:admin
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-24T10:30:00.000Z",
    "uptime": 3600.5
  }
}
```

---

## Public Endpoints

### Health Check (sem auth)

```
GET /health
```

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2024-01-24T10:30:00.000Z"
}
```

---

## Error Responses

### 400 - Bad Request
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Latitude must be between -90 and 90",
  "details": {
    "latitude": 95
  },
  "traceId": "trace-uuid"
}
```

### 401 - Unauthorized
```json
{
  "error": "UNAUTHORIZED",
  "message": "Missing authorization token",
  "traceId": "trace-uuid"
}
```

### 403 - Forbidden
```json
{
  "error": "FORBIDDEN",
  "message": "You do not own this ride",
  "traceId": "trace-uuid"
}
```

### 404 - Not Found
```json
{
  "error": "RIDE_NOT_FOUND",
  "message": "Ride not found",
  "traceId": "trace-uuid"
}
```

### 409 - Conflict
```json
{
  "error": "INVALID_STATE_TRANSITION",
  "message": "Cannot transition from in_progress to created",
  "details": {
    "currentStatus": "in_progress",
    "newStatus": "created"
  },
  "traceId": "trace-uuid"
}
```

### 429 - Rate Limited
```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Please try again later."
}
```

### 500 - Internal Error
```json
{
  "error": "INTERNAL_ERROR",
  "message": "An unexpected error occurred",
  "traceId": "trace-uuid"
}
```

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Auth required |
| 403 | Forbidden - Access denied |
| 404 | Not Found - Resource not found |
| 409 | Conflict - State conflict |
| 429 | Too Many Requests - Rate limited |
| 500 | Server Error - Unexpected error |

---

## Rate Limiting

- **Limit:** 100 requisições por minuto
- **Por:** Endereço IP
- **Response:** 429 Too Many Requests

---

## Timestamps

Todos os timestamps estão em ISO 8601 UTC:
```
2024-01-24T10:30:45.123Z
```

---

## Ride Status Values

```
created                  - Corrida acabou de ser criada
searching_driver         - Procurando motorista disponível
driver_assigned          - Motorista foi atribuído
driver_approaching       - Motorista chegando (futuro)
in_progress              - Corrida em andamento
finished                 - Corrida finalizada
cancelled_by_passenger   - Cancelada pelo passageiro
cancelled_by_driver      - Cancelada pelo motorista
cancelled_timeout        - Cancelada por timeout
error                    - Erro no processamento
```

---

## Driver Status Values

```
offline                  - Motorista offline
online                   - Motorista disponível
busy                     - Em corrida
on_break                 - De folga
```

---

## Examples using cURL

### Create Ride as Passenger

```bash
PASSENGER_ID="550e8400-e29b-41d4-a716-446655440000"

curl -X POST http://localhost:3000/api/passenger/rides \
  -H "Authorization: Bearer ${PASSENGER_ID}:passenger" \
  -H "Content-Type: application/json" \
  -d '{
    "pickupLocation": {
      "latitude": -23.5505,
      "longitude": -46.6333
    },
    "dropoffLocation": {
      "latitude": -23.5,
      "longitude": -46.6
    }
  }'
```

### Update Driver Location

```bash
DRIVER_ID="driver-uuid"

curl -X POST http://localhost:3000/api/driver/location \
  -H "Authorization: Bearer ${DRIVER_ID}:driver" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": -23.5505,
    "longitude": -46.6333,
    "accuracy": 10,
    "bearing": 45,
    "speed": 25
  }'
```

---

## TODO

- [ ] Adicionar paginação em listagens
- [ ] Suportar filtros avançados
- [ ] Adicionar webhooks para eventos
- [ ] Implementar rate limiting mais fino (por usuário)
- [ ] Adicionar OpenAPI/Swagger documentation
- [ ] Suportar batch requests
- [ ] Implementar GraphQL (alternativa)

