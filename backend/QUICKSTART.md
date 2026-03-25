# GUIA RÁPIDO - VouDeMoto Backend

## 🚀 Iniciar o Backend

### Pré-requisitos
- Node.js 16+ instalado
- npm ou yarn

### Passos

#### 1. Instalar dependências
```bash
npm install
```

#### 2. Configurar ambiente
```bash
cp .env.example .env
```

Arquivo `.env` padrão:
```
NODE_ENV=development
APP_MODE=mock
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=debug
```

#### 3. Rodar em desenvolvimento
```bash
npm run dev
```

Server vai rodar em: **http://localhost:3000**

#### 4. Testar a saúde
```bash
curl http://localhost:3000/health

# Resposta esperada:
# {"status":"ok","timestamp":"2024-01-24T..."}
```

---

## 📝 Exemplos de Requisições

### 1️⃣ Criar Passageiro

```bash
curl -X POST http://localhost:3000/api/passengers \
  -H "Authorization: Bearer admin_1:admin" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@example.com",
    "phone": "11999999999",
    "role": "passenger"
  }'
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-...",
    "name": "João Silva",
    "email": "joao@example.com",
    "phone": "11999999999",
    "role": "passenger",
    "createdAt": "2024-01-24T...",
    "updatedAt": "2024-01-24T..."
  }
}
```

### 2️⃣ Criar Motorista

```bash
curl -X POST http://localhost:3000/api/drivers \
  -H "Authorization: Bearer admin_1:admin" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Maria Oliveira",
    "email": "maria@example.com",
    "phone": "11988888888",
    "role": "driver",
    "documentId": "12345678900"
  }'
```

### 3️⃣ Motorista Fica Online

```bash
DRIVER_ID="uuid-do-motorista-criado"

curl -X POST http://localhost:3000/api/driver/status/online \
  -H "Authorization: Bearer ${DRIVER_ID}:driver" \
  -H "Content-Type: application/json"
```

### 4️⃣ Atualizar Localização do Motorista

```bash
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

### 5️⃣ Passageiro Cria Corrida

```bash
PASSENGER_ID="uuid-do-passageiro-criado"

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

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "ride-uuid",
    "passengerId": "passenger-uuid",
    "status": "created",
    "pickupLocation": {"latitude": -23.5505, "longitude": -46.6333},
    "dropoffLocation": {"latitude": -23.5, "longitude": -46.6},
    "createdAt": "2024-01-24T...",
    "lastStatusUpdate": "2024-01-24T...",
    "statusHistory": [...]
  }
}
```

### 6️⃣ Passageiro Inicia Busca por Motorista

```bash
RIDE_ID="ride-uuid-criado"

curl -X POST http://localhost:3000/api/passenger/rides/${RIDE_ID}/start-matching \
  -H "Authorization: Bearer ${PASSENGER_ID}:passenger" \
  -H "Content-Type: application/json"
```

### 7️⃣ Motorista Aceita Corrida

```bash
curl -X POST http://localhost:3000/api/driver/rides/${RIDE_ID}/accept \
  -H "Authorization: Bearer ${DRIVER_ID}:driver" \
  -H "Content-Type: application/json"
```

### 8️⃣ Motorista Inicia Corrida

```bash
curl -X POST http://localhost:3000/api/driver/rides/${RIDE_ID}/start \
  -H "Authorization: Bearer ${DRIVER_ID}:driver" \
  -H "Content-Type: application/json"
```

### 9️⃣ Motorista Finaliza Corrida

```bash
curl -X POST http://localhost:3000/api/driver/rides/${RIDE_ID}/finish \
  -H "Authorization: Bearer ${DRIVER_ID}:driver" \
  -H "Content-Type: application/json" \
  -d '{
    "finalLocation": {
      "latitude": -23.5,
      "longitude": -46.6
    }
  }'
```

### 🔟 Consultar Status da Corrida

```bash
curl -X GET http://localhost:3000/api/passenger/rides/${RIDE_ID} \
  -H "Authorization: Bearer ${PASSENGER_ID}:passenger" \
  -H "Content-Type: application/json"
```

---

## 🧪 Rodar Testes

### Testes Unitários

```bash
# Testar UserService
npx ts-node tests/userService.test.ts

# Testar RideService
npx ts-node tests/rideService.test.ts

# Testar Validators
npx ts-node tests/validators.test.ts
```

---

## 📊 Analisar Logs

Logs são estruturados com timestamps e contexto:

```
[2024-01-24T10:30:45.123Z] [INFO] [RideService] { rideId: 'uuid', passengerId: 'uuid' } Ride created successfully
[2024-01-24T10:30:46.456Z] [DEBUG] [MatchingService] Finding best driver...
[2024-01-24T10:30:47.789Z] [INFO] [MatchingService] Best driver found { driverId: 'uuid', distance: 2.5, score: 87 }
```

Controlar nível de log em `.env`:
```
LOG_LEVEL=debug    # Tudo
LOG_LEVEL=info     # Info e acima
LOG_LEVEL=warn     # Warnings e erros
LOG_LEVEL=error    # Apenas erros
```

---

## 🐛 Troubleshooting

### Porta 3000 já em uso
```bash
# Trocar porta
PORT=3001 npm run dev

# Ou matar processo na porta
lsof -ti:3000 | xargs kill -9
```

### Erro "Cannot find module"
```bash
# Reinstalar dependências
rm -rf node_modules
npm install
```

### TypeScript errors
```bash
# Compilar TypeScript
npm run build

# Verificar erros
npx tsc --noEmit
```

---

## 🏗️ Build para Produção

```bash
# Compilar
npm run build

# Rodar versão compilada
npm start

# Arquivo principal
node dist/index.js
```

---

## 📚 Documentação

- [README.md](./README.md) - Overview e API
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitetura detalhada
- [src/models/Ride.ts](./src/models/Ride.ts) - State machine da corrida

---

## 🔄 Fluxo Recomendado para Testar

1. **Terminal 1** - Rodar server
   ```bash
   npm run dev
   ```

2. **Terminal 2** - Executar testes
   ```bash
   npx ts-node tests/userService.test.ts
   npx ts-node tests/rideService.test.ts
   ```

3. **Terminal 3** - Testar via curl
   ```bash
   # Ver exemplos acima
   ```

---

## 🚨 Importante

- ⚠️ **MOCK mode**: Dados não persistem entre restarts
- ⚠️ **Sem banco real**: Tudo em memória
- ⚠️ **Sem WebSockets**: Usar polling ou implementar
- ✅ **Estrutura pronta**: Para adicionar real repositories

---

## 📞 Próximos Passos

1. Implementar matching automático em background job
2. Adicionar timeouts (driver acceptance, ride inactivity)
3. Integrar com banco de dados real (PostgreSQL)
4. Adicionar Redis para cache
5. Implementar WebSockets para real-time
6. Integrar Google Maps API
7. Adicionar sistema de pagamento

---

**Tudo pronto para começar! 🚀**
