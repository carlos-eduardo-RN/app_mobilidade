# Plano de Disaster Recovery - VouDeMoto Backend

## Visão Geral

Este documento estabelece o plano de recuperação de desastres (DR) para garantir a continuidade dos negócios em caso de falhas catastróficas.

## Objetivos de Recuperação

### RTO (Recovery Time Objective)
- **Crítico**: 15 minutos
- **Alto**: 1 hora
- **Médio**: 4 horas
- **Baixo**: 24 horas

### RPO (Recovery Point Objective)
- **Banco de Dados**: 5 minutos (replicação contínua)
- **Arquivos**: 1 hora (backup incremental)
- **Logs**: 15 minutos (streaming)
- **Configurações**: 0 minutos (versionado em Git)

### SLA de Disponibilidade
- **Target**: 99.95% uptime
- **Downtime permitido/mês**: 21,6 minutos
- **Downtime permitido/ano**: 4,38 horas

## Classificação de Serviços

### Tier 1 - Crítico (RTO: 15min)
- ✅ API Backend
- ✅ Banco de Dados (PostgreSQL)
- ✅ Cache (Redis)
- ✅ Autenticação (JWT)
- ✅ Sistema de Corridas em tempo real

### Tier 2 - Alto (RTO: 1h)
- ⚠️ Sistema de Pagamentos
- ⚠️ Notificações Push
- ⚠️ Sistema de Avaliações
- ⚠️ Analytics em tempo real

### Tier 3 - Médio (RTO: 4h)
- 📊 Dashboard Administrativo
- 📊 Relatórios
- 📊 Logs históricos
- 📊 Backup de dados

### Tier 4 - Baixo (RTO: 24h)
- 📋 Documentação
- 📋 Ferramentas de desenvolvimento
- 📋 Ambientes de teste

## Cenários de Disaster

### 1. Falha de Zona de Disponibilidade (AZ)

**Probabilidade**: Baixa (< 0.1% ao ano)  
**Impacto**: Médio  
**RTO**: 5 minutos (automático)  
**RPO**: 0 minutos

#### Detecção
- Health checks do Load Balancer
- Métricas de pods não responsivos
- Alertas de Prometheus

#### Resposta Automática
```yaml
1. Load Balancer detecta falha de AZ
2. Remove pods da AZ com falha do pool
3. HPA aumenta réplicas nas AZs saudáveis
4. Tráfego é redistribuído automaticamente
```

#### Verificação
- Confirmar tráfego distribuído entre AZs restantes
- Verificar logs de failover
- Monitorar métricas de performance

#### Recuperação
- Investigar causa raiz da falha
- Aguardar AWS resolver problemas de AZ
- Reativar pods na AZ recuperada gradualmente

---

### 2. Falha de Região AWS

**Probabilidade**: Muito Baixa (< 0.01% ao ano)  
**Impacto**: Crítico  
**RTO**: 30 minutos (manual)  
**RPO**: 5 minutos

#### Detecção
- Alertas de múltiplas AZs falhando
- Notificação AWS Health Dashboard
- Perda total de conectividade com região

#### Resposta Manual
```bash
# 1. Ativar região DR (us-west-2)
kubectl config use-context production-dr

# 2. Promover réplica de leitura para primário
aws rds promote-read-replica \
  --db-instance-identifier voudemoto-db-dr \
  --region us-west-2

# 3. Atualizar DNS para apontar para DR
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456789 \
  --change-batch file://dns-failover.json

# 4. Restaurar última snapshot de dados
aws rds restore-db-instance-from-snapshot \
  --db-instance-identifier voudemoto-db-dr \
  --db-snapshot-identifier latest-snapshot

# 5. Deploy da aplicação na região DR
kubectl apply -f k8s/ha/ --namespace voudemoto

# 6. Verificar health checks
kubectl get pods -n voudemoto
curl https://api.voudemoto.com/health

# 7. Notificar equipe e stakeholders
./scripts/notify-disaster-recovery.sh
```

#### Tempo Estimado
- Promoção de DB: 5-10 minutos
- Atualização DNS: 2-5 minutos (+ TTL)
- Deploy aplicação: 5-10 minutos
- Verificação: 5 minutos
- **Total**: ~20-30 minutos

---

### 3. Corrupção de Banco de Dados

**Probabilidade**: Baixa (< 1% ao ano)  
**Impacto**: Crítico  
**RTO**: 45 minutos  
**RPO**: 5 minutos

#### Detecção
- Erros de integridade referencial
- Queries retornando dados inconsistentes
- Alertas de backup verificação

#### Resposta
```bash
# 1. Isolar banco de dados corrompido
kubectl scale deployment voudemoto-backend --replicas=0

# 2. Identificar último backup válido
aws s3 ls s3://voudemoto-backups/production/ | tail -n 10

# 3. Restaurar do backup
psql $DATABASE_URL < backup-2026-01-28-14-30.sql

# 4. Verificar integridade
psql $DATABASE_URL -c "SELECT * FROM pg_catalog.pg_database_size('voudemoto');"
psql $DATABASE_URL -c "ANALYZE VERBOSE;"

# 5. Replay WAL logs (se disponível)
pg_waldump /var/lib/postgresql/wal/000000010000000000000001

# 6. Reativar aplicação
kubectl scale deployment voudemoto-backend --replicas=6

# 7. Verificar funcionamento
curl https://api.voudemoto.com/api/rides
```

#### Prevenção
- Backups contínuos WAL
- Snapshots automáticos a cada hora
- Testes de restore mensais
- Monitoramento de integridade

---

### 4. Ataque DDoS / Segurança

**Probabilidade**: Média (5-10% ao ano)  
**Impacto**: Alto  
**RTO**: 10 minutos  
**RPO**: 0 minutos

#### Detecção
- Rate limiting alertas
- WAF bloqueios em massa
- Spike anormal de tráfego
- CPU/memória elevados sem carga legítima

#### Resposta
```bash
# 1. Ativar modo de proteção DDoS
aws shield activate-emergency-contact

# 2. Aumentar rate limits temporariamente
kubectl patch configmap nginx-rate-limit-config \
  --patch '{"data":{"rate":"10r/s"}}'

# 3. Habilitar CAPTCHA para endpoints críticos
kubectl set env deployment/voudemoto-backend \
  ENABLE_CAPTCHA=true

# 4. Ativar CloudFlare Under Attack Mode
curl -X PATCH https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/security_level \
  -H "Authorization: Bearer $CF_TOKEN" \
  -d '{"value":"under_attack"}'

# 5. Analisar logs para identificar padrão
kubectl logs -n voudemoto -l app=backend --tail=1000 | grep "429\|403"

# 6. Bloquear IPs maliciosos
kubectl apply -f k8s/security/ip-blacklist.yaml

# 7. Escalar infraestrutura se necessário
kubectl scale deployment voudemoto-backend --replicas=20
```

#### Pós-Incidente
- Análise forense de logs
- Atualização de regras WAF
- Report para autoridades (se necessário)
- Comunicação com clientes

---

### 5. Perda de Dados / Ransomware

**Probabilidade**: Muito Baixa (< 0.1% ao ano)  
**Impacto**: Crítico  
**RTO**: 2 horas  
**RPO**: 1 hora

#### Detecção
- Criptografia não autorizada de dados
- Deleção em massa de registros
- Demanda de resgate

#### Resposta
```bash
# 1. ISOLAR IMEDIATAMENTE
kubectl delete deployment voudemoto-backend
aws rds modify-db-instance --db-instance-identifier voudemoto-db \
  --publicly-accessible false

# 2. Preservar evidências
kubectl get events --all-namespaces > incident-events.log
aws s3 cp s3://voudemoto-logs/ ./forensics/ --recursive

# 3. Avaliar extensão do dano
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM rides WHERE updated_at > NOW() - INTERVAL '1 hour';"

# 4. Restaurar de backup imutável
aws s3 cp s3://voudemoto-backups-immutable/latest.sql.gz ./
gunzip latest.sql.gz
psql $NEW_DATABASE_URL < latest.sql

# 5. Criar nova infraestrutura limpa
terraform destroy -target=kubernetes_cluster
terraform apply -target=kubernetes_cluster

# 6. Deploy em cluster limpo
kubectl config use-context production-clean
kubectl apply -f k8s/ --namespace voudemoto

# 7. Notificar ANPD (se dados pessoais afetados)
./scripts/notify-data-breach.sh
```

#### Prevenção
- Backups imutáveis (S3 Object Lock)
- Backups off-site em região diferente
- Princípio do menor privilégio
- MFA obrigatório para acessos administrativos
- Segmentação de rede

---

## Backups

### Estratégia de Backup

#### PostgreSQL
```yaml
Tipo: Contínuo (WAL) + Snapshots
Frequência: 
  - WAL: Contínuo (streaming)
  - Snapshot: A cada hora
  - Full Backup: Diário (2 AM UTC)
Retenção:
  - WAL: 7 dias
  - Snapshots: 30 dias
  - Full Backup: 90 dias
  - Yearly: 7 anos (compliance)
Localização: 
  - Primary: S3 us-east-1
  - DR: S3 us-west-2
  - Immutable: S3 Glacier
```

#### Redis
```yaml
Tipo: RDB + AOF
Frequência:
  - AOF: A cada segundo (appendfsync everysec)
  - RDB: A cada 6 horas
Retenção: 7 dias
Localização: EBS Snapshots + S3
```

#### MongoDB
```yaml
Tipo: Replica Set + Snapshots
Frequência:
  - Oplog: Contínuo
  - Snapshot: A cada 12 horas
Retenção: 30 dias
Localização: EBS Snapshots + S3
```

#### Arquivos (S3)
```yaml
Tipo: Versionamento + Replicação
Versões: 30 versões mantidas
Replicação: Cross-region (us-east-1 → us-west-2)
Lifecycle: Mover para Glacier após 90 dias
```

### Teste de Restore

**Frequência**: Mensal  
**Responsável**: Equipe DevOps  
**Documentação**: Wiki interno

```bash
# Script de teste mensal
./scripts/test-restore.sh

# Verifica:
# 1. Backup existe e não está corrompido
# 2. Restore completa em < RTO
# 3. Dados estão íntegros
# 4. Aplicação funciona com dados restaurados
# 5. Performance está adequada
```

---

## Monitoramento e Alertas

### Alertas Críticos (Pager)
- ❌ API retornando 500 por > 1 minuto
- ❌ Banco de dados inacessível
- ❌ > 50% dos pods em falha
- ❌ Disco > 90% de uso
- ❌ Memória > 95% de uso

### Alertas de Aviso (Email/Slack)
- ⚠️ API latência p95 > 500ms
- ⚠️ Taxa de erro > 1%
- ⚠️ Backup falhou
- ⚠️ Certificado SSL expira em < 7 dias
- ⚠️ Réplica de DB com lag > 1 minuto

### Dashboard 24/7
- Grafana: https://grafana.voudemoto.com
- Jaeger: https://jaeger.voudemoto.com
- AWS Console: Monitoramento de recursos
- Status Page: https://status.voudemoto.com

---

## Comunicação

### Cadeia de Escalação

```
1. Engenheiro On-Call
   ↓ (15 minutos)
2. Tech Lead
   ↓ (30 minutos)
3. CTO
   ↓ (1 hora)
4. CEO
```

### Canais de Comunicação

**Interno**:
- Slack: #incidents (privado)
- PagerDuty: Alertas automáticos
- Zoom: War room para incidentes críticos

**Externo**:
- Status Page: https://status.voudemoto.com
- Email: clientes afetados
- Redes Sociais: @voudemoto (se necessário)
- ANPD: incidents@voudemoto.com (dados pessoais)

### Template de Comunicação

```markdown
# Incidente: [TÍTULO]

**Status**: Investigando / Identificado / Monitorando / Resolvido
**Severidade**: Crítico / Alto / Médio / Baixo
**Início**: YYYY-MM-DD HH:MM UTC
**Impacto**: [Descrição do impacto nos usuários]

## Descrição
[O que aconteceu]

## Ações Tomadas
- [Ação 1]
- [Ação 2]

## Próximos Passos
- [Passo 1]
- [Passo 2]

## ETA de Resolução
[Estimativa se disponível]

---
Última atualização: [Timestamp]
```

---

## Pós-Incidente

### Post-Mortem (Obrigatório para Tier 1-2)

**Prazo**: 48 horas após resolução  
**Participantes**: Todos os envolvidos + stakeholders  
**Duração**: 1 hora

#### Agenda
1. **Timeline** (10min): O que aconteceu e quando
2. **Causa Raiz** (15min): Por que aconteceu
3. **Impacto** (10min): Quem foi afetado e como
4. **O que funcionou** (10min): Ações positivas
5. **O que não funcionou** (10min): Falhas no processo
6. **Action Items** (15min): Melhorias a implementar

#### Princípios
- ✅ Blameless: Focar no processo, não em pessoas
- ✅ Transparente: Compartilhar aprendizados
- ✅ Acionável: Definir melhorias concretas
- ✅ Documentado: Publicar relatório completo

### Métricas de Incidentes

**Acompanhar**:
- MTBF (Mean Time Between Failures)
- MTTR (Mean Time To Recovery)
- MTTD (Mean Time To Detect)
- MTTA (Mean Time To Acknowledge)
- Número de incidentes por mês
- Incidentes recorrentes

**Meta**:
- MTBF: > 30 dias
- MTTR: < 30 minutos
- MTTD: < 5 minutos
- MTTA: < 2 minutos

---

## Testes de DR

### Drill Completo (Anual)
**Data**: Primeiro sábado de cada trimestre  
**Duração**: 4 horas  
**Objetivo**: Testar failover completo para região DR

### Tabletop Exercise (Trimestral)
**Data**: Segunda sexta-feira do trimestre  
**Duração**: 2 horas  
**Objetivo**: Discutir cenários hipotéticos

### Backup Restore Test (Mensal)
**Data**: Último domingo do mês  
**Duração**: 1 hora  
**Objetivo**: Verificar integridade de backups

---

## Documentação de Referência

- [Runbooks](./runbooks/)
- [Arquitetura](./architecture/)
- [Contatos de Emergência](./contacts.md)
- [Scripts de Automação](./scripts/)
- [Procedimentos de Backup](./backup-procedures.md)

---

## Histórico de Revisões

| Data | Versão | Autor | Alterações |
|------|--------|-------|------------|
| 2026-01-28 | 1.0 | DevOps Team | Versão inicial |

---

## Aprovações

| Papel | Nome | Data | Assinatura |
|-------|------|------|------------|
| CTO | [Nome] | YYYY-MM-DD | ✓ |
| DevOps Lead | [Nome] | YYYY-MM-DD | ✓ |
| CISO | [Nome] | YYYY-MM-DD | ✓ |

---

**Próxima Revisão**: 28 de abril de 2026  
**Responsável**: DevOps Team
