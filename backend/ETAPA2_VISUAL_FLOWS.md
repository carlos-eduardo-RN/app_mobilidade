# ETAPA 2 - Fluxos Visuais Detalhados

## 🎬 Fluxo 1: Matching com Sucesso (2 tentativas)

```
PASSAGEIRO CRIA CORRIDA
         │
         ▼
┌─────────────────────────────────────┐
│ Corrida: CREATED                    │
│ Localização: Av. Paulista, São Paulo│
└─────────────────────┬───────────────┘
                      │
                      ▼
             ⏱️ T=0s (Agora)
             
        PASSAGEIRO CLICA
        "PROCURAR MOTORISTA"
                      │
                      ▼
┌─────────────────────────────────────┐
│ startAutomatedMatching()            │
│ Status: CREATED → SEARCHING_DRIVER  │
│ Evento: RIDE_MATCHING_STARTED       │
└─────────────────────┬───────────────┘
                      │
                      ▼
        MatchingAutomationService
        .startAutomation()
                      │
                      ▼
             ⏱️ T=0s (Tentativa 1)
             
    Raio: 3km
    Candidatos: [ ]  (nenhum)
    ❌ Sem motorista
             │
             ├─ Expandir raio: 3km → 4km
             ├─ Calcular delay: LINEAR = 15s
             ├─ Evento: MATCHING_ATTEMPT
             └─ Agendar próxima tentativa
             
                      │
                      ▼
             ⏱️ T=15s (Aguardando)
             
            [...]  aguardando scheduler
             
                      │
                      ▼
             ⏱️ T=15s (Tentativa 2)
             
    Raio: 4km
    Candidatos:
      ├─ driver-1 (3.5km) score: 85 ⭐
      ├─ driver-2 (3.8km) score: 80
      └─ driver-3 (4.0km) score: 75
      
    ✅ Motorista encontrado: driver-1
             │
             ├─ Evento: DRIVER_ASSIGNED
             ├─ Status: SEARCHING_DRIVER → DRIVER_ASSIGNED
             └─ Notificar driver-1
             
                      │
                      ▼
        ⏱️ T=16s (Sucesso!)
        
┌─────────────────────────────────────┐
│ Corrida Atribuída                   │
│ Passageiro: João Silva              │
│ Motorista: Maria Santos (driver-1)  │
│ Distância: 3.5km                    │
│ ETA: 8 minutos                      │
│ Tentativas: 2                       │
│ Tempo total: 16s                    │
└─────────────────────────────────────┘

RESULTADO: ✅ SUCESSO em 2 tentativas (16s)
```

---

## 🔄 Fluxo 2: Motorista Rejeita e Reatribui

```
[Continuando do Fluxo 1 - Corrida atribuída a driver-1]

        ⏱️ T=16s (Atribuída)
        
┌─────────────────────────────────────┐
│ Motorista (driver-1) REJEITA        │
│ Motivo: "Não vou nessa direção"     │
└─────────────────────┬───────────────┘
                      │
                      ▼
    DriverController.rejectRide()
             │
             ├─ Evento: RIDE_DRIVER_REJECTED
             └─ Chamar: handleDriverRejected()
             
                      │
                      ▼
    matchingAutomationService
    .handleDriverRejected(rideId, 'driver-1')
                      │
         ┌────────────┼────────────┐
         │            │            │
         ▼            ▼            ▼
    rejectedIds    currentAttempt  nextRetry
    .add(driver-1)  = 3            Sim ✓
    
         Status: IN_PROGRESS
         
         (currentAttempt < maxAttempts?)
         (3 < 4) ✅ SIM → Reatribuir
                      │
                      ▼
         ⏱️ T=17s (Tentativa 3)
         
    Raio: 5km
    Candidatos (excluindo driver-1):
      ├─ driver-2 (3.8km) score: 80 ⭐
      ├─ driver-3 (4.0km) score: 75
      └─ driver-4 (4.5km) score: 70
      
    ✅ Próximo melhor: driver-2
             │
             ├─ Evento: DRIVER_ASSIGNED
             ├─ Status: DRIVER_ASSIGNED (ainda)
             └─ Notificar driver-2
             
                      │
                      ▼
        ⏱️ T=18s (Nova Atribuição!)
        
┌─────────────────────────────────────┐
│ Corrida Reatribuída                 │
│ Motorista anterior: driver-1 ❌     │
│ Novo motorista: driver-2 ✅         │
│ Distância: 3.8km                    │
│ ETA: 9 minutos                      │
│ Tentativas: 3                       │
│ Motoristas rejeitados: 1            │
└─────────────────────────────────────┘

RESULTADO: ✅ REATRIBUÍDO após rejeição (2s)
```

---

## ⏳ Fluxo 3: Timeout - Sem Motoristas

```
[Começando novo matching]

        ⏱️ T=0s (Tentativa 1)
        Raio: 3km
        Candidatos: [ ]  ❌
        
                      │
                      ▼
        ⏱️ T=15s (Tentativa 2)
        Raio: 4km
        Candidatos: [ ]  ❌
        
                      │
                      ▼
        ⏱️ T=45s (Tentativa 3)
        Raio: 5km
        Candidatos: [ ]  ❌
        
                      │
                      ▼
        ⏱️ T=90s (Tentativa 4)
        
        ⚠️ TIMEOUT GLOBAL ATINGIDO (60s)
        ⚠️ RAIO MÁXIMO (5km) ATINGIDO
        ⚠️ MAX TENTATIVAS (4) ATINGIDAS
        
                      │
                      ▼
    handleMatchingFailed()
             │
             ├─ Status: FAILED
             ├─ Evento: MATCHING_FAILED
             └─ RideService.cancelRide()
             
                      │
                      ▼
        ⏱️ T=91s (Falha!)
        
┌─────────────────────────────────────┐
│ Matching Falhou                     │
│ Motivo: Nenhum motorista disponível │
│ Tentativas: 4                       │
│ Raio máximo: 5km                    │
│ Tempo total: 91s                    │
│ Ação: Corrida CANCELADA             │
└─────────────────────────────────────┘

✉️ Notificação enviada ao passageiro:
   "Desculpe, nenhum motorista disponível
    no momento. Crédito reembolsado."

RESULTADO: ❌ FALHA após 4 tentativas (91s)
```

---

## 🎯 Fluxo 4: Múltiplas Tentativas com Estratégias

### Estratégia: LINEAR

```
Tentativa │ Delay │ Acum | Raio │ Resultado
──────────────────────────────────────────
   1      │  0s   │ 0s   │ 3km  │ ❌ Sem motorista
   2      │ 15s   │ 15s  │ 4km  │ ❌ Sem motorista
   3      │ 30s   │ 45s  │ 5km  │ ❌ Sem motorista
   4      │ 45s   │ 90s  │ 6km  │ ⏱️ TIMEOUT em 60s

❌ FALHA: Timeout antes da 4ª tentativa completar
   Tempo total: 60s
   Tentativas completadas: 3
```

### Estratégia: EXPONENTIAL ⭐

```
Tentativa │ Delay │ Acum  │ Raio │ Resultado
────────────────────────────────────────────
   1      │  0s   │  0s   │ 3km  │ ❌ Sem motorista
   2      │ 15s   │ 15s   │ 4km  │ ❌ Sem motorista
   3      │ 30s   │ 45s   │ 5km  │ ✅ ENCONTROU!
   4      │ 60s   │ 105s  │ 6km  │ (não executa)

✅ SUCESSO: Motorista encontrado na 3ª tentativa
   Tempo total: 46s
   Tentativas: 3
```

### Estratégia: FIBONACCI

```
Tentativa │ Delay │ Acum │ Raio │ Resultado
─────────────────────────────────────────
   1      │  0s   │ 0s   │ 3km  │ ❌ Sem motorista
   2      │ 15s   │ 15s  │ 4km  │ ❌ Sem motorista
   3      │ 15s   │ 30s  │ 5km  │ ✅ ENCONTROU!
   4      │ 30s   │ 60s  │ 6km  │ (timeout no 4º)

✅ SUCESSO: Motorista encontrado na 3ª tentativa
   Tempo total: 31s
   Tentativas: 3
```

---

## 🔌 Fluxo 5: Arquitetura de Eventos

```
┌──────────────────────────────────────┐
│ RideService                          │
│ .startAutomatedMatching()            │
└───────────────┬──────────────────────┘
                │
                ▼
        RIDE_MATCHING_STARTED
                │
        ┌───────┼───────┬──────────────┐
        │       │       │              │
        ▼       ▼       ▼              ▼
    NotifyPass  Log   Analytics  WebSocket
    enger              Handler    Push
        
┌──────────────────────────────────────┐
│ MatchingAutomationService            │
│ .startAutomation()                   │
└───────────────┬──────────────────────┘
                │
        ┌───────┴───────┐
        │               │
        ▼               ▼
    MATCHING_STARTED   Agendar
                       Job
                       │
        ┌──────────────┴──────────────┐
        │              │              │
        ▼              ▼              ▼
    Logging     WebSocket    Analytics
                 Passenger      Event
                
┌──────────────────────────────────────┐
│ MatchingJob                          │
│ .execute()                           │
└───────────────┬──────────────────────┘
                │
        ┌───────┴───────────┬──────────┐
        │                   │          │
        ▼                   ▼          ▼
    MATCHING_ATTEMPT   DRIVER_ASSIGNED FAILED
        │                   │          │
        │       ┌───────────┤          │
        │       │           │          │
        └─┐ ┌─┐ └─┐ ┌─┐ ┌─┐ └─┐ ┌─┐ ┌─┐ ┌─┐
          │ │ │   │ │ │ │ │   │ │ │ │ │ │ │
        Notif Log Notif SMS Email  SMS SMS Email
        Pass       Driver   Event   Event Event
                           Logger  Handler Handler
```

---

## 🎛️ Fluxo 6: Job Scheduler - Execução de Jobs

```
╔════════════════════════════════════════════╗
║ JobScheduler.schedule()                    ║
║ Agendado para: T+15s                       ║
╚═────────────────┬─────────────────────────╝
                  │
                  ▼
         ┌──────────────┐
         │ PENDING      │
         └─────┬────────┘
               │
         [Aguardando 15s]
               │
               ▼
         ┌──────────────┐
         │ RUNNING      │
         └─────┬────────┘
               │
               ▼
        MatchingJob
        .execute()
               │
        ┌──────┴──────┐
        │             │
        ▼             ▼
    SUCCESS       FAILURE
        │             │
        ├─ result OK  ├─ shouldRetry?
        │             │
        │    ┌────────┼────────┐
        │    │        │        │
        │    ▼        ▼        ▼
        │  NO    YES (Retry)
        │    │        │
        │    │        ▼
        │    │   NEW JOB
        │    │   delay=30s
        │    │
        ▼    ▼
    ┌──────────────┐
    │ COMPLETED    │
    └──────────────┘
         │
         ▼
    Cleanup
    (após 24h)
```

---

## 📊 Fluxo 7: State Machine Completa

```
                ┌─────────────┐
                │   CREATED   │ ◄── Corrida criada
                └────────┬────┘
                         │
                    Chamar
                 startAutomated
                  Matching()
                         │
                         ▼
            ┌─────────────────────────┐
            │  SEARCHING_DRIVER       │ ◄── Automação inicia
            │  [MatchingAutomation    │
            │   running]              │
            └──┬──────────────┬───────┘
               │              │
        ┌──────┘              └──────┐
        │                            │
        ▼                            ▼
    Motorista         Timeout/Nenhum
    Encontrado        Motorista
        │                            │
        ▼                            ▼
    ┌─────────────────┐    ┌──────────────────┐
    │ DRIVER_ASSIGNED │    │ CANCELLED_TIMEOUT│
    └────────┬────────┘    └──────────────────┘
             │
      Motorista
      Aceita?
        │    │
     ┌──┴────┴──┐
     │          │
    SIM        NÃO
     │          │
     ▼          ▼
    ┌──────────────────┐    ┌──────────────────┐
    │ IN_PROGRESS      │    │ CANCELLED_BY_    │
    │                  │    │ DRIVER           │
    │ (Viagem ativa)   │    └──────────────────┘
    └────────┬─────────┘
             │
        Passeio
        Finaliza
             │
             ▼
        ┌──────────────┐
        │   FINISHED   │ ◄── Viagem concluída
        └──────────────┘
```

---

## 🎓 Fluxo 8: Decisão - Qual Estratégia Usar?

```
                         START
                           │
                           ▼
                      Qual ambiente?
                    /          |           \
                   /           |            \
              PROD?         TEST?         DEV?
              /               |             \
             ▼                ▼              ▼
      Alta carga?      Teste rápido?   Debugging?
        / \             / \             /  \
       /   \           /   \           /    \
      SIM   NÃO       SIM   NÃO       SIM   NÃO
       │     │        │     │         │     │
       │     ▼        │     ▼         │     ▼
       │   EXPO/LIN   │   LINEAR      │   LINEAR
       │     │        │     │         │     │
       ▼     ▼        ▼     ▼         ▼     ▼
   EXPONENTIAL   FIBONACCI  LINEAR  LINEAR  EXPO
   
   Concluir com:
   └─ Configurar delays baseado em strategy
   └─ Monitorar métricas
   └─ Ajustar conforme necessário
```

---

## 📈 Fluxo 9: Monitoramento em Tempo Real

```
GET /api/admin/automation/:rideId (Real-time)

┌─────────────────────────────────────────────┐
│ Ride: ride-123                              │
│ Status: IN_PROGRESS                         │
│ Passenger: João Silva                       │
├─────────────────────────────────────────────┤
│ Automação                                   │
│  Tentativa atual: 2/4                       │
│  Raio: 4km (inicial: 3km)                   │
│  Próxima tentativa: T+12s                   │
├─────────────────────────────────────────────┤
│ Motoristas Rejeitados                       │
│  [driver-1] Rejeitou em T=15s               │
├─────────────────────────────────────────────┤
│ Timeline                                    │
│  T=0s:  MATCHING_STARTED                    │
│  T=1s:  MATCHING_ATTEMPT (tentativa 1)      │
│  T=15s: DRIVER_REJECTED (driver-1)          │
│  T=16s: MATCHING_ATTEMPT (tentativa 2)      │
│  T=??s: (aguardando resultado)              │
├─────────────────────────────────────────────┤
│ Eventos                                     │
│  ▪ matching_started                         │
│  ▪ matching_attempt (x2)                    │
│  ▪ driver_rejected                          │
└─────────────────────────────────────────────┘
```

---

**Visualizações criadas! Próximo: Exemplos práticos de código e debugging** 🎬
