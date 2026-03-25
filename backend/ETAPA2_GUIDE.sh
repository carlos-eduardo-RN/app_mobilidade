#!/usr/bin/env bash
# ETAPA 2 - Quick Navigation Guide

echo "
╔══════════════════════════════════════════════════════════════════════╗
║                   ETAPA 2 - QUICK NAVIGATION                        ║
║                   Matching Automation Complete!                     ║
╚══════════════════════════════════════════════════════════════════════╝

📚 DOCUMENTAÇÃO
═══════════════════════════════════════════════════════════════════════

  🌟 COMECE AQUI (5 min)
     └─ ETAPA2_EXECUTIVE_SUMMARY.md
        • O que foi feito
        • Quick start
        • Troubleshooting rápido
        • Métricas

  📖 ENTENDA A ARQUITETURA (20 min)
     └─ ETAPA2_MATCHING_AUTOMATION.md
        • Componentes principais
        • Modelos de dados
        • Fluxos completos (4 cenários)
        • Configuração

  🔍 VEJA OS FLUXOS (10 min)
     └─ ETAPA2_VISUAL_FLOWS.md
        • 9 fluxos com ASCII art
        • Timelines
        • Comparação de estratégias
        • State machine

  🛠️  PROBLEMAS? (15 min)
     └─ ETAPA2_TROUBLESHOOTING.md
        • 4 problemas comuns
        • 7 boas práticas
        • Deploy checklist
        • Métricas

  🐛 DEPURE COM CONFIANÇA (15 min)
     └─ ETAPA2_DEBUG_OBSERVABILITY.md
        • Logger estruturado
        • Endpoints admin
        • Simulação de cenários
        • Health check

  📋 ÍNDICE COMPLETO
     └─ ETAPA2_INDEX.md
        • Todos os arquivos listados
        • Organização por tópico
        • Status de conclusão

═══════════════════════════════════════════════════════════════════════

💻 CÓDIGO
═══════════════════════════════════════════════════════════════════════

  📁 ARQUIVOS NOVOS (5)
     ├─ src/jobs/interfaces.ts
     │  └─ Contrato de background jobs
     ├─ src/jobs/JobScheduler.ts
     │  └─ Orquestrador de jobs (~300 linhas)
     ├─ src/jobs/MatchingJob.ts
     │  └─ Job de matching (~200 linhas)
     ├─ src/services/MatchingAutomationService.ts
     │  └─ Automação completa (~400 linhas)
     └─ tests/matchingAutomation.test.ts
        └─ 15+ casos de teste (~300 linhas)

  🔄 ARQUIVOS MODIFICADOS (4)
     ├─ src/models/Matching.ts
     │  └─ + RetryStrategy, AutomationConfig
     ├─ src/models/Events.ts
     │  └─ + 5 novos eventos de automação
     ├─ src/services/RideService.ts
     │  └─ + startAutomatedMatching(), recordDriverRejection()
     └─ src/services/ApplicationService.ts
        └─ + jobScheduler, matchingAutomationService

═══════════════════════════════════════════════════════════════════════

📝 EXEMPLOS
═══════════════════════════════════════════════════════════════════════

  💡 CÓDIGO TYPESCRIPT (10 exemplos)
     └─ examples/matchingAutomationExamples.ts
        ├─ 1. Automação Básica
        ├─ 2. Sucesso
        ├─ 3. Rejeição
        ├─ 4. Event Subscribers
        ├─ 5. Pause/Resume
        ├─ 6. Job Scheduler Status
        ├─ 7. Cleanup & Shutdown
        ├─ 8. Estratégias de Retry
        ├─ 9. Fluxo Completo
        └─ 10. Tratamento de Erros

  🔌 API REST (10 exemplos em curl)
     └─ examples/matchingAutomation.sh
        ├─ 1. Criar Passageiro
        ├─ 2. Criar Motorista
        ├─ 3. Criar Corrida
        ├─ 4. Iniciar Matching
        ├─ 5. Obter Status
        ├─ 6. Ver Eventos
        ├─ 7. Motorista Rejeita
        ├─ 8. Admin - Corridas
        ├─ 9. Cancelar Corrida
        └─ 10. Múltiplas Corridas

═══════════════════════════════════════════════════════════════════════

🧪 TESTES
═══════════════════════════════════════════════════════════════════════

  Rodar todos:
  \$ npm test -- tests/matchingAutomation.test.ts

  Com cobertura:
  \$ npm test -- --coverage tests/matchingAutomation.test.ts

  Casos cobertos:
  ✅ Start automation
  ✅ Publish events
  ✅ Pause/Resume
  ✅ Expand radius
  ✅ Record rejection
  ✅ Complete flow
  ✅ Job scheduling
  ✅ Disable automation

═══════════════════════════════════════════════════════════════════════

⚡ QUICK START (5 MINUTOS)
═══════════════════════════════════════════════════════════════════════

  1️⃣  Instalar dependências
      \$ npm install

  2️⃣  Configurar .env
      \$ echo \"MATCHING_AUTOMATION_ENABLED=true\" >> .env

  3️⃣  Iniciar servidor
      \$ npm run dev

  4️⃣  Testar (em outro terminal)
      \$ bash examples/matchingAutomation.sh

  5️⃣  Monitorar jobs
      \$ curl http://localhost:3000/api/admin/jobs

═══════════════════════════════════════════════════════════════════════

🎯 CONCEITOS-CHAVE
═══════════════════════════════════════════════════════════════════════

  🔄 Retry Strategy
     └─ LINEAR: 15s, 30s, 45s, 60s
     └─ EXPONENTIAL: 15s, 30s, 60s, 120s ⭐ Recomendado
     └─ FIBONACCI: 15s, 15s, 30s, 45s, 75s

  📊 Estado de Automação
     └─ PENDING → IN_PROGRESS → MATCHED/FAILED/TIMEOUT

  🎪 Expansão de Raio
     └─ Tentativa 1: 3km → Sem motorista
     └─ Tentativa 2: 4km → Sem motorista
     └─ Tentativa 3: 5km → Motorista encontrado ✅

  ⏱️  Timeouts
     └─ Global: 60s (máximo total)
     └─ Job: 30s (por tentativa)
     └─ Attempts: 4 (máximo)

  📢 Eventos Publicados
     └─ MATCHING_STARTED
     └─ MATCHING_ATTEMPT
     └─ MATCHING_FAILED
     └─ DRIVER_ASSIGNED
     └─ DRIVER_REJECTED

═══════════════════════════════════════════════════════════════════════

✅ CHECKLIST DE VERIFICAÇÃO
═══════════════════════════════════════════════════════════════════════

  Básico
  ☐ Código compila: npm run build
  ☐ Testes passam: npm test
  ☐ Servidor inicia: npm run dev

  Funcionalidade
  ☐ Exemplos funcionam
  ☐ API curl funciona
  ☐ Debug endpoints retornam dados
  ☐ Logs aparecem corretamente

  Produção
  ☐ .env configurado corretamente
  ☐ MATCHING_TIMEOUT_SECONDS > delays acumulados
  ☐ Motoristas online em teste
  ☐ Memory não cresce indefinidamente
  ☐ Alertas configurados

═══════════════════════════════════════════════════════════════════════

🚨 TROUBLESHOOTING RÁPIDO
═══════════════════════════════════════════════════════════════════════

  ❌ Sem motorista encontrado?
     ✅ Aumentar MATCHING_EXPAND_RADIUS_KM ou MATCHING_MAX_RADIUS_KM

  ❌ Timeout muito rápido?
     ✅ Aumentar MATCHING_TIMEOUT_SECONDS

  ❌ Rejeição não funciona?
     ✅ Verificar handleDriverRejected() é chamado

  ❌ Memory crescendo?
     ✅ Chamar cleanupAutomationState() após finalizar

═══════════════════════════════════════════════════════════════════════

📊 MÉTRICAS DE PRODUÇÃO
═══════════════════════════════════════════════════════════════════════

  Monitore:
  • Taxa de sucesso: deve ser > 95%
  • Tempo médio: deve ser < 30s
  • Taxa de rejeição: deve ser < 5%
  • Taxa de timeout: deve ser < 2%

  Alertas se:
  • Taxa de sucesso < 80%
  • Tempo médio > 60s
  • Taxa de rejeição > 15%
  • Taxa de timeout > 10%

═══════════════════════════════════════════════════════════════════════

🔗 PRÓXIMO PASSO
═══════════════════════════════════════════════════════════════════════

  ETAPA 3 - Timeout Handling ⏱️
  └─ Driver accept timeout (30s)
  └─ Matching timeout avançado
  └─ Ride inactivity timeout (5m)
  └─ Cleanup de corridas expiradas

═══════════════════════════════════════════════════════════════════════

📞 PRECISA DE AJUDA?
═══════════════════════════════════════════════════════════════════════

  Iniciante?
  → Leia: ETAPA2_EXECUTIVE_SUMMARY.md

  Desenvolvedor?
  → Leia: ETAPA2_MATCHING_AUTOMATION.md

  Problema específico?
  → Leia: ETAPA2_TROUBLESHOOTING.md

  Quer debugar?
  → Leia: ETAPA2_DEBUG_OBSERVABILITY.md

  Vendo fluxos?
  → Leia: ETAPA2_VISUAL_FLOWS.md

═══════════════════════════════════════════════════════════════════════

✨ BEM-VINDO À ETAPA 2! ✨

  Você tem agora:
  ✅ Automação completa de matching
  ✅ Background job scheduler
  ✅ 3 estratégias de retry
  ✅ Reatribuição automática
  ✅ Sistema robusto de timeouts
  ✅ Event-driven architecture
  ✅ Observabilidade total
  ✅ 15+ testes
  ✅ Documentação completa

═══════════════════════════════════════════════════════════════════════

Vamos começar? 🚀

1. Leia: ETAPA2_EXECUTIVE_SUMMARY.md
2. Explore: examples/matchingAutomationExamples.ts
3. Teste: npm test
4. Deploy: npm run dev

Boa sorte! 🎯

═══════════════════════════════════════════════════════════════════════
"
