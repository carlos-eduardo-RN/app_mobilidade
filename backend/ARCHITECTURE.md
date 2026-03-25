# ARQUITETURA DETALHADA - VouDeMoto Backend

## 📋 Índice

1. [Princípios Fundamentais](#princípios-fundamentais)
2. [Camadas](#camadas)
3. [Domínios](#domínios)
4. [Padrões e Decisões](#padrões-e-decisões)
5. [Escalabilidade](#escalabilidade)
6. [Resiliência](#resiliência)

---

## 🎯 Princípios Fundamentais

### 1. Source of Truth Centralizado
- **Backend é a ÚNICA fonte de verdade** para estado da corrida
- Clientes (apps) apenas consultam e recebem eventos
- Transições de estado validadas no servidor

### 2. Separação de Responsabilidades
```
Controllers  → HTTP Layer (não tem lógica de negócio)
    ↓
Services     → Lógica de negócio (isolada e testável)
    ↓
Repositories → Persistência (agnóstica de banco)
    ↓
Models       → Tipos e entidades
```

### 3. Sem Acoplamento a Detalhes de Infraestrutura
- Repositórios são interfaces
- Mock para desenvolvimento
- Real para produção
- **Mesmo código, diferentes implementações**

### 4. Events First
- Cada mudança importante gera evento
- Eventos são imutáveis
- Histórico preservado (Event Sourcing ready)
- Subscribers reagem aos eventos

### 5. Idempotência
- Mesma requisição 2x = mesmo resultado
- Duplicata de requisições tratada gracefully
- Não há efeitos colaterais duplicados

---

## 🏗️ Camadas

### 1. **HTTP/Controller Layer**

```typescript
// PassengerController.ts
async createRide(req, res) {
  const { pickupLocation, dropoffLocation } = req.body;
  const ride = await appService.rideService.createRide({...});
  res.json(ride);
}
```

**Responsabilidades:**
- Parse de input HTTP
- Validação básica de schema
- Chamar service apropriado
- Retornar resposta HTTP

**Não faz:**
- Validação de regra de negócio
- Lógica de transação
- Acesso direto a banco

---

### 2. **Application Service Layer**

```typescript
// ApplicationService.ts
constructor(
  userRepository,
  driverRepository,
  rideRepository,
  eventPublisher
) {
  this.userService = new UserService(userRepository);
  this.rideService = new RideService(
    rideRepository,
    userRepository,
    eventPublisher,
    this.driverService,
    this.matchingService
  );
}
```

**Responsabilidades:**
- Orquestar Domain Services
- Gerenciar dependências
- Ponto único de injeção

---

### 3. **Domain Service Layer** ⭐

```typescript
// RideService.ts (CORAÇÃO DO SISTEMA)
async createRide(dto: CreateRideDTO): Promise<Ride> {
  // 1. Validar passageiro existe
  await this.userRepository.findById(dto.passengerId);
  
  // 2. Validar dados da corrida
  RideValidator.validateRideData(...);
  
  // 3. Criar entidade
  const ride = new Ride({...});
  
  // 4. Persistir
  const saved = await this.rideRepository.save(ride);
  
  // 5. Publicar evento
  await this.eventPublisher.publish(
    new RideCreatedEvent(saved.id)
  );
  
  // 6. Retornar
  return saved;
}
```

**Responsabilidades:**
- **Regras de negócio** (state machines, validações)
- Orquestar repositories
- Publicar eventos
- Garantir consistência

**Domínios (Services):**

| Service | Responsabilidade |
|---------|------------------|
| UserService | CRUD de usuários, validações |
| DriverService | Status do motorista, localização |
| RideService | **State machine de corrida** |
| MatchingService | Encontrar motorista ideal |

---

### 4. **Repository Layer** (Abstração)

```typescript
// IRepository.ts (Interface)
interface IRideRepository {
  save(entity: Ride): Promise<Ride>;
  findById(id: string): Promise<Ride | null>;
  findByPassengerId(passengerId: string): Promise<Ride[]>;
}

// MockRepository.ts (Implementação para MOCK)
class MockRideRepository implements IRideRepository {
  private store: Map<string, Ride> = new Map();
  
  async save(entity: Ride): Promise<Ride> {
    this.store.set(entity.id, entity);
    return entity;
  }
}

// RealRepository.ts (TODO: Implementação para REAL)
class PostgresRideRepository implements IRideRepository {
  async save(entity: Ride): Promise<Ride> {
    const result = await db.query(
      'INSERT INTO rides (...) VALUES (...)',
      [...]
    );
    return mapRowToRide(result.rows[0]);
  }
}
```

**Interface Segregation:**
- `IRepository<T>` - base (CRUD)
- `IRideRepository` - específica (findByPassengerId, etc)

**Benefício:**
- Services não sabem se é Mock ou Real
- Trocável em tempo de inicialização
- 100% testável sem banco

---

### 5. **Models Layer**

```typescript
// Ride.ts
export enum RideStatus {
  CREATED = 'created',
  SEARCHING_DRIVER = 'searching_driver',
  DRIVER_ASSIGNED = 'driver_assigned',
  IN_PROGRESS = 'in_progress',
  FINISHED = 'finished',
  CANCELLED_BY_PASSENGER = 'cancelled_by_passenger',
  CANCELLED_BY_DRIVER = 'cancelled_by_driver',
  ERROR = 'error',
}

export interface Ride {
  id: string;
  passengerId: string;
  driverId?: string;
  status: RideStatus;
  pickupLocation: Location;
  dropoffLocation: Location;
  statusHistory: RideStatusChange[];
  createdAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
}
```

**Características:**
- Tipagem forte com TypeScript
- Sem métodos (apenas dados)
- DTOs separados (CreateRideDTO, etc)
- Enums para estados

---

### 6. **Validator Layer**

```typescript
// Validators.ts
export class RideValidator {
  static validateStateTransition(
    currentStatus: RideStatus,
    newStatus: RideStatus
  ): boolean {
    const validTransitions = {
      [RideStatus.CREATED]: [RideStatus.SEARCHING_DRIVER],
      [RideStatus.SEARCHING_DRIVER]: [RideStatus.DRIVER_ASSIGNED],
      // ...
    };
    
    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new StateTransitionError(`Cannot go from ${currentStatus} to ${newStatus}`);
    }
    return true;
  }
}
```

**Validações:**
- Coordenadas geográficas (-90..90, -180..180)
- Transições de estado válidas
- Email/phone formato
- Distâncias reais (0-500km)

---

### 7. **Events Layer**

```typescript
// EventPublisher.ts
class EventPublisher {
  private subscribers: Map<EventType, EventHandler[]> = new Map();
  
  subscribe(eventType: EventType, handler: EventHandler) {
    this.subscribers.get(eventType).push(handler);
  }
  
  async publish(event: DomainEvent) {
    const handlers = this.subscribers.get(event.type);
    
    for (const handler of handlers) {
      await handler.handle(event);
    }
  }
}
```

**Modelo Observer:**
- Event Publisher: gerencia subscribers
- Domain Events: imutáveis
- Handlers: reagem aos eventos

**Eventos Suportados:**
```
RIDE_CREATED
RIDE_MATCHING_STARTED
RIDE_DRIVER_ASSIGNED
RIDE_STARTED
RIDE_FINISHED
RIDE_CANCELLED
DRIVER_CAME_ONLINE
DRIVER_WENT_OFFLINE
DRIVER_LOCATION_UPDATED
```

---

### 8. **Middleware Layer**

| Middleware | Responsabilidade |
|-----------|------------------|
| auth | Valida token e insere `req.user` |
| logging | Log de requisição/resposta |
| errorHandler | Converte exceções em HTTP 4xx/5xx |
| rateLimit | Limita 100 req/min por IP |

---

## 🎯 Domínios

### User Domain
```
User (Passenger | Driver | Admin)
  ├─ id: string
  ├─ role: UserRole
  ├─ email: string (unique)
  ├─ phone: string (unique)
  └─ createdAt: Date

Agregado: User
Repositório: IUserRepository
Service: UserService
```

### DriverStatus Domain
```
DriverStatus
  ├─ driverId: string
  ├─ status: DriverStatusType (offline | online | busy | on_break)
  ├─ currentRideId?: string
  └─ updatedAt: Date

State Machine:
  OFFLINE ↔ ONLINE ↔ (BUSY | ON_BREAK) ↔ OFFLINE
```

### Ride Domain (⭐ PRINCIPAL)
```
Ride
  ├─ id: string
  ├─ passengerId: string
  ├─ driverId?: string
  ├─ status: RideStatus
  ├─ pickupLocation: Location
  ├─ dropoffLocation: Location
  ├─ statusHistory: RideStatusChange[]
  ├─ estimate?: RideEstimate
  ├─ createdAt: Date
  └─ finishedAt?: Date

State Machine (SOURCE OF TRUTH):
  CREATED
    ↓
  SEARCHING_DRIVER
    ├→ DRIVER_ASSIGNED → DRIVER_APPROACHING → IN_PROGRESS → FINISHED
    ├→ CANCELLED_TIMEOUT
    └→ CANCELLED_BY_PASSENGER
```

### Location Domain
```
Location
  ├─ latitude: number (-90..90)
  ├─ longitude: number (-180..180)
  ├─ timestamp: Date
  ├─ accuracy?: number (metros)
  ├─ bearing?: number (graus)
  └─ speed?: number (m/s)

Persistência:
  - DriverLocations (Map<driverId, Location>)
  - PassengerLocations (Map<passengerId, Location>)
  - Sempre o último ponto válido
```

### Matching Domain
```
MatchingCriteria
  ├─ passengerLatitude: number
  ├─ passengerLongitude: number
  ├─ maxRadiusKm: number
  ├─ maxWaitTimeSeconds?: number
  └─ minDriverRating?: number

MatchingResult
  ├─ matchedDriverId: string
  ├─ distance: number (km)
  ├─ eta: number (segundos)
  └─ timestamp: Date

Algoritmo v1: Distância Linear
  score = 100 - (distancia * 2) + (rating * 4)
```

---

## 🔄 Padrões e Decisões

### 1. **Domain-Driven Design (DDD)**

✓ **Linguagem Ubíqua:**
- Ride, DriverStatus, Matching (termos do negócio, não técnicos)

✓ **Agregados:**
- Ride (com statusHistory)
- User
- DriverStatus

✓ **Value Objects:**
- Location
- RideLocation
- RideEstimate

---

### 2. **Repository Pattern**

✓ **Abstração de persistência:**
```typescript
interface IRepository<T> {
  save(entity: T): Promise<T>;
  findById(id: string): Promise<T | null>;
}
```

✓ **Duas implementações:**
- Mock (em memória) - desenvolvimento
- Real (banco real) - produção

---

### 3. **Observer Pattern (Events)**

✓ **Desacoplamento:**
```typescript
// Ride Service não conhece quem reage aos eventos
await eventPublisher.publish(rideCreatedEvent);

// Handler desconhecido reage
subscribers.forEach(h => h.handle(event));
```

✓ **Vantagens:**
- Add/remove handlers sem modificar RideService
- Fácil adicionar notificações, logs, etc

---

### 4. **State Machine Pattern**

✓ **Válido no nível de serviço:**
```typescript
RideValidator.validateStateTransition(
  currentStatus,  // CREATED
  newStatus       // SEARCHING_DRIVER
);
```

✓ **Benefícios:**
- Nunca deixa corrida em estado inválido
- Transições explícitas
- Fácil adicionar regras

---

### 5. **Dependency Injection**

✓ **Constructor Injection:**
```typescript
class RideService {
  constructor(
    private rideRepository: IRideRepository,
    private userRepository: IUserRepository,
    private eventPublisher: EventPublisher
  ) {}
}
```

✓ **Vantagens:**
- Testável (injetar mocks)
- Inversão de controle
- Sem singletons globais

---

## 📈 Escalabilidade

### Limitações Atuais (MOCK)
- Dados em memória
- Uma instância apenas
- Sem persistência

### Caminhos para Escalar

#### 1. **Database**
```typescript
// RealRideRepository.ts
class PostgresRideRepository implements IRideRepository {
  async save(ride: Ride): Promise<Ride> {
    const result = await this.db.query(
      'INSERT INTO rides (...) VALUES (...) RETURNING *'
    );
    return mapRowToRide(result.rows[0]);
  }
}
```

#### 2. **Redis (Cache + Real-time)**
```typescript
// LocationRepository com Redis
class RedisLocationRepository {
  async saveDriverLocation(driverId, location) {
    await redis.set(
      `driver:${driverId}:location`,
      JSON.stringify(location)
    );
  }
}
```

#### 3. **Message Queue (RabbitMQ/Kafka)**
```typescript
// Event Handler assíncrono
class SendNotificationHandler implements EventHandler {
  async handle(event: RideCreatedEvent) {
    await queue.publish('notifications', {
      type: 'ride.created',
      passengerId: event.passengerId
    });
  }
}
```

#### 4. **WebSockets (Real-time)**
```typescript
// Real-time location updates
io.on('driver:location', (data) => {
  io.to(`ride:${data.rideId}`).emit('location:updated', data);
});
```

#### 5. **Horizontal Scaling**
```
[App 1] [App 2] [App 3]
    ↓       ↓       ↓
  Load Balancer
    ↓       ↓       ↓
 PostgreSQL (shared database)
 Redis (shared cache)
 RabbitMQ (shared queue)
```

---

## 🛡️ Resiliência

### 1. **Idempotência**
- Requisições duplicadas = mesmo resultado
- Implementar via token/request ID

### 2. **Timeouts**
```typescript
const DRIVER_ACCEPT_TIMEOUT = 30000; // 30s
const MATCHING_TIMEOUT = 60000; // 1m
const RIDE_INACTIVITY_TIMEOUT = 300000; // 5m
```

### 3. **State Recovery**
- Backend sempre tem estado correto
- Clientes sincronizam ao reconectar
- Histórico de eventos permite replay

### 4. **Error Handling**
```typescript
// ApplicationError com código e status HTTP
throw new NotFoundError(
  ErrorCode.RIDE_NOT_FOUND,
  'Ride not found'
);

// Middleware converte para HTTP 404
```

### 5. **Logging Estruturado**
```typescript
Logger.info('RideService', 'Ride created', {
  rideId: ride.id,
  passengerId: ride.passengerId,
  traceId: req.traceId
});
```

---

## 🔐 Segurança

### v1 (Atual)
- ✓ Mock Token (user_id:role)
- ✓ Separação Passageiro/Motorista
- ✓ Validação de input
- ✓ Rate limit (100 req/min)

### v2 (TODO)
- ✓ JWT com expiração
- ✓ HTTPS obrigatório
- ✓ CORS configurado
- ✓ CSRF protection
- ✓ SQL injection prevention (ORM)
- ✓ Auth via OAuth (Apple/Google)

---

## 📊 Fluxo Completo: Criar e Finalizar Corrida

```
1. PASSAGEIRO CRIA CORRIDA
   POST /api/passenger/rides
   ├─ Controller recebe request
   ├─ RideService.createRide()
   │  ├─ Validar passageiro existe
   │  ├─ Validar coordenadas
   │  ├─ Criar Ride(status=CREATED)
   │  ├─ rideRepository.save()
   │  └─ eventPublisher.publish(RIDE_CREATED)
   └─ Response: { id, status: "created" }

2. PASSAGEIRO INICIA BUSCA
   POST /api/passenger/rides/{id}/start-matching
   ├─ RideService.startSearchingForDriver()
   │  ├─ Validar transição (CREATED → SEARCHING_DRIVER)
   │  ├─ Atualizar status
   │  └─ eventPublisher.publish(RIDE_MATCHING_STARTED)
   └─ Response: { status: "searching_driver" }

3. SISTEMA FAZ MATCHING (Background Job - TODO)
   ├─ MatchingService.findBestDriver()
   │  ├─ Pegar motoristas online
   │  ├─ Calcular distância (Haversine)
   │  ├─ Ordenar por score
   │  └─ Retornar: { driverId, distance, eta }
   └─ RideService.assignDriverToRide()
      ├─ Validar transição
      ├─ Atualizar Ride.driverId
      └─ eventPublisher.publish(RIDE_DRIVER_ASSIGNED)

4. MOTORISTA RECEBE NOTIFICAÇÃO (Push)
   ├─ WebSocket / Push Notification
   └─ Motorista vê corrida disponível

5. MOTORISTA ACEITA CORRIDA
   POST /api/driver/rides/{id}/accept
   ├─ Validar ownership
   ├─ eventPublisher.publish(RIDE_DRIVER_ACCEPTED)
   └─ Response: { status: "driver_assigned" }

6. MOTORISTA CHEGA NO PASSAGEIRO
   ├─ Atualizar localização constantemente
   └─ RideService (futuro) → status = DRIVER_APPROACHING

7. MOTORISTA INICIA CORRIDA
   POST /api/driver/rides/{id}/start
   ├─ RideService.startRide()
   │  ├─ Validar transição (DRIVER_ASSIGNED → IN_PROGRESS)
   │  ├─ Atualizar status
   │  ├─ Registrar startedAt
   │  └─ eventPublisher.publish(RIDE_STARTED)
   └─ Response: { status: "in_progress" }

8. MOTORISTA FINALIZA CORRIDA
   POST /api/driver/rides/{id}/finish
   ├─ RideService.finishRide()
   │  ├─ Validar transição (IN_PROGRESS → FINISHED)
   │  ├─ Atualizar status
   │  ├─ Registrar finishedAt
   │  └─ eventPublisher.publish(RIDE_FINISHED)
   └─ Response: { status: "finished" }

9. SISTEMA REALIZA PÓS-PROCESSAMENTO (TODO)
   ├─ Calcular preço final
   ├─ Processar pagamento
   ├─ Enviar recibo (email/SMS)
   ├─ Atualizar rating
   └─ Arquivar corrida
```

---

## 🎓 Conclusão

**Arquitetura pensada para:**
- ✅ Escalabilidade (repositórios plugáveis)
- ✅ Testabilidade (sem dependências externas)
- ✅ Maintainability (separação clara)
- ✅ Evolução (placeholders para features futuras)
- ✅ Resiliência (state machine + timeouts)

**Nunca otimizar prematuramente. Código correto > código rápido.**
