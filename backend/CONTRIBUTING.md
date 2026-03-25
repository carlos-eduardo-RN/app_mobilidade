# 🔧 Guia de Extensão e Contribuição

## Como Adicionar Novas Features

Siga este padrão para manter a arquitetura limpa e testável.

---

## 1. Adicionar Novo Endpoint

### Exemplo: Avaliação da Corrida (Rating)

**Passo 1: Atualizar Model**

```typescript
// src/models/Ride.ts
export interface Ride {
  // ... existing fields
  passengerRating?: number; // 1-5
  driverRating?: number;    // 1-5
  passengerReview?: string;
  driverReview?: string;
}

export interface RateRideDTO {
  rideId: string;
  rating: number;
  review?: string;
  ratedBy: 'passenger' | 'driver';
}
```

**Passo 2: Atualizar Validator**

```typescript
// src/validators/Validators.ts
export class RideValidator {
  static validateRating(rating: number): boolean {
    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      throw new ValidationError('Rating must be integer between 1 and 5');
    }
    return true;
  }
}
```

**Passo 3: Atualizar Service**

```typescript
// src/services/RideService.ts
async rateRide(dto: RateRideDTO): Promise<Ride> {
  Logger.debug('RideService', 'Rating ride', { rideId: dto.rideId, rating: dto.rating });

  const ride = await this.getRideById(dto.rideId);

  // Validações
  RideValidator.isFinalStatus(ride.status);
  RideValidator.validateRating(dto.rating);

  // Atualizar
  const updates = dto.ratedBy === 'passenger'
    ? { passengerRating: dto.rating, passengerReview: dto.review }
    : { driverRating: dto.rating, driverReview: dto.review };

  const updated = await this.rideRepository.update(dto.rideId, updates);

  // Publicar evento
  await this.eventPublisher.publish({
    id: uuidv4(),
    type: EventType.RIDE_RATED,
    aggregateId: dto.rideId,
    aggregateType: 'ride',
    timestamp: new Date(),
    data: { rideId: dto.rideId, rating: dto.rating }
  });

  return updated;
}
```

**Passo 4: Adicionar Event Type**

```typescript
// src/models/Events.ts
export enum EventType {
  // ... existing
  RIDE_RATED = 'ride_rated',
}
```

**Passo 5: Atualizar Controller**

```typescript
// src/controllers/PassengerController.ts
async rateRide(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { rideId } = req.params;
    const passengerId = req.user!.id;
    const { rating, review } = req.body;

    const ride = await this.appService.rideService.getRideById(rideId);

    if (ride.passengerId !== passengerId) {
      res.status(403).json({ error: 'FORBIDDEN' });
      return;
    }

    const rated = await this.appService.rideService.rateRide({
      rideId,
      rating,
      review,
      ratedBy: 'passenger'
    });

    res.status(200).json({ success: true, data: rated });
  } catch (error) {
    next(error);
  }
}
```

**Passo 6: Adicionar Rota**

```typescript
// src/config/Routes.ts
passengerRouter.post('/rides/:rideId/rate', (req, res, next) => 
  passengerController.rateRide(req, res, next)
);
```

**Passo 7: Testar**

```typescript
// tests/rateRide.test.ts
async function testRateRide() {
  // Criar corrida
  // Finalizar corrida
  // Rating na corrida
  // Verificar dados atualizados
}
```

---

## 2. Adicionar Novo Domínio/Aggregado

### Exemplo: Payment Domain

**Passo 1: Criar Modelos**

```typescript
// src/models/Payment.ts
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

export interface Payment {
  id: string;
  rideId: string;
  passengerId: string;
  amount: number;
  status: PaymentStatus;
  paymentMethod: string;
  transactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentDTO {
  rideId: string;
  amount: number;
  paymentMethod: string;
}
```

**Passo 2: Criar Repository Interface**

```typescript
// src/repositories/IRepository.ts
export interface IPaymentRepository extends IRepository<Payment> {
  findByRideId(rideId: string): Promise<Payment | null>;
  findByPassengerId(passengerId: string): Promise<Payment[]>;
  findByStatus(status: PaymentStatus): Promise<Payment[]>;
}
```

**Passo 3: Criar Mock Repository**

```typescript
// src/repositories/MockRepositories.ts
export class MockPaymentRepository extends MockRepository<Payment> implements IPaymentRepository {
  async findByRideId(rideId: string): Promise<Payment | null> {
    const all = await this.findAll();
    return all.find(p => p.rideId === rideId) || null;
  }
  // ... outros métodos
}
```

**Passo 4: Criar Service**

```typescript
// src/services/PaymentService.ts
export class PaymentService {
  constructor(
    private paymentRepository: IPaymentRepository,
    private rideRepository: IRideRepository,
    private eventPublisher: EventPublisher
  ) {}

  async processPayment(dto: CreatePaymentDTO): Promise<Payment> {
    // Validações
    // Criar payment
    // Publicar evento
    // TODO: Integrar com gateway real (Stripe, etc)
  }
}
```

**Passo 5: Integrar em ApplicationService**

```typescript
// src/services/ApplicationService.ts
public paymentService: PaymentService;

constructor(..., paymentRepository: IPaymentRepository, ...) {
  this.paymentService = new PaymentService(
    paymentRepository,
    rideRepository,
    eventPublisher
  );
}
```

---

## 3. Adicionar Novo Evento

### Exemplo: RIDE_TIMEOUT

**Passo 1: Adicionar Event Type**

```typescript
// src/models/Events.ts
export enum EventType {
  // ... existing
  RIDE_TIMEOUT = 'ride_timeout',
}
```

**Passo 2: Publicar Evento no Service**

```typescript
// src/services/RideService.ts
async handleRideTimeout(rideId: string): Promise<void> {
  const ride = await this.getRideById(rideId);
  
  await this.cancelRide({
    rideId,
    cancelledBy: 'system',
    reason: 'Ride timeout'
  });

  await this.eventPublisher.publish({
    id: uuidv4(),
    type: EventType.RIDE_TIMEOUT,
    aggregateId: rideId,
    aggregateType: 'ride',
    timestamp: new Date(),
    data: { rideId }
  });
}
```

**Passo 3: Criar Handler**

```typescript
// src/events/handlers/RideTimeoutHandler.ts
export class RideTimeoutHandler implements EventHandler {
  constructor(
    private logger: Logger,
    private notificationService: NotificationService
  ) {}

  async handle(event: DomainEvent): Promise<void> {
    const rideId = event.data.rideId;
    
    this.logger.info('RideTimeoutHandler', 'Handling ride timeout', { rideId });

    // 1. Liberar motorista
    // 2. Notificar passageiro
    // 3. Arquivar corrida
    // 4. Adicionar à fila de analytics
  }
}
```

**Passo 4: Registrar Handler**

```typescript
// src/index.ts
const rideTimeoutHandler = new RideTimeoutHandler(logger, notificationService);
eventPublisher.subscribe(EventType.RIDE_TIMEOUT, rideTimeoutHandler);
```

---

## 4. Trocar de Mock para Real

### Exemplo: PostgreSQL

**Passo 1: Criar classe Real**

```typescript
// src/repositories/PostgresRideRepository.ts
import { IRideRepository } from './IRepository';
import { Ride } from '../models/Ride';

export class PostgresRideRepository implements IRideRepository {
  constructor(private db: DatabaseClient) {}

  async save(ride: Ride): Promise<Ride> {
    const result = await this.db.query(
      `INSERT INTO rides (id, passenger_id, driver_id, status, ...)
       VALUES ($1, $2, $3, $4, ...)
       RETURNING *`,
      [ride.id, ride.passengerId, ride.driverId, ride.status, ...]
    );
    return mapRowToRide(result.rows[0]);
  }

  async findById(id: string): Promise<Ride | null> {
    const result = await this.db.query(
      'SELECT * FROM rides WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? mapRowToRide(result.rows[0]) : null;
  }

  // ... outros métodos
}
```

**Passo 2: Trocar em index.ts baseado no ambiente**

```typescript
// src/index.ts
let rideRepository: IRideRepository;

if (config.mode === 'mock') {
  rideRepository = new MockRideRepository();
} else {
  const db = new PostgresClient(config.databaseUrl);
  rideRepository = new PostgresRideRepository(db);
}

const appService = new ApplicationService(
  userRepository,
  driverRepository,
  rideRepository,
  // ...
);
```

---

## 5. Adicionar Novo Middleware

### Exemplo: Request Validation

**Passo 1: Criar Middleware**

```typescript
// src/middlewares/ValidateSchema.ts
export function validateSchema(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: error.errors
      });
    }
  };
}
```

**Passo 2: Usar em Rota**

```typescript
// src/config/Routes.ts
import { validateSchema } from '../middlewares/ValidateSchema';

passengerRouter.post(
  '/rides',
  validateSchema(createRideSchema),
  (req, res, next) => passengerController.createRide(req, res, next)
);
```

---

## 6. Adicionar Background Job

### Exemplo: Matching Job

**Passo 1: Criar Job**

```typescript
// src/jobs/MatchingJob.ts
export class MatchingJob {
  constructor(
    private rideService: RideService,
    private matchingService: MatchingService,
    private interval: number = 5000
  ) {}

  start() {
    setInterval(async () => {
      try {
        // 1. Pegar corridas em busca
        const rides = await this.rideService.listRidesByStatus('searching_driver');

        // 2. Para cada corrida, executar matching
        for (const ride of rides) {
          const match = await this.matchingService.findBestDriver({
            passengerLatitude: ride.pickupLocation.latitude,
            passengerLongitude: ride.pickupLocation.longitude,
            maxRadiusKm: 10
          });

          // 3. Se encontrou, atribuir
          if (match) {
            await this.rideService.assignDriverToRide(ride.id, match.matchedDriverId);
          }
        }
      } catch (error) {
        Logger.error('MatchingJob', 'Error', { error });
      }
    }, this.interval);
  }
}
```

**Passo 2: Inicializar em index.ts**

```typescript
// src/index.ts
const matchingJob = new MatchingJob(appService.rideService, appService.matchingService);
matchingJob.start();

Logger.info('Bootstrap', 'Background jobs started');
```

---

## 7. Testes

### Estrutura Recomendada

```
tests/
├── unit/
│   ├── services/
│   │   ├── userService.test.ts
│   │   ├── rideService.test.ts
│   │   └── paymentService.test.ts
│   ├── validators/
│   │   └── validators.test.ts
│   └── utils/
│       └── distanceCalculator.test.ts
├── integration/
│   ├── fullRideFlow.test.ts
│   ├── paymentFlow.test.ts
│   └── matchingFlow.test.ts
├── e2e/
│   ├── passenger.e2e.ts
│   ├── driver.e2e.ts
│   └── admin.e2e.ts
├── mockData.ts
└── fixtures/
    └── sampleRides.ts
```

### Template de Teste

```typescript
// tests/unit/services/paymentService.test.ts
import { PaymentService } from '../../../src/services/PaymentService';
import { MockPaymentRepository } from '../../../src/repositories/MockRepositories';
import { EventPublisher } from '../../../src/events/EventPublisher';

describe('PaymentService', () => {
  let paymentService: PaymentService;
  let paymentRepository: MockPaymentRepository;
  let eventPublisher: EventPublisher;

  beforeEach(() => {
    paymentRepository = new MockPaymentRepository();
    eventPublisher = new EventPublisher();
    paymentService = new PaymentService(paymentRepository, eventPublisher);
  });

  it('should process payment', async () => {
    const payment = await paymentService.processPayment({
      rideId: 'ride123',
      amount: 50.00,
      paymentMethod: 'credit_card'
    });

    expect(payment.status).toBe('completed');
    expect(payment.amount).toBe(50.00);
  });

  it('should reject invalid amount', async () => {
    expect(() => {
      paymentService.processPayment({
        rideId: 'ride123',
        amount: -10,
        paymentMethod: 'credit_card'
      });
    }).toThrow();
  });
});
```

---

## 8. Checklist para Nova Feature

- [ ] Atualizar Models com novos tipos/interfaces
- [ ] Atualizar Validators com regras de negócio
- [ ] Criar/atualizar Service com lógica
- [ ] Atualizar/criar Repository interface e mock
- [ ] Adicionar EventTypes se necessário
- [ ] Publicar eventos do Service
- [ ] Criar/atualizar Controller
- [ ] Adicionar rota em Routes.ts
- [ ] Criar testes unitários
- [ ] Criar testes de integração
- [ ] Atualizar documentação (README, API.md)
- [ ] Testar fluxo completo com curl

---

## 9. Boas Práticas

### ✅ Faça

- Injetar dependências no constructor
- Publicar eventos para mudanças importantes
- Validar em múltiplas camadas (controller → validator → service)
- Usar tipos TypeScript fortes
- Manter Services isolados e testáveis
- Log estruturado com contexto
- Tratar erros explicitamente

### ❌ Não Faça

- Acesso direto a banco no Controller
- Estado global/singletons
- Misturar lógica HTTP com negócio
- Ignore erros de validação
- Código duplicado (DRY principle)
- Transações implícitas
- Hardcode de valores

---

## 10. Performance e Escalabilidade

### Quando adicionar índices
```sql
CREATE INDEX idx_rides_passenger_id ON rides(passenger_id);
CREATE INDEX idx_rides_status ON rides(status);
CREATE INDEX idx_driver_location_driver_id ON driver_locations(driver_id);
```

### Quando usar cache (Redis)
- Localização de motorista (muda frequentemente)
- Metadata de usuário (muda raramente)
- Resultados de matching (curta validade)

### Quando usar fila (RabbitMQ/Kafka)
- Envio de notificações
- Processamento de pagamentos
- Callbacks para APIs externas
- Análise/analytics

---

## 11. Documentação

Adicionar inline comments para:
- Decisões de design
- Lógica complexa
- Placeholders para futuro (TODO)
- Alertas de performance

Exemplo:
```typescript
/**
 * Encontrar motorista por algoritmo de score
 * 
 * Critério: Distância linear (v1)
 * TODO: Implementar fila progressiva com retries
 * 
 * @param criteria - Critério de busca (raio, etc)
 * @returns MatchingResult ou null se nenhum encontrado
 */
async findBestDriver(criteria: MatchingCriteria): Promise<MatchingResult | null> {
  // Implementação...
}
```

---

**Feliz coding! 🚀**
