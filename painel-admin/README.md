# VouDeMoto Admin Panel

Painel administrativo em portugues para operacao em tempo real.

## Setup
- Copie `.env.example` para `.env`.
- Configure as URLs do backend:
  - `VITE_API_BASE_URL`
  - `VITE_REALTIME_URL`
- Instale dependencias e rode em desenvolvimento.

## Rotas de tela
- `/` painel principal
- `/corridas` corridas ativas
- `/mapa` mapa em tempo real
- `/motoristas` visao de motoristas
- `/passageiros` visao de passageiros
- `/incidentes` feed de incidentes
- `/auditoria` log de auditoria
- `/relatorios` metricas e resumo

## Integracao com backend
- Login por HTTP: `POST {VITE_API_BASE_URL}/login`
- Tempo real por WebSocket: `VITE_REALTIME_URL`
- Eventos esperados: `ride_snapshot`, `ride_state_changed`, `driver_location_update`, `audit_event`, `incident_created`, `system_health`
- Acoes administrativas enviadas: `admin_cancel_ride`, `admin_reassign_driver`, `admin_force_complete`

Detalhes tecnicos completos em `INTEGRATION.md`.
