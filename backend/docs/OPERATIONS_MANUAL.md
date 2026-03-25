# Manual de Operações - VouDeMoto Backend

## Visão Geral

Este manual documenta todos os procedimentos operacionais para o sistema VouDeMoto Backend em produção.

## Índice

1. [Deployment](#deployment)
2. [Scaling](#scaling)
3. [Monitoring](#monitoring)
4. [Troubleshooting](#troubleshooting)
5. [Backup & Restore](#backup--restore)
6. [Manutenção](#manutencao)
7. [Segurança](#seguranca)
8. [Disaster Recovery](#disaster-recovery)

---

## Deployment

### Deployment Regular (Main Branch)

```bash
# 1. Verificar branch e pull latest
git checkout main
git pull origin main

# 2. Criar tag de versão
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3

# 3. CI/CD executará automaticamente:
# - Lint e testes
# - Build da imagem Docker
# - Scan de segurança
# - Deploy em staging
# - Testes de smoke
# - Deploy em production (blue-green)

# 4. Monitorar deployment
kubectl rollout status deployment/voudemoto-backend -n voudemoto
kubectl get pods -n voudemoto -w

# 5. Verificar health
curl https://api.voudemoto.com/health
```

### Rollback de Deployment

```bash
# Rollback para versão anterior
kubectl rollout undo deployment/voudemoto-backend -n voudemoto

# Rollback para versão específica
kubectl rollout history deployment/voudemoto-backend -n voudemoto
kubectl rollout undo deployment/voudemoto-backend --to-revision=5 -n voudemoto

# Verificar status
kubectl rollout status deployment/voudemoto-backend -n voudemoto
```

### Deployment Manual (Emergência)

```bash
# 1. Build imagem localmente
docker build -t voudemoto/backend:emergency .

# 2. Push para registry
docker push ghcr.io/voudemoto/backend:emergency

# 3. Update deployment
kubectl set image deployment/voudemoto-backend \
  backend=ghcr.io/voudemoto/backend:emergency \
  -n voudemoto

# 4. Force rollout
kubectl rollout restart deployment/voudemoto-backend -n voudemoto
```

---

## Scaling

### Manual Scaling

```bash
# Escalar horizontalmente
kubectl scale deployment/voudemoto-backend --replicas=10 -n voudemoto

# Escalar verticalmente (editar recursos)
kubectl edit deployment/voudemoto-backend -n voudemoto
# Modificar resources.requests e resources.limits

# Verificar scaling
kubectl get hpa -n voudemoto
kubectl top pods -n voudemoto
```

### Auto-Scaling Configuration

```bash
# Verificar HPA atual
kubectl get hpa voudemoto-backend-hpa -n voudemoto -o yaml

# Ajustar thresholds
kubectl patch hpa voudemoto-backend-hpa -n voudemoto \
  --patch '{"spec":{"metrics":[{"type":"Resource","resource":{"name":"cpu","target":{"type":"Utilization","averageUtilization":60}}}]}}'

# Ajustar min/max replicas
kubectl patch hpa voudemoto-backend-hpa -n voudemoto \
  --patch '{"spec":{"minReplicas":8,"maxReplicas":40}}'
```

### Database Scaling

```bash
# Escalar RDS (AWS)
aws rds modify-db-instance \
  --db-instance-identifier voudemoto-db \
  --db-instance-class db.r6g.2xlarge \
  --apply-immediately

# Escalar Redis (aumentar nodes)
helm upgrade redis bitnami/redis \
  --set replica.replicaCount=5 \
  --namespace voudemoto

# Escalar MongoDB (adicionar shards)
kubectl scale statefulset mongodb --replicas=5 -n voudemoto
```

---

## Monitoring

### Dashboards

**Grafana**: https://grafana.voudemoto.com
- Backend Overview: Métricas gerais da API
- Database Performance: Queries, connections, latência
- Cache Metrics: Hit rate, memory usage
- Infrastructure: CPU, memória, rede, disco

**Jaeger**: https://jaeger.voudemoto.com
- Distributed tracing
- Latência de requests
- Dependências entre serviços

**Prometheus**: https://prometheus.voudemoto.com
- Métricas brutas
- Query PromQL
- Targets e health checks

### Logs

```bash
# Logs de pods específicos
kubectl logs -f deployment/voudemoto-backend -n voudemoto

# Logs de todos os pods
kubectl logs -l app=backend -n voudemoto --all-containers=true

# Logs com timestamps
kubectl logs deployment/voudemoto-backend -n voudemoto --timestamps=true

# Logs anteriores (pod crashado)
kubectl logs deployment/voudemoto-backend -n voudemoto --previous

# Logs via Loki (Grafana)
# Acessar Grafana > Explore > Loki datasource
# Query: {namespace="voudemoto", app="backend"}
```

### Métricas Chave

```promql
# Request rate
rate(http_requests_total{job="voudemoto-backend"}[5m])

# Error rate
rate(http_requests_total{job="voudemoto-backend",status=~"5.."}[5m]) / 
rate(http_requests_total{job="voudemoto-backend"}[5m])

# Latência p95
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Pods disponíveis
count(up{job="voudemoto-backend"} == 1)

# CPU usage
rate(container_cpu_usage_seconds_total{pod=~"voudemoto-backend.*"}[5m])

# Memory usage
container_memory_usage_bytes{pod=~"voudemoto-backend.*"} / 
container_spec_memory_limit_bytes * 100

# Database connections
pg_stat_database_numbackends

# Cache hit rate
rate(cache_operations_total{operation="get",status="hit"}[5m]) / 
rate(cache_operations_total{operation="get"}[5m])
```

---

## Troubleshooting

### API Retornando 500

```bash
# 1. Verificar logs
kubectl logs -l app=backend -n voudemoto --tail=100 | grep ERROR

# 2. Verificar health dos pods
kubectl get pods -n voudemoto
kubectl describe pod <pod-name> -n voudemoto

# 3. Verificar banco de dados
kubectl exec -it deployment/postgres -n voudemoto -- psql -U postgres -c "SELECT 1;"

# 4. Verificar Redis
kubectl exec -it deployment/redis -n voudemoto -- redis-cli PING

# 5. Verificar métricas
# Acessar Grafana e verificar error rate dashboard
```

### Alta Latência

```bash
# 1. Verificar traces no Jaeger
# Identificar operações lentas

# 2. Verificar banco de dados
kubectl exec -it deployment/postgres -n voudemoto -- \
  psql -U postgres -c "SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# 3. Verificar cache hit rate
kubectl exec -it deployment/redis -n voudemoto -- \
  redis-cli INFO stats | grep hit_rate

# 4. Verificar recursos
kubectl top pods -n voudemoto
kubectl top nodes

# 5. Analisar slow queries
tail -f logs/slow-queries.log
```

### Pod CrashLooping

```bash
# 1. Verificar status do pod
kubectl describe pod <pod-name> -n voudemoto

# 2. Verificar logs anteriores
kubectl logs <pod-name> -n voudemoto --previous

# 3. Verificar eventos
kubectl get events -n voudemoto --sort-by='.lastTimestamp'

# 4. Verificar recursos
kubectl top pod <pod-name> -n voudemoto

# 5. Executar debug pod
kubectl debug <pod-name> -n voudemoto --image=busybox -it
```

### Banco de Dados Lento

```bash
# 1. Verificar conexões ativas
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# 2. Verificar queries longas
psql $DATABASE_URL -c "SELECT pid, now() - query_start as duration, query FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '5 seconds';"

# 3. Matar query longa (se necessário)
psql $DATABASE_URL -c "SELECT pg_terminate_backend(<pid>);"

# 4. Verificar locks
psql $DATABASE_URL -c "SELECT * FROM pg_locks WHERE NOT granted;"

# 5. Executar VACUUM
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# 6. Atualizar estatísticas
psql $DATABASE_URL -c "ANALYZE;"
```

### Disco Cheio

```bash
# 1. Verificar uso de disco nos nodes
kubectl get nodes
kubectl describe node <node-name> | grep -A 5 "Allocated resources"

# 2. Limpar logs antigos
kubectl exec -it <pod-name> -n voudemoto -- sh -c "find /app/logs -name '*.log' -mtime +7 -delete"

# 3. Limpar imagens Docker antigas
kubectl get nodes -o name | xargs -I {} kubectl debug {} -it --image=alpine -- \
  docker system prune -af --filter "until=48h"

# 4. Expandir PVC
kubectl patch pvc <pvc-name> -n voudemoto \
  --patch '{"spec":{"resources":{"requests":{"storage":"100Gi"}}}}'

# 5. Verificar uso de disco
kubectl exec -it <pod-name> -n voudemoto -- df -h
```

---

## Backup & Restore

### Backup Manual

```bash
# PostgreSQL
kubectl exec -it deployment/postgres -n voudemoto -- \
  pg_dump -U postgres voudemoto | gzip > backup-$(date +%Y%m%d-%H%M%S).sql.gz

# Upload para S3
aws s3 cp backup-*.sql.gz s3://voudemoto-backups/manual/

# Redis (RDB snapshot)
kubectl exec -it deployment/redis -n voudemoto -- redis-cli BGSAVE

# MongoDB
kubectl exec -it deployment/mongodb -n voudemoto -- \
  mongodump --archive | gzip > mongodb-backup-$(date +%Y%m%d-%H%M%S).gz
```

### Restore Manual

```bash
# PostgreSQL
aws s3 cp s3://voudemoto-backups/backup-20260128.sql.gz ./
gunzip backup-20260128.sql.gz
kubectl exec -i deployment/postgres -n voudemoto -- \
  psql -U postgres voudemoto < backup-20260128.sql

# Redis
kubectl exec -i deployment/redis -n voudemoto -- redis-cli FLUSHALL
kubectl exec -i deployment/redis -n voudemoto -- redis-cli RESTORE < backup.rdb

# MongoDB
aws s3 cp s3://voudemoto-backups/mongodb-backup-20260128.gz ./
gunzip mongodb-backup-20260128.gz
kubectl exec -i deployment/mongodb -n voudemoto -- \
  mongorestore --archive < mongodb-backup-20260128
```

### Verificar Backups

```bash
# Listar backups recentes
aws s3 ls s3://voudemoto-backups/production/ --recursive | tail -n 10

# Verificar integridade
aws s3 cp s3://voudemoto-backups/backup-latest.sql.gz - | gunzip | head -n 100
```

---

## Manutenção

### Atualizações de Segurança

```bash
# Atualizar imagens base
docker pull node:20-alpine
docker pull postgres:16-alpine
docker pull redis:7-alpine

# Rebuild com novas imagens
docker build -t voudemoto/backend:latest .

# Scan de vulnerabilidades
trivy image voudemoto/backend:latest

# Deploy se não houver vulnerabilidades críticas
kubectl set image deployment/voudemoto-backend backend=voudemoto/backend:latest -n voudemoto
```

### Atualização de Certificados SSL

```bash
# Verificar expiração
kubectl get certificate -n voudemoto

# Forçar renovação (cert-manager renova automaticamente)
kubectl delete certificate voudemoto-tls -n voudemoto
kubectl apply -f k8s/security/cluster-issuer.yaml
```

### Limpeza de Dados Antigos

```bash
# Limpar logs antigos (>30 dias)
psql $DATABASE_URL -c "DELETE FROM audit.logs WHERE created_at < NOW() - INTERVAL '30 days';"

# Limpar notificações lidas antigas (>90 dias)
psql $DATABASE_URL -c "DELETE FROM notifications WHERE is_read = true AND created_at < NOW() - INTERVAL '90 days';"

# Limpar métricas antigas (>180 dias)
psql $DATABASE_URL -c "DELETE FROM analytics.metrics WHERE timestamp < NOW() - INTERVAL '180 days';"

# Vacuum full
psql $DATABASE_URL -c "VACUUM FULL ANALYZE;"
```

### Atualização do Kubernetes

```bash
# Verificar versão atual
kubectl version

# Atualizar control plane (EKS)
aws eks update-cluster-version \
  --name voudemoto-production \
  --kubernetes-version 1.28

# Atualizar node groups
aws eks update-nodegroup-version \
  --cluster-name voudemoto-production \
  --nodegroup-name voudemoto-nodes \
  --kubernetes-version 1.28

# Verificar pods após atualização
kubectl get pods --all-namespaces
```

---

## Segurança

### Rotação de Secrets

```bash
# 1. Gerar novos secrets
export NEW_JWT_SECRET=$(openssl rand -base64 32)
export NEW_JWT_REFRESH_SECRET=$(openssl rand -base64 32)

# 2. Atualizar no AWS Secrets Manager
aws secretsmanager update-secret \
  --secret-id voudemoto/production/jwt-secret \
  --secret-string "$NEW_JWT_SECRET"

# 3. Reiniciar pods para pegar novos secrets
kubectl rollout restart deployment/voudemoto-backend -n voudemoto

# 4. Verificar funcionamento
kubectl logs -l app=backend -n voudemoto --tail=50 | grep "secret"
```

### Auditoria de Acessos

```bash
# Verificar acessos recentes
psql $DATABASE_URL -c "SELECT user_id, action, resource_type, created_at FROM audit.logs ORDER BY created_at DESC LIMIT 100;"

# Verificar tentativas de login falhadas
psql $DATABASE_URL -c "SELECT ip_address, COUNT(*) FROM audit.logs WHERE action = 'login_failed' AND created_at > NOW() - INTERVAL '1 hour' GROUP BY ip_address HAVING COUNT(*) > 5;"

# Exportar logs de auditoria
psql $DATABASE_URL -c "\COPY (SELECT * FROM audit.logs WHERE created_at > NOW() - INTERVAL '30 days') TO '/tmp/audit-logs.csv' CSV HEADER;"
```

### Scan de Vulnerabilidades

```bash
# Scan de imagem Docker
trivy image ghcr.io/voudemoto/backend:latest

# Scan de dependências
npm audit
npm audit fix

# Scan de código
snyk test
snyk monitor
```

---

## Disaster Recovery

### Failover para Região DR

```bash
# Ver procedimento completo em docs/DR_PLAN.md

# 1. Ativar contexto DR
kubectl config use-context production-dr

# 2. Promover réplica de leitura
aws rds promote-read-replica --db-instance-identifier voudemoto-db-dr

# 3. Atualizar DNS
aws route53 change-resource-record-sets --hosted-zone-id Z123 --change-batch file://failover-dns.json

# 4. Deploy na região DR
kubectl apply -f k8s/ --namespace voudemoto

# 5. Verificar health
curl https://api.voudemoto.com/health
```

### Restore Completo

```bash
# Ver procedimento completo em docs/DR_PLAN.md

# 1. Baixar backup mais recente
aws s3 cp s3://voudemoto-backups/production/latest.sql.gz ./

# 2. Restaurar banco de dados
gunzip latest.sql.gz
psql $DATABASE_URL < latest.sql

# 3. Verificar integridade
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"

# 4. Reiniciar aplicação
kubectl rollout restart deployment/voudemoto-backend -n voudemoto
```

---

## Contatos de Emergência

| Papel | Nome | Telefone | Email |
|-------|------|----------|-------|
| CTO | [Nome] | +55 11 9xxxx-xxxx | cto@voudemoto.com |
| DevOps Lead | [Nome] | +55 11 9xxxx-xxxx | devops@voudemoto.com |
| On-Call (PagerDuty) | Rotativo | - | oncall@voudemoto.com |
| AWS Support | - | - | aws-enterprise |

---

## Recursos Úteis

- [Runbooks](./runbooks/)
- [DR Plan](./DR_PLAN.md)
- [LGPD Compliance](./LGPD_COMPLIANCE.md)
- [Architecture](./ARCHITECTURE.md)
- [Grafana Dashboards](https://grafana.voudemoto.com)
- [Jaeger Tracing](https://jaeger.voudemoto.com)
- [Status Page](https://status.voudemoto.com)

---

**Última Atualização**: 28 de janeiro de 2026  
**Responsável**: DevOps Team  
**Próxima Revisão**: 28 de abril de 2026
