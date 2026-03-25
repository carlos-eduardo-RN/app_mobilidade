# 📊 Diagramas da Arquitetura

## 1. Arquitetura de Camadas

```
┌───────────────────────────────────────────────────────┐
│                     HTTP Clients                       │
│    (Mobile Passenger | Mobile Driver | Web Admin)     │
└─────────────────────────┬─────────────────────────────┘
                          │
                          ▼
┌───────────────────────────────────────────────────────┐
│              HTTP Layer (Express.js)                   │
│  Controllers (Passenger | Driver | Admin)             │
│  + Middlewares (Auth | Logging | Error | RateLimit)   │
└─────────────────────────┬─────────────────────────────┘
                          │
                          ▼
┌───────────────────────────────────────────────────────┐
│          Application Service Layer                     │
│  (Dependency Injection + Initialization)              │
└─────────────────────────┬─────────────────────────────┘
                          │
                          ▼
┌───────────────────────────────────────────────────────┐
│     Domain Service Layer ⭐ (Core Logic)               │
│  - UserService          (Users & Validation)          │
│  - DriverService        (Status & Location)           │
│  - RideService          (State Machine)               │
│  - MatchingService      (Algorithm)                   │
└─────────────────────────┬─────────────────────────────┘
                          │
                    ┌─────┴─────┐
                    │           │
                    ▼           ▼
            ┌──────────┐   ┌──────────┐
            │Validators│   │Events    │
            │(Business)│   │Publisher │
            └──────────┘   └──────────┘
                    │           │
                    └─────┬─────┘
                          │
                          ▼
┌───────────────────────────────────────────────────────┐
│      Repository Layer (Abstraction)                    │
│  Interfaces:                                           │
│  - IUserRepository      - IDriverRepository            │
│  - IRideRepository      - ILocationRepository          │
│  - IDriverStatusRepository                             │
└─────────────────────────┬─────────────────────────────┘
                          │
            ┌─────────────┴─────────────┐
            │                           │
            ▼                           ▼
    ┌──────────────┐          ┌──────────────┐
    │ MOCK Mode    │          │ REAL Mode    │
    │ (Dev/Test)   │          │ (Production) │
    └──────────────┘          └──────────────┘
            │                           │
            ▼                           ▼
    ┌──────────────┐          ┌──────────────┐
    │ In-Memory    │          │ PostgreSQL   │
    │ Maps         │          │ + Redis      │
    └──────────────┘          └──────────────┘
```

---

## 2. Estado Machine: Ride Status

```
                        ┌─ CREATED ─┐
                        │           │
                        └─────┬─────┘
                              │
                              ▼
                    ┌─ SEARCHING_DRIVER ─┐
                    │                    │
              ┌─────┴────┬───────────┬───┘
              │          │           │
              ▼          ▼           ▼
    CANCELLED_    DRIVER_    CANCELLED_
    TIMEOUT       ASSIGNED   BY_PASSENGER
                    │
                    ▼
            ┌─ DRIVER_APPROACHING ─┐
            │                      │
       ┌────┴───┬──────────────┬───┘
       │        │              │
       ▼        ▼              ▼
    CANCELLED_  IN_       CANCELLED_
    BY_DRIVER   PROGRESS  BY_PASSENGER
                  │
                  ▼
            ┌─ IN_PROGRESS ─┐
            │               │
       ┌────┴──┬────────┬──┘
       │       │        │
       ▼       ▼        ▼
    CANCELLED_ FINISHED CANCELLED_
    BY_DRIVER         BY_PASSENGER


┌──────────────────────────────────────┐
│         Estados Finais               │
├──────────────────────────────────────┤
│ • FINISHED                           │
│ • CANCELLED_BY_PASSENGER             │
│ • CANCELLED_BY_DRIVER                │
│ • CANCELLED_TIMEOUT                  │
│ • ERROR                              │
└──────────────────────────────────────┘
```

---

## 3. Estado Machine: Driver Status

```
    ┌─────────────┐
    │   OFFLINE   │ ◄─┐
    └──────┬──────┘   │
           │          │
           ▼          │
    ┌─────────────┐   │
    │    ONLINE   │──┐├─────────┐
    └──────┬──────┘  ││         │
           │         │▼         │
     ┌─────┴┬───┐    ││    ┌────┴──┐
     │      │   │    ││    │       │
     ▼      ▼   │    └┼──┐ ▼       │
    BUSY  ON_   │      │ ┌┴─────┐  │
          BREAK │      └─┤ OFF  │  │
                │        └──────┘  │
                └──────────────────┘
```

---

## 4. Fluxo HTTP: Criar Corrida

```
┌──────────────┐
│ Passageiro   │
│ Móvel App    │
└────────┬─────┘
         │ POST /api/passenger/rides
         │ {pickup, dropoff}
         ▼
┌──────────────────────────────────────────────┐
│ HTTP Layer (Express)                         │
├──────────────────────────────────────────────┤
│ 1. loggingMiddleware      → Log requisição   │
│ 2. authMiddleware         → Validar token    │
│ 3. PassengerController    → Parse input      │
│ 4. validateRequestBody    → Validar schema   │
└────────┬─────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│ Application Service Layer                    │
├──────────────────────────────────────────────┤
│ appService.rideService.createRide()          │
└────────┬─────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│ RideService (Domain)                         │
├──────────────────────────────────────────────┤
│ 1. Validar passageiro existe                 │
│ 2. Validar coordenadas                       │
│ 3. Criar Ride(status=CREATED)                │
│ 4. rideRepository.save()                     │
│ 5. eventPublisher.publish(RIDE_CREATED)      │
└────────┬─────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│ Repository Layer                             │
├──────────────────────────────────────────────┤
│ MockRideRepository.save(ride)                │
│ → this.store.set(ride.id, ride)              │
└────────┬─────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│ Event System                                 │
├──────────────────────────────────────────────┤
│ subscribers.get(RIDE_CREATED).forEach(...)   │
│ → handler.handle(event)                      │
└────────┬─────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│ HTTP Response (201)                          │
├──────────────────────────────────────────────┤
│ {                                            │
│   success: true,                             │
│   data: { id, status, pickup, dropoff, ... } │
│ }                                            │
└────────┬─────────────────────────────────────┘
         │
         ▼
┌──────────────┐
│ Passageiro   │
│ Recebe ID    │
└──────────────┘
```

---

## 5. State Transition Validation

```
User wants to:
  transition from state A to state B

         │
         ▼
  ┌─────────────────┐
  │ RideValidator   │
  │.validateState   │
  │Transition()     │
  └────────┬────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
  VALID      INVALID
    │             │
    ▼             ▼
Update        Throw
Status     StateTransition
           Error (409)
    │
    ▼
Publish
Event
```

---

## 6. Matching Algorithm Flow

```
┌──────────────────────────────────┐
│ Matching Request                 │
│ {passengerLat, passengerLng,     │
│  maxRadius, criteria...}         │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ Get all active drivers           │
│ driverRepository.findAll()       │
└────────────┬─────────────────────┘
             │
             ▼
   ┌─────────────────────┐
   │ For each driver:    │
   ├─────────────────────┤
   │ 1. Get location     │
   │ 2. Calculate dist   │ ◄─ Haversine
   │ 3. Check radius     │
   │ 4. Calculate score  │
   │ 5. Add to list      │
   └────────────┬────────┘
                │
                ▼
┌──────────────────────────────────┐
│ Sort by score (desc)             │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ Return best match                │
│ {driverId, distance, eta}        │
└──────────────────────────────────┘
```

---

## 7. Event-Driven Communication

```
┌─────────────────────┐
│ RideService         │
│ (publishes events)  │
└────────────┬────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌─────────┐      ┌─────────┐
│ Event   │      │ Event   │
│Pub      │      │Pub      │
│lisher  │      │lisher  │
└────┬────┘      └────┬────┘
     │                │
     ▼                ▼
 RIDE_       RIDE_
 CREATED    FINISHED
     │                │
     ▼                ▼
┌─────────────────────────────┐
│ Subscribers (Handlers)      │
├─────────────────────────────┤
│ • NotificationHandler       │
│ • AnalyticsHandler          │
│ • PaymentHandler            │
│ • ARatingHandler            │
└─────────────────────────────┘
     │                │
     ▼                ▼
 [Send    [Process
  SMS]     Payment]
```

---

## 8. Data Flow: Complete Ride

```
START
  │
  ├─ Passenger creates ride
  │  ├─ Controller validates input
  │  ├─ RideService creates Ride(CREATED)
  │  ├─ Repository saves
  │  └─ EventPublisher sends RIDE_CREATED
  │
  ├─ Passenger starts matching
  │  ├─ RideService.startSearchingForDriver()
  │  ├─ Status: CREATED → SEARCHING_DRIVER
  │  └─ EventPublisher sends RIDE_MATCHING_STARTED
  │
  ├─ System finds best driver [Background Job]
  │  ├─ MatchingService.findBestDriver()
  │  ├─ RideService.assignDriverToRide()
  │  ├─ Status: SEARCHING_DRIVER → DRIVER_ASSIGNED
  │  └─ EventPublisher sends RIDE_DRIVER_ASSIGNED
  │
  ├─ Driver accepts ride
  │  └─ EventPublisher sends RIDE_DRIVER_ACCEPTED
  │
  ├─ Driver updates location (N times)
  │  ├─ DriverService.updateDriverLocation()
  │  └─ EventPublisher sends DRIVER_LOCATION_UPDATED
  │
  ├─ Driver starts ride
  │  ├─ RideService.startRide()
  │  ├─ Status: DRIVER_ASSIGNED → IN_PROGRESS
  │  └─ EventPublisher sends RIDE_STARTED
  │
  ├─ Driver updates location (N times)
  │  └─ EventPublisher sends DRIVER_LOCATION_UPDATED
  │
  ├─ Driver finishes ride
  │  ├─ RideService.finishRide()
  │  ├─ Status: IN_PROGRESS → FINISHED
  │  └─ EventPublisher sends RIDE_FINISHED
  │
  ├─ Post-processing [Background Jobs]
  │  ├─ Process payment
  │  ├─ Send receipt
  │  ├─ Update driver rating
  │  └─ Archive ride
  │
  └─ END ✅
```

---

## 9. Dependency Injection Pattern

```
┌─────────────────────────────────────┐
│ index.ts (Main Entry Point)         │
├─────────────────────────────────────┤
│                                     │
│ // 1. Create repositories           │
│ userRepository = new Mock...()      │
│ rideRepository = new Mock...()      │
│                                     │
│ // 2. Create event publisher       │
│ eventPublisher = new Event...()     │
│                                     │
│ // 3. Create application service   │
│ appService = new Application...({  │
│   userRepository,                   │
│   rideRepository,                   │
│   eventPublisher                    │
│ })                                  │
│                                     │
│ // 4. Pass to routes                │
│ setupRoutes(app, appService)        │
│                                     │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ ApplicationService                  │
├─────────────────────────────────────┤
│                                     │
│ this.rideService = new RideService({│
│   rideRepository,                   │
│   userRepository,                   │
│   eventPublisher,                   │
│   driverService,                    │
│   matchingService                   │
│ })                                  │
│                                     │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ RideService                         │
├─────────────────────────────────────┤
│                                     │
│ async createRide(dto) {             │
│   // use this.rideRepository        │
│   // use this.eventPublisher        │
│ }                                   │
│                                     │
└─────────────────────────────────────┘
```

---

## 10. Test Coverage

```
┌──────────────────────────────────────────────┐
│ Tests                                        │
├──────────────────────────────────────────────┤
│                                              │
│ Unit Tests                                   │
│ ├─ UserService                               │
│ ├─ RideService (state transitions)           │
│ └─ Validators                                │
│                                              │
│ Integration Tests                            │
│ ├─ Full ride flow (create → finish)          │
│ ├─ Matching flow                             │
│ └─ Error scenarios                           │
│                                              │
│ E2E Tests (TODO)                             │
│ ├─ Passenger app flow                        │
│ ├─ Driver app flow                           │
│ └─ Admin panel flow                          │
│                                              │
└──────────────────────────────────────────────┘
```

---

## 11. Mode Switching (Mock ↔ Real)

```
                    config.mode
                       │
            ┌──────────┴──────────┐
            │                     │
            ▼                     ▼
        'mock'                'real'
            │                     │
            ▼                     ▼
    ┌───────────────┐     ┌───────────────┐
    │ MockRide      │     │ PostgresRide  │
    │ Repository    │     │ Repository    │
    └───────┬───────┘     └───────┬───────┘
            │                     │
            ▼                     ▼
        In-Memory            Database
        (Maps)               (PostgreSQL)
         │                      │
         │  IRepository         │
         │  (interface)         │
         │◄─────────────────────┤
         │
         └─ Same code, different implementation
```

---

**Diagrams created for VouDeMoto Backend Architecture**
